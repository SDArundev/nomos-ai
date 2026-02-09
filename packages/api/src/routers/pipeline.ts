import { featureRepository, projectRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getPipelineService } from "./auto-mode";

export const pipelineRouter = {
	steps: protectedProcedure.handler(async () => {
		const service = getPipelineService();
		return service.getSteps();
	}),

	progress: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input, context }) => {
			const feature = await featureRepository.findById(input.featureId);
			if (!feature || feature.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}
			const project = await projectRepository.findById(feature.projectId);
			const projectRoot = project?.path;
			const service = getPipelineService();
			return service.getProgress(input.featureId, projectRoot);
		}),
};
