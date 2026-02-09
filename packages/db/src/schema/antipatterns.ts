import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const antipattern = pgTable(
	"antipattern",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		name: text("name").notNull(),
		description: text("description").notNull(),
		category: text("category").notNull(),
		severity: text("severity").notNull(),
		evidenceCount: integer("evidence_count").default(0),
		prevention: text("prevention"),
		whatWentWrong: text("what_went_wrong"),
		lesson: text("lesson"),
		fixApplied: text("fix_applied"),
		lastSeen: text("last_seen"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("antipattern_category_idx").on(table.category),
		index("antipattern_user_id_idx").on(table.userId),
		index("antipattern_severity_idx").on(table.severity),
		check("severity_enum", sql`severity IN ('critical', 'high', 'medium', 'low')`),
	],
);
