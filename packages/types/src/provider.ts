import { z } from "zod";

export const thinkingLevelSchema = z.enum([
	"none",
	"low",
	"standard",
	"high",
	"ultrathink",
]);
export type ProviderThinkingLevel = z.infer<typeof thinkingLevelSchema>;

export const THINKING_TOKEN_BUDGET: Record<
	ProviderThinkingLevel,
	number | undefined
> = {
	none: undefined,
	low: 1024,
	standard: 10000,
	high: 16000,
	ultrathink: 32000,
};

export const contentBlockSchema = z.object({
	type: z.enum(["text", "tool_use", "thinking", "tool_result"]),
	text: z.string().optional(),
	thinking: z.string().optional(),
	name: z.string().optional(),
	input: z.unknown().optional(),
	tool_use_id: z.string().optional(),
	content: z.string().optional(),
});
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const providerMessageSchema = z.object({
	type: z.enum(["assistant", "user", "error", "result"]),
	subtype: z.enum(["success", "error", "error_max_turns"]).optional(),
	session_id: z.string().optional(),
	message: z
		.object({
			role: z.enum(["user", "assistant"]),
			content: z.array(contentBlockSchema),
		})
		.optional(),
	result: z.string().optional(),
	error: z.string().optional(),
	// Cost tracking (populated on "result" messages)
	costData: z
		.object({
			totalCostUsd: z.number(),
			inputTokens: z.number(),
			outputTokens: z.number(),
		})
		.optional(),
});
export type ProviderMessage = z.infer<typeof providerMessageSchema>;

export const permissionModeSchema = z.enum([
	"default",
	"acceptEdits",
	"bypassPermissions",
	"plan",
]);
export type PermissionMode = z.infer<typeof permissionModeSchema>;

export const executeOptionsSchema = z.object({
	prompt: z.string(),
	model: z.string().default("sonnet"),
	cwd: z.string(),
	systemPrompt: z.string().optional(),
	maxTurns: z.number().default(10),
	permissionMode: permissionModeSchema.optional(),
	allowedTools: z.array(z.string()).optional(),
	abortController: z.custom<AbortController>().optional(),
	sdkSessionId: z.string().optional(),
	thinkingLevel: thinkingLevelSchema.default("standard"),
	maxBudgetUsd: z.number().positive().optional(),
});
export type ExecuteOptions = z.infer<typeof executeOptionsSchema>;
