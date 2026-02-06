import { projectRepository } from "@nomos-ai/db";
import { ProjectIdSchema } from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateProjectId } from "../utils/id-generation";

const createProjectInput = z.object({
	name: z.string().min(1, "Project name is required").max(100),
	path: z
		.string()
		.min(1, "Project path is required")
		.refine((p) => p.startsWith("/") || /^[A-Za-z]:/.test(p), {
			message: "Path must be an absolute path",
		}),
	settings: z
		.object({
			theme: z.enum(["light", "dark", "system"]).default("system"),
			locale: z.string().default("en"),
			autoSaveInterval: z.number().int().min(0).default(30),
			notifications: z.boolean().default(true),
		})
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
			settings: z
				.object({
					theme: z.enum(["light", "dark", "system"]).optional(),
					locale: z.string().optional(),
					autoSaveInterval: z.number().int().min(0).optional(),
					notifications: z.boolean().optional(),
				})
				.optional(),
		})
		.refine((data) => Object.keys(data).length > 0, {
			message: "At least one field must be provided for update",
		}),
});

export const projectRouter = {
	list: protectedProcedure.handler(async () => {
		return projectRepository.findAll();
	}),

	get: protectedProcedure
		.input(z.object({ id: ProjectIdSchema }))
		.handler(async ({ input }) => {
			const project = await projectRepository.findById(input.id);
			if (!project) {
				throw new ORPCError("NOT_FOUND", {
					message: `Project not found: ${input.id}`,
				});
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
					settings: input.settings as Record<string, unknown> | undefined,
				});
			} catch (error) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to create project",
				});
			}
		}),

	update: protectedProcedure
		.input(updateProjectInput)
		.handler(async ({ input }) => {
			try {
				const updateData: Record<string, unknown> = {};
				if (input.data.name !== undefined) updateData.name = input.data.name;
				if (input.data.path !== undefined) updateData.path = input.data.path;
				if (input.data.settings !== undefined)
					updateData.settings = input.data.settings;
				return await projectRepository.update(input.id, updateData);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to update project",
				});
			}
		}),

	delete: protectedProcedure
		.input(z.object({ id: ProjectIdSchema }))
		.handler(async ({ input }) => {
			try {
				return await projectRepository.delete(input.id);
			} catch (error) {
				if (error instanceof Error && error.message.includes("not found")) {
					throw new ORPCError("NOT_FOUND", {
						message: error.message,
					});
				}
				throw new ORPCError("BAD_REQUEST", {
					message:
						error instanceof Error ? error.message : "Failed to delete project",
				});
			}
		}),
};
