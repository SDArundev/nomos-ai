import { eq } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { featureMetric } from "../schema/feature-metrics";

export type FeatureMetricSelect = typeof featureMetric.$inferSelect;
export type FeatureMetricInsert = typeof featureMetric.$inferInsert;

export const featureMetricRepository = {
	async findAll(): Promise<FeatureMetricSelect[]> {
		return db.select().from(featureMetric);
	},

	async findByUser(userId: string): Promise<FeatureMetricSelect[]> {
		return db
			.select()
			.from(featureMetric)
			.where(eq(featureMetric.userId, userId));
	},

	async findById(id: string): Promise<FeatureMetricSelect | null> {
		const rows = await db
			.select()
			.from(featureMetric)
			.where(eq(featureMetric.id, id));
		return rows[0] ?? null;
	},

	async findByFeature(featureId: string): Promise<FeatureMetricSelect | null> {
		const rows = await db
			.select()
			.from(featureMetric)
			.where(eq(featureMetric.featureId, featureId));
		return rows[0] ?? null;
	},

	async findByOutcome(outcome: string): Promise<FeatureMetricSelect[]> {
		return db
			.select()
			.from(featureMetric)
			.where(eq(featureMetric.outcome, outcome));
	},

	async create(
		data: Omit<FeatureMetricInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<FeatureMetricSelect> {
		if (data.id) {
			const rows = await db
				.insert(featureMetric)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create feature metric");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(
				tx,
				featureMetric,
				"MET-",
				3,
				data,
			) as Promise<FeatureMetricSelect>;
		});
	},

	async upsert(
		data: Omit<FeatureMetricInsert, "createdAt" | "updatedAt">,
	): Promise<FeatureMetricSelect> {
		const rows = await db
			.insert(featureMetric)
			.values(data)
			.onConflictDoUpdate({
				target: featureMetric.id,
				set: {
					durationMinutes: data.durationMinutes,
					filesChanged: data.filesChanged,
					linesAdded: data.linesAdded,
					linesRemoved: data.linesRemoved,
					commits: data.commits,
					retries: data.retries,
					riskLevel: data.riskLevel,
					outcome: data.outcome,
					startedAt: data.startedAt,
					verifiedAt: data.verifiedAt,
					notes: data.notes,
				},
			})
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to upsert feature metric");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<Omit<FeatureMetricInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<FeatureMetricSelect> {
		const rows = await db
			.update(featureMetric)
			.set(data)
			.where(eq(featureMetric.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature metric not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<FeatureMetricSelect> {
		const rows = await db
			.delete(featureMetric)
			.where(eq(featureMetric.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature metric not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
