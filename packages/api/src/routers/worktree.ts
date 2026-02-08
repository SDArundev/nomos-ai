import { featureRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getWorktreeService } from "./auto-mode";

async function verifyFeatureOwnership(featureId: string, userId: string) {
	const feature = await featureRepository.findById(featureId);
	if (!feature || feature.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return feature;
}

export const worktreeRouter = {
	list: protectedProcedure.handler(async () => {
		const service = getWorktreeService();
		return service.listActive();
	}),

	getByFeature: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
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
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
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
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getWorktreeService();
			await service.remove(input.featureId, input.projectRoot);
			return { success: true };
		}),
};
