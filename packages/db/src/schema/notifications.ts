import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createNotificationId } from "../lib/ids";

export const notification = sqliteTable(
	"notification",
	{
		id: text("id").primaryKey().$defaultFn(createNotificationId),
		type: text("type").notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		read: integer("read", { mode: "boolean" }).default(false),
		dismissed: integer("dismissed", { mode: "boolean" }).default(false),
		featureId: text("feature_id"),
		projectId: text("project_id").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("notification_project_id_idx").on(table.projectId)],
);
