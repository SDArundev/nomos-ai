import { worktreeRepository } from "@nomos-ai/db";
import {
	type DiffStat,
	type GitLogEntry,
	gitDiff,
	gitDiffStat,
	gitLog,
} from "../lib/git-utils";

export interface DiffResult {
	featureId: string;
	branch: string;
	diff: string;
	stat: DiffStat;
}

export class GitDiffService {
	/**
	 * Get the full diff between a feature branch and main.
	 */
	async getDiff(featureId: string, _projectRoot: string): Promise<DiffResult> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		const [diff, stat] = await Promise.all([
			gitDiff("main", worktree.branchName, worktree.path),
			gitDiffStat("main", worktree.branchName, worktree.path),
		]);

		return {
			featureId,
			branch: worktree.branchName,
			diff,
			stat,
		};
	}

	/**
	 * Get only the diff stat (summary) between a feature branch and main.
	 */
	async getDiffStat(
		featureId: string,
		_projectRoot: string,
	): Promise<DiffStat> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		return gitDiffStat("main", worktree.branchName, worktree.path);
	}

	/**
	 * Get the git log for a feature's worktree.
	 */
	async getLog(featureId: string, count = 20): Promise<GitLogEntry[]> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) {
			throw new Error(`No active worktree found for feature ${featureId}`);
		}

		return gitLog(count, worktree.path);
	}
}
