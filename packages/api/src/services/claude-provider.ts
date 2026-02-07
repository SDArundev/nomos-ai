import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ExecuteOptions, ProviderMessage } from "@nomos-ai/types";
import { THINKING_TOKEN_BUDGET } from "@nomos-ai/types";

const MODEL_ALIASES: Record<string, string> = {
	haiku: "claude-haiku-4-5-20251001",
	sonnet: "claude-sonnet-4-5-20250929",
	opus: "claude-opus-4-6",
};

export interface AgentProvider {
	executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage>;
}

export class ClaudeProvider implements AgentProvider {
	async *executeQuery(
		options: ExecuteOptions,
	): AsyncGenerator<ProviderMessage> {
		const model = MODEL_ALIASES[options.model] ?? options.model;
		const thinkingLevel = options.thinkingLevel ?? "standard";

		const sdkOptions: Record<string, unknown> = {
			prompt: options.prompt,
			options: {
				model,
				cwd: options.cwd,
				systemPrompt: options.systemPrompt,
				maxTurns: options.maxTurns ?? 10,
				permissionMode: "bypassPermissions" as const,
				allowDangerouslySkipPermissions: true,
				...(options.allowedTools && { tools: options.allowedTools }),
				...(options.sdkSessionId && {
					sdkSessionId: options.sdkSessionId,
				}),
				...(thinkingLevel !== "none" && {
					maxThinkingTokens: THINKING_TOKEN_BUDGET[thinkingLevel],
				}),
			},
		};

		if (options.abortController) {
			sdkOptions.abortController = options.abortController;
		}

		const stream = query(sdkOptions as Parameters<typeof query>[0]);

		for await (const message of stream) {
			yield message as ProviderMessage;
		}
	}

	resolveModel(alias: string): string {
		return MODEL_ALIASES[alias] ?? alias;
	}

	static create(): AgentProvider {
		const isMock = process.env.NOMOS_MOCK_AGENT === "true" || process.env.NOMOS_MOCK_AGENT === "1";
		if (isMock) {
			// Lazy import to avoid loading mock in production
			const { MockProvider } = require("./mock-provider") as typeof import("./mock-provider");
			return new MockProvider();
		}
		return new ClaudeProvider();
	}
}
