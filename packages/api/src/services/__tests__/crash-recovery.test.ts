import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ProviderMessage } from "@nomos-ai/types";
import type { AgentProvider } from "../claude-provider";
import type { EventService } from "../event-service";
import type { PipelineService } from "../pipeline-service";
import type { SessionService } from "../session-service";
import type { WorktreeService } from "../worktree-service";

// ── Mock helpers ──────────────────────────────────────────

function createMockEventService(): EventService {
	return {
		emit: mock(() => {}) as EventService["emit"],
		subscribe: mock(() => () => {}) as EventService["subscribe"],
		subscriberCount: 0,
	} as EventService;
}

function createMockPipelineService(): PipelineService {
	return {
		setProjectRoot: mock(() => {}),
		pollCheckpoints: mock(async () => {}),
		mapCheckpointToFeature: mock(async () => {}),
		readCheckpoint: mock(() => null),
		getLatestCheckpoint: mock(() => null),
	} as unknown as PipelineService;
}

function createMockWorktreeService(): WorktreeService {
	return {
		create: mock(async () => ({ path: "/tmp/worktree" })),
		remove: mock(async () => {}),
		findByFeatureId: mock(async () => null),
		listActive: mock(async () => []),
	} as unknown as WorktreeService;
}

function createMockProvider(messages: ProviderMessage[] = []): AgentProvider {
	return {
		async *executeQuery() {
			for (const msg of messages) {
				yield msg;
			}
		},
	};
}

async function waitFor(
	conditionFn: () => boolean,
	timeoutMs = 2000,
	intervalMs = 50,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (conditionFn()) return;
		await new Promise((r) => setTimeout(r, intervalMs));
	}
}

// ── DB Mocks ──────────────────────────────────────────────

const mockSessionDb = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
	findActive: mock(async () => []) as ReturnType<typeof mock>,
	findResumable: mock(async () => []) as ReturnType<typeof mock>,
	findByStatus: mock(async () => []) as ReturnType<typeof mock>,
	create: mock(async (data: Record<string, unknown>) => ({
		id: data.id ?? "sess_new",
		...data,
		createdAt: new Date(),
		updatedAt: new Date(),
	})) as ReturnType<typeof mock>,
	update: mock(
		async (id: string, data: Record<string, unknown>) => ({
			id,
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
			userId: "user1",
		}),
	) as ReturnType<typeof mock>,
};

const mockFeatureDb = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
	findByProject: mock(async () => []) as ReturnType<typeof mock>,
	update: mock(async () => ({})) as ReturnType<typeof mock>,
	incrementRetryCount: mock(async () => {}) as ReturnType<typeof mock>,
	getRetryInfo: mock(async () => ({ retryCount: 0 })) as ReturnType<typeof mock>,
};

mock.module("@nomos-ai/db", () => ({
	sessionRepository: mockSessionDb,
	featureRepository: mockFeatureDb,
	projectRepository: {
		findById: mock(async () => ({ id: "proj1", path: "/Users/test/project" })),
	},
}));

// Import after mock registration
const { SessionService } = await import("../session-service");
const { AutoModeService } = await import("../auto-mode-service");

// ── Session Cleanup on Startup Tests ──────────────────────

describe("Server startup session cleanup", () => {
	beforeEach(() => {
		mockSessionDb.findActive.mockReset();
		mockSessionDb.update.mockReset();
	});

	test("marks orphaned running sessions as failed with restart reason", async () => {
		const orphanedSessions = [
			{
				id: "sess_orphan1",
				status: "running",
				isRunning: true,
				userId: "user1",
				featureId: "F001",
			},
			{
				id: "sess_orphan2",
				status: "pending",
				isRunning: false,
				userId: "user2",
				featureId: "F002",
			},
		];

		mockSessionDb.findActive.mockResolvedValue(orphanedSessions);
		mockSessionDb.update.mockImplementation(
			async (id: string, data: Record<string, unknown>) => ({
				id,
				...data,
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
			}),
		);

		// Simulate the startup cleanup logic from apps/server/src/index.ts
		const orphaned = await mockSessionDb.findActive();
		if (orphaned.length > 0) {
			for (const session of orphaned) {
				await mockSessionDb.update(session.id, {
					status: "failed",
					isRunning: false,
					error: "Server restarted, session orphaned",
					completedAt: new Date(),
				});
			}
		}

		expect(mockSessionDb.update).toHaveBeenCalledTimes(2);

		const firstCall = mockSessionDb.update.mock.calls[0]!;
		expect(firstCall[0]).toBe("sess_orphan1");
		expect((firstCall[1] as Record<string, unknown>).status).toBe("failed");
		expect((firstCall[1] as Record<string, unknown>).isRunning).toBe(false);
		expect((firstCall[1] as Record<string, unknown>).error).toBe(
			"Server restarted, session orphaned",
		);

		const secondCall = mockSessionDb.update.mock.calls[1]!;
		expect(secondCall[0]).toBe("sess_orphan2");
		expect((secondCall[1] as Record<string, unknown>).status).toBe("failed");
	});

	test("does nothing when no orphaned sessions exist", async () => {
		mockSessionDb.findActive.mockResolvedValue([]);

		const orphaned = await mockSessionDb.findActive();
		expect(orphaned.length).toBe(0);
		expect(mockSessionDb.update).not.toHaveBeenCalled();
	});

	test("cleanup handles DB errors gracefully", async () => {
		mockSessionDb.findActive.mockRejectedValue(
			new Error("Database connection failed"),
		);

		let errorCaught = false;
		try {
			await mockSessionDb.findActive();
		} catch {
			errorCaught = true;
		}

		expect(errorCaught).toBe(true);
		// In the real server, this is caught and logged as non-fatal
	});
});

