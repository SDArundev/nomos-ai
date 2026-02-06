import { query } from "@anthropic-ai/claude-agent-sdk";
import { env } from "@nomos-ai/env/server";
import { DEFAULT_TOOLS, MODEL_MAP, type Model } from "@nomos-ai/types";

/**
 * Permission modes for agent tool execution
 */
export const PERMISSION_MODES = {
	default: "default" as const,
	acceptEdits: "acceptEdits" as const,
	bypassPermissions: "bypassPermissions" as const,
	plan: "plan" as const,
};

/**
 * Create an agent query with the Claude Agent SDK
 */
export function createAgentQuery(options: {
	prompt: string;
	model?: Model;
	tools?: string[];
	maxTurns?: number;
	maxBudgetUsd?: number;
	cwd?: string;
	systemPrompt?: string;
	permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
}) {
	const sdkModel = options.model ? MODEL_MAP[options.model] : env.CLAUDE_MODEL;

	return query({
		prompt: options.prompt,
		options: {
			model: sdkModel,
			tools: options.tools ?? DEFAULT_TOOLS,
			maxTurns: options.maxTurns,
			maxBudgetUsd: options.maxBudgetUsd,
			cwd: options.cwd,
			systemPrompt: options.systemPrompt,
			permissionMode: options.permissionMode ?? "bypassPermissions",
		},
	});
}
