import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const pattern = pgTable(
	"pattern",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		name: text("name").notNull(),
		description: text("description").notNull(),
		category: text("category").notNull(),
		confidence: real("confidence").notNull().default(0.5),
		evidenceCount: integer("evidence_count").default(0),
		successRate: real("success_rate").default(0),
		riskIfIgnored: text("risk_if_ignored"),
		codeExample: text("code_example"),
		recommendation: text("recommendation"),
		appliesTo: jsonb("applies_to").$type<string[]>(),
		featuresApplied: jsonb("features_applied").$type<string[]>(),
		featuresSucceeded: jsonb("features_succeeded").$type<string[]>(),
		firstSeen: text("first_seen"),
		lastSeen: text("last_seen"),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("pattern_category_idx").on(table.category),
		index("pattern_user_id_idx").on(table.userId),
		index("pattern_confidence_idx").on(table.confidence),
		check("confidence_range", sql`confidence >= 0 AND confidence <= 1`),
		check("success_rate_range", sql`success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 1)`),
		check("status_enum", sql`status IN ('active', 'proven', 'archived')`),
	],
);
