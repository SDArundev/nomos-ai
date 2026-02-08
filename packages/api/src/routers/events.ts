import { eventRepository, featureRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const eventsRouter = {
	recent: protectedProcedure
		.input(
			z
				.object({ limit: z.number().int().min(1).max(100).default(50) })
				.optional(),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const userFeatures = await featureRepository.findByUser(userId);
			const userFeatureIds = new Set(userFeatures.map((f) => f.id));
			const events = await eventRepository.findRecent(input?.limit ?? 50);
			return events.filter(
				(e) => e.featureId && userFeatureIds.has(e.featureId),
			);
		}),

	byType: protectedProcedure
		.input(
			z.object({
				type: z.string(),
				limit: z.number().int().min(1).max(100).default(50),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const userFeatures = await featureRepository.findByUser(userId);
			const userFeatureIds = new Set(userFeatures.map((f) => f.id));
			const events = await eventRepository.findByType(input.type, input.limit);
			return events.filter(
				(e) => e.featureId && userFeatureIds.has(e.featureId),
			);
		}),

	byFeature: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input, context }) => {
			const feature = await featureRepository.findById(input.featureId);
			if (!feature || feature.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}
			return eventRepository.findByFeatureId(input.featureId);
		}),
};
