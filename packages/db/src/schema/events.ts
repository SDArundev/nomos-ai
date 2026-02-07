import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createEventId } from "../lib/ids";

export const event = sqliteTable("event", {
	id: text("id").primaryKey().$defaultFn(createEventId),
	type: text("type").notNull(),
	payload: text("payload"),
	featureId: text("feature_id"),
	projectId: text("project_id"),
	sessionId: text("session_id"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.$defaultFn(() => new Date()),
});
