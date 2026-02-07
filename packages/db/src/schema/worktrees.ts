import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createWorktreeId } from "../lib/ids";

export const worktree = sqliteTable(
	"worktree",
	{
		id: text("id").primaryKey().$defaultFn(createWorktreeId),
		featureId: text("feature_id").notNull(),
		branchName: text("branch_name").notNull(),
		path: text("path").notNull(),
		prNumber: integer("pr_number"),
		prUrl: text("pr_url"),
		prTitle: text("pr_title"),
		prState: text("pr_state"),
		prCreatedAt: text("pr_created_at"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
		removedAt: integer("removed_at", { mode: "timestamp_ms" }),
	},
	(table) => [index("worktree_feature_id_idx").on(table.featureId)],
);
