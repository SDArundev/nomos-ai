import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { featureRepository } from "@nomos-ai/db";
import type {
	PipelineStep,
	PipelineStepId,
	PipelineStepStatus,
} from "@nomos-ai/types";
import { z } from "zod";
import type { EventService } from "./event-service";

// ---------------------------------------------------------------------------
// Checkpoint Zod schema
// ---------------------------------------------------------------------------

const checkpointEnvSchema = z.object({
	worktree_path: z.string(),
	output_dir: z.string(),
	server_port: z.number().optional(),
	web_port: z.number().optional(),
	project_root: z.string(),
});

const checkpointFlagsSchema = z.object({
	auto: z.boolean(),
	test: z.boolean(),
	merge: z.boolean(),
	cleanup: z.boolean(),
	plan_only: z.boolean(),
	verify_only: z.boolean(),
});

const checkpointFeatureSummarySchema = z.object({
	id: z.string(),
	title: z.string(),
	ac: z.array(z.string()),
	category: z.string(),
	phase: z.string(),
	dependencies: z.array(z.string()).optional(),
});

const checkpointStatusSchema = z.enum(["completed", "failed", "escalated"]);

const checkpointSchema = z.object({
	v: z.number(),
	phase: z.number().min(1).max(6),
	feature_id: z.string(),
	ts: z.string(),
	status: checkpointStatusSchema,
	env: checkpointEnvSchema,
	flags: checkpointFlagsSchema,
	feature_summary: checkpointFeatureSummarySchema,
	data: z.record(z.string(), z.unknown()),
});

export type CheckpointData = z.infer<typeof checkpointSchema>;

// ---------------------------------------------------------------------------
// Phase <-> PipelineStepId mapping (backward compat with old 7-step model)
// ---------------------------------------------------------------------------

const PHASE_TO_STEP: Record<number, { id: PipelineStepId; name: string }> = {
	1: { id: "context", name: "Understand" },
	2: { id: "plan", name: "Plan Implementation" },
	3: { id: "execute", name: "Execute" },
	4: { id: "verify", name: "Review" },
	5: { id: "merge", name: "Ship" },
	6: { id: "finish", name: "Learn" },
};

const PIPELINE_STEPS: Array<{
	id: PipelineStepId;
	name: string;
	order: number;
}> = [
	{ id: "init", name: "Initialize", order: 0 },
	{ id: "context", name: "Understand", order: 1 },
	{ id: "plan", name: "Plan Implementation", order: 2 },
	{ id: "execute", name: "Execute", order: 3 },
	{ id: "verify", name: "Review", order: 4 },
	{ id: "merge", name: "Ship", order: 5 },
	{ id: "finish", name: "Learn", order: 6 },
];

// Default output root (relative to project root)
const OUTPUT_DIR = ".nomos/output";
const POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// PipelineService — checkpoint reader + event emitter
// ---------------------------------------------------------------------------

export class PipelineService {
	private projectRoot: string | null = null;

	constructor(private events: EventService) {}

	/**
	 * Set the project root for checkpoint resolution.
	 * Must be called before polling or reading checkpoints without explicit root.
	 */
	setProjectRoot(root: string): void {
		this.projectRoot = root;
	}

	// -----------------------------------------------------------------------
	// Public: step definitions (consumed by pipeline router)
	// -----------------------------------------------------------------------

	getSteps(): typeof PIPELINE_STEPS {
		return PIPELINE_STEPS;
	}

	buildInitialSteps(): PipelineStep[] {
		return PIPELINE_STEPS.map((s) => ({
			id: s.id,
			name: s.name,
			order: s.order,
			status: "pending" as PipelineStepStatus,
		}));
	}

	// -----------------------------------------------------------------------
	// Public: checkpoint reading
	// -----------------------------------------------------------------------

