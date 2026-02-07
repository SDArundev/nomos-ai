import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createSettingId } from "../lib/ids";

export const setting = sqliteTable(
	"setting",
	{
		id: text("id").primaryKey().$defaultFn(createSettingId),
		key: text("key").notNull(),
		value: text("value").notNull(),
		scope: text("scope").notNull(),
		scopeId: text("scope_id"),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
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
