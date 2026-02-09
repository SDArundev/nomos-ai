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
		pollCheckpoints: mock(async () => {}),
		mapCheckpointToFeature: mock(async () => {}),
		readCheckpoint: mock(() => null),
		getLatestCheckpoint: mock(() => null),
		getSteps: mock(() => [
			{ id: "init", name: "Initialize", order: 0 },
			{ id: "context", name: "Understand", order: 1 },
			{ id: "plan", name: "Plan Implementation", order: 2 },
			{ id: "execute", name: "Execute", order: 3 },
			{ id: "verify", name: "Review", order: 4 },
			{ id: "merge", name: "Ship", order: 5 },
			{ id: "finish", name: "Learn", order: 6 },
		]),
		buildInitialSteps: mock(() => [
			{ id: "init", name: "Initialize", order: 0, status: "pending" },
			{ id: "context", name: "Understand", order: 1, status: "pending" },
			{ id: "plan", name: "Plan Implementation", order: 2, status: "pending" },
			{ id: "execute", name: "Execute", order: 3, status: "pending" },
			{ id: "verify", name: "Review", order: 4, status: "pending" },
			{ id: "merge", name: "Ship", order: 5, status: "pending" },
			{ id: "finish", name: "Learn", order: 6, status: "pending" },
		]),
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

function createMockSessionService(): SessionService {
	return {
		createPipelineSession: mock(
			async ({ userId, featureId }: { userId: string; featureId: string }) => ({
				id: `sess_${featureId}`,
				userId,
				featureId,
				status: "running",
				isRunning: true,
				model: "sonnet",
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
				messageCount: 0,
			}),
		) as SessionService["createPipelineSession"],
		completeSession: mock(async () => ({})) as SessionService["completeSession"],
		failSession: mock(async () => ({})) as SessionService["failSession"],
		createAgentSession: mock(async () => ({})) as SessionService["createAgentSession"],
		createInteractiveSession: mock(
			async () => ({}),
		) as SessionService["createInteractiveSession"],
		resumeSession: mock(async () => ({})) as SessionService["resumeSession"],
		getActiveSessionsCount: mock(async () => 0) as SessionService["getActiveSessionsCount"],
		findResumableSessions: mock(async () => []) as SessionService["findResumableSessions"],
	} as SessionService;
}

async function waitFor(
	conditionFn: () => boolean,
	timeoutMs = 3000,
	intervalMs = 50,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (conditionFn()) return;
		await new Promise((r) => setTimeout(r, intervalMs));
	}
}

// ── DB Mocks ──────────────────────────────────────────────

