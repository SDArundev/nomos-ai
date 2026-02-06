import { learningRepository } from "@nomos-ai/db";
import { FeatureIdSchema } from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateLearningId } from "../utils/id-generation";

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

export const learningRouter = {
	list: protectedProcedure
		.input(listLearningsInput)
		.handler(async ({ input }) => {
			if (input?.category) {
				return learningRepository.findByCategory(input.category);
			}
			if (input?.featureId) {
				return learningRepository.findByFeature(input.featureId);
			}
			return learningRepository.findAll();
		}),

	get: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ input }) => {
			const learning = await learningRepository.findById(input.id);
			if (!learning) {
				throw new ORPCError("NOT_FOUND", {
					message: `Learning not found: ${input.id}`,
				});
			}
			return learning;
		}),

	create: protectedProcedure
		.input(createLearningInput)
		.handler(async ({ input, context }) => {
			try {
				return await learningRepository.create({
					id: await generateLearningId(),
					userId: context.session.user.id,
					...input,
				});
			} catch (error) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to create learning",
				});
			}
		}),

	update: protectedProcedure
		.input(updateLearningInput)
		.handler(async ({ input }) => {
			try {
				return await learningRepository.update(input.id, input.data);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to update learning",
				});
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ input }) => {
			try {
				return await learningRepository.delete(input.id);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to delete learning",
				});
			}
		}),
};
