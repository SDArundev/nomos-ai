import { sessionRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { AgentService } from "../services/agent-service";
import { ClaudeProvider } from "../services/claude-provider";
import { EventService } from "../services/event-service";
import { SessionService } from "../services/session-service";

// Singleton instances shared across routers
let eventServiceInstance: EventService | null = null;
let sessionServiceInstance: SessionService | null = null;
let agentServiceInstance: AgentService | null = null;

export function getEventService(): EventService {
	if (!eventServiceInstance) {
		eventServiceInstance = new EventService();
	}
	return eventServiceInstance;
}

export function getSessionService(): SessionService {
	if (!sessionServiceInstance) {
		sessionServiceInstance = new SessionService(getEventService());
	}
	return sessionServiceInstance;
}

export function getAgentService(): AgentService {
	if (!agentServiceInstance) {
		const provider = ClaudeProvider.create();
		agentServiceInstance = new AgentService(
			getEventService(),
			provider,
			getSessionService(),
		);
	}
	return agentServiceInstance;
}

async function verifySessionOwnership(sessionId: string, userId: string) {
	const session = await sessionRepository.findById(sessionId);
	if (!session || session.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return session;
}

export const agentRouter = {
	createSession: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				projectId: z.string(),
				featureId: z.string().optional(),
				workingDirectory: z.string().optional(),
				model: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const service = getAgentService();
			return service.createSession({
				...input,
				userId: context.session.user.id,
			});
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				sessionId: z.string(),
				content: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.sessionId, context.session.user.id);
			const service = getAgentService();
			// Start in background (non-blocking) — events stream via WebSocket
			service.sendMessage(input.sessionId, input.content).catch(() => {
				// Errors handled via agent:error events
			});
			return { success: true };
		}),

	stop: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			// Authorization: verify session ownership
			const session = await sessionRepository.findById(input.sessionId);
			if (!session) {
				throw new ORPCError("NOT_FOUND", {
					message: `Session not found: ${input.sessionId}`,
				});
			}
			if (session.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have permission to stop this session",
				});
			}

			const service = getAgentService();
			await service.stop(input.sessionId);
			return { success: true };
		}),

	listSessions: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const service = getAgentService();
		const sessions = await service.listSessions();
		return sessions.filter((s) => s.userId === userId);
	}),

	getHistory: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.sessionId, context.session.user.id);
			const service = getAgentService();
			return service.getHistory(input.sessionId);
		}),

	clearHistory: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.sessionId, context.session.user.id);
			const service = getAgentService();
			await service.clearHistory(input.sessionId);
			return { success: true };
		}),
};
