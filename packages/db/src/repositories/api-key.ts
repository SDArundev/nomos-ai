import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { apiKey } from "../schema/api-keys";

type ApiKeySelect = typeof apiKey.$inferSelect;
type ApiKeyInsert = typeof apiKey.$inferInsert;

export type { ApiKeySelect, ApiKeyInsert };

export const apiKeyRepository = {
	async create(
		data: Omit<ApiKeyInsert, "id" | "createdAt" | "updatedAt">,
	): Promise<ApiKeySelect> {
		const id = crypto.randomUUID();
		const rows = await db
			.insert(apiKey)
			.values({ ...data, id })
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create API key");
		}
		return row;
	},

	async findByKeyHash(hash: string): Promise<ApiKeySelect | null> {
		const rows = await db.select().from(apiKey).where(eq(apiKey.keyHash, hash));
		return rows[0] ?? null;
	},

	async findByUser(userId: string): Promise<ApiKeySelect[]> {
		return db.select().from(apiKey).where(eq(apiKey.userId, userId));
	},

	async findById(id: string): Promise<ApiKeySelect | null> {
		const rows = await db.select().from(apiKey).where(eq(apiKey.id, id));
		return rows[0] ?? null;
	},

	async update(
		id: string,
		data: Partial<Omit<ApiKeyInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<ApiKeySelect> {
		const rows = await db
			.update(apiKey)
			.set(data)
			.where(eq(apiKey.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`API key not found: ${id}`);
		}
		return row;
	},

	async revoke(id: string): Promise<ApiKeySelect> {
		return this.update(id, { status: "revoked" });
	},

	async updateLastUsed(id: string): Promise<void> {
		await db
			.update(apiKey)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKey.id, id));
	},

	async findActiveByKeyHash(hash: string): Promise<ApiKeySelect | null> {
		const rows = await db
			.select()
			.from(apiKey)
			.where(and(eq(apiKey.keyHash, hash), eq(apiKey.status, "active")));
		return rows[0] ?? null;
	},
};
