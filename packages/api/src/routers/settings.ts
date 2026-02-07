import { z } from "zod";
import { protectedProcedure } from "../index";
import { SettingsService } from "../services/settings-service";

let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
	if (!settingsServiceInstance) {
		settingsServiceInstance = new SettingsService();
	}
	return settingsServiceInstance;
}

export const settingsRouter = {
	get: protectedProcedure
		.input(
			z.object({
				key: z.string(),
				projectId: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getSettingsService();
			const value = await service.get(input.key, input.projectId);
			return { key: input.key, value };
		}),

	set: protectedProcedure
		.input(
			z.object({
				key: z.string(),
				value: z.unknown(),
				scope: z.enum(["global", "project"]),
				scopeId: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getSettingsService();
			await service.set(input.key, input.value, input.scope, input.scopeId);
			return { success: true };
		}),

	getAll: protectedProcedure
		.input(
			z.object({
				scope: z.enum(["global", "project"]),
				scopeId: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getSettingsService();
			return service.getAll(input.scope, input.scopeId);
		}),
};
