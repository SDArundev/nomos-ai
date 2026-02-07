import { z } from "zod";
import { protectedProcedure } from "../index";
import { AutoModeService } from "../services/auto-mode-service";
import { PipelineService } from "../services/pipeline-service";
import { WorktreeService } from "../services/worktree-service";
import { getEventService } from "./agent";

let autoModeServiceInstance: AutoModeService | null = null;

export function getAutoModeService(): AutoModeService {
	if (!autoModeServiceInstance) {
		const events = getEventService();
		const pipeline = getPipelineService();
		const worktree = getWorktreeService();
		autoModeServiceInstance = new AutoModeService(events, pipeline, worktree);
	}
	return autoModeServiceInstance;
}

let pipelineServiceInstance: PipelineService | null = null;

export function getPipelineService(): PipelineService {
	if (!pipelineServiceInstance) {
		pipelineServiceInstance = new PipelineService(getEventService());
	}
	return pipelineServiceInstance;
}

let worktreeServiceInstance: WorktreeService | null = null;

export function getWorktreeService(): WorktreeService {
	if (!worktreeServiceInstance) {
		worktreeServiceInstance = new WorktreeService(getEventService());
	}
	return worktreeServiceInstance;
}

export const autoModeRouter = {
	start: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				projectRoot: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getAutoModeService();
			// Start in background (non-blocking)
			const noopExecuteStep = async (_prompt: string, _cwd: string) => {
				// In production, this would invoke the Claude SDK agent
				// For now, it's a placeholder that consumers must wire up
			};
			service
				.start(input.projectId, input.projectRoot, noopExecuteStep)
				.catch(() => {
					// Errors handled via events
				});
			return { success: true, message: "Auto-mode started" };
		}),

	stop: protectedProcedure.handler(async () => {
		const service = getAutoModeService();
		service.stop();
		return { success: true, message: "Auto-mode stopped" };
	}),

	status: protectedProcedure.handler(async () => {
		const service = getAutoModeService();
		return service.getStatus();
	}),

	setConcurrency: protectedProcedure
		.input(z.object({ max: z.number().int().min(1).max(5) }))
		.handler(async ({ input }) => {
			const service = getAutoModeService();
			service.setMaxConcurrency(input.max);
			return { success: true };
		}),
};
