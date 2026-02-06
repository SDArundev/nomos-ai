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