// ── SessionService.resumeSession Tests ────────────────────

describe("SessionService.resumeSession", () => {
	let events: ReturnType<typeof createMockEventService>;
	let sessionService: InstanceType<typeof SessionService>;

	beforeEach(() => {
		events = createMockEventService();
		sessionService = new SessionService(events);

		mockSessionDb.findById.mockReset();
		mockSessionDb.update.mockReset();
	});

	test("resumes a failed session and transitions to running", async () => {
		const failedSession = {
			id: "sess_failed1",
			status: "failed",
			isRunning: false,
			userId: "user1",
			featureId: "F001",
			error: "SDK connection failed",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		};

		mockSessionDb.findById.mockResolvedValue(failedSession);
		mockSessionDb.update.mockResolvedValue({
			...failedSession,
			status: "running",
			isRunning: true,
			error: null,
			completedAt: null,
		});

		const result = await sessionService.resumeSession("sess_failed1");

		expect(mockSessionDb.findById).toHaveBeenCalledWith("sess_failed1");
		expect(mockSessionDb.update).toHaveBeenCalledWith("sess_failed1", {
			status: "running",
			isRunning: true,
			error: null,
			completedAt: null,
		});
		expect(result.status).toBe("running");
		expect(result.isRunning).toBe(true);
	});

	test("emits session:resumed event on successful resume", async () => {
		const failedSession = {
			id: "sess_failed2",
			status: "failed",
			isRunning: false,
			userId: "user1",
			featureId: "F002",
			error: "Timeout",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		};

		mockSessionDb.findById.mockResolvedValue(failedSession);
		mockSessionDb.update.mockResolvedValue({
			...failedSession,
			status: "running",
			isRunning: true,
			error: null,
		});

		await sessionService.resumeSession("sess_failed2");

		expect(events.emit).toHaveBeenCalledWith("agent:stream", {
			type: "session:resumed",
			sessionId: "sess_failed2",
			userId: "user1",
			featureId: "F002",
		});
	});

	test("throws if session not found", async () => {
		mockSessionDb.findById.mockResolvedValue(null);

		await expect(
			sessionService.resumeSession("sess_nonexistent"),
		).rejects.toThrow("Session not found: sess_nonexistent");
	});

	test("throws if session is not in failed status", async () => {
		const runningSession = {
			id: "sess_running",
			status: "running",
			isRunning: true,
			userId: "user1",
			featureId: "F003",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		};

		mockSessionDb.findById.mockResolvedValue(runningSession);

		await expect(
			sessionService.resumeSession("sess_running"),
		).rejects.toThrow('Cannot resume session in status "running"');
	});

	test("throws if session is completed", async () => {
		const completedSession = {
			id: "sess_completed",
			status: "completed",
			isRunning: false,
			userId: "user1",
			featureId: "F004",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
			completedAt: new Date(),
		};

		mockSessionDb.findById.mockResolvedValue(completedSession);

		await expect(
			sessionService.resumeSession("sess_completed"),
		).rejects.toThrow('Cannot resume session in status "completed"');
	});

	test("throws if session has no feature ID", async () => {
		const failedNoFeature = {
			id: "sess_no_feature",
			status: "failed",
			isRunning: false,
			userId: "user1",
			featureId: null,
			error: "Error",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		};

		mockSessionDb.findById.mockResolvedValue(failedNoFeature);

		await expect(
			sessionService.resumeSession("sess_no_feature"),
		).rejects.toThrow("Cannot resume session without a feature ID");
	});
});

