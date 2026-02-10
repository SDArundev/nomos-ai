import {
	eventRepository,
	featureRepository,
	projectRepository,
	type EventSelect,
} from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

/**
 * Filter events to only those owned by the current user.
 * Matches on featureId, projectId, or payload.userId.
 */
function filterUserEvents(
	events: EventSelect[],
	userFeatureIds: Set<string>,
	userProjectIds: Set<string>,
	userId: string,
): EventSelect[] {
	return events.filter((e) => {
		// Feature-scoped events: check feature ownership
		if (e.featureId) return userFeatureIds.has(e.featureId);
		// Project-scoped events: check project ownership
		if (e.projectId) return userProjectIds.has(e.projectId);
		// Session/agent events: check userId in payload
		if (e.payload) {
			try {
				const data = JSON.parse(e.payload) as Record<string, unknown>;
				if (data.userId === userId) return true;
			} catch {
				// Malformed payload — skip
			}
		}
		return false;
	});
}

export const eventsRouter = {
	recent: protectedProcedure
		.input(
			z
				.object({ limit: z.number().int().min(1).max(100).default(50) })
				.optional(),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const [userFeatures, userProjects] = await Promise.all([
				featureRepository.findByUser(userId),
				projectRepository.findByUser(userId),
			]);
			const userFeatureIds = new Set(userFeatures.map((f) => f.id));
			const userProjectIds = new Set(userProjects.map((p) => p.id));
			const events = await eventRepository.findRecent(input?.limit ?? 50);
			return filterUserEvents(events, userFeatureIds, userProjectIds, userId);
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
			// Support prefix matching (e.g., "agent" matches "agent:stream")
			const isPrefix = !input.type.includes(":");
			const [userFeatures, userProjects] = await Promise.all([
				featureRepository.findByUser(userId),
				projectRepository.findByUser(userId),
			]);
			const userFeatureIds = new Set(userFeatures.map((f) => f.id));
			const userProjectIds = new Set(userProjects.map((p) => p.id));
			const events = isPrefix
				? await eventRepository.findByTypePrefix(input.type, input.limit)
				: await eventRepository.findByType(input.type, input.limit);
			return filterUserEvents(events, userFeatureIds, userProjectIds, userId);
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
