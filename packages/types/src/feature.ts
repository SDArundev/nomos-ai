import { z } from "zod";
import { FeatureIdSchema } from "./ids";
import { FeatureStatusSchema } from "./status";

/**
 * Estimated size values for feature complexity
 */
export const ESTIMATED_SIZE = {
	XS: "XS",
	S: "S",
	M: "M",
	L: "L",
	XL: "XL",
} as const;

export type EstimatedSize =
	(typeof ESTIMATED_SIZE)[keyof typeof ESTIMATED_SIZE];

export const EstimatedSizeSchema = z.enum([
	ESTIMATED_SIZE.XS,
	ESTIMATED_SIZE.S,
	ESTIMATED_SIZE.M,
	ESTIMATED_SIZE.L,
	ESTIMATED_SIZE.XL,
]);

/**
 * AI model selection for feature implementation
 */
export const MODEL = {
	OPUS: "opus",
	SONNET: "sonnet",
	HAIKU: "haiku",
} as const;

export type Model = (typeof MODEL)[keyof typeof MODEL];

export const ModelSchema = z.enum([MODEL.OPUS, MODEL.SONNET, MODEL.HAIKU]);

/**
 * Thinking level for AI processing
 */
export const THINKING_LEVEL = {
	NONE: "none",
	STANDARD: "standard",
	EXTENDED: "extended",
	ULTRATHINK: "ultrathink",
} as const;

export type ThinkingLevel =
	(typeof THINKING_LEVEL)[keyof typeof THINKING_LEVEL];

export const ThinkingLevelSchema = z.enum([
	THINKING_LEVEL.NONE,
	THINKING_LEVEL.STANDARD,
	THINKING_LEVEL.EXTENDED,
	THINKING_LEVEL.ULTRATHINK,
]);

/**
 * Planning mode for feature implementation
 */
export const PLANNING_MODE = {
	SKIP: "skip",
	LITE: "lite",
	SPEC: "spec",
	FULL: "full",
} as const;

export type PlanningMode = (typeof PLANNING_MODE)[keyof typeof PLANNING_MODE];

export const PlanningModeSchema = z.enum([
	PLANNING_MODE.SKIP,
	PLANNING_MODE.LITE,
	PLANNING_MODE.SPEC,
	PLANNING_MODE.FULL,
]);

/**
 * Description history entry source
 */
export const DESCRIPTION_SOURCE = {
	INITIAL: "initial",
	ENHANCE: "enhance",
	EDIT: "edit",
} as const;

export type DescriptionSource =
	(typeof DESCRIPTION_SOURCE)[keyof typeof DESCRIPTION_SOURCE];

export const DescriptionSourceSchema = z.enum([
	DESCRIPTION_SOURCE.INITIAL,
	DESCRIPTION_SOURCE.ENHANCE,
	DESCRIPTION_SOURCE.EDIT,
]);

/**
 * Enhancement mode for description improvements
 */
export const ENHANCEMENT_MODE = {
	IMPROVE: "improve",
	TECHNICAL: "technical",
	SIMPLIFY: "simplify",
	ACCEPTANCE: "acceptance",
	UX_REVIEWER: "ux-reviewer",
} as const;

export type EnhancementMode =
	(typeof ENHANCEMENT_MODE)[keyof typeof ENHANCEMENT_MODE];

export const EnhancementModeSchema = z.enum([
	ENHANCEMENT_MODE.IMPROVE,
	ENHANCEMENT_MODE.TECHNICAL,
	ENHANCEMENT_MODE.SIMPLIFY,
	ENHANCEMENT_MODE.ACCEPTANCE,
	ENHANCEMENT_MODE.UX_REVIEWER,
]);

/**
 * Plan specification status
 */
export const PLAN_STATUS = {
	PENDING: "pending",
	GENERATING: "generating",
	GENERATED: "generated",
	APPROVED: "approved",
	REJECTED: "rejected",
} as const;

export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

export const PlanStatusSchema = z.enum([
	PLAN_STATUS.PENDING,
	PLAN_STATUS.GENERATING,
	PLAN_STATUS.GENERATED,
	PLAN_STATUS.APPROVED,
	PLAN_STATUS.REJECTED,
]);

/**
 * Description history entry schema
 */
export const DescriptionHistoryEntrySchema = z.object({
	timestamp: z.string().datetime(),
	source: DescriptionSourceSchema,
	enhancementMode: EnhancementModeSchema.optional(),
	content: z.string(),
});

export type DescriptionHistoryEntry = z.infer<
	typeof DescriptionHistoryEntrySchema
>;

/**
 * Feature asset schema (for images and text files)
 */
export const FeatureAssetSchema = z.object({
	id: z.string(),
	path: z.string(),
	filename: z.string(),
	mimeType: z.string().optional(),
	content: z.string().optional(),
});