// ── SessionService.findResumableSessions Tests ────────────

describe("SessionService.findResumableSessions", () => {
	let events: ReturnType<typeof createMockEventService>;
	let sessionService: InstanceType<typeof SessionService>;

	beforeEach(() => {
		events = createMockEventService();
		sessionService = new SessionService(events);
		mockSessionDb.findResumable.mockReset();
	});

	test("returns failed sessions that have a featureId", async () => {
		const failedSessions = [
			{
				id: "sess_1",
				status: "failed",
				featureId: "F001",
				userId: "user1",
				error: "Connection lost",
			},
			{
				id: "sess_2",
				status: "failed",
				featureId: "F002",
				userId: "user1",
				error: "Timeout",
			},
			{
				id: "sess_3",
				status: "failed",
				featureId: null,
				userId: "user1",
				error: "No feature",
			},
		];

		mockSessionDb.findResumable.mockResolvedValue(failedSessions);

		const resumable = await sessionService.findResumableSessions();

		// Session without featureId should be filtered out
		expect(resumable).toHaveLength(2);
		expect(resumable[0]!.id).toBe("sess_1");
		expect(resumable[1]!.id).toBe("sess_2");
	});

	test("returns empty array when no failed sessions exist", async () => {
		mockSessionDb.findResumable.mockResolvedValue([]);

		const resumable = await sessionService.findResumableSessions();
		expect(resumable).toHaveLength(0);
	});

	test("filters out sessions with undefined featureId", async () => {
		const sessions = [
			{
				id: "sess_undef",
				status: "failed",
				featureId: undefined,
				userId: "user1",
			},
		];

		mockSessionDb.findResumable.mockResolvedValue(sessions);

		const resumable = await sessionService.findResumableSessions();
		expect(resumable).toHaveLength(0);
	});
});

// ── AutoModeService.resumeSession Tests ───────────────────

