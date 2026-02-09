import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createSettingId } from "../lib/ids";

export const setting = pgTable(
	"setting",
	{
		id: text("id").primaryKey().$defaultFn(createSettingId),
		key: text("key").notNull(),
		value: text("value").notNull(),
		scope: text("scope").notNull(),
		scopeId: text("scope_id"),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		uniqueIndex("setting_key_scope_idx").on(
			table.key,
			table.scope,
			table.scopeId,
		),
	],
);
