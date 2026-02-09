import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";
import { featureRepository, sessionRepository } from "@nomos-ai/db";
import { SESSION_STATUS } from "@nomos-ai/types";
import {
	areDependenciesSatisfied,
	resolveDependencies,
} from "../lib/dependency-resolver";
import type { EventService } from "./event-service";
import type { PipelineService } from "./pipeline-service";
import type { WorktreeService } from "./worktree-service";

const ALLOWED_ROOTS = ["/home", "/Users", "/tmp", "/var/projects"];

function validateProjectRoot(projectRoot: string): string {
	const resolved = resolve(projectRoot);
	if (!ALLOWED_ROOTS.some((root) => resolved.startsWith(`${root}/`))) {
		throw new Error("projectRoot must be under an allowed directory");
	}
	return resolved;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRY_BACKOFF_MS = [30_000, 60_000, 120_000]; // 30s, 60s, 120s
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_FAILURES = 3;

interface AutoModeConfig {
	maxConcurrency: number;
	maxRetries: number;
}

export class AutoModeService {
	private isRunning = false;
	private config: AutoModeConfig = {
		maxConcurrency: 1,
		maxRetries: MAX_RETRIES,
	};
	private runningFeatures = new Map<string, AbortController>();
	private retryTimers = new Set<ReturnType<typeof setTimeout>>();
	private consecutiveFailures = 0;
	private currentUserId: string | null = null;

	constructor(
		private events: EventService,
		private pipelineService: PipelineService,
		private worktreeService: WorktreeService,
	) {}

	async start(
		projectId: string,
		rawProjectRoot: string,
		userId: string,
	): Promise<void> {
		if (this.isRunning) {
			throw new Error("Auto-mode is already running");
		}

		const projectRoot = validateProjectRoot(rawProjectRoot);
		this.isRunning = true;
		this.consecutiveFailures = 0;
		this.currentUserId = userId;
		this.events.emit("auto-mode:started", { projectId, userId });

		while (this.isRunning) {
			// Check concurrency limit
			if (this.runningFeatures.size >= this.config.maxConcurrency) {
				await sleep(1000);
				continue;
			}

			// Get all project features and resolve in dependency order
			const allFeatures = await featureRepository.findByProject(projectId);
			const pendingFeatures = allFeatures.filter((f) => f.status === "pending");
			const ordered = resolveDependencies(pendingFeatures);

			// Pick next eligible feature
			const feature = ordered.find((f) => {
				// Skip if already running
				if (this.runningFeatures.has(f.id)) return false;
				// Skip if dependencies not satisfied
				if (!areDependenciesSatisfied(f, allFeatures)) {
					this.events.emit("auto-mode:event", {
						type: "auto-mode:feature-skipped",
						featureId: f.id,
						reason: "dependencies_not_satisfied",
						userId: this.currentUserId!,
					});
					return false;
				}
				// Skip if max retries exceeded
				if ((f.retryCount ?? 0) >= this.config.maxRetries) {
					this.events.emit("auto-mode:event", {
						type: "auto-mode:feature-skipped",
						featureId: f.id,
						reason: "max_retries_exceeded",
						userId: this.currentUserId!,
					});
					return false;
				}
				return true;
			});

			if (!feature) {
				this.events.emit("auto-mode:idle", {
					projectId,
					userId: this.currentUserId!,
				});
				await sleep(5000);
				continue;
			}

			this.events.emit("auto-mode:event", {
				type: "auto-mode:feature-queued",
				featureId: feature.id,
				userId: this.currentUserId!,
			});

			// Execute feature in background
			this.executeFeature(feature.id, projectRoot).catch((err) => {
				this.consecutiveFailures++;
				this.events.emit("auto-mode:error", {
					featureId: feature.id,
					error: err instanceof Error ? err.message : String(err),
					userId: this.currentUserId!,
				});
				if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
					this.events.emit("auto-mode:event", {
						type: "auto-mode:paused",
						reason: "consecutive_failures",
						count: this.consecutiveFailures,
						userId: this.currentUserId!,
					});
					this.stop();
				}
			});
		}
	}

	private async executeFeature(
		featureId: string,
		projectRoot: string,
	): Promise<void> {
		const abort = new AbortController();
		this.runningFeatures.set(featureId, abort);

		try {
			// Mark as in_progress
			await featureRepository.update(featureId, {
				status: "in_progress",
				locked: true,
				lockedBy: this.currentUserId!,
				lockedAt: new Date(),
			});

			this.events.emit("feature:started", {
				featureId,
				userId: this.currentUserId!,
			});

			// Create a tracked agent session
			const session = await sessionRepository.create({
				userId: this.currentUserId!,
				featureId,
				status: SESSION_STATUS.RUNNING,
				startedAt: new Date(),
				model: "claude-cli",
				isRunning: true,
				messageCount: 0,
			});

			// Create worktree if needed
			const feature = await featureRepository.findById(featureId);
			let cwd = projectRoot;

			if (feature?.useWorktree) {
				const branchName = `nomos/${featureId}`;
				const worktree = await this.worktreeService.create({
					featureId,
					branchName,
					projectRoot,
				});
				cwd = worktree.path;
			}

			// Auto-mode always runs with auto=true, test=true, merge=false
			// (merge is not done automatically — features go to waiting_approval)
			const prompt = `Read .claude/skills/nomos/SKILL.md and follow the FIRST ACTION instructions for feature ${featureId}. Flags: auto=true, test=true, merge=false`;

			// Spawn claude CLI as subprocess
			const proc = spawn(
				"claude",
				["--dangerously-skip-permissions", "-p", prompt],
				{
					cwd,
					env: { ...process.env },
					stdio: ["ignore", "pipe", "pipe"],
				},
			);

			// Wire abort signal to kill the subprocess
			const onAbort = () => {
				proc.kill();
			};
			abort.signal.addEventListener("abort", onAbort);

			// Set project root for checkpoint resolution and start polling
			this.pipelineService.setProjectRoot(cwd);

			const pollPromise = this.pipelineService.pollCheckpoints(
				featureId,
				(checkpoint) => {
					this.pipelineService.mapCheckpointToFeature(
						featureId,
						checkpoint,
						this.currentUserId!,
					);
					this.events.emit("auto-mode:event", {
						type: "auto-mode:checkpoint",
						featureId,
						checkpoint,
						userId: this.currentUserId!,
					});
				},
				abort.signal,
			);

			// Stream stdout/stderr for logging/events
			this.streamChildOutput(proc, session.id);

			// Wait for subprocess to exit
			const exitCode = await new Promise<number | null>((resolveCode) => {
				proc.on("close", (code) => resolveCode(code));
				proc.on("error", () => resolveCode(null));
			});

			// Clean up abort listener
			abort.signal.removeEventListener("abort", onAbort);

			// Wait for checkpoint polling to finish
			await pollPromise.catch(() => {
				// Polling may reject if aborted — that's fine
			});

			if (exitCode !== 0) {
				throw new Error(
					`Claude CLI exited with code ${exitCode} for feature ${featureId}`,
				);
			}

			// Read final checkpoint data
			const finalCheckpoint = this.pipelineService.getLatestCheckpoint(
				featureId,
				cwd,
			);
			const costData = finalCheckpoint?.data?.data as
				| Record<string, unknown>
				| undefined;

			// Success
			this.consecutiveFailures = 0;
			await featureRepository.update(featureId, {
				status: "waiting_approval",
				locked: false,
				lockedBy: null,
				lockedAt: null,
			});

			await sessionRepository.update(session.id, {
				status: SESSION_STATUS.COMPLETED,
				isRunning: false,
				completedAt: new Date(),
				...(typeof costData?.total_cost_usd === "number" && {
					totalCostUsd: String(costData.total_cost_usd),
				}),
			});

			this.events.emit("feature:completed", {
				featureId,
				userId: this.currentUserId!,
			});
		} catch (err) {
			// Increment retry count
			await featureRepository.incrementRetryCount(featureId);
			const retryInfo = await featureRepository.getRetryInfo(featureId);

			await featureRepository.update(featureId, {
				status: "failed",
				error: err instanceof Error ? err.message : String(err),
				locked: false,
				lockedBy: null,
				lockedAt: null,
			});

			this.events.emit("feature:error", {
				featureId,
				error: err instanceof Error ? err.message : String(err),
				userId: this.currentUserId!,
			});

			// Schedule retry if under limit
			if (retryInfo.retryCount < this.config.maxRetries) {
				const backoffMs =
					RETRY_BACKOFF_MS[
						Math.min(retryInfo.retryCount - 1, RETRY_BACKOFF_MS.length - 1)
					] ?? RETRY_BACKOFF_MS[0];
				this.events.emit("auto-mode:event", {
					type: "auto-mode:retry",
					featureId,
					attempt: retryInfo.retryCount,
					nextRetryMs: backoffMs,
					userId: this.currentUserId!,
				});

				// Reset to pending after backoff so it gets picked up again
				const timer = setTimeout(async () => {
					this.retryTimers.delete(timer);
					try {
						await featureRepository.update(featureId, { status: "pending" });
					} catch {
						// Feature may have been manually handled
					}
				}, backoffMs);
				this.retryTimers.add(timer);
			}

			throw err;
		} finally {
			this.runningFeatures.delete(featureId);
		}
	}

	/**
	 * Attach listeners to a child process's stdout/stderr and emit as agent events.
	 */
	private streamChildOutput(proc: ChildProcess, sessionId: string): void {
		proc.stdout?.on("data", (chunk: Buffer) => {
			this.events.emit("agent:stream", {
				sessionId,
				channel: "stdout",
				text: chunk.toString(),
				userId: this.currentUserId!,
			});
		});

		proc.stderr?.on("data", (chunk: Buffer) => {
			this.events.emit("agent:stream", {
				sessionId,
				channel: "stderr",
				text: chunk.toString(),
				userId: this.currentUserId!,
			});
		});
	}

	stop(): void {
		this.isRunning = false;
		for (const timer of this.retryTimers) {
			clearTimeout(timer);
		}
		this.retryTimers.clear();
		for (const [, abort] of this.runningFeatures) {
			abort.abort();
		}
		this.runningFeatures.clear();
		if (this.currentUserId) {
			this.events.emit("auto-mode:stopped", { userId: this.currentUserId });
		}
	}

	getStatus(): {
		isRunning: boolean;
		runningFeatures: string[];
		consecutiveFailures: number;
		config: AutoModeConfig;
	} {
		return {
			isRunning: this.isRunning,
			runningFeatures: Array.from(this.runningFeatures.keys()),
			consecutiveFailures: this.consecutiveFailures,
			config: { ...this.config },
		};
	}

	setMaxConcurrency(max: number): void {
		this.config.maxConcurrency = Math.max(1, max);
	}

	setConfig(config: Partial<AutoModeConfig>): void {
		if (config.maxConcurrency !== undefined) {
			this.config.maxConcurrency = Math.max(
				1,
				Math.min(5, config.maxConcurrency),
			);
		}
		if (config.maxRetries !== undefined) {
			this.config.maxRetries = Math.max(0, Math.min(10, config.maxRetries));
		}
	}

	getConfig(): AutoModeConfig {
		return { ...this.config };
	}
}
