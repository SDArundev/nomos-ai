import { featureRepository } from "@nomos-ai/db";
import {
	resolveDependencies,
	getBlockingDependencies,
} from "../lib/dependency-resolver";
import {
	FEATURE_VALID_TRANSITIONS,
	FeatureIdSchema,
	type FeatureStatus,
	FeatureStatusSchema,
	PhaseIdSchema,
} from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { handleRepositoryError } from "../utils/error-handler";
import { generateFeatureId } from "../utils/id-generation";

const listFeaturesInput = z
	.object({
		status: FeatureStatusSchema.optional(),
		phase: PhaseIdSchema.optional(),
	})
	.optional();

const createFeatureInput = z.object({
	projectId: z.string().min(1, "Project ID is required"),
	title: z.string().min(5, "Title must be at least 5 characters").max(80),
	category: z.string().min(1, "Category is required"),
	description: z
		.string()
		.min(20, "Description must be at least 20 characters")
		.max(500),
	phase: PhaseIdSchema,
	acceptanceCriteria: z.array(z.string()).min(1).max(10),
	status: FeatureStatusSchema.default("backlog"),
	priority: z.number().int().min(1).max(999).optional(),
	requirements: z.array(z.string()).optional(),
	dependencies: z.array(FeatureIdSchema).optional(),
	estimatedSize: z.enum(["XS", "S", "M", "L", "XL"]).optional(),
});

const updateFeatureInput = z.object({
	id: FeatureIdSchema,
	data: z
		.object({
			title: z.string().min(5).max(80).optional(),
			category: z.string().min(1).optional(),
			description: z.string().min(20).max(500).optional(),
			phase: PhaseIdSchema.optional(),
			priority: z.number().int().min(1).max(999).optional(),
			requirements: z.array(z.string()).optional(),
			dependencies: z.array(FeatureIdSchema).optional(),
			estimatedSize: z.enum(["XS", "S", "M", "L", "XL"]).optional(),
			acceptanceCriteria: z.array(z.string()).min(1).max(10).optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided for update",
		}),
});

const updateStatusInput = z.object({
	id: FeatureIdSchema,
	status: FeatureStatusSchema,
});

const bulkUpdateStatusInput = z.object({
	ids: z.array(FeatureIdSchema).min(1, "At least one feature ID is required"),
	status: FeatureStatusSchema,
});

export const featureRouter = {
	list: protectedProcedure
		.input(listFeaturesInput)
		.handler(async ({ input }) => {
			if (input?.status && input?.phase) {
				return featureRepository.findByStatusAndPhase(
					input.status,
					input.phase,
				);
			}
			if (input?.status) {
				return featureRepository.findByStatus(input.status);
			}
			if (input?.phase) {
				return featureRepository.findByPhase(input.phase);
			}
			return featureRepository.findAll();
		}),

	get: protectedProcedure
		.input(z.object({ id: FeatureIdSchema }))
		.handler(async ({ input }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}
			return feat;
		}),

	create: protectedProcedure
		.input(createFeatureInput)
		.handler(async ({ input, context }) => {
			try {
				return await featureRepository.create({
					id: await generateFeatureId(),
					userId: context.session.user.id,
					projectId: input.projectId,
					title: input.title,
					category: input.category,
					description: input.description,
					phase: input.phase,
					status: input.status,
					passes: false,
					acceptanceCriteria: input.acceptanceCriteria,
					priority: input.priority,
					requirements: input.requirements,
					dependencies: input.dependencies,
					estimatedSize: input.estimatedSize,
				});
			} catch (error) {
				handleRepositoryError(error, "create feature");
			}
		}),

	update: protectedProcedure
		.input(updateFeatureInput)
		.handler(async ({ input }) => {
			try {
				const updateData = Object.fromEntries(
					Object.entries(input.data).filter(([, v]) => v !== undefined),
				);
				return await featureRepository.update(input.id, updateData);
			} catch (error) {
				handleRepositoryError(error, "update feature");
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: FeatureIdSchema }))
		.handler(async ({ input }) => {
			try {
				return await featureRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete feature");
			}
		}),

	updateStatus: protectedProcedure
		.input(updateStatusInput)
		.handler(async ({ input }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}

			const allowed = FEATURE_VALID_TRANSITIONS[feat.status as FeatureStatus];
			if (!allowed || !allowed.includes(input.status)) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Invalid status transition: ${feat.status} → ${input.status}`,
				});
			}

			return featureRepository.update(input.id, { status: input.status });
		}),

	getDependencyOrder: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input }) => {
			const features = await featureRepository.findByProjectWithDependencies(input.projectId);
			const ordered = resolveDependencies(features);
			return ordered.map((f) => ({
				id: f.id,
				title: f.title,
				status: f.status,
				dependencies: f.dependencies ?? [],
				blocking: getBlockingDependencies(f, features).map((b) => b.id),
			}));
		}),

	bulkUpdateStatus: protectedProcedure
		.input(bulkUpdateStatusInput)
		.handler(async ({ input }) => {
			try {
				return await featureRepository.bulkUpdateStatusWithValidation(
					input.ids,
					input.status,
					FEATURE_VALID_TRANSITIONS,
				);
			} catch (error) {
				handleRepositoryError(error, "bulk update feature status");
			}
		}),
};
