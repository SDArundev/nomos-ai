import {
	antipatternRepository,
	featureInsightRepository,
	featureMetricRepository,
	learningRepository,
	patternRepository,
} from "@nomos-ai/db";
import { FeatureIdSchema } from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { handleRepositoryError } from "../utils/error-handler";

// ── Legacy learning CRUD ────────────────────────────────────

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

// ── Pattern inputs ──────────────────────────────────────────

const createPatternInput = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	description: z.string().min(1),
	category: z.string().min(1),
	confidence: z.number().min(0).max(1).optional(),
	evidenceCount: z.number().int().optional(),
	successRate: z.number().min(0).max(1).optional(),
	riskIfIgnored: z.string().optional(),
	codeExample: z.string().optional(),
	recommendation: z.string().optional(),
	appliesTo: z.array(z.string()).optional(),
	featuresApplied: z.array(z.string()).optional(),
	featuresSucceeded: z.array(z.string()).optional(),
	firstSeen: z.string().optional(),
	lastSeen: z.string().optional(),
});

// ── Antipattern inputs ──────────────────────────────────────

const createAntipatternInput = z.object({
	id: z.string().optional(),
	name: z.string().min(1),
	description: z.string().min(1),
	category: z.string().min(1),
	severity: z.string().min(1),
	evidenceCount: z.number().int().optional(),
	prevention: z.string().optional(),
	whatWentWrong: z.string().optional(),
	lesson: z.string().optional(),
	fixApplied: z.string().optional(),
	lastSeen: z.string().optional(),
});

// ── Feature insight inputs ──────────────────────────────────

const createInsightInput = z.object({
	featureId: FeatureIdSchema,
	acceptanceCriteria: z
		.array(
			z.object({
				criterion: z.string(),
				status: z.string(),
				details: z.string().optional(),
			}),
		)
		.optional(),
	discoveries: z
		.array(
			z.object({
				discovery: z.string(),
				context: z.string(),
				lesson: z.string(),
				benefit: z.string().optional(),
				code_pattern: z.string().optional(),
			}),
		)
		.optional(),
	patternsApplied: z.array(z.string()).optional(),
	whatWorked: z.array(z.string()).optional(),
	whatFailed: z.array(z.string()).optional(),
	whatCouldImprove: z.array(z.string()).optional(),
	recommendations: z.array(z.string()).optional(),
});

// ── Feature metric inputs ───────────────────────────────────

const createMetricInput = z.object({
	featureId: FeatureIdSchema,
	durationMinutes: z.number().int().optional(),
	filesChanged: z.number().int().optional(),
	linesAdded: z.number().int().optional(),
	linesRemoved: z.number().int().optional(),
	commits: z.number().int().optional(),
	retries: z.number().int().optional(),
	riskLevel: z.string().optional(),
	outcome: z.string().optional(),
	startedAt: z.string().optional(),
	verifiedAt: z.string().optional(),
	notes: z.string().optional(),
});

// ── Relevant query input ────────────────────────────────────

const relevantInput = z
	.object({
		category: z.string().optional(),
		minConfidence: z.number().min(0).max(1).optional(),
		type: z.enum(["patterns", "antipatterns", "all"]).optional(),
	})
	.optional();

// ── Router ──────────────────────────────────────────────────

