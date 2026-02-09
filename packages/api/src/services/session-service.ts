import { sessionRepository } from "@nomos-ai/db";
import { SESSION_STATUS } from "@nomos-ai/types";
import type { EventService } from "./event-service";

type SessionRecord = Awaited<ReturnType<typeof sessionRepository.create>>;

interface CreatePipelineSessionInput {
	userId: string;
	featureId: string;
	model?: string;
}

interface CreateInteractiveSessionInput {
	userId: string;
	projectId: string;
	featureId?: string | null;
	model?: string;
	workingDirectory?: string | null;
}

interface CreateAgentSessionInput {
	userId: string;
	featureId: string;
}

interface CostData {
	totalCostUsd: number;
	inputTokens: number;
	outputTokens: number;
}

export class SessionService {
	constructor(private events: EventService) {}

	/** Create a session for an AutoMode pipeline run (starts immediately as RUNNING) */
	async createPipelineSession(
		input: CreatePipelineSessionInput,
	): Promise<SessionRecord> {
		const session = await sessionRepository.create({
			userId: input.userId,
			featureId: input.featureId,
			status: SESSION_STATUS.RUNNING,
			startedAt: new Date(),
			model: input.model ?? "sonnet",
			isRunning: true,
			messageCount: 0,
		});

		this.events.emit("agent:stream", {
			type: "session:created",
			sessionId: session.id,
			userId: input.userId,
			featureId: input.featureId,
		});

		return session;
	}

	/** Create a session for an interactive web conversation (starts as PENDING) */
	async createInteractiveSession(
		input: CreateInteractiveSessionInput,
	): Promise<SessionRecord> {
		const session = await sessionRepository.create({
			userId: input.userId,
			projectId: input.projectId,
			featureId: input.featureId ?? null,
			status: SESSION_STATUS.PENDING,
			startedAt: new Date(),
			model: input.model ?? "sonnet",
			workingDirectory: input.workingDirectory ?? null,
			isRunning: false,
			messageCount: 0,
		});

		return session;
	}

	/** Create a session for a feature-aware agent (starts as PENDING) */
	async createAgentSession(
		input: CreateAgentSessionInput,
	): Promise<SessionRecord> {
		const session = await sessionRepository.create({
			userId: input.userId,
			featureId: input.featureId,
			status: SESSION_STATUS.PENDING,
			startedAt: new Date(),
		});

		return session;
	}

	/** Mark a session as completed with optional cost data */
	async completeSession(
		sessionId: string,
		output?: string,
		costData?: CostData,
	): Promise<SessionRecord> {
		return sessionRepository.update(sessionId, {
			status: SESSION_STATUS.COMPLETED,
			isRunning: false,
			completedAt: new Date(),
			...(output && { output }),
			...(costData && {
				totalCostUsd: String(costData.totalCostUsd),
				inputTokens: costData.inputTokens,
				outputTokens: costData.outputTokens,
			}),
		});
	}

	/** Mark a session as failed */
	async failSession(sessionId: string, error: string): Promise<SessionRecord> {
		return sessionRepository.update(sessionId, {
			status: SESSION_STATUS.FAILED,
			isRunning: false,
			error,
		});
	}

	/** Get the count of active (pending/running) sessions */
	async getActiveSessionsCount(): Promise<number> {
		const active = await sessionRepository.findActive();
		return active.length;
	}
}
