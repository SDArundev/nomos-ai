import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { antipattern } from "../schema/antipatterns";

export type AntipatternSelect = typeof antipattern.$inferSelect;
export type AntipatternInsert = typeof antipattern.$inferInsert;

export const antipatternRepository = {
	async findAll(): Promise<AntipatternSelect[]> {
		return db.select().from(antipattern);
	},

	async findByUser(userId: string): Promise<AntipatternSelect[]> {
		return db.select().from(antipattern).where(eq(antipattern.userId, userId));
	},

	async findById(id: string): Promise<AntipatternSelect | null> {
		const rows = await db
			.select()
			.from(antipattern)
			.where(eq(antipattern.id, id));
		return rows[0] ?? null;
	},

	async findByCategory(
		category?: string,
		userId?: string,
	): Promise<AntipatternSelect[]> {
		const conditions = [];
		if (category) {
			conditions.push(eq(antipattern.category, category));
		}
		if (userId) {
			conditions.push(eq(antipattern.userId, userId));
		}
		if (conditions.length === 0) {
			return db.select().from(antipattern);
		}
		return db
			.select()
			.from(antipattern)
			.where(and(...conditions));
	},

	async findBySeverity(severity: string): Promise<AntipatternSelect[]> {
		return db
			.select()
			.from(antipattern)
			.where(eq(antipattern.severity, severity));
	},

	async create(
		data: Omit<AntipatternInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<AntipatternSelect> {
		if (data.id) {
			const rows = await db
				.insert(antipattern)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create antipattern");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(
				tx,
				antipattern,
				"ANTI-",
				3,
				data,
			) as Promise<AntipatternSelect>;
		});
	},

	async upsert(
		data: Omit<AntipatternInsert, "createdAt" | "updatedAt">,
	): Promise<AntipatternSelect> {
		const rows = await db
			.insert(antipattern)
			.values(data)
			.onConflictDoUpdate({
				target: antipattern.id,
				set: {
					name: data.name,
					description: data.description,
					category: data.category,
					severity: data.severity,
					evidenceCount: data.evidenceCount,
					prevention: data.prevention,
					whatWentWrong: data.whatWentWrong,
					lesson: data.lesson,
					fixApplied: data.fixApplied,
					lastSeen: data.lastSeen,
				},
			})
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to upsert antipattern");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<Omit<AntipatternInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<AntipatternSelect> {
		const rows = await db
			.update(antipattern)
			.set(data)
			.where(eq(antipattern.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Antipattern not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<AntipatternSelect> {
		const rows = await db
			.delete(antipattern)
			.where(eq(antipattern.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Antipattern not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