export const learningRouter = {
	// Legacy learning CRUD
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
			const learning = await learningRepository.findById(input.id);
			if (!learning) {
				throw new ORPCError("NOT_FOUND", {
					message: `Learning not found: ${input.id}`,
				});
			}
			if (learning.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}
			return learning;
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
			const existing = await learningRepository.findById(input.id);
			if (!existing || existing.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", {
					message: `Learning not found: ${input.id}`,
				});
			}
			try {
				return await learningRepository.update(input.id, input.data);
			} catch (error) {
				handleRepositoryError(error, "update learning");
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			const existing = await learningRepository.findById(input.id);
			if (!existing || existing.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", {
					message: `Learning not found: ${input.id}`,
				});
			}
			try {
				return await learningRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete learning");
			}
		}),

	// ── I5: Relevant patterns/antipatterns for Phase 1/2 ────

	relevant: protectedProcedure
		.input(relevantInput)
		.handler(async ({ input }) => {
			const category = input?.category;
			const minConfidence = input?.minConfidence ?? 0.7;
			const type = input?.type ?? "all";

			const includePatterns = type !== "antipatterns";
			const includeAntipatterns = type !== "patterns";

			const patterns = includePatterns
				? await patternRepository.findRelevant(category, minConfidence)
				: [];
			const antipatterns = includeAntipatterns
				? await antipatternRepository.findByCategory(category)
				: [];
			const allPatterns = includePatterns
				? await patternRepository.findAll()
				: [];

			return {
				patterns,
				antipatterns,
				summary: {
					totalPatterns: allPatterns.length,
					totalAntipatterns: antipatterns.length,
					filteredPatterns: patterns.length,
					categories: [
						...new Set([
							...patterns.map((p: { category: string }) => p.category),
							...antipatterns.map((a: { category: string }) => a.category),
						]),
					],
				},
			};
		}),

	// ── Pattern CRUD ────────────────────────────────────────

	createPattern: protectedProcedure
		.input(createPatternInput)
		.handler(async ({ input, context }) => {
			try {
				return await patternRepository.create({
					...input,
					userId: context.session.user.id,
				});
			} catch (error) {
				handleRepositoryError(error, "create pattern");
			}
		}),

	listPatterns: protectedProcedure.handler(async () => {
		return patternRepository.findAll();
	}),

	// ── Antipattern CRUD ────────────────────────────────────

	createAntipattern: protectedProcedure
		.input(createAntipatternInput)
		.handler(async ({ input, context }) => {
			try {
				return await antipatternRepository.create({
					...input,
					userId: context.session.user.id,
				});
			} catch (error) {
				handleRepositoryError(error, "create antipattern");
			}
		}),

	listAntipatterns: protectedProcedure.handler(async () => {
		return antipatternRepository.findAll();
	}),

	// ── Feature insight CRUD ────────────────────────────────

	createInsight: protectedProcedure
		.input(createInsightInput)
		.handler(async ({ input, context }) => {
			try {
				return await featureInsightRepository.create({
					...input,
					userId: context.session.user.id,
				});
			} catch (error) {
				handleRepositoryError(error, "create insight");
			}
		}),

	getInsight: protectedProcedure
		.input(z.object({ featureId: FeatureIdSchema }))
		.handler(async ({ input }) => {
			const insight = await featureInsightRepository.findByFeature(
				input.featureId,
			);
			if (!insight) {
				throw new ORPCError("NOT_FOUND", {
					message: `Insight not found for feature: ${input.featureId}`,
				});
			}
			return insight;
		}),

	listInsights: protectedProcedure.handler(async () => {
		return featureInsightRepository.findAll();
	}),

	// ── Feature metric CRUD ─────────────────────────────────

	createMetric: protectedProcedure
		.input(createMetricInput)
		.handler(async ({ input, context }) => {
			try {
				return await featureMetricRepository.create({
					...input,
					userId: context.session.user.id,
					startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
					verifiedAt: input.verifiedAt
						? new Date(input.verifiedAt)
						: undefined,
				});
			} catch (error) {
				handleRepositoryError(error, "create metric");
			}
		}),

	getMetric: protectedProcedure
		.input(z.object({ featureId: FeatureIdSchema }))
		.handler(async ({ input }) => {
			const metric = await featureMetricRepository.findByFeature(
				input.featureId,
			);
			if (!metric) {
				throw new ORPCError("NOT_FOUND", {
					message: `Metric not found for feature: ${input.featureId}`,
				});
			}
			return metric;
		}),

	listMetrics: protectedProcedure.handler(async () => {
		return featureMetricRepository.findAll();
	}),

	// ── I6: Pattern curation ────────────────────────────────

	curate: protectedProcedure.handler(async () => {
		const allPatterns = await patternRepository.findAll();

		let pruned = 0;
		let promoted = 0;
		const flagged: string[] = [];

		for (const p of allPatterns) {
			// Prune: low confidence + low evidence + low usage
			if (
				p.status === "active" &&
				(p.confidence ?? 0) < 0.3 &&
				(p.evidenceCount ?? 0) < 2 &&
				(p.featuresApplied?.length ?? 0) < 3
			) {
				await patternRepository.update(p.id, { status: "archived" });
				pruned++;
				continue;
			}

			// Promote: high confidence + high success + enough evidence
			if (
				p.status === "active" &&
				(p.confidence ?? 0) >= 0.9 &&
				(p.successRate ?? 0) >= 0.95 &&
				(p.evidenceCount ?? 0) >= 5
			) {
				await patternRepository.update(p.id, { status: "proven" });
				promoted++;
				continue;
			}
		}

		// Flag potential duplicates (simple name similarity check)
		const names = allPatterns
			.filter((p) => p.status === "active")
			.map((p) => ({ id: p.id, name: p.name }));
		for (let i = 0; i < names.length; i++) {
			for (let j = i + 1; j < names.length; j++) {
				const a = names[i]!;
				const b = names[j]!;
				if (
					a.name.toLowerCase() === b.name.toLowerCase() ||
					a.name.replace(/_/g, "").toLowerCase() ===
						b.name.replace(/_/g, "").toLowerCase()
				) {
					flagged.push(`${a.id} ~ ${b.id}`);
				}
			}
		}

		return {
			pruned,
			promoted,
			flagged,
			total: allPatterns.length,
		};
	}),
};
