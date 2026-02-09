import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createWorktreeId } from "../lib/ids";
import { feature } from "./features";

export const worktree = pgTable(
	"worktree",
	{
		id: text("id").primaryKey().$defaultFn(createWorktreeId),
		featureId: text("feature_id")
			.notNull()
			.references(() => feature.id, { onDelete: "cascade" }),
		branchName: text("branch_name").notNull(),
		path: text("path").notNull(),
		prNumber: integer("pr_number"),
		prUrl: text("pr_url"),
		prTitle: text("pr_title"),
		prState: text("pr_state"),
		prCreatedAt: text("pr_created_at"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.notNull()
			.$defaultFn(() => new Date()),
		removedAt: timestamp("removed_at", { withTimezone: true, mode: "date" }),
	},
	(table) => [index("worktree_feature_id_idx").on(table.featureId)],
);
