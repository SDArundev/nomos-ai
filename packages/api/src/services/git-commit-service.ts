import { featureRepository, worktreeRepository } from "@nomos-ai/db";
import {
	type GitStatus,
	git,
	gitAddAll,
	gitCommit,
	gitStatus,
} from "../lib/git-utils";
import type { IEventService } from "./event-service";

export interface CommitResult {
	hash: string;
	filesChanged: number;
	message: string;
}

export class GitCommitService {
	constructor(private events: IEventService) {}

	/**
	 * Commit all changes in a feature's worktree using a conventional commit message.
	 * Resets .nomos/ from staging before committing.
	 */
	async commitFeature(
		featureId: string,
		_projectRoot: string,
	): Promise<CommitResult> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		const feature = await featureRepository.findById(featureId);
		if (!feature) {
			throw new Error(`Feature not found: ${featureId}`);
		}

		const cwd = worktree.path;

		// Stage all changes
		await gitAddAll(cwd);

		// Reset .nomos/ directory from staging (don't commit config/output files)
		try {
			await git(["reset", "HEAD", "--", ".nomos/"], cwd);
		} catch {
			// .nomos/ may not exist in worktree — that's fine
		}

		// Check if there's anything to commit
		const status = await gitStatus(cwd);
		if (
			status.staged.length === 0 &&
			status.unstaged.length === 0 &&
			status.untracked.length === 0
		) {
			throw new Error("Nothing to commit — working tree clean");
		}

		// Build conventional commit message
		const message = `feat(${featureId}): ${feature.title}`;

		// Commit
		const hash = await gitCommit(message, cwd);

		const result: CommitResult = {
			hash,
			filesChanged: status.staged.length,
			message,
		};

		// Emit event
		this.events.emit("worktree:init-completed", {
			featureId,
			userId: feature.userId,
			type: "git:commit",
			hash,
		});

		return result;
	}

	/**
	 * Get the git status of a worktree.
	 */
	async getStatus(worktreePath: string): Promise<GitStatus> {
		return gitStatus(worktreePath);
	}

	/**
	 * Verify that the working tree is clean (no uncommitted changes).
	 * Returns clean status and list of uncommitted files if dirty.
	 */
	async verifyCleanState(worktreePath: string): Promise<{
		clean: boolean;
		uncommittedFiles: string[];
	}> {
		const status = await gitStatus(worktreePath);
		const uncommittedFiles = [
			...status.staged,
			...status.unstaged,
			...status.untracked,
		];
		return {
			clean: uncommittedFiles.length === 0,
			uncommittedFiles,
		};
	}
}
