import { resolve } from "node:path";
import { featureRepository, sessionRepository } from "@nomos-ai/db";
import { env } from "@nomos-ai/env/server";
import type { PermissionMode, ProviderMessage } from "@nomos-ai/types";
import {
	areDependenciesSatisfied,
	resolveDependencies,
} from "../lib/dependency-resolver";
import type { AgentProvider } from "./claude-provider";
import type { IEventService } from "./event-service";
import type { PipelineService } from "./pipeline-service";
import type { SessionService } from "./session-service";
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
	private startedByUserId: string | null = null;

	constructor(
		private events: IEventService,
		private provider: AgentProvider,
		private pipelineService: PipelineService,
		private worktreeService: WorktreeService,
		private sessionService: SessionService,
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
		this.startedByUserId = userId;
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
						userId,
					});
					return false;
				}
				// Skip if max retries exceeded
				if ((f.retryCount ?? 0) >= this.config.maxRetries) {
					this.events.emit("auto-mode:event", {
						type: "auto-mode:feature-skipped",
						featureId: f.id,
						reason: "max_retries_exceeded",
						userId,
					});
					return false;
				}
				return true;
			});

			if (!feature) {
				this.events.emit("auto-mode:idle", {
					projectId,
					userId,
				});
				await sleep(5000);
				continue;
			}

			this.events.emit("auto-mode:event", {
				type: "auto-mode:feature-queued",
				featureId: feature.id,
				userId,
			});

			// Execute feature in background
			this.executeFeature(feature.id, projectRoot, userId).catch((err) => {
				this.consecutiveFailures++;
				this.events.emit("auto-mode:error", {
					featureId: feature.id,
					error: err instanceof Error ? err.message : String(err),
					userId,
				});
				if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
					this.events.emit("auto-mode:event", {
						type: "auto-mode:paused",
						reason: "consecutive_failures",
						count: this.consecutiveFailures,
						userId,
					});
					this.stop();
				}
			});
		}
	}

	private async executeFeature(
		featureId: string,
		projectRoot: string,
		userId: string,
	): Promise<void> {
		const abort = new AbortController();
		this.runningFeatures.set(featureId, abort);

		try {
			// Mark as in_progress
			await featureRepository.update(featureId, {
				status: "in_progress",
				locked: true,
				lockedBy: userId,
				lockedAt: new Date(),
			});

			this.events.emit("feature:started", {
				featureId,
				userId,
			});

			// Create a tracked agent session
			const session = await this.sessionService.createPipelineSession({
				userId,
				featureId,
				model: "sonnet",
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

			// Start polling with explicit projectRoot (no shared state)
			const pollPromise = this.pipelineService.pollCheckpoints(
				featureId,
				(checkpoint) => {
					this.pipelineService.mapCheckpointToFeature(
						featureId,
						checkpoint,
						userId,
					);
					this.events.emit("auto-mode:event", {
						type: "auto-mode:checkpoint",
						featureId,
						checkpoint,
						userId,
					});
				},
				abort.signal,
				cwd,
			);

			// Execute via SDK query() instead of CLI subprocess
			let costData: ProviderMessage["costData"];
			// SECURITY: bypassPermissions allows the agent to execute tools without user approval.
			// Only enable via CLAUDE_BYPASS_PERMISSIONS=true in trusted/containerized environments.
			const permissionMode: PermissionMode = env.CLAUDE_BYPASS_PERMISSIONS
				? "bypassPermissions"
				: "default";
			const stream = this.provider.executeQuery({
				prompt,
				model: "sonnet",
				cwd,
				maxTurns: 50,
				permissionMode,
				thinkingLevel: "standard",
				abortController: abort,
			});

			for await (const msg of stream) {
				// Emit structured messages for dashboard consumers
				this.events.emit("agent:stream", {
					sessionId: session.id,
					message: msg,
					userId,
				});

				// Capture SDK session ID for potential resume
				if (msg.session_id) {
					sessionRepository
						.update(session.id, { sdkSessionId: msg.session_id })
						.catch(() => {
							// Fire-and-forget — don't crash on DB errors
						});
				}

				// Capture cost data from result messages.
				// SDK total_cost_usd is cumulative across all turns within a single query() call,
				// so we simply overwrite (not accumulate) with the final result message's cost data.
				if (msg.type === "result" && msg.costData) {
					costData = msg.costData;
				}
			}

			// Wait for checkpoint polling to finish
			await pollPromise.catch(() => {
				// Polling may reject if aborted — that's fine
			});

			// Success
			this.consecutiveFailures = 0;
			await featureRepository.update(featureId, {
				status: "waiting_approval",
				locked: false,
				lockedBy: null,
				lockedAt: null,
			});

			await this.sessionService.completeSession(
				session.id,
				undefined,
				costData
					? {
							totalCostUsd: costData.totalCostUsd,
							inputTokens: costData.inputTokens,
							outputTokens: costData.outputTokens,
						}
					: undefined,
			);

			this.events.emit("feature:completed", {
				featureId,
				userId,
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
				userId,
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
					userId,
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
		if (this.startedByUserId) {
			this.events.emit("auto-mode:stopped", { userId: this.startedByUserId });
		}
	}

	getStatus(): {
		isRunning: boolean;
		runningFeatures: string[];
		consecutiveFailures: number;
		config: AutoModeConfig;
		startedByUserId: string | null;
	} {
		return {
			isRunning: this.isRunning,
			runningFeatures: Array.from(this.runningFeatures.keys()),
			consecutiveFailures: this.consecutiveFailures,
			config: { ...this.config },
			startedByUserId: this.startedByUserId,
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

	/**
	 * Resume a failed session by re-running its feature with the SDK resume option.
	 * Uses the stored sdkSessionId to continue from where the previous run left off.
	 */
	async resumeSession(
		sessionId: string,
		rawProjectRoot: string,
		userId: string,
	): Promise<void> {
		const projectRoot = validateProjectRoot(rawProjectRoot);

		// Resume the session (validates status, updates DB)
		const session =
			await this.sessionService.resumeSession(sessionId);

		if (!session.featureId) {
			throw new Error("Cannot resume session without a feature ID");
		}

		const featureId = session.featureId;

		if (this.runningFeatures.has(featureId)) {
			throw new Error(`Feature ${featureId} is already running`);
		}

		// Reset feature to in_progress
		await featureRepository.update(featureId, {
			status: "in_progress",
			locked: true,
			lockedBy: userId,
			lockedAt: new Date(),
			error: null,
		});

		this.events.emit("auto-mode:event", {
			type: "auto-mode:feature-queued",
			featureId,
			userId,
		});

		// Execute the feature — the SDK will use the resume option if sdkSessionId is set
		this.executeFeature(featureId, projectRoot, userId).catch((err) => {
			this.events.emit("auto-mode:error", {
				featureId,
				error: err instanceof Error ? err.message : String(err),
				userId,
			});
		});
	}

	/**
	 * Start a pipeline for a single feature (triggered from Intent Box / dashboard).
	 * Unlike `start()`, this does not enter a loop — it runs one feature and returns.
	 */
	async startFeature(
		featureId: string,
		rawProjectRoot: string,
		userId: string,
	): Promise<void> {
		const projectRoot = validateProjectRoot(rawProjectRoot);

		if (this.runningFeatures.has(featureId)) {
			throw new Error(`Feature ${featureId} is already running`);
		}

		this.events.emit("auto-mode:event", {
			type: "auto-mode:feature-queued",
			featureId,
			userId,
		});

		// executeFeature handles session creation, status updates, and cleanup
		this.executeFeature(featureId, projectRoot, userId).catch((err) => {
			this.events.emit("auto-mode:error", {
				featureId,
				error: err instanceof Error ? err.message : String(err),
				userId,
			});
		});
	}
}
