import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { feature } from "./features";

export const featureInsight = pgTable(
	"feature_insight",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		featureId: text("feature_id")
			.notNull()
			.references(() => feature.id, { onDelete: "cascade" }),
		acceptanceCriteria: jsonb("acceptance_criteria").$type<
			Array<{ criterion: string; status: string; details?: string }>
		>(),
		discoveries: jsonb("discoveries").$type<
			Array<{
				discovery: string;
				context: string;
				lesson: string;
				benefit?: string;
				code_pattern?: string;
			}>
		>(),
		patternsApplied: jsonb("patterns_applied").$type<string[]>(),
		whatWorked: jsonb("what_worked").$type<string[]>(),
		whatFailed: jsonb("what_failed").$type<string[]>(),
		whatCouldImprove: jsonb("what_could_improve").$type<string[]>(),
		recommendations: jsonb("recommendations").$type<string[]>(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("feature_insight_feature_id_idx").on(table.featureId),
		index("feature_insight_user_id_idx").on(table.userId),
	],
);