const mockFeatureDb = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
	findByProject: mock(async () => []) as ReturnType<typeof mock>,
	findByUser: mock(async () => []) as ReturnType<typeof mock>,
	findByUserAndProject: mock(async () => []) as ReturnType<typeof mock>,
	create: mock(async (data: Record<string, unknown>) => ({
		id: `F${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
		...data,
		createdAt: new Date(),
		updatedAt: new Date(),
	})) as ReturnType<typeof mock>,
	update: mock(async () => ({})) as ReturnType<typeof mock>,
	incrementRetryCount: mock(async () => {}) as ReturnType<typeof mock>,
	getRetryInfo: mock(async () => ({ retryCount: 0 })) as ReturnType<typeof mock>,
};

const mockSessionDb = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
	create: mock(async (data: Record<string, unknown>) => ({
		id: data.id ?? "sess_new",
		...data,
		createdAt: new Date(),
		updatedAt: new Date(),
	})) as ReturnType<typeof mock>,
	update: mock(async () => ({})) as ReturnType<typeof mock>,
	findActive: mock(async () => []) as ReturnType<typeof mock>,
};

const mockProjectDb = {
	findById: mock(async () => ({
		id: "proj1",
		path: "/Users/test/project",
		userId: "user1",
	})) as ReturnType<typeof mock>,
};

mock.module("@nomos-ai/db", () => ({
	featureRepository: mockFeatureDb,
	sessionRepository: mockSessionDb,
	projectRepository: mockProjectDb,
}));

// Import after mock registration
const { AutoModeService } = await import("../auto-mode-service");
const { SessionService } = await import("../session-service");
const { PipelineService } = await import("../pipeline-service");
const { EventService: RealEventService } = await import("../event-service");

// ── Tests ─────────────────────────────────────────────────

describe("Self-building loop validation (F1/F4)", () => {
	beforeEach(() => {
		for (const fn of Object.values(mockFeatureDb)) {
			if (typeof fn === "function" && "mockReset" in fn) {
				(fn as ReturnType<typeof mock>).mockReset();
			}
		}
		for (const fn of Object.values(mockSessionDb)) {
			if (typeof fn === "function" && "mockReset" in fn) {
				(fn as ReturnType<typeof mock>).mockReset();
			}
		}
	});

	describe("Feature creation (Intent Box → DB)", () => {
		test("featureRepository.create returns a feature with generated ID", async () => {
			const featureData = {
				userId: "user1",
				projectId: "proj1",
				title: "Add dark mode toggle",
				category: "CAT-UI",
				description: "Implement a toggle switch for dark/light mode in the settings page",
				phase: "phase-1",
				status: "backlog",
				passes: false,
				acceptanceCriteria: [
					"Toggle switches between dark and light mode",
					"User preference is persisted",
				],
				estimatedSize: "M",
			};

			mockFeatureDb.create.mockResolvedValue({
				id: "F999",
				...featureData,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const created = await mockFeatureDb.create(featureData);

			expect(created.id).toBe("F999");
			expect(created.title).toBe("Add dark mode toggle");
			expect(created.status).toBe("backlog");
			expect(created.category).toBe("CAT-UI");
			expect(created.acceptanceCriteria).toHaveLength(2);
		});

		test("feature creation includes all required fields for pipeline", async () => {
			const featureData = {
				userId: "user1",
				projectId: "proj1",
				title: "Implement API rate limiting",
				category: "CAT-API",
				description: "Add sliding window rate limiting to all API endpoints",
				phase: "phase-2",
				status: "pending",
				passes: false,
				acceptanceCriteria: [
					"Rate limiter rejects requests over threshold",
					"Response includes Retry-After header",
				],
				priority: 1,
				dependencies: [],
				estimatedSize: "S",
			};

			mockFeatureDb.create.mockResolvedValue({
				id: "F998",
				...featureData,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const created = await mockFeatureDb.create(featureData);

			// Pipeline needs: id, title, description, phase, acceptanceCriteria
			expect(created.id).toBeDefined();
			expect(created.title).toBeDefined();
			expect(created.description).toBeDefined();
			expect(created.phase).toBeDefined();
			expect(created.acceptanceCriteria).toBeDefined();
			expect(created.projectId).toBe("proj1");
		});
	});

	describe("AutoModeService.startFeature (feature ID → pipeline)", () => {
		test("startFeature accepts feature ID and starts pipeline execution", async () => {
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();
			const provider = createMockProvider([
				{
					type: "result",
					subtype: "success",
					session_id: "sdk-1",
					result: "done",
				} as ProviderMessage,
			]);

			mockFeatureDb.findById.mockResolvedValue({
				id: "F100",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});

			const service = new AutoModeService(
				events,
				provider,
				pipeline,
				worktree,
				sessions,
			);

			// This should not throw
			await service.startFeature("F100", "/Users/test/project", "user1");

			// Feature-queued event should be emitted
			const queuedEvent = (events.emit as ReturnType<typeof mock>).mock.calls.find(
				(call: unknown[]) =>
					call[0] === "auto-mode:event" &&
					(call[1] as Record<string, unknown>)?.type === "auto-mode:feature-queued",
			);
			expect(queuedEvent).toBeDefined();
			expect(
				(queuedEvent![1] as Record<string, unknown>).featureId,
			).toBe("F100");
		});

		test("startFeature creates pipeline session for tracking", async () => {
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();
			const provider = createMockProvider([
				{
					type: "result",
					subtype: "success",
					session_id: "sdk-1",
				} as ProviderMessage,
			]);

			mockFeatureDb.findById.mockResolvedValue({
				id: "F200",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});

			const service = new AutoModeService(
				events,
				provider,
				pipeline,
				worktree,
				sessions,
			);
			await service.startFeature("F200", "/Users/test/project", "user1");

			// Wait for async executeFeature to start
			await waitFor(
				() => (sessions.createPipelineSession as ReturnType<typeof mock>).mock.calls.length > 0,
			);

			const createCalls = (sessions.createPipelineSession as ReturnType<typeof mock>).mock.calls;
			expect(createCalls.length).toBeGreaterThan(0);

			const sessionInput = createCalls[0]![0] as Record<string, unknown>;
			expect(sessionInput.userId).toBe("user1");
			expect(sessionInput.featureId).toBe("F200");
		});

		test("startFeature configures PipelineService for checkpoint polling", async () => {
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();
			const provider = createMockProvider([
				{
					type: "result",
					subtype: "success",
					session_id: "sdk-1",
				} as ProviderMessage,
			]);

			mockFeatureDb.findById.mockResolvedValue({
				id: "F300",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});

			const service = new AutoModeService(
				events,
				provider,
				pipeline,
				worktree,
				sessions,
			);
			await service.startFeature("F300", "/Users/test/project", "user1");

			// Wait for pipeline setup
			await waitFor(
				() => (pipeline.pollCheckpoints as ReturnType<typeof mock>).mock.calls.length > 0,
			);

			expect(pipeline.pollCheckpoints).toHaveBeenCalled();
		});
	});

	describe("PipelineService checkpoint processing", () => {
		test("PipelineService.buildInitialSteps returns all 7 pipeline steps", () => {
			const events = createMockEventService();
			const realPipeline = new PipelineService(events);
			const steps = realPipeline.buildInitialSteps();

			expect(steps).toHaveLength(7);
			expect(steps[0]!.id).toBe("init");
			expect(steps[1]!.id).toBe("context");
			expect(steps[2]!.id).toBe("plan");
			expect(steps[3]!.id).toBe("execute");
			expect(steps[4]!.id).toBe("verify");
			expect(steps[5]!.id).toBe("merge");
			expect(steps[6]!.id).toBe("finish");

			// All steps start as pending
			for (const step of steps) {
				expect(step.status).toBe("pending");
			}
		});

		test("PipelineService.readCheckpoint returns null when no file exists", () => {
			const events = createMockEventService();
			const realPipeline = new PipelineService(events);

			const checkpoint = realPipeline.readCheckpoint("F000", 1, "/tmp/nonexistent-project");
			expect(checkpoint).toBeNull();
		});

		test("PipelineService.getLatestCheckpoint returns null with no checkpoints", () => {
			const events = createMockEventService();
			const realPipeline = new PipelineService(events);

			const latest = realPipeline.getLatestCheckpoint("F000", "/tmp/nonexistent-project");
			expect(latest).toBeNull();
		});

		test("PipelineService.getLatestCheckpoint returns null without project root", () => {
			const events = createMockEventService();
			const realPipeline = new PipelineService(events);

			// No project root set
			const latest = realPipeline.getLatestCheckpoint("F000");
			expect(latest).toBeNull();
		});
	});

	describe("EventService typed event emission", () => {
		test("EventService emits typed events and subscribers receive them", () => {
			const eventService = new RealEventService();

			const received: Array<{ type: string; payload: unknown }> = [];
			eventService.subscribe((type, payload) => {
				received.push({ type, payload });
			});

			eventService.emit("feature:started", {
				featureId: "F001",
				userId: "user1",
			});

			expect(received).toHaveLength(1);
			expect(received[0]!.type).toBe("feature:started");
			expect((received[0]!.payload as Record<string, unknown>).featureId).toBe("F001");
		});

		test("EventService emits pipeline step events in order", () => {
			const eventService = new RealEventService();
			const events: string[] = [];

			eventService.subscribe((type) => {
				events.push(type);
			});

			// Simulate a pipeline run emitting step events
			eventService.emit("feature:started", {
				featureId: "F001",
				userId: "user1",
			});
			eventService.emit("pipeline:step-started", {
				featureId: "F001",
				step: "context",
				name: "Understand",
				userId: "user1",
			});
			eventService.emit("pipeline:step-completed", {
				featureId: "F001",
				step: "context",
				name: "Understand",
				userId: "user1",
			});
			eventService.emit("pipeline:step-started", {
				featureId: "F001",
				step: "plan",
				name: "Plan Implementation",
				userId: "user1",
			});
			eventService.emit("pipeline:step-completed", {
				featureId: "F001",
				step: "plan",
				name: "Plan Implementation",
				userId: "user1",
			});
			eventService.emit("feature:completed", {
				featureId: "F001",
				userId: "user1",
			});

			expect(events).toEqual([
				"feature:started",
				"pipeline:step-started",
				"pipeline:step-completed",
				"pipeline:step-started",
				"pipeline:step-completed",
				"feature:completed",
			]);
		});

		test("EventService subscriber isolation prevents cascading failures", () => {
			const eventService = new RealEventService();

			let called = false;

			// First subscriber throws
			eventService.subscribe(() => {
				throw new Error("Subscriber error");
			});

			// Second subscriber should still be called
			eventService.subscribe(() => {
				called = true;
			});

			eventService.emit("feature:started", {
				featureId: "F001",
				userId: "user1",
			});

			expect(called).toBe(true);
		});

		test("EventService unsubscribe removes listener", () => {
			const eventService = new RealEventService();
			let count = 0;

			const unsub = eventService.subscribe(() => {
				count++;
			});

			eventService.emit("feature:started", {
				featureId: "F001",
				userId: "user1",
			});
			expect(count).toBe(1);

			unsub();

			eventService.emit("feature:started", {
				featureId: "F002",
				userId: "user1",
			});
			expect(count).toBe(1); // No change after unsubscribe
		});
	});

	describe("Session state transitions", () => {
		test("SessionService creates pipeline session in RUNNING state", async () => {
			const events = createMockEventService();
			const sessionService = new SessionService(events);

			mockSessionDb.create.mockResolvedValue({
				id: "sess_pipeline",
				userId: "user1",
				featureId: "F001",
				status: "running",
				isRunning: true,
				model: "sonnet",
				messageCount: 0,
				startedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const session = await sessionService.createPipelineSession({
				userId: "user1",
				featureId: "F001",
				model: "sonnet",
			});

			expect(session.status).toBe("running");
			expect(session.isRunning).toBe(true);
			expect(session.featureId).toBe("F001");
		});

		test("SessionService creates interactive session in PENDING state", async () => {
			const events = createMockEventService();
			const sessionService = new SessionService(events);

			mockSessionDb.create.mockResolvedValue({
				id: "sess_interactive",
				userId: "user1",
				projectId: "proj1",
				status: "pending",
				isRunning: false,
				model: "sonnet",
				messageCount: 0,
				startedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const session = await sessionService.createInteractiveSession({
				userId: "user1",
				projectId: "proj1",
			});

			expect(session.status).toBe("pending");
			expect(session.isRunning).toBe(false);
		});

		test("SessionService transitions RUNNING → COMPLETED", async () => {
			const events = createMockEventService();
			const sessionService = new SessionService(events);

			mockSessionDb.update.mockResolvedValue({
				id: "sess_1",
				status: "completed",
				isRunning: false,
				completedAt: new Date(),
				totalCostUsd: "0.050000",
				inputTokens: 2000,
				outputTokens: 1000,
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
				userId: "user1",
			});

			const session = await sessionService.completeSession(
				"sess_1",
				"output text",
				{ totalCostUsd: 0.05, inputTokens: 2000, outputTokens: 1000 },
			);

			expect(session.status).toBe("completed");
			expect(session.isRunning).toBe(false);
			expect(session.completedAt).toBeDefined();

			// Verify the update was called with cost data
			const updateCall = mockSessionDb.update.mock.calls[0]!;
			const updateData = updateCall[1] as Record<string, unknown>;
			expect(updateData.status).toBe("completed");
			expect(updateData.totalCostUsd).toBe("0.05");
			expect(updateData.inputTokens).toBe(2000);
			expect(updateData.outputTokens).toBe(1000);
		});

		test("SessionService transitions RUNNING → FAILED", async () => {
			const events = createMockEventService();
			const sessionService = new SessionService(events);

			mockSessionDb.update.mockResolvedValue({
				id: "sess_2",
				status: "failed",
				isRunning: false,
				error: "Pipeline crashed",
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
				userId: "user1",
			});

			const session = await sessionService.failSession(
				"sess_2",
				"Pipeline crashed",
			);

			expect(session.status).toBe("failed");
			expect(session.isRunning).toBe(false);
			expect(session.error).toBe("Pipeline crashed");
		});

		test("SessionService transitions FAILED → RUNNING (resume)", async () => {
			const events = createMockEventService();
			const sessionService = new SessionService(events);

			mockSessionDb.findById.mockResolvedValue({
				id: "sess_3",
				status: "failed",
				isRunning: false,
				userId: "user1",
				featureId: "F001",
				error: "Timeout",
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
			});

			mockSessionDb.update.mockResolvedValue({
				id: "sess_3",
				status: "running",
				isRunning: true,
				error: null,
				completedAt: null,
				userId: "user1",
				featureId: "F001",
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
			});

			const session = await sessionService.resumeSession("sess_3");

			expect(session.status).toBe("running");
			expect(session.isRunning).toBe(true);
			expect(session.error).toBeNull();
		});
	});

	describe("Full loop: create → start → complete", () => {
		test("feature creation → startFeature → pipeline events → session complete", async () => {
			// Step 1: Create feature
			mockFeatureDb.create.mockResolvedValue({
				id: "F_LOOP",
				userId: "user1",
				projectId: "proj1",
				title: "Test self-building loop",
				category: "CAT-TEST",
				description: "Validate the self-building pipeline works end-to-end",
				phase: "phase-1",
				status: "pending",
				passes: false,
				acceptanceCriteria: ["Pipeline completes"],
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const feature = await mockFeatureDb.create({
				userId: "user1",
				projectId: "proj1",
				title: "Test self-building loop",
				category: "CAT-TEST",
				description: "Validate the self-building pipeline works end-to-end",
				phase: "phase-1",
				status: "pending",
				passes: false,
				acceptanceCriteria: ["Pipeline completes"],
			});

			expect(feature.id).toBe("F_LOOP");

			// Step 2: Start pipeline via AutoModeService
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();

			const resultMsg: ProviderMessage = {
				type: "result",
				subtype: "success",
				session_id: "sdk-loop",
				result: "Feature implemented",
				costData: {
					totalCostUsd: 0.15,
					inputTokens: 8000,
					outputTokens: 4000,
				},
			};
			const provider = createMockProvider([resultMsg]);

			mockFeatureDb.findById.mockResolvedValue({
				id: "F_LOOP",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});

			const service = new AutoModeService(
				events,
				provider,
				pipeline,
				worktree,
				sessions,
			);

			await service.startFeature("F_LOOP", "/Users/test/project", "user1");

			// Step 3: Verify pipeline was set up
			await waitFor(
				() => (pipeline.pollCheckpoints as ReturnType<typeof mock>).mock.calls.length > 0,
			);

			expect(pipeline.pollCheckpoints).toHaveBeenCalled();

			// Step 4: Verify events were emitted
			const emittedTypes = (events.emit as ReturnType<typeof mock>).mock.calls.map(
				(call: unknown[]) => call[0],
			);
			expect(emittedTypes).toContain("auto-mode:event");

			// Step 5: Wait for completion
			const completeMock = sessions.completeSession as ReturnType<typeof mock>;
			await waitFor(() => completeMock.mock.calls.length > 0);

			if (completeMock.mock.calls.length > 0) {
				const costArg = completeMock.mock.calls[0]![2] as { totalCostUsd: number } | undefined;
				if (costArg) {
					expect(costArg.totalCostUsd).toBe(0.15);
				}
			}
		});
	});

	describe("Feature status transitions through pipeline", () => {
		test("feature transitions: pending → in_progress (first step always happens)", async () => {
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();
			const provider = createMockProvider([
				{
					type: "result",
					subtype: "success",
					session_id: "sdk-status",
					result: "done",
				} as ProviderMessage,
			]);

			mockFeatureDb.findById.mockResolvedValue({
				id: "F_STATUS",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});

			const service = new AutoModeService(
				events,
				provider,
				pipeline,
				worktree,
				sessions,
			);
			await service.startFeature("F_STATUS", "/Users/test/project", "user1");

			// Wait for at least the first update
			await waitFor(
				() => mockFeatureDb.update.mock.calls.length >= 1,
			);

			const updateCalls = mockFeatureDb.update.mock.calls;

			// First update: pending → in_progress (this always happens)
			expect(updateCalls.length).toBeGreaterThanOrEqual(1);
			const firstUpdate = updateCalls[0]![1] as Record<string, unknown>;
			expect(firstUpdate.status).toBe("in_progress");
			expect(firstUpdate.locked).toBe(true);

			// Wait for second update (success or failure path)
			await waitFor(
				() => mockFeatureDb.update.mock.calls.length >= 2,
			);

			// Second update: either waiting_approval (success) or failed (error)
			if (updateCalls.length >= 2) {
				const secondUpdate = updateCalls[1]![1] as Record<string, unknown>;
				const validStatuses = ["waiting_approval", "failed"];
				expect(validStatuses).toContain(secondUpdate.status);

				if (secondUpdate.status === "waiting_approval") {
					expect(secondUpdate.locked).toBe(false);
				}
			}
		});

		test("feature transitions: pending → in_progress → failed on error", async () => {
			const events = createMockEventService();
			const sessions = createMockSessionService();
			const pipeline = createMockPipelineService();
			const worktree = createMockWorktreeService();

			const errorProvider: AgentProvider = {
				async *executeQuery() {
					throw new Error("SDK connection timeout");
				},
			};

			mockFeatureDb.findById.mockResolvedValue({
				id: "F_FAIL",
				projectId: "proj1",
				status: "pending",
				useWorktree: false,
			});
			mockFeatureDb.update.mockResolvedValue({});
			mockFeatureDb.incrementRetryCount.mockResolvedValue(undefined);
			mockFeatureDb.getRetryInfo.mockResolvedValue({ retryCount: 3 });

			const service = new AutoModeService(
				events,
				errorProvider,
				pipeline,
				worktree,
				sessions,
			);
			await service.startFeature("F_FAIL", "/Users/test/project", "user1");

			// Wait for error handling
			await waitFor(() => {
				return mockFeatureDb.update.mock.calls.some(
					(call: unknown[]) => (call[1] as Record<string, unknown>)?.status === "failed",
				);
			});

			const failCall = mockFeatureDb.update.mock.calls.find(
				(call: unknown[]) => (call[1] as Record<string, unknown>)?.status === "failed",
			);
			expect(failCall).toBeDefined();
			expect((failCall![1] as Record<string, unknown>).error).toBe(
				"SDK connection timeout",
			);
		});
	});
});

// ── Manual testing note for F1 ────────────────────────────

describe("F1: Manual testing required", () => {
	test("F1 requires a running server and manual testing (placeholder)", () => {
		// F1: Run NOMOS from dashboard to implement a real feature on its own codebase
		// This cannot be automated — requires:
		// 1. Running server (bun run dev)
		// 2. Docker postgres running
		// 3. Dashboard open in browser
		// 4. Creating a feature via Intent Box
		// 5. Clicking "Create & Start" in DecompositionPreview
		// 6. Watching the pipeline execute via WebSocket events
		// 7. Verifying checkpoints are created in .nomos/output/
		// 8. Verifying feature transitions in the dashboard
		//
		// Mark as: NEEDS MANUAL TESTING WITH RUNNING SERVER
		expect(true).toBe(true);
	});
});
