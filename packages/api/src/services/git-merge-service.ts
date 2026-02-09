import { featureRepository, worktreeRepository } from "@nomos-ai/db";
import {
	gitCheckout,
	gitFetch,
	gitMerge,
	gitPush,
	gitRebase,
} from "../lib/git-utils";
import { transitionFeatureStatus } from "../lib/feature-state-machine";
import type { IEventService } from "./event-service";

export interface MergeResult {
	merged: boolean;
	branch: string;
	message: string;
}

export class GitMergeService {
	constructor(private events: IEventService) {}

	/**
	 * Push a feature branch to the remote.
	 */
	async pushBranch(
		featureId: string,
		force?: boolean,
	): Promise<{ branch: string }> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		await gitPush("origin", worktree.branchName, worktree.path, force);
		return { branch: worktree.branchName };
	}

	/**
	 * Rebase the feature branch onto the latest main.
	 */
	async rebaseOnMain(featureId: string): Promise<void> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		await gitFetch("origin", worktree.path);
		await gitRebase("origin/main", worktree.path);
	}

	/**
	 * Full merge-to-main flow: fetch, rebase, checkout main, merge --no-ff, push.
	 * Updates feature status and emits events.
	 */
	async mergeToMain(
		featureId: string,
		projectRoot: string,
	): Promise<MergeResult> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		const feature = await featureRepository.findById(featureId);
		if (!feature) {
			throw new Error(`Feature not found: ${featureId}`);
		}

		const branch = worktree.branchName;

		// 1. Fetch latest main
		await gitFetch("origin", projectRoot);

		// 2. Rebase feature branch onto origin/main
		await gitRebase("origin/main", worktree.path);

		// 3. Checkout main in the project root
		await gitCheckout("main", projectRoot);

		// 4. Merge with --no-ff for a merge commit
		const mergeOutput = await gitMerge(branch, projectRoot, true);

		// 5. Push main
		await gitPush("origin", "main", projectRoot);

		// 6. Update feature status via state machine
		await transitionFeatureStatus(featureId, "verified", {
			verifiedAt: new Date(),
		});

		// 7. Emit event
		this.events.emit("feature:verified", {
			featureId,
			userId: feature.userId,
		});

		return {
			merged: true,
			branch,
			message: mergeOutput,
		};
	}

	/**
	 * Create a pull request for a feature branch using GitHubService.
	 * Returns the PR URL.
	 */
	async createPR(
		featureId: string,
		title: string,
		body: string,
	): Promise<string> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		// Push branch first
		await gitPush("origin", worktree.branchName, worktree.path);

		// Use gh CLI to create PR
		const { GitHubService } = await import("./github-service");
		const github = new GitHubService();
		const prUrl = await github.createPR({
			title,
			body,
			branch: worktree.branchName,
			base: "main",
		});

		// Update worktree record with PR info
		const prNumber = this.extractPrNumber(prUrl);
		if (prNumber) {
			await worktreeRepository.updatePR(worktree.id, {
				prNumber,
				prUrl,
				prTitle: title,
				prState: "open",
				prCreatedAt: new Date().toISOString(),
			});
		}

		return prUrl;
	}

	private extractPrNumber(prUrl: string): number | null {
		const match = prUrl.match(/\/pull\/(\d+)/);
		return match?.[1] ? Number.parseInt(match[1], 10) : null;
	}
}
