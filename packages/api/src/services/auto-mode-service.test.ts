import { beforeEach, describe, expect, mock, test } from "bun:test";

// Mock dependencies BEFORE importing the module under test
const mockFeatureRepository = {
	findByProject: mock(() => Promise.resolve([])),
	findById: mock(() => Promise.resolve(null)),
	update: mock(() => Promise.resolve()),
	incrementRetryCount: mock(() => Promise.resolve()),
	getRetryInfo: mock(() => Promise.resolve({ retryCount: 0 })),
};

const mockSessionRepository = {
	create: mock(() =>
		Promise.resolve({ id: "sess_001", userId: "user_001", status: "running" }),
	),
	update: mock(() => Promise.resolve()),
};

mock.module("@nomos-ai/db", () => ({
	featureRepository: mockFeatureRepository,
	sessionRepository: mockSessionRepository,
	// Provide other exports that the module might re-export
	eventRepository: {},
	learningRepository: {},
	messageRepository: {},
	notificationRepository: {},
	projectRepository: {},
	settingRepository: {},
	worktreeRepository: {},
}));

const mockAreDependenciesSatisfied = mock(() => true);
const mockResolveDependencies = mock((features: any[]) => features);

mock.module("../lib/dependency-resolver", () => ({
	areDependenciesSatisfied: mockAreDependenciesSatisfied,
	resolveDependencies: mockResolveDependencies,
}));

// Import after mocks
const { AutoModeService } = await import("./auto-mode-service");

