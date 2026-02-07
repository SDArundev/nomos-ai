import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { setting } from "../schema/settings";

export type SettingSelect = typeof setting.$inferSelect;
export type SettingInsert = typeof setting.$inferInsert;

export const settingRepository = {
	async findByKeyAndScope(
		key: string,
		scope: string,
		scopeId?: string | null,
	): Promise<SettingSelect | undefined> {
		const conditions = [eq(setting.key, key), eq(setting.scope, scope)];
		if (scopeId) {
			conditions.push(eq(setting.scopeId, scopeId));
		}
		const rows = await db
			.select()
			.from(setting)
			.where(and(...conditions));
		return rows[0];
	},

	async upsert(
		data: Omit<SettingInsert, "id" | "updatedAt">,
	): Promise<SettingSelect> {
		const existing = await this.findByKeyAndScope(
			data.key,
			data.scope,
			data.scopeId,
		);

		if (existing) {
			const rows = await db
				.update(setting)
				.set({ value: data.value, updatedAt: new Date() })
				.where(eq(setting.id, existing.id))
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to update setting");
			return row;
		}

		const rows = await db.insert(setting).values(data).returning();
		const row = rows[0];
		if (!row) throw new Error("Failed to create setting");
		return row;
	},

	async deleteByScope(scope: string, scopeId: string): Promise<void> {
		await db
			.delete(setting)
			.where(and(eq(setting.scope, scope), eq(setting.scopeId, scopeId)));
	},

	async getAllForScope(
		scope: string,
		scopeId?: string | null,
	): Promise<SettingSelect[]> {
		const conditions = [eq(setting.scope, scope)];
		if (scopeId) {
			conditions.push(eq(setting.scopeId, scopeId));
		}
		return db
			.select()
			.from(setting)
			.where(and(...conditions));
	},
};
