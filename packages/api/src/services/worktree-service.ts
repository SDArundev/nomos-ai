import { worktreeRepository } from "@nomos-ai/db";
import type { EventService } from "./event-service";
import {
	branchExists,
	createBranch,
	worktreeAdd,
	worktreeRemove,
} from "../lib/git-utils";

interface CreateWorktreeInput {
	featureId: string;
	branchName: string;
	projectRoot: string;
	baseBranch?: string;
}

export class WorktreeService {
	constructor(private events: EventService) {}

	async create(input: CreateWorktreeInput) {
		const { featureId, branchName, projectRoot, baseBranch = "main" } = input;
		const worktreePath = `${projectRoot}/.worktrees/${featureId}`;

		this.events.emit("worktree:init-started", { featureId });

		// Create branch if it doesn't exist
		if (!(await branchExists(branchName, projectRoot))) {
			await createBranch(branchName, baseBranch, projectRoot);
		}

		// Create worktree
		await worktreeAdd(worktreePath, branchName, projectRoot);

		// Persist to DB
		const worktree = await worktreeRepository.create({
			featureId,
			branchName,
			path: worktreePath,
		});

		this.events.emit("worktree:init-completed", { featureId });
		return worktree;
	}

	async remove(featureId: string, projectRoot: string): Promise<void> {
		const worktree = await worktreeRepository.findByFeatureId(featureId);
		if (!worktree) return;

		try {
			await worktreeRemove(worktree.path, projectRoot);
		} catch {
			// Worktree may already be removed from disk
		}

		await worktreeRepository.markRemoved(worktree.id);
	}

	async findByFeatureId(featureId: string) {
		return worktreeRepository.findByFeatureId(featureId);
	}

	async listActive() {
		return worktreeRepository.findActive();
	}
}
