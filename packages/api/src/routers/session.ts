import { sessionRepository } from "@nomos-ai/db";
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
import { generateSessionId } from "../utils/id-generation";

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

export const sessionRouter = {
	list: protectedProcedure
		.input(listSessionsInput)
		.handler(async ({ input }) => {
			if (input?.status) {
				return sessionRepository.findByStatus(input.status);
			}
			if (input?.featureId) {
				return sessionRepository.findByFeature(input.featureId);
			}
			return sessionRepository.findAll();
		}),

	get: protectedProcedure
		.input(z.object({ id: SessionIdSchema }))
		.handler(async ({ input }) => {
			const session = await sessionRepository.findById(input.id);
			if (!session) {
				throw new ORPCError("NOT_FOUND", {
					message: `Session not found: ${input.id}`,
				});
			}
			const duration = sessionRepository.calculateDuration(session);
			return { ...session, duration };
		}),

	create: protectedProcedure
		.input(createSessionInput)
		.handler(async ({ input, context }) => {
			try {
				return await sessionRepository.create({
					id: await generateSessionId(),
					userId: context.session.user.id,
					featureId: input.featureId,
					status: input.status,
					startedAt: input.startedAt,
				});
			} catch (error) {
				handleRepositoryError(error, "create session");
			}
		}),

	update: protectedProcedure
		.input(updateSessionInput)
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
			try {
				return await sessionRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete session");
			}
		}),

	listActive: protectedProcedure.handler(async () => {
		return sessionRepository.findActive();
	}),

	updateStatus: protectedProcedure
		.input(updateStatusInput)
		.handler(async ({ input }) => {
			const session = await sessionRepository.findById(input.id);
			if (!session) {
				throw new ORPCError("NOT_FOUND", {
					message: `Session not found: ${input.id}`,
				});
			}

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
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
			const session = await sessionRepository.findById(input.id);
			if (!session) {
				throw new ORPCError("NOT_FOUND", {
					message: `Session not found: ${input.id}`,
				});
			}
			return { duration: sessionRepository.calculateDuration(session) };
		}),

	createAgentSession: protectedProcedure
		.input(createAgentSessionInput)
		.handler(async ({ input, context }) => {
			return createAgentSession({
				...input,
				userId: context.session.user.id,
			});
		}),
};
