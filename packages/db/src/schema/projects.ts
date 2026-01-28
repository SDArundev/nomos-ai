import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const project = sqliteTable(
	"project",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		path: text("path").notNull().unique(),
		settings: text("settings", { mode: "json" })
			.$type<Record<string, unknown>>()
			.default({})
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("project_name_idx").on(table.name)],
);
