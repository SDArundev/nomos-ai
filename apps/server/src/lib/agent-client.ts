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
	delegate: "delegate" as const,
	dontAsk: "dontAsk" as const,
};

/**
 * Derived type from PERMISSION_MODES constant
 */
export type PermissionMode =
	(typeof PERMISSION_MODES)[keyof typeof PERMISSION_MODES];

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
	permissionMode?: PermissionMode;
}) {
	const sdkModel = options.model ? MODEL_MAP[options.model] : env.CLAUDE_MODEL;
	const effectivePermissionMode = options.permissionMode ?? "bypassPermissions";

	return query({
		prompt: options.prompt,
		options: {
			model: sdkModel,
			tools: options.tools ?? DEFAULT_TOOLS,
			maxTurns: options.maxTurns,
			maxBudgetUsd: options.maxBudgetUsd,
			cwd: options.cwd,
			systemPrompt: options.systemPrompt,
			permissionMode: effectivePermissionMode,
			...(effectivePermissionMode === "bypassPermissions" && {
				allowDangerouslySkipPermissions: true,
			}),
		},
	});
}
