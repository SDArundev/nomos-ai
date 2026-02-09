import { featureRepository } from "@nomos-ai/db";
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
import {
	getBlockingDependencies,
	resolveDependencies,
} from "../lib/dependency-resolver";
import {
	isValidTransition,
	transitionFeatureStatus,
} from "../lib/feature-state-machine";
import { ExpansionService } from "../services/expansion-service";
import { handleRepositoryError } from "../utils/error-handler";

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
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			if (input?.status && input?.phase) {
				return featureRepository.findByUserStatusAndPhase(
					userId,
					input.status,
					input.phase,
				);
			}
			if (input?.status) {
				return featureRepository.findByUserAndStatus(userId, input.status);
			}
			if (input?.phase) {
				return featureRepository.findByUserAndPhase(userId, input.phase);
			}
			return featureRepository.findByUser(userId);
		}),

	listPaginated: protectedProcedure
		.input(
			z.object({
				limit: z.number().int().min(1).max(200).optional(),
				offset: z.number().int().min(0).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			return featureRepository.findPaginated({
				limit: input.limit,
				offset: input.offset,
				userId: context.session.user.id,
			});
		}),

	get: protectedProcedure
		.input(z.object({ id: FeatureIdSchema }))
		.handler(async ({ input, context }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}
			if (feat.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", {
					message: "Access denied",
				});
			}
			return feat;
		}),

	create: protectedProcedure
		.input(createFeatureInput)
		.handler(async ({ input, context }) => {
			try {
				return await featureRepository.create({
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
		.handler(async ({ input, context }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat || feat.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}
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
		.handler(async ({ input, context }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat || feat.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}
			try {
				return await featureRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete feature");
			}
		}),

	updateStatus: protectedProcedure
		.input(updateStatusInput)
		.handler(async ({ input, context }) => {
			const feat = await featureRepository.findById(input.id);
			if (!feat) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.id}`,
				});
			}
			if (feat.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}

			if (!isValidTransition(feat.status as FeatureStatus, input.status)) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Invalid status transition: ${feat.status} → ${input.status}`,
				});
			}

			await transitionFeatureStatus(input.id, input.status);
			return featureRepository.findById(input.id);
		}),

	getDependencyOrder: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input, context }) => {
			const features = await featureRepository.findByUserAndProject(
				context.session.user.id,
				input.projectId,
			);
			const ordered = resolveDependencies(features);
			return ordered.map((f) => ({
				id: f.id,
				title: f.title,
				status: f.status,
				dependencies: f.dependencies ?? [],
				blocking: getBlockingDependencies(f, features).map((b) => b.id),
			}));
		}),

	bulkCreate: protectedProcedure
		.input(
			z.object({
				features: z.array(createFeatureInput).min(1).max(500),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const results = [];
			for (const feat of input.features) {
				try {
					const created = await featureRepository.create({
						userId,
						projectId: feat.projectId,
						title: feat.title,
						category: feat.category,
						description: feat.description,
						phase: feat.phase,
						status: feat.status,
						passes: false,
						acceptanceCriteria: feat.acceptanceCriteria,
						priority: feat.priority,
						requirements: feat.requirements,
						dependencies: feat.dependencies,
						estimatedSize: feat.estimatedSize,
					});
					results.push({ id: created.id, success: true });
				} catch {
					results.push({ id: feat.title, success: false });
				}
			}
			return results;
		}),

	bulkDelete: protectedProcedure
		.input(z.object({ ids: z.array(FeatureIdSchema).min(1) }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const userFeatures = await featureRepository.findByUser(userId);
			const userIds = new Set(userFeatures.map((f) => f.id));
			const unauthorized = input.ids.filter((id) => !userIds.has(id));
			if (unauthorized.length > 0) {
				throw new ORPCError("FORBIDDEN", {
					message: "Access denied to some features",
				});
			}
			const results = [];
			for (const id of input.ids) {
				try {
					await featureRepository.delete(id);
					results.push({ id, success: true });
				} catch {
					results.push({ id, success: false });
				}
			}
			return results;
		}),

	bulkUpdateStatus: protectedProcedure
		.input(bulkUpdateStatusInput)
		.handler(async ({ input, context }) => {
			// Verify all features belong to the user
			const userId = context.session.user.id;
			const userFeatures = await featureRepository.findByUser(userId);
			const userIds = new Set(userFeatures.map((f) => f.id));
			const unauthorized = input.ids.filter((id) => !userIds.has(id));
			if (unauthorized.length > 0) {
				throw new ORPCError("FORBIDDEN", {
					message: "Access denied to some features",
				});
			}
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

	expand: protectedProcedure
		.input(
			z.object({
				text: z.string().min(1, "Text is required").max(2000),
				projectId: z.string().min(1, "Project ID is required"),
			}),
		)
		.handler(async ({ input, context }) => {
			const expansionService = new ExpansionService();
			return expansionService.expandIntent({
				naturalLanguage: input.text,
				projectId: input.projectId,
				userId: context.session.user.id,
			});
		}),

	exportJson: protectedProcedure
		.input(
			z.object({
				projectId: z.string().min(1, "Project ID is required").optional(),
			}).optional(),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const features = input?.projectId
				? await featureRepository.findByUserAndProject(userId, input.projectId)
				: await featureRepository.findByUser(userId);

			return {
				_generated: true,
				_generatedAt: new Date().toISOString(),
				_note: "Auto-generated from database. Do not edit manually. Use the NOMOS API to modify features.",
				features: features.map((f) => ({
					id: f.id,
					title: f.title,
					category: f.category,
					description: f.description,
					phase: f.phase,
					priority: f.priority,
					requirements: f.requirements ?? [],
					dependencies: f.dependencies ?? [],
					acceptanceCriteria: f.acceptanceCriteria ?? [],
					estimatedSize: f.estimatedSize,
					status: f.status,
					passes: f.passes,
				})),
			};
		}),
};
