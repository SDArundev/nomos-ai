import { featureRepository, projectRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { AutoModeService } from "../services/auto-mode-service";
import { ClaudeProvider } from "../services/claude-provider";
import { PipelineService } from "../services/pipeline-service";
import { WorktreeService } from "../services/worktree-service";
import { getEventService, getSessionService } from "./agent";

let autoModeServiceInstance: AutoModeService | null = null;

export function getAutoModeService(): AutoModeService {
	if (!autoModeServiceInstance) {
		const events = getEventService();
		const provider = ClaudeProvider.create();
		const pipeline = getPipelineService();
		const worktree = getWorktreeService();
		const sessions = getSessionService();
		autoModeServiceInstance = new AutoModeService(events, provider, pipeline, worktree, sessions);
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
		.handler(async ({ input, context }) => {
			const service = getAutoModeService();
			service
				.start(input.projectId, input.projectRoot, context.session.user.id)
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

	setConfig: protectedProcedure
		.input(
			z.object({
				maxConcurrency: z.number().int().min(1).max(5).optional(),
				maxRetries: z.number().int().min(0).max(10).optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getAutoModeService();
			service.setConfig(input);
			return { success: true, config: service.getConfig() };
		}),

	getConfig: protectedProcedure.handler(async () => {
		const service = getAutoModeService();
		return service.getConfig();
	}),

	retryFeature: protectedProcedure
		.input(z.object({ featureId: z.string() }))
		.handler(async ({ input, context }) => {
			const feature = await featureRepository.findById(input.featureId);
			if (!feature || feature.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}
			await featureRepository.resetRetryCount(input.featureId);
			await featureRepository.update(input.featureId, { status: "pending" });
			return {
				success: true,
				message: `Reset retry count for ${input.featureId}`,
			};
		}),

	startFeature: protectedProcedure
		.input(
			z.object({
				featureId: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			// Verify feature exists and belongs to user
			const feature = await featureRepository.findById(input.featureId);
			if (!feature) {
				throw new ORPCError("NOT_FOUND", {
					message: `Feature not found: ${input.featureId}`,
				});
			}
			if (feature.userId !== userId) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}

			// Get project to determine projectRoot
			const project = await projectRepository.findById(feature.projectId);
			if (!project) {
				throw new ORPCError("NOT_FOUND", {
					message: `Project not found for feature ${input.featureId}`,
				});
			}

			const service = getAutoModeService();

			// Update feature to pending so executeFeature can transition it
			if (feature.status === "backlog") {
				await featureRepository.update(input.featureId, { status: "pending" });
			}

			service
				.startFeature(input.featureId, project.path, userId)
				.catch(() => {
					// Errors handled via events
				});

			return {
				success: true,
				message: `Pipeline started for ${input.featureId}`,
			};
		}),
};
