import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { feature } from "../schema/features";

export type FeatureSelect = typeof feature.$inferSelect;
export type FeatureInsert = typeof feature.$inferInsert;

export interface PaginatedResult<T> {
	rows: T[];
	total: number;
}

export const featureRepository = {
	async findAll(): Promise<FeatureSelect[]> {
		return db.select().from(feature);
	},

	async findPaginated(params: {
		limit?: number;
		offset?: number;
		userId?: string;
	}): Promise<PaginatedResult<FeatureSelect>> {
		const limit = Math.min(params.limit ?? 50, 200);
		const offset = params.offset ?? 0;

		const where = params.userId ? eq(feature.userId, params.userId) : undefined;

		const [rows, totalResult] = await Promise.all([
			db
				.select()
				.from(feature)
				.where(where)
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(feature)
				.where(where),
		]);

		return {
			rows,
			total: totalResult[0]?.count ?? 0,
		};
	},

	async findById(id: string): Promise<FeatureSelect | null> {
		const rows = await db.select().from(feature).where(eq(feature.id, id));
		return rows[0] ?? null;
	},

	async findByUser(userId: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.userId, userId));
	},

	async findByUserAndStatus(
		userId: string,
		status: string,
	): Promise<FeatureSelect[]> {
		return db
			.select()
			.from(feature)
			.where(and(eq(feature.userId, userId), eq(feature.status, status)));
	},

	async findByUserAndPhase(
		userId: string,
		phase: string,
	): Promise<FeatureSelect[]> {
		return db
			.select()
			.from(feature)
			.where(and(eq(feature.userId, userId), eq(feature.phase, phase)));
	},

	async findByUserStatusAndPhase(
		userId: string,
		status: string,
		phase: string,
	): Promise<FeatureSelect[]> {
		return db
			.select()
			.from(feature)
			.where(
				and(
					eq(feature.userId, userId),
					eq(feature.status, status),
					eq(feature.phase, phase),
				),
			);
	},

	async findByUserAndProject(
		userId: string,
		projectId: string,
	): Promise<FeatureSelect[]> {
		return db
			.select()
			.from(feature)
			.where(and(eq(feature.userId, userId), eq(feature.projectId, projectId)));
	},

	async findByProject(projectId: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.projectId, projectId));
	},

	async findByStatus(status: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.status, status));
	},

	async findByPhase(phase: string): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.phase, phase));
	},

	async findByStatusAndPhase(
		status: string,
		phase: string,
	): Promise<FeatureSelect[]> {
		return db
			.select()
			.from(feature)
			.where(and(eq(feature.status, status), eq(feature.phase, phase)));
	},

	async create(
		data: Omit<FeatureInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<FeatureSelect> {
		if (data.id) {
			const rows = await db
				.insert(feature)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create feature");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(tx, feature, "F", 3, data) as Promise<FeatureSelect>;
		});
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
		if (ids.length === 0) {
			throw new Error("Cannot bulk update status: ids array is empty");
		}
		return db.transaction(async (tx) => {
			const existing = await tx
				.select()
				.from(feature)
				.where(inArray(feature.id, ids));
			const existingIds = new Set(existing.map((r) => r.id));
			const missingIds = ids.filter((id) => !existingIds.has(id));
			if (missingIds.length > 0) {
				throw new Error(`Features not found: ${missingIds.join(", ")}`);
			}
			return tx
				.update(feature)
				.set({ status })
				.where(inArray(feature.id, ids))
				.returning();
		});
	},

	async bulkUpdateStatusWithValidation(
		ids: string[],
		status: string,
		validTransitions: Record<string, string[]>,
	): Promise<FeatureSelect[]> {
		if (ids.length === 0) {
			throw new Error("Cannot bulk update status: ids array is empty");
		}
		return db.transaction(async (tx) => {
			// Fetch full feature records for validation
			const features = await tx
				.select()
				.from(feature)
				.where(inArray(feature.id, ids));

			// Check for missing features
			const existingIds = new Set(features.map((r) => r.id));
			const missingIds = ids.filter((id) => !existingIds.has(id));
			if (missingIds.length > 0) {
				throw new Error(`Features not found: ${missingIds.join(", ")}`);
			}

			// Validate all status transitions
			const invalid: string[] = [];
			for (const feat of features) {
				const allowed = validTransitions[feat.status];
				if (!allowed || !allowed.includes(status)) {
					invalid.push(`${feat.id}: ${feat.status} → ${status}`);
				}
			}

			if (invalid.length > 0) {
				throw new Error(`Invalid status transitions: ${invalid.join(", ")}`);
			}

			// Perform the bulk update
			return tx
				.update(feature)
				.set({ status })
				.where(inArray(feature.id, ids))
				.returning();
		});
	},

	async delete(id: string): Promise<FeatureSelect> {
		const rows = await db.delete(feature).where(eq(feature.id, id)).returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Feature not found: ${id}`);
		}
		return row;
	},

	async incrementRetryCount(id: string): Promise<void> {
		const feat = await this.findById(id);
		if (!feat) throw new Error(`Feature not found: ${id}`);
		await db
			.update(feature)
			.set({
				retryCount: (feat.retryCount ?? 0) + 1,
				lastFailureAt: new Date(),
			})
			.where(eq(feature.id, id));
	},

	async getRetryInfo(
		id: string,
	): Promise<{ retryCount: number; lastFailureAt: Date | null }> {
		const feat = await this.findById(id);
		if (!feat) throw new Error(`Feature not found: ${id}`);
		return {
			retryCount: feat.retryCount ?? 0,
			lastFailureAt: feat.lastFailureAt ?? null,
		};
	},

	async resetRetryCount(id: string): Promise<void> {
		await db
			.update(feature)
			.set({ retryCount: 0, lastFailureAt: null })
			.where(eq(feature.id, id));
	},

	async findByProjectWithDependencies(
		projectId: string,
	): Promise<FeatureSelect[]> {
		return db.select().from(feature).where(eq(feature.projectId, projectId));
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
