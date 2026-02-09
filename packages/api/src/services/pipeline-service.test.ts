import { beforeEach, describe, expect, mock, test } from "bun:test";

// Mock node:fs BEFORE importing the module under test
const mockExistsSync = mock(() => false);
const mockReaddirSync = mock(() => [] as string[]);
const mockReadFileSync = mock(() => "");

mock.module("node:fs", () => ({
	existsSync: mockExistsSync,
	readdirSync: mockReaddirSync,
	readFileSync: mockReadFileSync,
}));

// Mock the featureRepository (must return Promises for .catch() chaining)
const mockFeatureRepository = {
	update: mock(() => Promise.resolve({})),
	findById: mock(() => Promise.resolve(null)),
	findByProject: mock(() => Promise.resolve([])),
};

const mockSessionRepository = {
	create: mock(() => Promise.resolve({ id: "sess_001" })),
	update: mock(() => Promise.resolve({})),
	findActive: mock(() => Promise.resolve([])),
};

mock.module("@nomos-ai/db", () => ({
	featureRepository: mockFeatureRepository,
	sessionRepository: mockSessionRepository,
	eventRepository: {},
	learningRepository: {},
	messageRepository: {},
	notificationRepository: {},
	projectRepository: {},
	settingRepository: {},
	worktreeRepository: {},
}));

// Import after mocks
const { PipelineService } = await import("./pipeline-service");

// Helper: build a valid checkpoint JSON string
function makeCheckpoint(
	phase: number,
	status: "completed" | "failed" | "escalated" = "completed",
	data: Record<string, unknown> = {},
) {
	return JSON.stringify({
		v: 1,
		phase,
		feature_id: "F001",
		ts: new Date().toISOString(),
		status,
		env: {
			worktree_path: "/tmp/wt",
			output_dir: "/tmp/out",
			project_root: "/tmp/root",
		},
		flags: {
			auto: true,
			test: true,
			merge: false,
			cleanup: false,
			plan_only: false,
			verify_only: false,
		},
		feature_summary: {
			id: "F001",
			title: "Test Feature",
			ac: ["AC1"],
			category: "core",
			phase: "development",
		},
		data,
	});
}