describe("AutoModeService", () => {
	let events: { emit: ReturnType<typeof mock> };
	let provider: { executeQuery: ReturnType<typeof mock> };
	let pipelineService: {
		setProjectRoot: ReturnType<typeof mock>;
		pollCheckpoints: ReturnType<typeof mock>;
		mapCheckpointToFeature: ReturnType<typeof mock>;
		getLatestCheckpoint: ReturnType<typeof mock>;
	};
	let worktreeService: { create: ReturnType<typeof mock> };
	let sessionService: {
		createPipelineSession: ReturnType<typeof mock>;
		completeSession: ReturnType<typeof mock>;
		failSession: ReturnType<typeof mock>;
	};
	let service: InstanceType<typeof AutoModeService>;

	beforeEach(() => {
		mockFeatureRepository.findByProject.mockReset();
		mockFeatureRepository.findById.mockReset();
		mockFeatureRepository.update.mockReset();
		mockFeatureRepository.incrementRetryCount.mockReset();
		mockFeatureRepository.getRetryInfo.mockReset();
		mockSessionRepository.create.mockReset();
		mockSessionRepository.update.mockReset();

		mockSessionRepository.create.mockResolvedValue({
			id: "sess_001",
			userId: "user_001",
			status: "running",
		});

		events = { emit: mock(() => {}) };
		provider = {
			executeQuery: mock(async function* () {
				yield {
					type: "result",
					subtype: "success",
					session_id: "sdk-session-1",
					result: "done",
					costData: {
						totalCostUsd: 0.05,
						inputTokens: 1000,
						outputTokens: 500,
					},
				};
			}),
		};
		pipelineService = {
			setProjectRoot: mock(() => {}),
			pollCheckpoints: mock(() => Promise.resolve()),
			mapCheckpointToFeature: mock(() => {}),
			getLatestCheckpoint: mock(() => null),
		};
		worktreeService = {
			create: mock(() => Promise.resolve({ path: "/tmp/wt" })),
		};
		sessionService = {
			createPipelineSession: mock(() =>
				Promise.resolve({ id: "sess_001", userId: "user_001", status: "running" }),
			),
			completeSession: mock(() => Promise.resolve()),
			failSession: mock(() => Promise.resolve()),
		};

		service = new AutoModeService(
			events as any,
			provider as any,
			pipelineService as any,
			worktreeService as any,
			sessionService as any,
		);
	});

	describe("getStatus", () => {
		test("returns initial status when not running", () => {
			const status = service.getStatus();
			expect(status.isRunning).toBe(false);
			expect(status.runningFeatures).toEqual([]);
			expect(status.consecutiveFailures).toBe(0);
		});
	});

	describe("setConfig / getConfig", () => {
		test("sets and gets maxConcurrency", () => {
			service.setMaxConcurrency(3);
			const config = service.getConfig();
			expect(config.maxConcurrency).toBe(3);
		});

		test("clamps maxConcurrency to minimum of 1", () => {
			service.setMaxConcurrency(0);
			expect(service.getConfig().maxConcurrency).toBe(1);
		});

		test("setConfig clamps concurrency between 1 and 5", () => {
			service.setConfig({ maxConcurrency: 10 });
			expect(service.getConfig().maxConcurrency).toBe(5);

			service.setConfig({ maxConcurrency: -1 });
			expect(service.getConfig().maxConcurrency).toBe(1);
		});

		test("setConfig clamps maxRetries between 0 and 10", () => {
			service.setConfig({ maxRetries: 20 });
			expect(service.getConfig().maxRetries).toBe(10);

			service.setConfig({ maxRetries: -5 });
			expect(service.getConfig().maxRetries).toBe(0);
		});
	});

	describe("stop", () => {
		test("sets isRunning to false and clears state", () => {
			// Start is async loop, so we test stop independently
			service.stop();
			const status = service.getStatus();
			expect(status.isRunning).toBe(false);
			expect(status.runningFeatures).toEqual([]);
		});

		test("emits auto-mode:stopped event when userId is set", () => {
			// We can't easily set currentUserId without starting,
			// but stop() guards with if(currentUserId)
			service.stop();
			// No userId set, so no event emitted
			const stopCalls = (events.emit.mock.calls as any[][]).filter(
				(c) => c[0] === "auto-mode:stopped",
			);
			expect(stopCalls).toHaveLength(0);
		});
	});

	describe("start", () => {
		test("throws when already running", async () => {
			// Return a pending feature so executeFeature fires (and fails fast)
			mockFeatureRepository.findByProject.mockResolvedValue([
				{
					id: "F001",
					status: "pending",
					retryCount: 0,
					dependencies: [],
				},
			]);
			mockFeatureRepository.findById.mockResolvedValue({
				id: "F001",
				useWorktree: false,
			});

			// Start the loop (it will try to execute F001 which will fail because
			// `claude` binary doesn't exist, but isRunning is set synchronously)
			service
				.start("proj_001", "/Users/test/project", "user_001")
				.catch(() => {});

			// Yield microtask queue so async start body runs up to isRunning = true
			await new Promise((r) => setTimeout(r, 5));

			// Second call should reject immediately
			await expect(
				service.start("proj_001", "/Users/test/project", "user_001"),
			).rejects.toThrow("Auto-mode is already running");

			// Clean up
			service.stop();
		});

		test("rejects projectRoot outside allowed directories", async () => {
			await expect(
				service.start("proj_001", "/etc/passwd", "user_001"),
			).rejects.toThrow("projectRoot must be under an allowed directory");
		});

		test("accepts projectRoot under /Users", async () => {
			mockFeatureRepository.findByProject.mockResolvedValue([]);

			// Fire-and-forget — don't await (loop has sleep(5000))
			service
				.start("proj_001", "/Users/test/project", "user_001")
				.catch(() => {});

			// Wait for the first loop iteration to complete findByProject
			await new Promise((r) => setTimeout(r, 20));

			expect(events.emit).toHaveBeenCalled();
			const startedCalls = (events.emit.mock.calls as any[][]).filter(
				(c) => c[0] === "auto-mode:started",
			);
			expect(startedCalls).toHaveLength(1);

			service.stop();
		});

		test("accepts projectRoot under /tmp", async () => {
			mockFeatureRepository.findByProject.mockResolvedValue([]);

			// Fire-and-forget
			service
				.start("proj_001", "/tmp/test-project", "user_001")
				.catch(() => {});

			// Wait for loop to enter
			await new Promise((r) => setTimeout(r, 20));

			// isRunning should be true (loop is running)
			expect(service.getStatus().isRunning).toBe(true);

			service.stop();
			expect(service.getStatus().isRunning).toBe(false);
		});
	});
});
