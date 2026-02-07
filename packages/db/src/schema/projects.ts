import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const project = sqliteTable(
	"project",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		path: text("path").notNull(),
		settings: text("settings", { mode: "json" })
			.$type<Record<string, unknown>>()
			.default({ theme: "system", locale: "en", autoSaveInterval: 30, notifications: true })
			.notNull(),
		status: text("status").notNull().default("draft"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("project_user_path_unique").on(table.userId, table.path),
		index("project_name_idx").on(table.name),
	],
);
