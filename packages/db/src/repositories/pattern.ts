import { and, eq, gte } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { pattern } from "../schema/patterns";

export type PatternSelect = typeof pattern.$inferSelect;
export type PatternInsert = typeof pattern.$inferInsert;

export const patternRepository = {
	async findAll(): Promise<PatternSelect[]> {
		return db.select().from(pattern);
	},

	async findByUser(userId: string): Promise<PatternSelect[]> {
		return db.select().from(pattern).where(eq(pattern.userId, userId));
	},

	async findById(id: string): Promise<PatternSelect | null> {
		const rows = await db.select().from(pattern).where(eq(pattern.id, id));
		return rows[0] ?? null;
	},

	async findByCategory(category: string): Promise<PatternSelect[]> {
		return db.select().from(pattern).where(eq(pattern.category, category));
	},

	async findRelevant(
		category?: string,
		minConfidence = 0.7,
	): Promise<PatternSelect[]> {
		const conditions = [
			gte(pattern.confidence, minConfidence),
			eq(pattern.status, "active"),
		];
		if (category) {
			conditions.push(eq(pattern.category, category));
		}
		return db
			.select()
			.from(pattern)
			.where(and(...conditions));
	},

	async create(
		data: Omit<PatternInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<PatternSelect> {
		if (data.id) {
			const rows = await db
				.insert(pattern)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create pattern");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(
				tx,
				pattern,
				"PAT-",
				3,
				data,
			) as Promise<PatternSelect>;
		});
	},

	async upsert(
		data: Omit<PatternInsert, "createdAt" | "updatedAt">,
	): Promise<PatternSelect> {
		const rows = await db
			.insert(pattern)
			.values(data)
			.onConflictDoUpdate({
				target: pattern.id,
				set: {
					name: data.name,
					description: data.description,
					category: data.category,
					confidence: data.confidence,
					evidenceCount: data.evidenceCount,
					successRate: data.successRate,
					riskIfIgnored: data.riskIfIgnored,
					codeExample: data.codeExample,
					recommendation: data.recommendation,
					appliesTo: data.appliesTo,
					featuresApplied: data.featuresApplied,
					featuresSucceeded: data.featuresSucceeded,
					firstSeen: data.firstSeen,
					lastSeen: data.lastSeen,
					status: data.status,
				},
			})
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to upsert pattern");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<Omit<PatternInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<PatternSelect> {
		const rows = await db
			.update(pattern)
			.set(data)
			.where(eq(pattern.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Pattern not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<PatternSelect> {
		const rows = await db.delete(pattern).where(eq(pattern.id, id)).returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Pattern not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
