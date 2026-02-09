import { featureRepository, worktreeRepository } from "@nomos-ai/db";
import { validateProjectRoot } from "../lib/allowed-roots";
import {
	branchExists,
	createBranch,
	worktreeAdd,
	worktreeRemove,
} from "../lib/git-utils";
import type { IEventService } from "./event-service";

interface CreateWorktreeInput {
	featureId: string;
	branchName: string;
	projectRoot: string;
	baseBranch?: string;
}

export class WorktreeService {
	constructor(private events: IEventService) {}

	async create(input: CreateWorktreeInput) {
		const { featureId, branchName, baseBranch = "main" } = input;
		const projectRoot = validateProjectRoot(input.projectRoot);
		const worktreePath = `${projectRoot}/.worktrees/${featureId}`;

		// Look up feature to get userId
		const feature = await featureRepository.findById(featureId);
		const userId = feature?.userId ?? null;

		this.events.emit("worktree:init-started", { featureId, userId });

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

		this.events.emit("worktree:init-completed", { featureId, userId });
		return worktree;
	}

	async remove(featureId: string, rawProjectRoot: string): Promise<void> {
		const projectRoot = validateProjectRoot(rawProjectRoot);
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