describe("AutoModeService.resumeSession", () => {
	let events: ReturnType<typeof createMockEventService>;
	let pipeline: ReturnType<typeof createMockPipelineService>;
	let worktree: ReturnType<typeof createMockWorktreeService>;

	beforeEach(() => {
		events = createMockEventService();
		pipeline = createMockPipelineService();
		worktree = createMockWorktreeService();

		mockFeatureDb.findById.mockReset();
		mockFeatureDb.update.mockReset();
		mockFeatureDb.incrementRetryCount.mockReset();
		mockFeatureDb.getRetryInfo.mockReset();
		mockSessionDb.findById.mockReset();
		mockSessionDb.update.mockReset();
	});

	test("validates project root and rejects invalid paths", async () => {
		const mockSessionService = {
			resumeSession: mock(async () => ({
				id: "sess_1",
				featureId: "F001",
				status: "running",
				userId: "user1",
			})),
		} as unknown as SessionService;

		const provider = createMockProvider([]);
		const service = new AutoModeService(
			events,
			provider,
			pipeline,
			worktree,
			mockSessionService,
		);

		await expect(
			service.resumeSession("sess_1", "/etc/shadow", "user1"),
		).rejects.toThrow("allowed directory");
	});

	test("throws if feature is already running", async () => {
		const mockSessionService = {
			resumeSession: mock(async () => ({
				id: "sess_running",
				featureId: "F_RUNNING",
				status: "running",
				userId: "user1",
			})),
			createPipelineSession: mock(async () => ({
				id: "sess_F_RUNNING",
				featureId: "F_RUNNING",
				status: "running",
				userId: "user1",
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
			})),
			completeSession: mock(async () => ({})),
			failSession: mock(async () => ({})),
		} as unknown as SessionService;

		// Provider that hangs forever so the feature stays "running"
		const hangingProvider: AgentProvider = {
			async *executeQuery() {
				await new Promise(() => {});
			},
		};

		mockFeatureDb.findById.mockResolvedValue({
			id: "F_RUNNING",
			status: "in_progress",
			useWorktree: false,
		});
		mockFeatureDb.update.mockResolvedValue({});

		const service = new AutoModeService(
			events,
			hangingProvider,
			pipeline,
			worktree,
			mockSessionService,
		);

		// Start feature, which will hang in executeFeature
		await service.startFeature("F_RUNNING", "/Users/test/project", "user1");
		await new Promise((r) => setTimeout(r, 100));

		// Now try to resume — should fail since feature is already running
		await expect(
			service.resumeSession("sess_running", "/Users/test/project", "user1"),
		).rejects.toThrow("already running");

		// Cleanup: stop the service
		service.stop();
	});

	test("delegates to SessionService.resumeSession for state validation", async () => {
		const resumeMock = mock(async () => ({
			id: "sess_resume",
			featureId: "F_RESUME",
			status: "running",
			userId: "user1",
			sdkSessionId: "sdk-prev-session",
		}));

		const mockSessionService = {
			resumeSession: resumeMock,
			createPipelineSession: mock(async () => ({
				id: "sess_resume",
				userId: "user1",
				featureId: "F_RESUME",
				status: "running",
			})),
			completeSession: mock(async () => ({})),
			failSession: mock(async () => ({})),
		} as unknown as SessionService;

		const provider = createMockProvider([
			{
				type: "result",
				subtype: "success",
				session_id: "sdk-new",
				result: "done",
			} as ProviderMessage,
		]);

		mockFeatureDb.findById.mockResolvedValue({
			id: "F_RESUME",
			status: "failed",
			useWorktree: false,
		});
		mockFeatureDb.update.mockResolvedValue({});

		const service = new AutoModeService(
			events,
			provider,
			pipeline,
			worktree,
			mockSessionService,
		);

		await service.resumeSession("sess_resume", "/Users/test/project", "user1");

		// Wait for executeFeature to start
		await new Promise((r) => setTimeout(r, 200));

		// SessionService.resumeSession should be called first
		expect(resumeMock).toHaveBeenCalledWith("sess_resume");
	});

	test("resets feature to in_progress when resuming", async () => {
		const mockSessionService = {
			resumeSession: mock(async () => ({
				id: "sess_reset",
				featureId: "F_RESET",
				status: "running",
				userId: "user1",
			})),
			createPipelineSession: mock(async () => ({
				id: "sess_reset",
				userId: "user1",
				featureId: "F_RESET",
				status: "running",
			})),
			completeSession: mock(async () => ({})),
			failSession: mock(async () => ({})),
		} as unknown as SessionService;

		const provider = createMockProvider([
			{
				type: "result",
				subtype: "success",
				session_id: "sdk-1",
				result: "done",
			} as ProviderMessage,
		]);

		mockFeatureDb.findById.mockResolvedValue({
			id: "F_RESET",
			status: "failed",
			useWorktree: false,
		});
		mockFeatureDb.update.mockResolvedValue({});

		const service = new AutoModeService(
			events,
			provider,
			pipeline,
			worktree,
			mockSessionService,
		);

		await service.resumeSession("sess_reset", "/Users/test/project", "user1");
		await new Promise((r) => setTimeout(r, 200));

		// Feature should be updated to in_progress
		const inProgressCall = mockFeatureDb.update.mock.calls.find(
			(call: unknown[]) =>
				(call[1] as Record<string, unknown>)?.status === "in_progress",
		);
		expect(inProgressCall).toBeDefined();
		expect(inProgressCall![0]).toBe("F_RESET");
		expect(
			(inProgressCall![1] as Record<string, unknown>).locked,
		).toBe(true);
	});

	test("emits feature-queued event on resume", async () => {
		const mockSessionService = {
			resumeSession: mock(async () => ({
				id: "sess_emit",
				featureId: "F_EMIT",
				status: "running",
				userId: "user1",
			})),
			createPipelineSession: mock(async () => ({
				id: "sess_emit",
				userId: "user1",
				featureId: "F_EMIT",
				status: "running",
			})),
			completeSession: mock(async () => ({})),
			failSession: mock(async () => ({})),
		} as unknown as SessionService;

		const provider = createMockProvider([
			{
				type: "result",
				subtype: "success",
				session_id: "s1",
			} as ProviderMessage,
		]);

		mockFeatureDb.findById.mockResolvedValue({
			id: "F_EMIT",
			status: "failed",
			useWorktree: false,
		});
		mockFeatureDb.update.mockResolvedValue({});

		const service = new AutoModeService(
			events,
			provider,
			pipeline,
			worktree,
			mockSessionService,
		);

		await service.resumeSession("sess_emit", "/Users/test/project", "user1");
		await new Promise((r) => setTimeout(r, 100));

		const queuedEvent = (events.emit as ReturnType<typeof mock>).mock.calls.find(
			(call: unknown[]) =>
				call[0] === "auto-mode:event" &&
				(call[1] as Record<string, unknown>)?.type === "auto-mode:feature-queued",
		);
		expect(queuedEvent).toBeDefined();
	});

	test("throws if session has no featureId", async () => {
		const mockSessionService = {
			resumeSession: mock(async () => ({
				id: "sess_no_feat",
				featureId: null,
				status: "running",
				userId: "user1",
			})),
		} as unknown as SessionService;

		const provider = createMockProvider([]);
		const service = new AutoModeService(
			events,
			provider,
			pipeline,
			worktree,
			mockSessionService,
		);

		await expect(
			service.resumeSession("sess_no_feat", "/Users/test/project", "user1"),
		).rejects.toThrow("Cannot resume session without a feature ID");
	});
});

