import { eventRepository } from "@nomos-ai/db";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const eventsRouter = {
	recent: protectedProcedure
		.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
		.handler(async ({ input }) => {
			return eventRepository.findRecent(input?.limit ?? 50);
		}),

	byType: protectedProcedure
		.input(
			z.object({
				type: z.string(),
				limit: z.number().int().min(1).max(100).default(50),
			}),
		)
		.handler(async ({ input }) => {
			return eventRepository.findByType(input.type, input.limit);
		}),

	byFeature: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input }) => {
			return eventRepository.findByFeatureId(input.featureId);
		}),
};
