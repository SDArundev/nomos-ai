import { z } from "zod";
import { protectedProcedure } from "../index";
import { FSService } from "../services/fs-service";

let fsServiceInstance: FSService | null = null;

export function getFSService(root?: string): FSService {
	if (!fsServiceInstance) {
		fsServiceInstance = new FSService(root ?? process.cwd());
	}
	return fsServiceInstance;
}

export const fsRouter = {
	readFile: protectedProcedure
		.input(z.object({ path: z.string() }))
		.handler(async ({ input }) => {
			const service = getFSService();
			const content = await service.readFile(input.path);
			return { content };
		}),

	writeFile: protectedProcedure
		.input(z.object({ path: z.string(), content: z.string() }))
		.handler(async ({ input }) => {
			const service = getFSService();
			await service.writeFile(input.path, input.content);
			return { success: true };
		}),

	listDir: protectedProcedure
		.input(z.object({ path: z.string() }))
		.handler(async ({ input }) => {
			const service = getFSService();
			return service.listDir(input.path);
		}),
};
