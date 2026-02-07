import { z } from "zod";
import { protectedProcedure } from "../index";
import { getWorktreeService } from "./auto-mode";

export const worktreeRouter = {
	list: protectedProcedure.handler(async () => {
		const service = getWorktreeService();
		return service.listActive();
	}),

	getByFeature: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input }) => {
			const service = getWorktreeService();
			return service.findByFeatureId(input.featureId) ?? null;
		}),

	create: protectedProcedure
		.input(
			z.object({
				featureId: z.string(),
				branchName: z.string(),
				projectRoot: z.string(),
				baseBranch: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getWorktreeService();
			return service.create(input);
		}),

	remove: protectedProcedure
		.input(
			z.object({
				featureId: z.string(),
				projectRoot: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getWorktreeService();
			await service.remove(input.featureId, input.projectRoot);
			return { success: true };
		}),
};
