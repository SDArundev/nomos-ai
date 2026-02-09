import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { notification } from "../schema/notifications";

export type NotificationSelect = typeof notification.$inferSelect;
export type NotificationInsert = typeof notification.$inferInsert;

export const notificationRepository = {
	async create(
		data: Omit<NotificationInsert, "id" | "createdAt">,
	): Promise<NotificationSelect> {
		const rows = await db.insert(notification).values(data).returning();
		const row = rows[0];
		if (!row) throw new Error("Failed to create notification");
		return row;
	},

	async findById(id: string): Promise<NotificationSelect | undefined> {
		const rows = await db
			.select()
			.from(notification)
			.where(eq(notification.id, id))
			.limit(1);
		return rows[0];
	},

	async findByProjectId(
		projectId: string,
		unreadOnly = false,
	): Promise<NotificationSelect[]> {
		const conditions = [eq(notification.projectId, projectId)];
		if (unreadOnly) {
			conditions.push(eq(notification.read, false));
		}
		return db
			.select()
			.from(notification)
			.where(and(...conditions))
			.orderBy(desc(notification.createdAt));
	},

	async markRead(id: string): Promise<void> {
		await db
			.update(notification)
			.set({ read: true })
			.where(eq(notification.id, id));
	},

	async markAllRead(projectId: string): Promise<void> {
		await db
			.update(notification)
			.set({ read: true })
			.where(
				and(
					eq(notification.projectId, projectId),
					eq(notification.read, false),
				),
			);
	},

	async dismiss(id: string): Promise<void> {
		await db
			.update(notification)
			.set({ dismissed: true })
			.where(eq(notification.id, id));
	},

	async countUnread(projectId: string): Promise<number> {
		const result = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(notification)
			.where(
				and(
					eq(notification.projectId, projectId),
					eq(notification.read, false),
				),
			);
		return result[0]?.count ?? 0;
	},
};
