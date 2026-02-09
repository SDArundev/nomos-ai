import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createNotificationId } from "../lib/ids";
import { feature } from "./features";
import { project } from "./projects";

export const notification = pgTable(
	"notification",
	{
		id: text("id").primaryKey().$defaultFn(createNotificationId),
		type: text("type").notNull(),
		title: text("title").notNull(),
		message: text("message").notNull(),
		read: boolean("read").default(false),
		dismissed: boolean("dismissed").default(false),
		featureId: text("feature_id").references(() => feature.id, {
			onDelete: "set null",
		}),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("notification_project_id_idx").on(table.projectId)],
);
