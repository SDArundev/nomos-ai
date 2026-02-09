import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const project = pgTable(
	"project",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		path: text("path").notNull(),
		settings: jsonb("settings")
			.$type<Record<string, unknown>>()
			.default({
				theme: "system",
				locale: "en",
				autoSaveInterval: 30,
				notifications: true,
			})
			.notNull(),
		status: text("status").notNull().default("draft"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("project_user_path_unique").on(table.userId, table.path),
		index("project_name_idx").on(table.name),
	],
);
