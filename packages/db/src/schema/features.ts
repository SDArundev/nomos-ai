import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { project } from "./projects";

export const feature = pgTable(
	"feature",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		category: text("category").notNull(),
		description: text("description").notNull(),
		phase: text("phase").notNull(),
		priority: integer("priority"),
		status: text("status").notNull(),
		passes: boolean("passes").notNull().default(false),
		acceptanceCriteria: jsonb("acceptance_criteria")
			.$type<string[]>()
			.notNull(),
		requirements: jsonb("requirements").$type<string[]>(),
		dependencies: jsonb("dependencies").$type<string[]>(),
		estimatedSize: text("estimated_size"),
		preImplemented: boolean("pre_implemented"),
		model: text("model"),
		thinkingLevel: text("thinking_level"),
		planningMode: text("planning_mode"),
		requirePlanApproval: boolean("require_plan_approval"),
		skipTests: boolean("skip_tests"),
		retries: integer("retries").default(0),
		descriptionHistory: jsonb("description_history").$type<
			Array<{
				timestamp: string;
				source: string;
				enhancementMode?: string;
				content: string;
			}>
		>(),
		spec: text("spec"),
		technicalNotes: text("technical_notes"),
		testingRequirements: jsonb("testing_requirements").$type<{
			unit?: string[];
			integration?: string[];
			e2e?: string[];
			manual?: string[];
		}>(),
		files: jsonb("files").$type<{
			create?: string[];
			modify?: string[];
			delete?: string[];
		}>(),
		imagePaths: jsonb("image_paths").$type<
			Array<{
				id: string;
				path: string;
				filename?: string;
				mimeType?: string;
				content?: string;
			}>
		>(),
		textFilePaths: jsonb("text_file_paths").$type<
			Array<{
				id: string;
				path: string;
				filename?: string;
				mimeType?: string;
				content?: string;
			}>
		>(),
		error: text("error"),
		summary: text("summary"),
		planSpec: jsonb("plan_spec").$type<{
			status?: string;
			content?: string;
			version?: number;
			createdAt?: string;
			updatedAt?: string;
			taskCounts?: {
				total?: number;
				completed?: number;
			};
		}>(),
		branchName: text("branch_name"),
		useWorktree: boolean("use_worktree").default(false),
		locked: boolean("locked").default(false),
		lockedBy: text("locked_by"),
		lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
		pipelineStep: text("pipeline_step"),
		lastCompletedStep: text("last_completed_step"),
		retryCount: integer("retry_count").default(0),
		lastFailureAt: timestamp("last_failure_at", {
			withTimezone: true,
			mode: "date",
		}),
		tags: jsonb("tags").$type<string[]>(),
		titleGenerating: boolean("title_generating"),
		startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
		completedAt: timestamp("completed_at", {
			withTimezone: true,
			mode: "date",
		}),
		verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
		completedBy: text("completed_by"),
		// New columns
		release: text("release"),
		failureReason: text("failure_reason"),
		restoredAt: timestamp("restored_at", { withTimezone: true, mode: "date" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("feature_status_idx").on(table.status),
		index("feature_phase_idx").on(table.phase),
		index("feature_project_id_idx").on(table.projectId),
	],
);
