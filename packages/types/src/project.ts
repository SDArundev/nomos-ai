import { z } from "zod";
import { ProjectIdSchema } from "./ids";
import { ProjectStatusSchema } from "./status";

/**
 * Project settings schema for configuration options
 */
export const ProjectSettingsSchema = z.object({
	/** Theme preference for the project UI */
	theme: z.enum(["light", "dark", "system"]).default("system"),
	/** Locale for internationalization */
	locale: z.string().default("en"),
	/** Auto-save interval in seconds (0 to disable) */
	autoSaveInterval: z.number().int().min(0).default(30),
	/** Enable notifications for project events */
	notifications: z.boolean().default(true),
});

/** Project settings type */
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

/**
 * Project schema for multi-project support.
 * Validates project structure with name, path, settings, and timestamps.
 */
export const ProjectSchema = z.object({
	/** Unique project identifier */
	id: ProjectIdSchema,
	/** Human-readable project name */
	name: z.string().min(1, "Project name is required").max(100),
	/** Absolute path to the project directory */
	path: z
		.string()
		.min(1, "Project path is required")
		.refine((p) => p.startsWith("/") || /^[A-Za-z]:/.test(p), {
			message: "Path must be an absolute path",
		}),
	/** Project configuration settings */
	settings: ProjectSettingsSchema.optional().transform((s) => ({
		theme: s?.theme ?? "system",
		locale: s?.locale ?? "en",
		autoSaveInterval: s?.autoSaveInterval ?? 30,
		notifications: s?.notifications ?? true,
	})),
	/** Current project status */
	status: ProjectStatusSchema.default("draft"),
	/** ISO 8601 timestamp when project was created */
	createdAt: z.string().datetime(),
	/** ISO 8601 timestamp when project was last updated */
	updatedAt: z.string().datetime(),
});

/** Project type inferred from schema */
export type Project = z.infer<typeof ProjectSchema>;
