import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { feature } from "./features";

export const learning = sqliteTable(
	"learning",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		featureId: text("feature_id").references(() => feature.id, {
			onDelete: "set null",
		}),
		category: text("category").notNull(),
		pattern: text("pattern"),
		antiPattern: text("anti_pattern"),
		context: text("context", { mode: "json" }).$type<{
			problem?: string;
			solution?: string;
			codeExample?: string;
			gotcha?: string;
			recommendation?: string;
		}>(),
		severity: text("severity"),
		tags: text("tags", { mode: "json" }).$type<string[]>(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("learning_category_idx").on(table.category),
		index("learning_feature_id_idx").on(table.featureId),
	],
);
