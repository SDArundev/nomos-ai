import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const apiKey = pgTable(
	"api_key",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		keyHash: text("key_hash").notNull().unique(),
		keyPrefix: text("key_prefix").notNull(),
		status: text("status").notNull().default("active"),
		lastUsedAt: timestamp("last_used_at", {
			withTimezone: true,
			mode: "date",
		}),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.default(sql`now()`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("api_key_userId_idx").on(table.userId),
		index("api_key_keyHash_idx").on(table.keyHash),
	],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id],
	}),
}));
