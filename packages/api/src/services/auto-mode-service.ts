import { featureRepository, sessionRepository } from "@nomos-ai/db";
import { SESSION_STATUS } from "@nomos-ai/types";
import { generateSessionId } from "../utils/id-generation";
import type { AgentProvider } from "./claude-provider";
import type { EventService } from "./event-service";
import type { PipelineService } from "./pipeline-service";
import type { WorktreeService } from "./worktree-service";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AutoModeService {
	private isRunning = false;
	private maxConcurrency = 1;
	private runningFeatures = new Map<string, AbortController>();
	private consecutiveFailures = 0;
	private readonly MAX_FAILURES = 3;

	constructor(
		private events: EventService,
		private pipelineService: PipelineService,
		private worktreeService: WorktreeService,
		private provider: AgentProvider,
	) {}

	async start(
		projectId: string,
		projectRoot: string,
	): Promise<void> {
		if (this.isRunning) {
			throw new Error("Auto-mode is already running");
		}

		this.isRunning = true;
		this.consecutiveFailures = 0;
		this.events.emit("auto-mode:started", { projectId });

		while (this.isRunning) {
			// Check concurrency limit
			if (this.runningFeatures.size >= this.maxConcurrency) {
				await sleep(1000);
				continue;
			}

			// Pick next pending feature
			const features = await featureRepository.findByStatus("pending");
			const projectFeatures = features.filter((f) => f.projectId === projectId);
			const feature = projectFeatures[0];

			if (!feature) {
				this.events.emit("auto-mode:idle", { projectId });
				await sleep(5000);
				continue;
			}

			// Check dependencies
			if (!(await this.areDependenciesMet(feature.id))) {
				await sleep(2000);
				continue;
			}

			// Execute feature in background
			this.executeFeature(feature.id, projectRoot).catch(
				(err) => {
					this.consecutiveFailures++;
					this.events.emit("auto-mode:error", {
						featureId: feature.id,
						error: err instanceof Error ? err.message : String(err),
					});
					if (this.consecutiveFailures >= this.MAX_FAILURES) {
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
				lockedBy: "auto-mode",
				lockedAt: new Date(),
			});

			this.events.emit("feature:started", { featureId });

			// Create a tracked agent session for this feature
			const session = await sessionRepository.create({
				id: await generateSessionId(),
				userId: "auto-mode",
				featureId,
				status: SESSION_STATUS.RUNNING,
				startedAt: new Date(),
				model: "sonnet",
				isRunning: true,
				messageCount: 0,
			});

			// Create worktree if feature has useWorktree=true
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

			// Real executeStep using the provider
			const executeStep = async (prompt: string, stepCwd: string) => {
				this.events.emit("agent:stream", {
					sessionId: session.id,
					message: { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: `Executing step for ${featureId}...` }] } },
				});

				for await (const msg of this.provider.executeQuery({
					prompt,
					cwd: stepCwd,
					model: feature?.model ?? "sonnet",
					maxTurns: 50,
					thinkingLevel: "high",
					abortController: abort,
				})) {
					this.events.emit("agent:stream", {
						sessionId: session.id,
						message: msg,
					});
				}
			};

			// Run pipeline
			await this.pipelineService.executeFeature(featureId, executeStep, cwd);

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

			this.events.emit("feature:completed", { featureId });
		} catch (err) {
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
			});
			throw err;
		} finally {
			this.runningFeatures.delete(featureId);
		}
	}

	private async areDependenciesMet(featureId: string): Promise<boolean> {
		const deps = await featureRepository.findDependencies(featureId);
		return deps.every(
			(d) => d.status === "verified" || d.status === "waiting_approval",
		);
	}

	stop(): void {
		this.isRunning = false;
		for (const [, abort] of this.runningFeatures) {
			abort.abort();
		}
		this.runningFeatures.clear();
		this.events.emit("auto-mode:stopped", {});
	}

	getStatus(): {
		isRunning: boolean;
		runningFeatures: string[];
		consecutiveFailures: number;
	} {
		return {
			isRunning: this.isRunning,
			runningFeatures: Array.from(this.runningFeatures.keys()),
			consecutiveFailures: this.consecutiveFailures,
		};
	}

	setMaxConcurrency(max: number): void {
		this.maxConcurrency = Math.max(1, max);
	}
}
