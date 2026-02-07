import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { project } from "./projects";

export const feature = sqliteTable(
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
		passes: integer("passes", { mode: "boolean" }).notNull().default(false),
		acceptanceCriteria: text("acceptance_criteria", { mode: "json" })
			.$type<string[]>()
			.notNull(),
		requirements: text("requirements", { mode: "json" }).$type<string[]>(),
		dependencies: text("dependencies", { mode: "json" }).$type<string[]>(),
		estimatedSize: text("estimated_size"),
		preImplemented: integer("pre_implemented", { mode: "boolean" }),
		model: text("model"),
		thinkingLevel: text("thinking_level"),
		planningMode: text("planning_mode"),
		requirePlanApproval: integer("require_plan_approval", { mode: "boolean" }),
		skipTests: integer("skip_tests", { mode: "boolean" }),
		retries: integer("retries").default(0),
		descriptionHistory: text("description_history", { mode: "json" }).$type<
			Array<{
				timestamp: string;
				source: string;
				enhancementMode?: string;
				content: string;
			}>
		>(),
		spec: text("spec"),
		technicalNotes: text("technical_notes"),
		testingRequirements: text("testing_requirements", { mode: "json" }).$type<{
			unit?: string[];
			integration?: string[];
			e2e?: string[];
			manual?: string[];
		}>(),
		files: text("files", { mode: "json" }).$type<{
			create?: string[];
			modify?: string[];
			delete?: string[];
		}>(),
		imagePaths: text("image_paths", { mode: "json" }).$type<
			Array<{
				id: string;
				path: string;
				filename?: string;
				mimeType?: string;
				content?: string;
			}>
		>(),
		textFilePaths: text("text_file_paths", { mode: "json" }).$type<
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
		planSpec: text("plan_spec", { mode: "json" }).$type<{
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
		// F258: worktree + locking + pipeline fields
		useWorktree: integer("use_worktree", { mode: "boolean" }).default(false),
		locked: integer("locked", { mode: "boolean" }).default(false),
		lockedBy: text("locked_by"),
		lockedAt: integer("locked_at", { mode: "timestamp_ms" }),
		pipelineStep: text("pipeline_step"),
		lastCompletedStep: text("last_completed_step"),
		retryCount: integer("retry_count").default(0),
		lastFailureAt: integer("last_failure_at", { mode: "timestamp_ms" }),
		tags: text("tags", { mode: "json" }).$type<string[]>(),
		titleGenerating: integer("title_generating", { mode: "boolean" }),
		startedAt: integer("started_at", { mode: "timestamp_ms" }),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
		completedBy: text("completed_by"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("feature_status_idx").on(table.status),
		index("feature_phase_idx").on(table.phase),
		index("feature_project_id_idx").on(table.projectId),
	],
);
