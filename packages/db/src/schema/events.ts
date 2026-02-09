import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createEventId } from "../lib/ids";
import { feature } from "./features";
import { agentSession } from "./sessions";

export const event = pgTable("event", {
	id: text("id").primaryKey().$defaultFn(createEventId),
	type: text("type").notNull(),
	payload: text("payload"),
	featureId: text("feature_id").references(() => feature.id, {
		onDelete: "set null",
	}),
	projectId: text("project_id"),
	sessionId: text("session_id").references(() => agentSession.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
		.notNull()
		.$defaultFn(() => new Date()),
}, (table) => [
	index("event_type_idx").on(table.type),
	index("event_created_at_idx").on(table.createdAt),
	index("event_project_type_idx").on(table.projectId, table.type),
]);
