import { z } from "zod";

export const themeModeSchema = z.enum([
	"system",
	"dark",
	"light",
	"dracula",
	"nord",
	"monokai",
	"tokyonight",
	"solarized",
	"gruvbox",
	"catppuccin",
	"onedark",
	"synthwave",
	"forest",
	"ocean",
]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const planningModeSettingSchema = z.enum([
	"skip",
	"lite",
	"spec",
	"full",
]);
export type PlanningModeSetting = z.infer<typeof planningModeSettingSchema>;

export const settingScopeSchema = z.enum(["global", "project"]);
export type SettingScope = z.infer<typeof settingScopeSchema>;

export const settingSchema = z.object({
	id: z.string(),
	key: z.string(),
	value: z.string(), // JSON-encoded
	scope: settingScopeSchema,
	scopeId: z.string().nullable(), // projectId for project scope
	updatedAt: z.date(),
});
export type Setting = z.infer<typeof settingSchema>;

export const SETTING_KEYS = {
	THEME: "theme",
	MAX_CONCURRENCY: "maxConcurrency",
	DEFAULT_MODEL: "defaultModel",
	THINKING_LEVEL: "thinkingLevel",
	PLANNING_MODE: "planningMode",
	USE_WORKTREES: "useWorktrees",
	SKIP_TESTS: "skipTests",
	SIDEBAR_OPEN: "sidebarOpen",
} as const;
