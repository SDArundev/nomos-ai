import { eq } from "drizzle-orm";
import { db } from "../index";
import { generateInsightId } from "../lib/id-generation";
import { featureInsight } from "../schema/feature-insights";

export type FeatureInsightSelect = typeof featureInsight.$inferSelect;
export type FeatureInsightInsert = typeof featureInsight.$inferInsert;

export const featureInsightRepository = {
	async findAll(): Promise<FeatureInsightSelect[]> {
		return db.select().from(featureInsight);
	},

	async findByUser(userId: string): Promise<FeatureInsightSelect[]> {
		return db
			.select()
			.from(featureInsight)
			.where(eq(featureInsight.userId, userId));
	},

	async findById(id: string): Promise<FeatureInsightSelect | null> {
		const rows = await db
			.select()
			.from(featureInsight)
			.where(eq(featureInsight.id, id));
		return rows[0] ?? null;
	},

	async findByFeature(featureId: string): Promise<FeatureInsightSelect | null> {
		const rows = await db
			.select()
			.from(featureInsight)
			.where(eq(featureInsight.featureId, featureId));
		return rows[0] ?? null;
	},

	async create(
		data: Omit<FeatureInsightInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<FeatureInsightSelect> {
		const id = data.id ?? (await generateInsightId());
		const rows = await db
			.insert(featureInsight)
			.values({ ...data, id })
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create feature insight");
		}
		return row;
	},

	async upsert(
		data: Omit<FeatureInsightInsert, "createdAt" | "updatedAt">,
	): Promise<FeatureInsightSelect> {
		const rows = await db
			.insert(featureInsight)
			.values(data)
			.onConflictDoUpdate({
				target: featureInsight.id,
				set: {
					acceptanceCriteria: data.acceptanceCriteria,
					discoveries: data.discoveries,
					patternsApplied: data.patternsApplied,
					whatWorked: data.whatWorked,
					whatFailed: data.whatFailed,
					whatCouldImprove: data.whatCouldImprove,
					recommendations: data.recommendations,
				},
			})
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to upsert feature insight");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<
			Omit<FeatureInsightInsert, "id" | "createdAt" | "updatedAt">
		>,
	): Promise<FeatureInsightSelect> {
		const rows = await db
			.update(featureInsight)
			.set(data)
			.where(eq(featureInsight.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature insight not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<FeatureInsightSelect> {
		const rows = await db
			.delete(featureInsight)
			.where(eq(featureInsight.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature insight not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
