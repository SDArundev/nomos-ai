import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { feature } from "./features";

export const agentSession = pgTable(
	"agent_session",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		featureId: text("feature_id").references(() => feature.id, {
			onDelete: "cascade",
		}),
		projectId: text("project_id"),
		status: text("status").notNull(),
		startedAt: timestamp("started_at", {
			withTimezone: true,
			mode: "date",
		}).notNull(),
		completedAt: timestamp("completed_at", {
			withTimezone: true,
			mode: "date",
		}),
		output: text("output"),
		error: text("error"),
		sdkSessionId: text("sdk_session_id"),
		model: text("model").default("sonnet"),
		isRunning: boolean("is_running").default(false),
		workingDirectory: text("working_directory"),
		messageCount: integer("message_count").default(0),
		totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }),
		inputTokens: integer("input_tokens"),
		outputTokens: integer("output_tokens"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("agent_session_status_idx").on(table.status),
		index("agent_session_feature_id_idx").on(table.featureId),
		index("agent_session_user_id_idx").on(table.userId),
	],
);

export const agentSessionRelations = relations(agentSession, ({ one }) => ({
	feature: one(feature, {
		fields: [agentSession.featureId],
		references: [feature.id],
	}),
}));
