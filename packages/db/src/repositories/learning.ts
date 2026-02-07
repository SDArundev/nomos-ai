import { eq } from "drizzle-orm";
import { db } from "../index";
import { generateLearningId } from "../lib/id-generation";
import { learning } from "../schema/learnings";

export type LearningSelect = typeof learning.$inferSelect;
export type LearningInsert = typeof learning.$inferInsert;

export const learningRepository = {
	async findAll(): Promise<LearningSelect[]> {
		return db.select().from(learning);
	},

	async findById(id: string): Promise<LearningSelect | null> {
		const rows = await db.select().from(learning).where(eq(learning.id, id));
		return rows[0] ?? null;
	},

	async findByFeature(featureId: string): Promise<LearningSelect[]> {
		return db.select().from(learning).where(eq(learning.featureId, featureId));
	},

	async findByCategory(category: string): Promise<LearningSelect[]> {
		return db.select().from(learning).where(eq(learning.category, category));
	},

	async create(
		data: Omit<LearningInsert, "id" | "createdAt" | "updatedAt"> & { id?: string },
	): Promise<LearningSelect> {
		const id = data.id ?? (await generateLearningId());
		const rows = await db.insert(learning).values({ ...data, id }).returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create learning");
		}
		return row;
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
		const rows = await db.delete(learning).where(eq(learning.id, id)).returning();
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
