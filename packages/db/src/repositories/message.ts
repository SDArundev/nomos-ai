import { asc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { message } from "../schema/messages";

export type MessageSelect = typeof message.$inferSelect;
export type MessageInsert = typeof message.$inferInsert;

export const messageRepository = {
	async create(
		data: Omit<MessageInsert, "id" | "createdAt">,
	): Promise<MessageSelect> {
		const rows = await db.insert(message).values(data).returning();
		const row = rows[0];
		if (!row) throw new Error("Failed to create message");
		return row;
	},

	async findBySessionId(sessionId: string): Promise<MessageSelect[]> {
		return db
			.select()
			.from(message)
			.where(eq(message.sessionId, sessionId))
			.orderBy(asc(message.createdAt));
	},

	async deleteBySessionId(sessionId: string): Promise<void> {
		await db.delete(message).where(eq(message.sessionId, sessionId));
	},

	async countBySessionId(sessionId: string): Promise<number> {
		const result = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(message)
			.where(eq(message.sessionId, sessionId));
		return result[0]?.count ?? 0;
	},
};
