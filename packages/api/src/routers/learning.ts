import { learningRepository } from "@nomos-ai/db";
import { FeatureIdSchema } from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { handleRepositoryError } from "../utils/error-handler";

const listLearningsInput = z
	.object({
		category: z.string().optional(),
		featureId: FeatureIdSchema.optional(),
	})
	.optional();

const createLearningInput = z.object({
	featureId: FeatureIdSchema.optional(),
	category: z.string().min(1, "Category is required"),
	pattern: z.string().optional(),
	antiPattern: z.string().optional(),
	context: z
		.object({
			problem: z.string().optional(),
			solution: z.string().optional(),
			codeExample: z.string().optional(),
			gotcha: z.string().optional(),
			recommendation: z.string().optional(),
		})
		.optional(),
	severity: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

const updateLearningInput = z.object({
	id: z.string().min(1),
	data: z
		.object({
			category: z.string().min(1).optional(),
			pattern: z.string().optional(),
			antiPattern: z.string().optional(),
			context: z
				.object({
					problem: z.string().optional(),
					solution: z.string().optional(),
					codeExample: z.string().optional(),
					gotcha: z.string().optional(),
					recommendation: z.string().optional(),
				})
				.optional(),
			severity: z.string().optional(),
			tags: z.array(z.string()).optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided for update",
		}),
});

async function verifyLearningOwnership(learningId: string, userId: string) {
	const learning = await learningRepository.findById(learningId);
	if (!learning) {
		throw new ORPCError("NOT_FOUND", {
			message: `Learning not found: ${learningId}`,
		});
	}
	if (learning.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return learning;
}

export const learningRouter = {
	list: protectedProcedure
		.input(listLearningsInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			if (input?.category) {
				return learningRepository.findByUserAndCategory(userId, input.category);
			}
			if (input?.featureId) {
				return learningRepository.findByUserAndFeature(userId, input.featureId);
			}
			return learningRepository.findByUser(userId);
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			return verifyLearningOwnership(input.id, context.session.user.id);
		}),

	create: protectedProcedure
		.input(createLearningInput)
		.handler(async ({ input, context }) => {
			try {
				return await learningRepository.create({
					userId: context.session.user.id,
					...input,
				});
			} catch (error) {
				handleRepositoryError(error, "create learning");
			}
		}),

	update: protectedProcedure
		.input(updateLearningInput)
		.handler(async ({ input, context }) => {
			await verifyLearningOwnership(input.id, context.session.user.id);
			try {
				return await learningRepository.update(input.id, input.data);
			} catch (error) {
				handleRepositoryError(error, "update learning");
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			await verifyLearningOwnership(input.id, context.session.user.id);
			try {
				return await learningRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete learning");
			}
		}),
};
