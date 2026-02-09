import { and, count, eq } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { learning } from "../schema/learnings";

export type LearningSelect = typeof learning.$inferSelect;
export type LearningInsert = typeof learning.$inferInsert;

export interface PaginatedLearningResult {
	rows: LearningSelect[];
	total: number;
}

export const learningRepository = {
	async findAll(): Promise<LearningSelect[]> {
		return db.select().from(learning);
	},

	async findPaginated(params: {
		limit?: number;
		offset?: number;
		userId?: string;
	}): Promise<PaginatedLearningResult> {
		const limit = Math.min(params.limit ?? 50, 200);
		const offset = params.offset ?? 0;

		const where = params.userId
			? eq(learning.userId, params.userId)
			: undefined;

		const [rows, totalResult] = await Promise.all([
			db
				.select()
				.from(learning)
				.where(where)
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(learning)
				.where(where),
		]);

		return {
			rows,
			total: totalResult[0]?.count ?? 0,
		};
	},

	async findByUser(userId: string): Promise<LearningSelect[]> {
		return db.select().from(learning).where(eq(learning.userId, userId));
	},

	async findById(id: string): Promise<LearningSelect | null> {
		const rows = await db.select().from(learning).where(eq(learning.id, id));
		return rows[0] ?? null;
	},

	async findByUserAndFeature(
		userId: string,
		featureId: string,
	): Promise<LearningSelect[]> {
		return db
			.select()
			.from(learning)
			.where(
				and(eq(learning.userId, userId), eq(learning.featureId, featureId)),
			);
	},

	async findByUserAndCategory(
		userId: string,
		category: string,
	): Promise<LearningSelect[]> {
		return db
			.select()
			.from(learning)
			.where(and(eq(learning.userId, userId), eq(learning.category, category)));
	},

	async findByFeature(featureId: string): Promise<LearningSelect[]> {
		return db.select().from(learning).where(eq(learning.featureId, featureId));
	},

	async findByCategory(category: string): Promise<LearningSelect[]> {
		return db.select().from(learning).where(eq(learning.category, category));
	},

	async create(
		data: Omit<LearningInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<LearningSelect> {
		if (data.id) {
			const rows = await db
				.insert(learning)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create learning");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(
				tx,
				learning,
				"L",
				3,
				data,
			) as Promise<LearningSelect>;
		});
	},

	async update(
		id: string,
		data: Partial<Omit<LearningInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<LearningSelect> {
		const rows = await db
			.update(learning)
			.set(data)
			.where(eq(learning.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Learning not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<LearningSelect> {
		const rows = await db
			.delete(learning)
			.where(eq(learning.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Learning not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
