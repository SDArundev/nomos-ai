import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { feature } from "./features";

export const featureMetric = pgTable(
	"feature_metric",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		featureId: text("feature_id")
			.notNull()
			.references(() => feature.id, { onDelete: "cascade" }),
		durationMinutes: integer("duration_minutes"),
		filesChanged: integer("files_changed"),
		linesAdded: integer("lines_added"),
		linesRemoved: integer("lines_removed"),
		commits: integer("commits"),
		retries: integer("retries").default(0),
		riskLevel: text("risk_level"),
		outcome: text("outcome"),
		startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
		verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("feature_metric_feature_id_idx").on(table.featureId),
		index("feature_metric_user_id_idx").on(table.userId),
		index("feature_metric_outcome_idx").on(table.outcome),
		unique("feature_metric_feature_id_unique").on(table.featureId),
	],
);
