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
		.handler(async ({ input }) => {
			const service = getTerminalService();
			const id = service.createSession(input.cwd);
			return { id };
		}),

	list: protectedProcedure.handler(async () => {
		const service = getTerminalService();
		return service.listSessions();
	}),

	write: protectedProcedure
		.input(z.object({ sessionId: z.string(), data: z.string() }))
		.handler(async ({ input }) => {
			const service = getTerminalService();
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
		.handler(async ({ input }) => {
			const service = getTerminalService();
			service.resize(input.sessionId, input.cols, input.rows);
			return { success: true };
		}),

	kill: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input }) => {
			const service = getTerminalService();
			service.kill(input.sessionId);
			return { success: true };
		}),

	scrollback: protectedProcedure
		.input(z.object({ sessionId: z.string() }))
		.handler(async ({ input }) => {
			const service = getTerminalService();
			return service.getScrollback(input.sessionId);
		}),
};
