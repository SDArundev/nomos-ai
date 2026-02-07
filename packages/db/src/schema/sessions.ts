import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { feature } from "./features";

export const agentSession = sqliteTable(
	"agent_session",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		featureId: text("feature_id").references(() => feature.id, {
			onDelete: "cascade",
		}),
		projectId: text("project_id"),
		status: text("status").notNull(),
		startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
		completedAt: integer("completed_at", { mode: "timestamp_ms" }),
		output: text("output"),
		error: text("error"),
		// F258: SDK session + model + running state
		sdkSessionId: text("sdk_session_id"),
		model: text("model").default("sonnet"),
		isRunning: integer("is_running", { mode: "boolean" }).default(false),
		workingDirectory: text("working_directory"),
		messageCount: integer("message_count").default(0),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("agent_session_status_idx").on(table.status),
		index("agent_session_feature_id_idx").on(table.featureId),
	],
);

export const agentSessionRelations = relations(agentSession, ({ one }) => ({
	feature: one(feature, {
		fields: [agentSession.featureId],
		references: [feature.id],
	}),
}));
