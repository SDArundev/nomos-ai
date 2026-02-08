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

export const terminalRouter = {
	create: protectedProcedure
		.input(z.object({ cwd: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			const userId = context.session.user.id;
			const id = service.createSession(input.cwd, userId);
			return { id };
		}),

	list: protectedProcedure.handler(async ({ context }) => {
		const service = getTerminalService();
		const allSessions = service.listSessions();
		// Filter to only return sessions owned by the current user
		return allSessions.filter(
			(session) => session.userId === context.session.user.id,
		);
	}),

	write: protectedProcedure
		.input(z.object({ sessionId: z.string(), data: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			const session = service.getSession(input.sessionId);

			if (session.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have permission to write to this terminal session",
				});
			}

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
			const session = service.getSession(input.sessionId);

			if (session.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have permission to resize this terminal session",
				});
			}

			service.resize(input.sessionId, input.cols, input.rows);
			return { success: true };
		}),

	kill: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			const session = service.getSession(input.sessionId);

			if (session.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have permission to kill this terminal session",
				});
			}

			service.kill(input.sessionId);
			return { success: true };
		}),

	scrollback: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input, context }) => {
			const service = getTerminalService();
			const session = service.getSession(input.sessionId);

			if (session.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "You do not have permission to access this terminal session",
				});
			}

			return service.getScrollback(input.sessionId);
		}),
};