export type FeatureAsset = z.infer<typeof FeatureAssetSchema>;

/**
 * Testing requirements schema
 */
export const TestingRequirementsSchema = z.object({
	unit: z.array(z.string()).optional(),
	integration: z.array(z.string()).optional(),
	e2e: z.array(z.string()).optional(),
	manual: z.array(z.string()).optional(),
});

export type TestingRequirements = z.infer<typeof TestingRequirementsSchema>;

/**
 * Files schema (for tracking file changes)
 */
export const FilesSchema = z.object({
	create: z.array(z.string()).optional(),
	modify: z.array(z.string()).optional(),
	delete: z.array(z.string()).optional(),
});

export type Files = z.infer<typeof FilesSchema>;

/**
 * Plan specification schema
 */
export const PlanSpecSchema = z.object({
	status: PlanStatusSchema,
	content: z.string().optional(),
	version: z.number().optional(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
	taskCounts: z
		.object({
			total: z.number(),
			completed: z.number(),
		})
		.optional(),
});

export type PlanSpec = z.infer<typeof PlanSpecSchema>;

/**
 * Feature categories (UI display values)
 */
export const FEATURE_CATEGORIES = [
	"CAT-AUTH",
	"CAT-DB",
	"CAT-UI",
	"CAT-API",
	"CAT-KAN",
	"CAT-CORE",
] as const;

/**
 * Category ID pattern (CAT-XXX format)
 */
export const CategoryIdSchema = z
	.string()
	.regex(/^CAT-[A-Z]{3}$/, "Category ID must be in format CAT-XXX");

export type CategoryId = z.infer<typeof CategoryIdSchema>;

/**
 * Feature phases (UI display values)
 */
export const FEATURE_PHASES = [
	"phase-1",
	"phase-2",
	"phase-3",
	"phase-4",
] as const;

/**
 * Phase ID pattern (phase-N format)
 */
export const PhaseIdSchema = z
	.string()
	.regex(/^phase-[0-9]+$/, "Phase ID must be in format phase-N");

export type PhaseId = z.infer<typeof PhaseIdSchema>;

/**
 * Requirement ID pattern (REQ-F001 or REQ-NF001 format)
 */
export const RequirementIdSchema = z
	.string()
	.regex(
		/^REQ-(F|NF)[0-9]{3}$/,
		"Requirement ID must be in format REQ-F001 or REQ-NF001",
	);

export type RequirementId = z.infer<typeof RequirementIdSchema>;

/**
 * Branch name pattern (nomos/F001 format)
 */
export const BranchNameSchema = z
	.string()
	.regex(/^nomos\/F[0-9]{3}$/, "Branch name must be in format nomos/F001");

export type BranchName = z.infer<typeof BranchNameSchema>;

/**
 * Feature schema matching feature.schema.json
 */
export const FeatureSchema = z.object({
	// Required fields
	id: FeatureIdSchema,
	title: z.string().min(5).max(80),
	category: CategoryIdSchema,
	description: z.string().min(20).max(500),
	phase: PhaseIdSchema,
	acceptanceCriteria: z.array(z.string()).min(1).max(10),
	status: FeatureStatusSchema,
	passes: z.boolean(),

	// Optional fields with defaults
	titleGenerating: z.boolean().default(false),
	model: ModelSchema.default("sonnet"),
	thinkingLevel: ThinkingLevelSchema.default("standard"),
	planningMode: PlanningModeSchema.default("lite"),
	requirePlanApproval: z.boolean().default(false),
	skipTests: z.boolean().default(false),
	retries: z.number().int().default(0),

	// Optional fields without defaults
	descriptionHistory: z.array(DescriptionHistoryEntrySchema).optional(),
	priority: z.number().int().min(1).max(999).optional(),
	requirements: z.array(RequirementIdSchema).optional(),
	dependencies: z.array(FeatureIdSchema).optional(),
	spec: z.string().optional(),
	technicalNotes: z.string().optional(),
	testingRequirements: TestingRequirementsSchema.optional(),
	files: FilesSchema.optional(),
	imagePaths: z.array(FeatureAssetSchema).optional(),
	textFilePaths: z.array(FeatureAssetSchema).optional(),
	estimatedSize: EstimatedSizeSchema.optional(),
	error: z.string().optional(),
	summary: z.string().optional(),
	planSpec: PlanSpecSchema.optional(),
	branchName: BranchNameSchema.optional(),
	tags: z.array(z.string()).optional(),
	startedAt: z.string().datetime().optional(),
	completedAt: z.string().datetime().optional(),
	verifiedAt: z.string().datetime().optional(),
	completedBy: z.string().optional(),
	preImplemented: z.boolean().optional(),
});

export type Feature = z.infer<typeof FeatureSchema>;
