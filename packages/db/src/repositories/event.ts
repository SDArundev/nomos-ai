import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { event } from "../schema/events";

export type EventSelect = typeof event.$inferSelect;
export type EventInsert = typeof event.$inferInsert;

export const eventRepository = {
	async create(
		data: Omit<EventInsert, "id" | "createdAt">,
	): Promise<EventSelect> {
		const rows = await db.insert(event).values(data).returning();
		const row = rows[0];
		if (!row) throw new Error("Failed to create event");
		return row;
	},

	async findByType(type: string, limit = 50): Promise<EventSelect[]> {
		return db
			.select()
			.from(event)
			.where(eq(event.type, type))
			.orderBy(desc(event.createdAt))
			.limit(limit);
	},

	async findByFeatureId(featureId: string): Promise<EventSelect[]> {
		return db
			.select()
			.from(event)
			.where(eq(event.featureId, featureId))
			.orderBy(desc(event.createdAt));
	},

	async findByProjectId(
		projectId: string,
		limit = 50,
	): Promise<EventSelect[]> {
		return db
			.select()
			.from(event)
			.where(eq(event.projectId, projectId))
			.orderBy(desc(event.createdAt))
			.limit(limit);
	},

	async findByTypePrefix(
		prefix: string,
		limit = 50,
	): Promise<EventSelect[]> {
		const rows = await db
			.select()
			.from(event)
			.orderBy(desc(event.createdAt))
			.limit(limit);
		return rows.filter((e) => e.type.startsWith(prefix));
	},

	async findRecent(limit = 50): Promise<EventSelect[]> {
		return db.select().from(event).orderBy(desc(event.createdAt)).limit(limit);
	},
};
