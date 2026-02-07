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
		.handler(async ({ input }) => {
			const service = getPipelineService();
			return service.getProgress(input.featureId);
		}),
};
