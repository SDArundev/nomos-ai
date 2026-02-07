import { z } from "zod";
import type { Model } from "./feature";

/**
 * Map Model enum values to full Claude API model IDs
 */
export const MODEL_MAP: Record<Model, string> = {
	opus: "claude-opus-4-20250514",
	sonnet: "claude-sonnet-4-5-20250929",
	haiku: "claude-haiku-4-5-20251001",
};

/**
 * Default tools enabled for agent sessions
 */
export const DEFAULT_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"];

/**
 * Agent definition schema for defining reusable agent configurations
 */
export const agentDefinitionSchema = z.object({
	description: z.string(),
	prompt: z.string(),
	tools: z.array(z.string()).optional(),
	model: z.enum(["sonnet", "opus", "haiku"]).optional(),
});
export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;
