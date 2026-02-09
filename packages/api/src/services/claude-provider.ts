import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
	SDKAssistantMessage,
	SDKMessage,
	SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type {
	ContentBlock,
	ExecuteOptions,
	ProviderMessage,
} from "@nomos-ai/types";
import { THINKING_TOKEN_BUDGET } from "@nomos-ai/types";

const MODEL_ALIASES: Record<string, string> = {
	haiku: "claude-haiku-4-5-20251001",
	sonnet: "claude-sonnet-4-5-20250929",
	opus: "claude-opus-4-6",
};

/** Max retries for retryable errors (rate limit, network, server) */
const MAX_RETRIES = 3;
/** Base delay in ms for exponential backoff */
const BASE_DELAY_MS = 1000;
/** Connection timeout in ms (5 minutes) */
const CONNECTION_TIMEOUT_MS = 300_000;

export type SDKErrorCategory =
	| "auth"
	| "rate_limit"
	| "network"
	| "timeout"
	| "server"
	| "validation"
	| "unknown";

export function classifyError(error: unknown): {
	category: SDKErrorCategory;
	retryable: boolean;
	message: string;
} {
	const msg = error instanceof Error ? error.message : String(error);
	const lower = msg.toLowerCase();

	if (
		lower.includes("401") ||
		lower.includes("unauthorized") ||
		lower.includes("invalid api key") ||
		lower.includes("authentication")
	) {
		return { category: "auth", retryable: false, message: msg };
	}
	if (
		lower.includes("429") ||
		lower.includes("rate limit") ||
		lower.includes("too many requests")
	) {
		return { category: "rate_limit", retryable: true, message: msg };
	}
	if (
		lower.includes("timeout") ||
		lower.includes("timed out") ||
		lower.includes("etimedout")
	) {
		return { category: "timeout", retryable: true, message: msg };
	}
	if (
		lower.includes("econnrefused") ||
		lower.includes("enotfound") ||
		lower.includes("network") ||
		lower.includes("fetch failed") ||
		lower.includes("econnreset")
	) {
		return { category: "network", retryable: true, message: msg };
	}
	if (
		lower.includes("500") ||
		lower.includes("502") ||
		lower.includes("503") ||
		lower.includes("overloaded")
	) {
		return { category: "server", retryable: true, message: msg };
	}
	if (
		lower.includes("invalid") ||
		lower.includes("validation") ||
		lower.includes("400")
	) {
		return { category: "validation", retryable: false, message: msg };
	}
	return { category: "unknown", retryable: false, message: msg };
}

function delayWithJitter(attempt: number): Promise<void> {
	const delay = BASE_DELAY_MS * 2 ** attempt;
	const jitter = delay * 0.5 * Math.random();
	return new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

/**
 * Extract cost data from an SDK result message using typed fields.
 */
function extractCostData(
	result: SDKResultMessage,
): ProviderMessage["costData"] {
	if (result.total_cost_usd == null) return undefined;
	return {
		totalCostUsd: result.total_cost_usd,
		inputTokens: result.usage.input_tokens,
		outputTokens: result.usage.output_tokens,
		cacheReadInputTokens: result.usage.cache_read_input_tokens,
		cacheCreationInputTokens: result.usage.cache_creation_input_tokens,
	};
}

/**
 * Convert an SDK message to a ProviderMessage, returning undefined for
 * message types we don't forward (system, stream_event, tool_progress, etc.).
 */
function toProviderMessage(message: SDKMessage): ProviderMessage | undefined {
	switch (message.type) {
		case "assistant": {
			const assistantMsg = message as SDKAssistantMessage;
			const content: ContentBlock[] = [];
			for (const block of assistantMsg.message.content) {
				if (block.type === "text") {
					content.push({ type: "text", text: block.text });
				} else if (block.type === "thinking") {
					content.push({
						type: "thinking",
						thinking: "thinking" in block ? String(block.thinking) : "",
					});
				} else if (block.type === "tool_use") {
					content.push({
						type: "tool_use",
						name: block.name,
						input: block.input,
						tool_use_id: block.id,
					});
				}
			}
			return {
				type: "assistant",
				session_id: assistantMsg.session_id,
				message: { role: "assistant", content },
			};
		}
		case "result": {
			const resultMsg = message as SDKResultMessage;
			return {
				type: "result",
				subtype: resultMsg.subtype === "success" ? "success" : "error",
				session_id: resultMsg.session_id,
				...(resultMsg.subtype === "success" && {
					result: resultMsg.result,
				}),
				costData: extractCostData(resultMsg),
			};
		}
		default:
			return undefined;
	}
}

export interface AgentProvider {
	executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage>;
}

export class ClaudeProvider implements AgentProvider {
	async *executeQuery(
		options: ExecuteOptions,
	): AsyncGenerator<ProviderMessage> {
		const model = MODEL_ALIASES[options.model] ?? options.model;
		const thinkingLevel = options.thinkingLevel ?? "standard";

		const abortController = options.abortController ?? new AbortController();

		const sdkOptions: Parameters<typeof query>[0] = {
			prompt: options.prompt,
			options: {
				model,
				cwd: options.cwd,
				systemPrompt: options.systemPrompt,
				maxTurns: options.maxTurns ?? 10,
				permissionMode: options.permissionMode ?? "default",
				allowDangerouslySkipPermissions:
					options.permissionMode === "bypassPermissions",
				settingSources: ["project"],
				abortController,
				...(options.allowedTools && { tools: options.allowedTools }),
				...(options.sdkSessionId && {
					sessionId: options.sdkSessionId,
				}),
				...(thinkingLevel !== "none" && {
					maxThinkingTokens: THINKING_TOKEN_BUDGET[thinkingLevel],
				}),
				...(options.maxBudgetUsd && {
					maxBudgetUsd: options.maxBudgetUsd,
				}),
			},
		};

		const timeout = setTimeout(() => {
			abortController.abort(new Error("Connection timeout"));
		}, CONNECTION_TIMEOUT_MS);

		let lastError: unknown;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				const stream = query(sdkOptions);

				for await (const message of stream) {
					const providerMsg = toProviderMessage(message);
					if (providerMsg) {
						yield providerMsg;
					}
				}

				clearTimeout(timeout);
				return;
			} catch (error) {
				lastError = error;
				const classified = classifyError(error);

				if (
					!classified.retryable ||
					abortController.signal.aborted ||
					attempt === MAX_RETRIES
				) {
					clearTimeout(timeout);
					throw new Error(
						`Claude SDK error [${classified.category}]: ${classified.message}`,
					);
				}

				console.warn(
					`[claude-provider] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}): [${classified.category}] ${classified.message}`,
				);
				await delayWithJitter(attempt);
			}
		}

		clearTimeout(timeout);
		throw lastError;
	}

	resolveModel(alias: string): string {
		return MODEL_ALIASES[alias] ?? alias;
	}

	static create(): AgentProvider {
		const isMock =
			process.env.NOMOS_MOCK_AGENT === "true" ||
			process.env.NOMOS_MOCK_AGENT === "1";
		if (isMock) {
			const { MockProvider } =
				require("./mock-provider") as typeof import("./mock-provider");
			return new MockProvider();
		}
		return new ClaudeProvider();
	}
}
