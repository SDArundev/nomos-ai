import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { feature } from "./features";

export const learning = pgTable(
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
		context: jsonb("context").$type<{
			problem?: string;
			solution?: string;
			codeExample?: string;
			gotcha?: string;
			recommendation?: string;
		}>(),
		severity: text("severity"),
		tags: jsonb("tags").$type<string[]>(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("learning_category_idx").on(table.category),
		index("learning_feature_id_idx").on(table.featureId),
	],
);
