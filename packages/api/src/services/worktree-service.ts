import { resolve } from "node:path";
import { featureRepository, worktreeRepository } from "@nomos-ai/db";
import {
	branchExists,
	createBranch,
	worktreeAdd,
	worktreeRemove,
} from "../lib/git-utils";
import type { EventService } from "./event-service";

/** Allowed base directories for project roots */
const ALLOWED_ROOTS = ["/home", "/Users", "/tmp", "/var/projects"];

function validateProjectRoot(projectRoot: string): string {
	const resolved = resolve(projectRoot);
	if (!ALLOWED_ROOTS.some((root) => resolved.startsWith(`${root}/`))) {
		throw new Error("projectRoot must be under an allowed directory");
	}
	return resolved;
}

interface CreateWorktreeInput {
	featureId: string;
	branchName: string;
	projectRoot: string;
	baseBranch?: string;
}

export class WorktreeService {
	constructor(private events: EventService) {}

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
