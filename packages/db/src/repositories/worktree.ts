import { and, eq, isNull } from "drizzle-orm";
import { db } from "../index";
import { worktree } from "../schema/worktrees";

export type WorktreeSelect = typeof worktree.$inferSelect;
export type WorktreeInsert = typeof worktree.$inferInsert;

export const worktreeRepository = {
	async create(
		data: Omit<WorktreeInsert, "id" | "createdAt">,
	): Promise<WorktreeSelect> {
		const rows = await db.insert(worktree).values(data).returning();
		const row = rows[0];
		if (!row) throw new Error("Failed to create worktree");
		return row;
	},

	async findByFeatureId(
		featureId: string,
	): Promise<WorktreeSelect | undefined> {
		const rows = await db
			.select()
			.from(worktree)
			.where(
				and(
					eq(worktree.featureId, featureId),
					isNull(worktree.removedAt),
				),
			);
		return rows[0];
	},

	async findByBranchName(
		branchName: string,
	): Promise<WorktreeSelect | undefined> {
		const rows = await db
			.select()
			.from(worktree)
			.where(
				and(
					eq(worktree.branchName, branchName),
					isNull(worktree.removedAt),
				),
			);
		return rows[0];
	},

	async updatePR(
		id: string,
		pr: {
			prNumber: number;
			prUrl: string;
			prTitle: string;
			prState: string;
			prCreatedAt: string;
		},
	): Promise<void> {
		await db.update(worktree).set(pr).where(eq(worktree.id, id));
	},

	async markRemoved(id: string): Promise<void> {
		await db
			.update(worktree)
			.set({ removedAt: new Date() })
			.where(eq(worktree.id, id));
	},

	async findActive(): Promise<WorktreeSelect[]> {
		return db
			.select()
			.from(worktree)
			.where(isNull(worktree.removedAt));
	},
};