describe("PipelineService", () => {
	let events: { emit: ReturnType<typeof mock> };
	let service: InstanceType<typeof PipelineService>;

	beforeEach(() => {
		mockExistsSync.mockReset();
		mockReaddirSync.mockReset();
		mockReadFileSync.mockReset();
		mockFeatureRepository.update.mockReset();
		mockFeatureRepository.findById.mockReset();

		// Re-set default implementations after reset (reset clears them)
		mockFeatureRepository.update.mockImplementation(() => Promise.resolve({}));
		mockFeatureRepository.findById.mockImplementation(() =>
			Promise.resolve(null),
		);

		events = { emit: mock(() => {}) };
		service = new PipelineService(events as any);
	});

	describe("getSteps / buildInitialSteps", () => {
		test("getSteps returns 7 pipeline steps", () => {
			const steps = service.getSteps();
			expect(steps).toHaveLength(7);
			expect(steps[0]?.id).toBe("init");
			expect(steps[6]?.id).toBe("finish");
		});

		test("buildInitialSteps returns steps with pending status", () => {
			const steps = service.buildInitialSteps();
			expect(steps).toHaveLength(7);
			for (const step of steps) {
				expect(step.status).toBe("pending");
			}
		});
	});

	describe("readCheckpoint", () => {
		test("returns null when no projectRoot provided", () => {
			const result = service.readCheckpoint("F001", 1);
			expect(result).toBeNull();
		});

		test("returns null when file does not exist", () => {
			mockExistsSync.mockReturnValue(false);
			const result = service.readCheckpoint("F001", 1, "/tmp/root");
			expect(result).toBeNull();
		});

		test("returns parsed checkpoint for valid file", () => {
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(makeCheckpoint(1));

			const result = service.readCheckpoint("F001", 1, "/tmp/root");
			expect(result).not.toBeNull();
			expect(result?.phase).toBe(1);
			expect(result?.status).toBe("completed");
			expect(result?.feature_id).toBe("F001");
		});

		test("returns null for malformed JSON", () => {
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue("{ invalid json }}}");

			const result = service.readCheckpoint("F001", 1, "/tmp/root");
			expect(result).toBeNull();
		});

		test("returns null for valid JSON that fails schema validation", () => {
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(
				JSON.stringify({ phase: 1, status: "completed" }),
			);

			const result = service.readCheckpoint("F001", 1, "/tmp/root");
			expect(result).toBeNull();
		});

		test("reads checkpoint with explicit projectRoot", () => {
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(makeCheckpoint(2));

			const result = service.readCheckpoint("F001", 2, "/tmp/myroot");
			expect(result).not.toBeNull();
			expect(result?.phase).toBe(2);
		});

		test("constructs correct file path with zero-padded phase", () => {
			mockExistsSync.mockReturnValue(false);
			service.readCheckpoint("F001", 3, "/tmp/root");

			// existsSync should have been called with the correct path
			const callArg = mockExistsSync.mock.calls[0]?.[0] as string;
			expect(callArg).toContain("F001");
			expect(callArg).toContain("cp-03.json");
		});
	});

	describe("getLatestCheckpoint", () => {
		test("returns null when projectRoot not set", () => {
			const result = service.getLatestCheckpoint("F001");
			expect(result).toBeNull();
		});

		test("returns null when output directory does not exist", () => {
			mockExistsSync.mockReturnValue(false);
			const result = service.getLatestCheckpoint("F001", "/tmp/root");
			expect(result).toBeNull();
		});

		test("returns null when no checkpoint files exist", () => {
			mockExistsSync.mockReturnValue(true);
			mockReaddirSync.mockReturnValue([]);
			const result = service.getLatestCheckpoint("F001", "/tmp/root");
			expect(result).toBeNull();
		});

		test("returns highest completed checkpoint", () => {
			// First call: existsSync for dir, then for each cp file
			let _existsCalls = 0;
			mockExistsSync.mockImplementation(() => {
				_existsCalls++;
				return true; // all exist
			});
			mockReaddirSync.mockReturnValue([
				"cp-01.json",
				"cp-02.json",
				"cp-03.json",
			]);
			// readFileSync returns valid checkpoint for each phase
			let readCalls = 0;
			mockReadFileSync.mockImplementation(() => {
				readCalls++;
				// Files are read in reverse order (cp-03 first)
				const phases = [3, 2, 1];
				return makeCheckpoint(phases[readCalls - 1] ?? 1);
			});

			const result = service.getLatestCheckpoint("F001", "/tmp/root");
			expect(result).not.toBeNull();
			expect(result?.phase).toBe(3);
			expect(result?.data.status).toBe("completed");
		});

		test("skips failed checkpoints and returns last completed", () => {
			mockExistsSync.mockReturnValue(true);
			mockReaddirSync.mockReturnValue(["cp-01.json", "cp-02.json"]);

			let readCalls = 0;
			mockReadFileSync.mockImplementation(() => {
				readCalls++;
				// cp-02 is failed (read first due to reverse sort), cp-01 is completed
				if (readCalls === 1) return makeCheckpoint(2, "failed");
				return makeCheckpoint(1, "completed");
			});

			const result = service.getLatestCheckpoint("F001", "/tmp/root");
			expect(result).not.toBeNull();
			expect(result?.phase).toBe(1);
		});

		test("ignores non-checkpoint files in directory", () => {
			mockExistsSync.mockReturnValue(true);
			mockReaddirSync.mockReturnValue(["README.md", "cp-01.json", "notes.txt"]);
			mockReadFileSync.mockReturnValue(makeCheckpoint(1));

			const result = service.getLatestCheckpoint("F001", "/tmp/root");
			expect(result).not.toBeNull();
			expect(result?.phase).toBe(1);
		});
	});

	describe("mapCheckpointToFeature", () => {
		test("updates pipelineStep and lastCompletedStep for any phase", () => {
			const cp = JSON.parse(makeCheckpoint(1));
			service.mapCheckpointToFeature("F001", cp);

			expect(mockFeatureRepository.update).toHaveBeenCalledTimes(1);
			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[0]).toBe("F001");
			expect(updateArgs[1].pipelineStep).toBe("context");
			expect(updateArgs[1].lastCompletedStep).toBe("context");
		});

		test("phase 2 sets summary from plan_overview", () => {
			const cp = JSON.parse(
				makeCheckpoint(2, "completed", { plan_overview: "My plan" }),
			);
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].summary).toBe("My plan");
		});

		test("phase 3 sets files and passes from verdict", () => {
			const cp = JSON.parse(
				makeCheckpoint(3, "completed", {
					files_changed: ["a.ts", "b.ts"],
					verdict: "PASS",
				}),
			);
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].files).toEqual({ modify: ["a.ts", "b.ts"] });
			expect(updateArgs[1].passes).toBe(true);
		});

		test("phase 4 sets status to waiting_approval", () => {
			const cp = JSON.parse(
				makeCheckpoint(4, "completed", { verdict: "PASS" }),
			);
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].status).toBe("waiting_approval");
			expect(updateArgs[1].passes).toBe(true);
		});

		test("phase 5 sets branchName from git_ops", () => {
			const cp = JSON.parse(
				makeCheckpoint(5, "completed", {
					git_ops: { branch: "feature/F001" },
				}),
			);
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].branchName).toBe("feature/F001");
		});

		test("phase 6 with merge flag sets status to verified", () => {
			const cpRaw = JSON.parse(makeCheckpoint(6));
			cpRaw.flags.merge = true;
			service.mapCheckpointToFeature("F001", cpRaw);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].status).toBe("verified");
			expect(updateArgs[1].verifiedAt).toBeInstanceOf(Date);
			expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
		});

		test("phase 6 without merge flag only sets completedAt", () => {
			const cp = JSON.parse(makeCheckpoint(6));
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].status).toBeUndefined();
			expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
		});

		test("failed checkpoint sets status to failed with error", () => {
			const cp = JSON.parse(
				makeCheckpoint(3, "failed", { error: "Build broke" }),
			);
			service.mapCheckpointToFeature("F001", cp);

			const updateArgs = mockFeatureRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].status).toBe("failed");
			expect(updateArgs[1].error).toBe("Build broke");
		});

		test("emits events when userId provided", () => {
			const cp = JSON.parse(makeCheckpoint(1));
			service.mapCheckpointToFeature("F001", cp, "user_001");

			// Should emit pipeline:step-started, feature:progress, pipeline:step-completed
			expect(events.emit).toHaveBeenCalledTimes(3);
			const calls = events.emit.mock.calls;
			expect(calls[0]?.[0]).toBe("pipeline:step-started");
			expect(calls[1]?.[0]).toBe("feature:progress");
			expect(calls[2]?.[0]).toBe("pipeline:step-completed");
		});

		test("emits feature:completed on phase 6 completed", () => {
			const cp = JSON.parse(makeCheckpoint(6));
			service.mapCheckpointToFeature("F001", cp, "user_001");

			const emitCalls = events.emit.mock.calls;
			const completedCall = emitCalls.find(
				(c: any[]) => c[0] === "feature:completed",
			);
			expect(completedCall).toBeDefined();
		});

		test("emits feature:error on failed checkpoint", () => {
			const cp = JSON.parse(makeCheckpoint(3, "failed"));
			service.mapCheckpointToFeature("F001", cp, "user_001");

			const emitCalls = events.emit.mock.calls;
			const errorCall = emitCalls.find((c: any[]) => c[0] === "feature:error");
			expect(errorCall).toBeDefined();
		});

		test("does not emit events when userId not provided", () => {
			const cp = JSON.parse(makeCheckpoint(1));
			service.mapCheckpointToFeature("F001", cp);

			expect(events.emit).not.toHaveBeenCalled();
		});
	});

	describe("pollCheckpoints", () => {
		test("rejects when projectRoot not provided", async () => {
			await expect(service.pollCheckpoints("F001", () => {})).rejects.toThrow(
				"projectRoot is required",
			);
		});

		test("stops polling when abort signal fires", async () => {
			const abort = new AbortController();

			// Abort immediately
			abort.abort();

			const onCheckpoint = mock(() => {});
			await service.pollCheckpoints("F001", onCheckpoint, abort.signal, "/tmp/root");

			expect(onCheckpoint).not.toHaveBeenCalled();
		});
	});

	describe("getProgress", () => {
		test("throws when feature not found", async () => {
			mockFeatureRepository.findById.mockResolvedValue(null);
			await expect(service.getProgress("F999")).rejects.toThrow(
				"Feature not found: F999",
			);
		});

		test("returns progress for a feature", async () => {
			mockFeatureRepository.findById.mockResolvedValue({
				id: "F001",
				pipelineStep: "execute",
			});

			const progress = await service.getProgress("F001");
			expect(progress.currentStep).toBe("execute");
			expect(progress.steps).toHaveLength(7);

			// Steps before execute should be completed
			const executeIdx = progress.steps.findIndex((s) => s.id === "execute");
			for (let i = 0; i < executeIdx; i++) {
				expect(progress.steps[i]?.status).toBe("completed");
			}
			expect(progress.steps[executeIdx]?.status).toBe("running");
		});
	});
});