	/**
	 * Read and parse a specific checkpoint file.
	 * Returns null if the file doesn't exist or fails validation.
	 */
	readCheckpoint(
		featureId: string,
		phase: number,
		projectRoot?: string,
	): CheckpointData | null {
		const root = projectRoot ?? this.projectRoot;
		if (!root) return null;

		const filePath = join(
			root,
			OUTPUT_DIR,
			featureId,
			`cp-${String(phase).padStart(2, "0")}.json`,
		);
		if (!existsSync(filePath)) return null;

		try {
			const raw = readFileSync(filePath, "utf-8");
			const parsed = JSON.parse(raw);
			return checkpointSchema.parse(parsed);
		} catch {
			return null;
		}
	}

	/**
	 * Find the highest completed checkpoint for a feature.
	 * Returns { phase, data } or null if no checkpoints exist.
	 */
	getLatestCheckpoint(
		featureId: string,
		projectRoot?: string,
	): { phase: number; data: CheckpointData } | null {
		const root = projectRoot ?? this.projectRoot;
		if (!root) return null;

		const dir = join(root, OUTPUT_DIR, featureId);
		if (!existsSync(dir)) return null;

		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			return null;
		}

		// Find cp-NN.json files, sorted descending
		const cpFiles = entries
			.filter((f) => /^cp-\d{2}\.json$/.test(f))
			.sort()
			.reverse();

		for (const file of cpFiles) {
			const phase = Number.parseInt(file.slice(3, 5), 10);
			const data = this.readCheckpoint(featureId, phase, root);
			if (data && data.status === "completed") {
				return { phase, data };
			}
		}

