import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createMessageId } from "../lib/ids";
import { agentSession } from "./sessions";

export const message = pgTable(
	"message",
	{
		id: text("id").primaryKey().$defaultFn(createMessageId),
		sessionId: text("session_id")
			.notNull()
			.references(() => agentSession.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		content: text("content").notNull(),
		toolCalls: jsonb("tool_calls").$type<
			Array<{
				id: string;
				name: string;
				input: unknown;
				result?: string;
				startedAt?: number;
				completedAt?: number;
			}>
		>(),
		thinkingContent: text("thinking_content"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("message_session_id_idx").on(table.sessionId)],
);
