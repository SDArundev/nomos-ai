import { featureRepository } from "@nomos-ai/db";
import {
	FEATURE_STATUS,
	FeatureIdSchema,
	FeatureStatusSchema,
	PhaseIdSchema,
} from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

const VALID_TRANSITIONS: Record<string, string[]> = {
	[FEATURE_STATUS.BACKLOG]: [FEATURE_STATUS.PENDING, FEATURE_STATUS.FAILED],
	[FEATURE_STATUS.PENDING]: [FEATURE_STATUS.IN_PROGRESS, FEATURE_STATUS.FAILED],
	[FEATURE_STATUS.IN_PROGRESS]: [
		FEATURE_STATUS.WAITING_APPROVAL,
		FEATURE_STATUS.FAILED,
	],
	[FEATURE_STATUS.WAITING_APPROVAL]: [
		FEATURE_STATUS.VERIFIED,
		FEATURE_STATUS.FAILED,
	],
	[FEATURE_STATUS.VERIFIED]: [],
	[FEATURE_STATUS.FAILED]: [],
};

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
		.handler(async ({ input }) => {
			try {
				return await featureRepository.create({
					id: crypto.randomUUID(),
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
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to create feature",
				});
			}
		}),

	update: protectedProcedure
		.input(updateFeatureInput)
		.handler(async ({ input }) => {
			try {
				const updateData: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(input.data)) {
					if (value !== undefined) {
						updateData[key] = value;
					}
				}
				return await featureRepository.update(input.id, updateData);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to update feature",
				});
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: FeatureIdSchema }))
		.handler(async ({ input }) => {
			try {
				return await featureRepository.delete(input.id);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to delete feature",
				});
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

			const allowed = VALID_TRANSITIONS[feat.status];
			if (!allowed || !allowed.includes(input.status)) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Invalid status transition: ${feat.status} → ${input.status}`,
				});
			}

			return featureRepository.update(input.id, { status: input.status });
		}),

	bulkUpdateStatus: protectedProcedure
		.input(bulkUpdateStatusInput)
		.handler(async ({ input }) => {
			const features = await Promise.all(
				input.ids.map((id) => featureRepository.findById(id)),
			);

			const invalid: string[] = [];
			for (const feat of features) {
				if (!feat) continue;
				const allowed = VALID_TRANSITIONS[feat.status];
				if (!allowed || !allowed.includes(input.status)) {
					invalid.push(`${feat.id}: ${feat.status} → ${input.status}`);
				}
			}

			if (invalid.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Invalid status transitions: ${invalid.join(", ")}`,
				});
			}

			return featureRepository.bulkUpdateStatus(input.ids, input.status);
		}),
};
