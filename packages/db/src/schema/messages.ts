import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createMessageId } from "../lib/ids";

export const message = sqliteTable(
	"message",
	{
		id: text("id").primaryKey().$defaultFn(createMessageId),
		sessionId: text("session_id").notNull(),
		role: text("role").notNull(),
		content: text("content").notNull(),
		toolCalls: text("tool_calls", { mode: "json" }).$type<
			Array<{
				id: string;
				name: string;
				input: unknown;
				result?: string;
			}>
		>(),
		thinkingContent: text("thinking_content"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("message_session_id_idx").on(table.sessionId)],
);
