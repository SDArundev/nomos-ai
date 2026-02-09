import { beforeEach, describe, expect, mock, test } from "bun:test";

// Mock dependencies BEFORE importing the module under test
const mockSessionRepository = {
	create: mock(() => Promise.resolve(null)),
	update: mock(() => Promise.resolve(null)),
	findActive: mock(() => Promise.resolve([])),
};

mock.module("@nomos-ai/db", () => ({
	sessionRepository: mockSessionRepository,
	featureRepository: {},
	eventRepository: {},
	learningRepository: {},
	messageRepository: {},
	notificationRepository: {},
	projectRepository: {},
	settingRepository: {},
	worktreeRepository: {},
}));

// Import after mocks
const { SessionService } = await import("./session-service");
const { SESSION_STATUS } = await import("@nomos-ai/types");

describe("SessionService", () => {
	let events: { emit: ReturnType<typeof mock> };
	let service: InstanceType<typeof SessionService>;

	beforeEach(() => {
		mockSessionRepository.create.mockReset();
		mockSessionRepository.update.mockReset();
		mockSessionRepository.findActive.mockReset();

		events = { emit: mock(() => {}) };
		service = new SessionService(events as any);
	});

	describe("createPipelineSession", () => {
		test("creates session with RUNNING status", async () => {
			const mockSession = {
				id: "sess_001",
				userId: "user_001",
				featureId: "F001",
				status: SESSION_STATUS.RUNNING,
			};
			mockSessionRepository.create.mockResolvedValue(mockSession);

			const result = await service.createPipelineSession({
				userId: "user_001",
				featureId: "F001",
			});

			expect(result).toEqual(mockSession);
			expect(mockSessionRepository.create).toHaveBeenCalledTimes(1);

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].status).toBe(SESSION_STATUS.RUNNING);
			expect(createArgs[0].isRunning).toBe(true);
			expect(createArgs[0].messageCount).toBe(0);
		});

		test("uses default model 'sonnet' when none specified", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_002" });

			await service.createPipelineSession({
				userId: "user_001",
				featureId: "F001",
			});

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].model).toBe("sonnet");
		});

		test("uses provided model when specified", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_003" });

			await service.createPipelineSession({
				userId: "user_001",
				featureId: "F001",
				model: "opus",
			});

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].model).toBe("opus");
		});

		test("emits agent:stream event on creation", async () => {
			mockSessionRepository.create.mockResolvedValue({
				id: "sess_004",
				userId: "user_001",
			});

			await service.createPipelineSession({
				userId: "user_001",
				featureId: "F001",
			});

			expect(events.emit).toHaveBeenCalledTimes(1);
			const emitArgs = events.emit.mock.calls[0] as any[];
			expect(emitArgs[0]).toBe("agent:stream");
			expect(emitArgs[1].type).toBe("session:created");
			expect(emitArgs[1].sessionId).toBe("sess_004");
		});
	});

	describe("createInteractiveSession", () => {
		test("creates session with PENDING status", async () => {
			const mockSession = {
				id: "sess_010",
				status: SESSION_STATUS.PENDING,
			};
			mockSessionRepository.create.mockResolvedValue(mockSession);

			const result = await service.createInteractiveSession({
				userId: "user_001",
				projectId: "proj_001",
			});

			expect(result).toEqual(mockSession);
			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].status).toBe(SESSION_STATUS.PENDING);
			expect(createArgs[0].isRunning).toBe(false);
		});

		test("passes featureId when provided", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_011" });

			await service.createInteractiveSession({
				userId: "user_001",
				projectId: "proj_001",
				featureId: "F001",
			});

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].featureId).toBe("F001");
		});

		test("sets featureId to null when not provided", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_012" });

			await service.createInteractiveSession({
				userId: "user_001",
				projectId: "proj_001",
			});

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].featureId).toBeNull();
		});

		test("passes workingDirectory when provided", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_013" });

			await service.createInteractiveSession({
				userId: "user_001",
				projectId: "proj_001",
				workingDirectory: "/tmp/work",
			});

			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].workingDirectory).toBe("/tmp/work");
		});

		test("does not emit events", async () => {
			mockSessionRepository.create.mockResolvedValue({ id: "sess_014" });

			await service.createInteractiveSession({
				userId: "user_001",
				projectId: "proj_001",
			});

			expect(events.emit).not.toHaveBeenCalled();
		});
	});

	describe("createAgentSession", () => {
		test("creates session with PENDING status", async () => {
			const mockSession = {
				id: "sess_020",
				status: SESSION_STATUS.PENDING,
			};
			mockSessionRepository.create.mockResolvedValue(mockSession);

			const result = await service.createAgentSession({
				userId: "user_001",
				featureId: "F001",
			});

			expect(result).toEqual(mockSession);
			const createArgs = mockSessionRepository.create.mock.calls[0] as any[];
			expect(createArgs[0].status).toBe(SESSION_STATUS.PENDING);
			expect(createArgs[0].userId).toBe("user_001");
			expect(createArgs[0].featureId).toBe("F001");
		});
	});

	describe("completeSession", () => {
		test("updates session to COMPLETED", async () => {
			const updated = {
				id: "sess_030",
				status: SESSION_STATUS.COMPLETED,
			};
			mockSessionRepository.update.mockResolvedValue(updated);

			const result = await service.completeSession("sess_030");

			expect(result).toEqual(updated);
			const updateArgs = mockSessionRepository.update.mock.calls[0] as any[];
			expect(updateArgs[0]).toBe("sess_030");
			expect(updateArgs[1].status).toBe(SESSION_STATUS.COMPLETED);
			expect(updateArgs[1].isRunning).toBe(false);
			expect(updateArgs[1].completedAt).toBeInstanceOf(Date);
		});

		test("includes output when provided", async () => {
			mockSessionRepository.update.mockResolvedValue({ id: "sess_031" });

			await service.completeSession("sess_031", "Feature done");

			const updateArgs = mockSessionRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].output).toBe("Feature done");
		});

		test("includes cost data when provided", async () => {
			mockSessionRepository.update.mockResolvedValue({ id: "sess_032" });

			await service.completeSession("sess_032", undefined, {
				totalCostUsd: 0.15,
				inputTokens: 5000,
				outputTokens: 2000,
			});

			const updateArgs = mockSessionRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].totalCostUsd).toBe("0.15");
			expect(updateArgs[1].inputTokens).toBe(5000);
			expect(updateArgs[1].outputTokens).toBe(2000);
		});

		test("does not include cost fields when not provided", async () => {
			mockSessionRepository.update.mockResolvedValue({ id: "sess_033" });

			await service.completeSession("sess_033");

			const updateArgs = mockSessionRepository.update.mock.calls[0] as any[];
			expect(updateArgs[1].totalCostUsd).toBeUndefined();
			expect(updateArgs[1].inputTokens).toBeUndefined();
		});
	});

	describe("failSession", () => {
		test("updates session to FAILED with error", async () => {
			const updated = {
				id: "sess_040",
				status: SESSION_STATUS.FAILED,
				error: "Build failed",
			};
			mockSessionRepository.update.mockResolvedValue(updated);

			const result = await service.failSession("sess_040", "Build failed");

			expect(result).toEqual(updated);
			const updateArgs = mockSessionRepository.update.mock.calls[0] as any[];
			expect(updateArgs[0]).toBe("sess_040");
			expect(updateArgs[1].status).toBe(SESSION_STATUS.FAILED);
			expect(updateArgs[1].isRunning).toBe(false);
			expect(updateArgs[1].error).toBe("Build failed");
		});
	});

	describe("getActiveSessionsCount", () => {
		test("returns 0 when no active sessions", async () => {
			mockSessionRepository.findActive.mockResolvedValue([]);
			const count = await service.getActiveSessionsCount();
			expect(count).toBe(0);
		});

		test("returns count of active sessions", async () => {
			mockSessionRepository.findActive.mockResolvedValue([
				{ id: "s1", status: "pending" },
				{ id: "s2", status: "running" },
				{ id: "s3", status: "running" },
			]);

			const count = await service.getActiveSessionsCount();
			expect(count).toBe(3);
		});
	});
});
