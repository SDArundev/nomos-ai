import { z } from "zod";

export const prStateSchema = z.enum(["OPEN", "MERGED", "CLOSED"]);
export type PRState = z.infer<typeof prStateSchema>;

export const worktreePRInfoSchema = z.object({
	number: z.number(),
	url: z.string().url(),
	title: z.string(),
	state: prStateSchema,
	createdAt: z.string().datetime(),
});
export type WorktreePRInfo = z.infer<typeof worktreePRInfoSchema>;

export const worktreeInfoSchema = z.object({
	id: z.string(),
	featureId: z.string(),
	branchName: z.string(),
	path: z.string(),
	pr: worktreePRInfoSchema.optional(),
	createdAt: z.date(),
	removedAt: z.date().optional(),
});
export type WorktreeInfo = z.infer<typeof worktreeInfoSchema>;
