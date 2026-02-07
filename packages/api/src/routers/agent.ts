import { z } from "zod";
import { protectedProcedure } from "../index";
import { AgentService } from "../services/agent-service";
import { ClaudeProvider } from "../services/claude-provider";
import { EventService } from "../services/event-service";

// Singleton instances shared across routers
let eventServiceInstance: EventService | null = null;
let agentServiceInstance: AgentService | null = null;

export function getEventService(): EventService {
	if (!eventServiceInstance) {
		eventServiceInstance = new EventService();
	}
	return eventServiceInstance;
}

export function getAgentService(): AgentService {
	if (!agentServiceInstance) {
		const provider = ClaudeProvider.create();
		agentServiceInstance = new AgentService(getEventService(), provider);
	}
	return agentServiceInstance;
}

export const agentRouter = {
	createSession: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				projectId: z.string(),
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
		.handler(async ({ input }) => {
			const service = getAgentService();
			// Start in background (non-blocking) — events stream via WebSocket
			service.sendMessage(input.sessionId, input.content).catch(() => {
				// Errors handled via agent:error events
			});
			return { success: true };
		}),

	stop: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input }) => {
			const service = getAgentService();
			await service.stop(input.sessionId);
			return { success: true };
		}),

	listSessions: protectedProcedure.handler(async () => {
		const service = getAgentService();
		return service.listSessions();
	}),

	getHistory: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input }) => {
			const service = getAgentService();
			return service.getHistory(input.sessionId);
		}),

	clearHistory: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input }) => {
			const service = getAgentService();
			await service.clearHistory(input.sessionId);
			return { success: true };
		}),
};