		return null;
	}

	// -----------------------------------------------------------------------
	// Public: checkpoint polling
	// -----------------------------------------------------------------------

	/**
	 * Poll for new checkpoints. Calls onCheckpoint when a new phase is detected.
	 * Returns a promise that resolves when polling stops.
	 *
	 * Stops when:
	 * - Phase 6 completes
	 * - A checkpoint has status "failed" or "escalated"
	 * - The abort signal fires
	 */
	pollCheckpoints(
		featureId: string,
		onCheckpoint: (cp: CheckpointData) => void,
		signal?: AbortSignal,
	): Promise<void> {
		const root = this.projectRoot;
		if (!root) {
			return Promise.reject(
				new Error("projectRoot not set — call setProjectRoot() first"),
			);
		}

		return new Promise<void>((resolve) => {
			let lastSeenPhase = 0;

			const poll = () => {
				if (signal?.aborted) {
					resolve();
					return;
				}

				// Process any new phases
				for (let p = lastSeenPhase + 1; p <= 6; p++) {
					const cp = this.readCheckpoint(featureId, p, root);
					if (!cp) break;

					onCheckpoint(cp);
					lastSeenPhase = p;

					// Stop on failure/escalation
					if (cp.status === "failed" || cp.status === "escalated") {
						resolve();
						return;
					}
				}

				// Stop after phase 6
				if (lastSeenPhase >= 6) {
					resolve();
					return;
				}

				setTimeout(poll, POLL_INTERVAL_MS);
			};

			// Start polling on next tick
			setTimeout(poll, 0);
		});
	}

	// -----------------------------------------------------------------------
	// Public: map checkpoint data to feature DB record
	// -----------------------------------------------------------------------

	/**
	 * Update the feature DB record based on checkpoint data.
	 * Emits pipeline events for WebSocket broadcasting.
	 */
	mapCheckpointToFeature(
		featureId: string,
		checkpoint: CheckpointData,
		userId?: string,
	): void {
		const step = PHASE_TO_STEP[checkpoint.phase];
		const data = checkpoint.data;

		const update: Record<string, unknown> = {
			pipelineStep: step?.id ?? null,
			lastCompletedStep: step?.id ?? null,
		};

		// Phase 2: plan overview -> summary
		if (checkpoint.phase === 2 && typeof data.plan_overview === "string") {
			update.summary = data.plan_overview;
		}

		// Phase 3: files changed -> feature files, verdict
		if (checkpoint.phase === 3) {
			if (Array.isArray(data.files_changed)) {
				update.files = { modify: data.files_changed as string[] };
			}
			if (data.verdict === "PASS") {
				update.passes = true;
			}
		}

		// Phase 4: verdict + status transition
		if (checkpoint.phase === 4) {
			update.status = "waiting_approval";
			if (data.verdict === "PASS") {
				update.passes = true;
			}
		}

		// Phase 5: PR URL, branch
		if (checkpoint.phase === 5) {
			const gitOps = data.git_ops as Record<string, unknown> | undefined;
			if (gitOps) {
				if (typeof gitOps.branch === "string") {
					update.branchName = gitOps.branch;
				}
			}
		}

		// Phase 6: conditional verify (if merge flag was set)
		if (checkpoint.phase === 6) {
			if (checkpoint.flags.merge) {
				update.status = "verified";
				update.verifiedAt = new Date();
			}
			update.completedAt = new Date();
		}

		// Failed checkpoint -> feature failed
		if (checkpoint.status === "failed") {
			update.status = "failed";
			const errorMsg =
				typeof data.error === "string"
					? data.error
					: typeof data.verdict === "string" && data.verdict === "FAIL"
						? `Phase ${checkpoint.phase} failed`
						: "Pipeline checkpoint failed";
			update.error = errorMsg;
		}

		// Emit pipeline events if userId provided
		if (userId && step) {
			this.emitCheckpointEvents(featureId, checkpoint, userId);
		}

		// Fire-and-forget DB update (errors logged, not thrown)
		featureRepository.update(featureId, update).catch(() => {
			// Swallow — polling should not crash on transient DB errors
		});
	}

	// -----------------------------------------------------------------------
	// Public: progress (consumed by pipeline router)
	// -----------------------------------------------------------------------

	async getProgress(featureId: string): Promise<{
		currentStep: string | null;
		completedPhase: number | null;
		steps: Array<{ id: string; name: string; status: string }>;
	}> {
		const feature = await featureRepository.findById(featureId);
		if (!feature) throw new Error(`Feature not found: ${featureId}`);

		// Read live checkpoint data if projectRoot is set
		let completedPhase: number | null = null;
		if (this.projectRoot) {
			const latest = this.getLatestCheckpoint(featureId);
			completedPhase = latest?.phase ?? null;
		}

		const currentStep = feature.pipelineStep ?? null;
		const currentIdx = currentStep
			? PIPELINE_STEPS.findIndex((s) => s.id === currentStep)
			: -1;

		const steps = PIPELINE_STEPS.map((s, i) => ({
			id: s.id,
			name: s.name,
			status:
				i < currentIdx ? "completed" : i === currentIdx ? "running" : "pending",
		}));

		return { currentStep, completedPhase, steps };
	}

	// -----------------------------------------------------------------------
	// Private: event emission
	// -----------------------------------------------------------------------

	private emitCheckpointEvents(
		featureId: string,
		cp: CheckpointData,
		userId: string,
	): void {
		const step = PHASE_TO_STEP[cp.phase];
		if (!step) return;

		this.events.emit("pipeline:step-started", {
			featureId,
			step: step.id,
			name: step.name,
			userId,
		});

		this.events.emit("feature:progress", {
			featureId,
			step: step.id,
			status: cp.status === "completed" ? "completed" : "failed",
			userId,
		});

		if (cp.status === "completed") {
			this.events.emit("pipeline:step-completed", {
				featureId,
				step: step.id,
				name: step.name,
				userId,
			});
		}

		if (cp.phase === 6 && cp.status === "completed") {
			this.events.emit("feature:completed", { featureId, userId });
		}
		if (cp.status === "failed") {
			this.events.emit("feature:error", {
				featureId,
				error: `Phase ${cp.phase} failed`,
				userId,
			});
		}
	}
}
