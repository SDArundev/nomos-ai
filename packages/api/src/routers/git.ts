import { featureRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { GitCommitService } from "../services/git-commit-service";
import { GitDiffService } from "../services/git-diff-service";
import { GitMergeService } from "../services/git-merge-service";
import { getEventService } from "./agent";

let commitServiceInstance: GitCommitService | null = null;
let mergeServiceInstance: GitMergeService | null = null;
let diffServiceInstance: GitDiffService | null = null;

function getCommitService(): GitCommitService {
	if (!commitServiceInstance) {
		commitServiceInstance = new GitCommitService(getEventService());
	}
	return commitServiceInstance;
}

function getMergeService(): GitMergeService {
	if (!mergeServiceInstance) {
		mergeServiceInstance = new GitMergeService(getEventService());
	}
	return mergeServiceInstance;
}

function getDiffService(): GitDiffService {
	if (!diffServiceInstance) {
		diffServiceInstance = new GitDiffService();
	}
	return diffServiceInstance;
}

async function verifyFeatureOwnership(featureId: string, userId: string) {
	const feature = await featureRepository.findById(featureId);
	if (!feature || feature.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return feature;
}

export const gitRouter = {
	status: protectedProcedure
		.input(z.object({ featureId: z.string().min(1) }))
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getCommitService();
			// Get worktree path from the commit service's status method
			const { worktreeRepository } = await import("@nomos-ai/db");
			const worktree = await worktreeRepository.findByFeatureId(
				input.featureId,
			);
			if (!worktree) {
				throw new ORPCError("NOT_FOUND", {
					message: `No worktree for feature ${input.featureId}`,
				});
			}
			return service.getStatus(worktree.path);
		}),

	commit: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				projectRoot: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getCommitService();
			return service.commitFeature(input.featureId, input.projectRoot);
		}),

	push: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				force: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getMergeService();
			return service.pushBranch(input.featureId, input.force);
		}),

	diff: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				projectRoot: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getDiffService();
			return service.getDiff(input.featureId, input.projectRoot);
		}),

	diffStat: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				projectRoot: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getDiffService();
			return service.getDiffStat(input.featureId, input.projectRoot);
		}),

	log: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				count: z.number().int().min(1).max(100).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getDiffService();
			return service.getLog(input.featureId, input.count);
		}),

	merge: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
				projectRoot: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyFeatureOwnership(input.featureId, context.session.user.id);
			const service = getMergeService();
			return service.mergeToMain(input.featureId, input.projectRoot);
		}),
};
