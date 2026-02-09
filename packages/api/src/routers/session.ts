import { projectRepository, sessionRepository } from "@nomos-ai/db";
import {
	FeatureIdSchema,
	ModelSchema,
	SESSION_STATUS,
	SESSION_VALID_TRANSITIONS,
	SessionIdSchema,
	type SessionStatus,
	SessionStatusSchema,
} from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { createAgentSession } from "../services/agent-service";
import { handleRepositoryError } from "../utils/error-handler";
import { getSessionService } from "./agent";
import { getAutoModeService } from "./auto-mode";

const listSessionsInput = z
	.object({
		status: SessionStatusSchema.optional(),
		featureId: FeatureIdSchema.optional(),
	})
	.optional();

const createSessionInput = z.object({
	featureId: FeatureIdSchema,
	status: SessionStatusSchema.default(SESSION_STATUS.PENDING),
	startedAt: z.coerce.date().default(() => new Date()),
});

const updateSessionInput = z.object({
	id: SessionIdSchema,
	data: z
		.object({
			completedAt: z.coerce.date().optional(),
			output: z.string().optional(),
			error: z.string().optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided for update",
		}),
});

const updateStatusInput = z.object({
	id: SessionIdSchema,
	status: SessionStatusSchema,
});

const appendOutputInput = z.object({
	id: SessionIdSchema,
	text: z.string().min(1, "Text must not be empty"),
});

const createAgentSessionInput = z.object({
	featureId: FeatureIdSchema,
	model: ModelSchema.optional(),
	tools: z.array(z.string()).optional(),
	maxTurns: z.number().int().positive().optional(),
	maxBudgetUsd: z.number().positive().optional(),
	cwd: z.string().optional(),
	permissionMode: z
		.enum(["default", "acceptEdits", "bypassPermissions", "plan"])
		.optional(),
});

async function verifySessionOwnership(sessionId: string, userId: string) {
	const session = await sessionRepository.findById(sessionId);
	if (!session) {
		throw new ORPCError("NOT_FOUND", {
			message: `Session not found: ${sessionId}`,
		});
	}
	if (session.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return session;
}

export const sessionRouter = {
	list: protectedProcedure
		.input(listSessionsInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			if (input?.status) {
				const sessions = await sessionRepository.findByStatus(input.status);
				return sessions.filter((s) => s.userId === userId);
			}
			if (input?.featureId) {
				const sessions = await sessionRepository.findByFeature(input.featureId);
				return sessions.filter((s) => s.userId === userId);
			}
			const sessions = await sessionRepository.findAll();
			return sessions.filter((s) => s.userId === userId);
		}),

	get: protectedProcedure
		.input(z.object({ id: SessionIdSchema }))
		.handler(async ({ input, context }) => {
			const session = await verifySessionOwnership(
				input.id,
				context.session.user.id,
			);
			const duration = sessionRepository.calculateDuration(session);
			return { ...session, duration };
		}),

	create: protectedProcedure
		.input(createSessionInput)
		.handler(async ({ input, context }) => {
			try {
				return await getSessionService().createAgentSession({
					userId: context.session.user.id,
					featureId: input.featureId,
				});
			} catch (error) {
				handleRepositoryError(error, "create session");
			}
		}),

	update: protectedProcedure
		.input(updateSessionInput)
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.id, context.session.user.id);
			try {
				const updateData = Object.fromEntries(
					Object.entries(input.data).filter(([, v]) => v !== undefined),
				);
				return await sessionRepository.update(input.id, updateData);
			} catch (error) {
				handleRepositoryError(error, "update session");
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: SessionIdSchema }))
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.id, context.session.user.id);
			try {
				return await sessionRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete session");
			}
		}),

	listActive: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const sessions = await sessionRepository.findActive();
		return sessions.filter((s) => s.userId === userId);
	}),

	updateStatus: protectedProcedure
		.input(updateStatusInput)
		.handler(async ({ input, context }) => {
			const session = await verifySessionOwnership(
				input.id,
				context.session.user.id,
			);

			const allowed =
				SESSION_VALID_TRANSITIONS[session.status as SessionStatus];
			if (!allowed || !allowed.includes(input.status)) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Invalid status transition: ${session.status} → ${input.status}`,
				});
			}

			return sessionRepository.update(input.id, { status: input.status });
		}),

	appendOutput: protectedProcedure
		.input(appendOutputInput)
		.handler(async ({ input, context }) => {
			await verifySessionOwnership(input.id, context.session.user.id);
			try {
				return await sessionRepository.appendOutput(input.id, input.text);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to append output",
				});
			}
		}),

	getDuration: protectedProcedure
		.input(z.object({ id: SessionIdSchema }))
		.handler(async ({ input, context }) => {
			const session = await verifySessionOwnership(
				input.id,
				context.session.user.id,
			);
			return { duration: sessionRepository.calculateDuration(session) };
		}),

	createAgentSession: protectedProcedure
		.input(createAgentSessionInput)
		.handler(async ({ input, context }) => {
			return createAgentSession(
				{ ...input, userId: context.session.user.id },
				getSessionService(),
			);
		}),

	/** Resume a failed pipeline session */
	resume: protectedProcedure
		.input(z.object({ id: SessionIdSchema }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const session = await verifySessionOwnership(input.id, userId);

			if (session.status !== "failed") {
				throw new ORPCError("BAD_REQUEST", {
					message: `Cannot resume session in status "${session.status}" — only failed sessions can be resumed`,
				});
			}
			if (!session.featureId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Cannot resume session without a feature ID",
				});
			}

			// Find the project to get the project root
			const project = session.projectId
				? await projectRepository.findById(session.projectId)
				: null;
			const projectRoot =
				project?.path ??
				session.workingDirectory ??
				process.cwd();

			const service = getAutoModeService();
			service
				.resumeSession(input.id, projectRoot, userId)
				.catch(() => {
					// Errors handled via events
				});

			return {
				success: true,
				message: `Resuming session ${input.id} for feature ${session.featureId}`,
			};
		}),

	/** List failed sessions that can be resumed */
	listResumable: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const sessionService = getSessionService();
		const sessions = await sessionService.findResumableSessions();
		return sessions.filter((s) => s.userId === userId);
	}),
};
