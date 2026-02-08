import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { TerminalService } from "../services/terminal-service";
import { getEventService } from "./agent";

let terminalServiceInstance: TerminalService | null = null;

export function getTerminalService(): TerminalService {
	if (!terminalServiceInstance) {
		terminalServiceInstance = new TerminalService(getEventService());
	}
	return terminalServiceInstance;
}

function verifyTerminalSessionOwnership(service: TerminalService, sessionId: string, userId: string): void {
	const sessionUserId = service.getSessionUserId(sessionId);
	if (!sessionUserId) {
		throw new ORPCError("NOT_FOUND", { message: "Terminal session not found" });
	}
	if (sessionUserId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
}

export const terminalRouter = {
	create: protectedProcedure
		.input(z.object({ cwd: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			const id = service.createSession(input.cwd, context.session.user.id);
			return { id };
		}),

	list: protectedProcedure.handler(async ({ context }) => {
		const service = getTerminalService();
		return service.listSessions(context.session.user.id);
	}),

	write: protectedProcedure
		.input(z.object({ sessionId: z.string(), data: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			verifyTerminalSessionOwnership(service, input.sessionId, context.session.user.id);
			service.write(input.sessionId, input.data);
			return { success: true };
		}),

	resize: protectedProcedure
		.input(
			z.object({
				sessionId: z.string(),
				cols: z.number().int().min(1),
				rows: z.number().int().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			verifyTerminalSessionOwnership(service, input.sessionId, context.session.user.id);
			service.resize(input.sessionId, input.cols, input.rows);
			return { success: true };
		}),

	kill: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			verifyTerminalSessionOwnership(service, input.sessionId, context.session.user.id);
			service.kill(input.sessionId);
			return { success: true };
		}),

	scrollback: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			verifyTerminalSessionOwnership(service, input.sessionId, context.session.user.id);
			return service.getScrollback(input.sessionId);
		}),
};
