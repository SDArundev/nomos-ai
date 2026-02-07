import { projectRepository } from "@nomos-ai/db";
import { ProjectIdSchema, ProjectStatusSchema } from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { handleRepositoryError } from "../utils/error-handler";
import { generateProjectId } from "../utils/id-generation";

const createProjectInput = z.object({
	name: z.string().min(1, "Project name is required").max(100),
	path: z
		.string()
		.min(1, "Project path is required")
		.refine((p) => p.startsWith("/") || /^[A-Za-z]:/.test(p), {
			message: "Path must be an absolute path",
		}),
	status: ProjectStatusSchema.optional(),
	settings: z
		.object({
			theme: z.enum(["light", "dark", "system"]).default("system"),
			locale: z.string().default("en"),
			autoSaveInterval: z.number().int().min(0).default(30),
			notifications: z.boolean().default(true),
		})
		.strict()
		.optional(),
});

const updateProjectInput = z.object({
	id: ProjectIdSchema,
	data: z
		.object({
			name: z.string().min(1).max(100).optional(),
			path: z
				.string()
				.min(1)
				.refine((p) => p.startsWith("/") || /^[A-Za-z]:/.test(p), {
					message: "Path must be an absolute path",
				})
				.optional(),
			status: ProjectStatusSchema.optional(),
			settings: z
				.object({
					theme: z.enum(["light", "dark", "system"]).optional(),
					locale: z.string().optional(),
					autoSaveInterval: z.number().int().min(0).optional(),
					notifications: z.boolean().optional(),
				})
				.strict()
				.optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided for update",
		}),
});

export const projectRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		return projectRepository.findByUser(context.session.user.id);
	}),

	get: protectedProcedure
		.input(z.object({ id: ProjectIdSchema }))
		.handler(async ({ input, context }) => {
			const project = await projectRepository.findById(input.id);
			if (!project) {
				throw new ORPCError("NOT_FOUND", {
					message: `Project not found: ${input.id}`,
				});
			}
			if (project.userId !== context.session.user.id) {
				throw new ORPCError("FORBIDDEN", { message: "Access denied" });
			}
			return project;
		}),

	create: protectedProcedure
		.input(createProjectInput)
		.handler(async ({ input, context }) => {
			try {
				return await projectRepository.create({
					id: await generateProjectId(),
					userId: context.session.user.id,
					name: input.name,
					path: input.path,
					status: input.status,
					settings: input.settings as Record<string, unknown> | undefined,
				});
			} catch (error) {
				handleRepositoryError(error, "create project");
			}
		}),

	update: protectedProcedure
		.input(updateProjectInput)
		.handler(async ({ input, context }) => {
			const existing = await projectRepository.findById(input.id);
			if (!existing || existing.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", { message: `Project not found: ${input.id}` });
			}
			try {
				const updateData = Object.fromEntries(
					Object.entries(input.data).filter(([, v]) => v !== undefined),
				);
				return await projectRepository.update(input.id, updateData);
			} catch (error) {
				handleRepositoryError(error, "update project");
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: ProjectIdSchema }))
		.handler(async ({ input, context }) => {
			const existing = await projectRepository.findById(input.id);
			if (!existing || existing.userId !== context.session.user.id) {
				throw new ORPCError("NOT_FOUND", { message: `Project not found: ${input.id}` });
			}
			try {
				return await projectRepository.delete(input.id);
			} catch (error) {
				handleRepositoryError(error, "delete project");
			}
		}),
};
