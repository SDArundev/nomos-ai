import { resolve } from "node:path";
import { featureRepository, sessionRepository } from "@nomos-ai/db";
import { SESSION_STATUS } from "@nomos-ai/types";
import {
	resolveDependencies,
	areDependenciesSatisfied,
} from "../lib/dependency-resolver";
import { loadProjectContext } from "../lib/context-loader";
import type { AgentProvider } from "./claude-provider";
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
	private config: AutoModeConfig = { maxConcurrency: 1, maxRetries: MAX_RETRIES };
	private runningFeatures = new Map<string, AbortController>();
	private retryTimers = new Set<ReturnType<typeof setTimeout>>();
	private consecutiveFailures = 0;
	private projectContext: string | null = null;
	private currentUserId: string | null = null;

	constructor(
		private events: EventService,
		private pipelineService: PipelineService,
		private worktreeService: WorktreeService,
		private provider: AgentProvider,
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

		// Load context once for all features
		this.projectContext = await loadProjectContext(projectRoot);

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
				this.events.emit("auto-mode:idle", { projectId, userId: this.currentUserId! });
				await sleep(5000);
				continue;
			}

			this.events.emit("auto-mode:event", {
				type: "auto-mode:feature-queued",
				featureId: feature.id,
				userId: this.currentUserId!,
			});

			// Execute feature in background
			this.executeFeature(feature.id, projectRoot).catch(
				(err) => {
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
				},
			);
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

			this.events.emit("feature:started", { featureId, userId: this.currentUserId! });

			// Create a tracked agent session
			const session = await sessionRepository.create({
				userId: this.currentUserId!,
				featureId,
				status: SESSION_STATUS.RUNNING,
				startedAt: new Date(),
				model: "sonnet",
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

			// Determine start step (resume from checkpoint if retrying)
			const lastCompleted = feature?.lastCompletedStep;

			// Real executeStep using the provider
			const executeStep = async (prompt: string, stepCwd: string) => {
				const systemPrompt = this.projectContext
					? `# Project Context\n\n${this.projectContext}`
					: undefined;

				for await (const msg of this.provider.executeQuery({
					prompt,
					cwd: stepCwd,
					model: feature?.model ?? "sonnet",
					maxTurns: 50,
					thinkingLevel: "high",
					systemPrompt,
					abortController: abort,
				})) {
					this.events.emit("agent:stream", {
						sessionId: session.id,
						message: msg,
						userId: this.currentUserId!,
					});
				}
			};

			// Run pipeline (with checkpoint resume)
			await this.pipelineService.executeFeature(
				featureId,
				executeStep,
				cwd,
				lastCompleted ?? undefined,
			);

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
			});

			this.events.emit("feature:completed", { featureId, userId: this.currentUserId! });
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
				const backoffMs = RETRY_BACKOFF_MS[Math.min(retryInfo.retryCount - 1, RETRY_BACKOFF_MS.length - 1)] ?? RETRY_BACKOFF_MS[0];
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
			this.config.maxConcurrency = Math.max(1, Math.min(5, config.maxConcurrency));
		}
		if (config.maxRetries !== undefined) {
			this.config.maxRetries = Math.max(0, Math.min(10, config.maxRetries));
		}
	}

	getConfig(): AutoModeConfig {
		return { ...this.config };
	}
}
