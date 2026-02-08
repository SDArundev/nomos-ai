import { projectRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
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

async function verifyProjectOwnership(projectId: string, userId: string) {
	const project = await projectRepository.findById(projectId);
	if (!project || project.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return project;
}

export const settingsRouter = {
	get: protectedProcedure
		.input(
			z.object({
				key: z.string(),
				projectId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			if (input.projectId) {
				await verifyProjectOwnership(input.projectId, context.session.user.id);
			}
			const service = getSettingsService();
			const value = await service.get(input.key, input.projectId, context.session.user.id);
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
		.handler(async ({ input, context }) => {
			if (input.scope === "project" && input.scopeId) {
				await verifyProjectOwnership(input.scopeId, context.session.user.id);
			}
			const service = getSettingsService();
			await service.set(input.key, input.value, input.scope, input.scopeId, context.session.user.id);
			return { success: true };
		}),

	getAll: protectedProcedure
		.input(
			z.object({
				scope: z.enum(["global", "project"]),
				scopeId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			if (input.scope === "project" && input.scopeId) {
				await verifyProjectOwnership(input.scopeId, context.session.user.id);
			}
			const service = getSettingsService();
			return service.getAll(input.scope, input.scopeId, context.session.user.id);
		}),
};