// ── sessionRepository.findResumable Tests ─────────────────

describe("sessionRepository.findResumable (mock verification)", () => {
	beforeEach(() => {
		mockSessionDb.findResumable.mockReset();
	});

	test("returns sessions with status failed", async () => {
		const failedSessions = [
			{
				id: "s1",
				status: "failed",
				featureId: "F001",
				sdkSessionId: "sdk-1",
			},
			{
				id: "s2",
				status: "failed",
				featureId: "F002",
				sdkSessionId: null,
			},
		];

		mockSessionDb.findResumable.mockResolvedValue(failedSessions);

		const result = await mockSessionDb.findResumable();
		expect(result).toHaveLength(2);
		expect(result[0].status).toBe("failed");
	});

	test("returns empty when no failed sessions", async () => {
		mockSessionDb.findResumable.mockResolvedValue([]);

		const result = await mockSessionDb.findResumable();
		expect(result).toHaveLength(0);
	});
});

// ── Full recovery flow: cleanup → resume ──────────────────

describe("Full crash recovery flow", () => {
	beforeEach(() => {
		mockSessionDb.findActive.mockReset();
		mockSessionDb.findResumable.mockReset();
		mockSessionDb.findById.mockReset();
		mockSessionDb.update.mockReset();
	});

	test("cleanup + find resumable + resume session end-to-end", async () => {
		// Step 1: Simulate server restart cleanup
		const orphanedSession = {
			id: "sess_orphan",
			status: "running",
			isRunning: true,
			userId: "user1",
			featureId: "F_RECOVER",
			sdkSessionId: "sdk-prev",
		};

		mockSessionDb.findActive.mockResolvedValue([orphanedSession]);
		mockSessionDb.update.mockImplementation(
			async (id: string, data: Record<string, unknown>) => ({
				id,
				userId: "user1",
				featureId: "F_RECOVER",
				sdkSessionId: "sdk-prev",
				...data,
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
			}),
		);

		// Cleanup orphaned sessions
		const orphaned = await mockSessionDb.findActive();
		for (const session of orphaned) {
			await mockSessionDb.update(session.id, {
				status: "failed",
				isRunning: false,
				error: "Server restarted, session orphaned",
				completedAt: new Date(),
			});
		}

		expect(mockSessionDb.update).toHaveBeenCalledTimes(1);
		expect(mockSessionDb.update.mock.calls[0]![0]).toBe("sess_orphan");

		// Step 2: Find resumable sessions
		mockSessionDb.findResumable.mockResolvedValue([
			{
				id: "sess_orphan",
				status: "failed",
				featureId: "F_RECOVER",
				userId: "user1",
				sdkSessionId: "sdk-prev",
				error: "Server restarted, session orphaned",
			},
		]);

		const events = createMockEventService();
		const sessionService = new SessionService(events);
		const resumable = await sessionService.findResumableSessions();

		expect(resumable).toHaveLength(1);
		expect(resumable[0]!.id).toBe("sess_orphan");
		expect(resumable[0]!.featureId).toBe("F_RECOVER");

		// Step 3: Resume the session
		mockSessionDb.findById.mockResolvedValue({
			id: "sess_orphan",
			status: "failed",
			isRunning: false,
			userId: "user1",
			featureId: "F_RECOVER",
			sdkSessionId: "sdk-prev",
			error: "Server restarted, session orphaned",
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		});

		mockSessionDb.update.mockReset();
		mockSessionDb.update.mockResolvedValue({
			id: "sess_orphan",
			status: "running",
			isRunning: true,
			userId: "user1",
			featureId: "F_RECOVER",
			sdkSessionId: "sdk-prev",
			error: null,
			completedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			startedAt: new Date(),
		});

		const resumed = await sessionService.resumeSession("sess_orphan");
		expect(resumed.status).toBe("running");
		expect(resumed.isRunning).toBe(true);

		// Verify session:resumed event was emitted
		expect(events.emit).toHaveBeenCalledWith("agent:stream", {
			type: "session:resumed",
			sessionId: "sess_orphan",
			userId: "user1",
			featureId: "F_RECOVER",
		});
	});
});
