import { eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { feature } from "../schema/features";

type FeatureSelect = typeof feature.$inferSelect;
type FeatureInsert = typeof feature.$inferInsert;

export const featureRepository = {
	async findAll(): Promise<FeatureSelect[]> {
		return db.select().from(feature);
	},

	async findById(id: string): Promise<FeatureSelect | null> {
		const rows = await db.select().from(feature).where(eq(feature.id, id));
		return rows[0] ?? null;
	},

	async findByProject(projectId: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.projectId, projectId));
	},

	async findByStatus(status: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.status, status));
	},

	async create(
		data: Omit<FeatureInsert, "createdAt" | "updatedAt">,
	): Promise<FeatureSelect> {
		const rows = await db.insert(feature).values(data).returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create feature");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<Omit<FeatureInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<FeatureSelect> {
		const rows = await db
			.update(feature)
			.set(data)
			.where(eq(feature.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature not found: ${id}`);
		}
		return row;
	},

	async bulkUpdateStatus(
		ids: string[],
		status: string,
	): Promise<FeatureSelect[]> {
		if (ids.length === 0) return [];
		return db
			.update(feature)
			.set({ status })
			.where(inArray(feature.id, ids))
			.returning();
	},

	async delete(id: string): Promise<FeatureSelect> {
		const rows = await db.delete(feature).where(eq(feature.id, id)).returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature not found: ${id}`);
		}
		return row;
	},

	async findDependencies(id: string): Promise<FeatureSelect[]> {
		const parent = await this.findById(id);
		if (!parent) {
			throw new Error(`Feature not found: ${id}`);
		}
		const deps = parent.dependencies ?? [];
		if (deps.length === 0) return [];
		return db.select().from(feature).where(inArray(feature.id, deps));
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
