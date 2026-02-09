import { describe, expect, test } from "bun:test";
import type {
	SDKAssistantMessage,
	SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { extractCostData, toProviderMessage } from "../claude-provider";

describe("extractCostData", () => {
	test("extracts all cost fields from a full SDKResultMessage", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			total_cost_usd: 0.042,
			usage: {
				input_tokens: 2000,
				output_tokens: 800,
				cache_read_input_tokens: 150,
				cache_creation_input_tokens: 50,
			},
		} as SDKResultMessage;

		const costData = extractCostData(result);
		expect(costData).toBeDefined();
		expect(costData!.totalCostUsd).toBe(0.042);
		expect(costData!.inputTokens).toBe(2000);
		expect(costData!.outputTokens).toBe(800);
		expect(costData!.cacheReadInputTokens).toBe(150);
		expect(costData!.cacheCreationInputTokens).toBe(50);
	});

	test("returns undefined when total_cost_usd is null", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			total_cost_usd: null,
			usage: {
				input_tokens: 0,
				output_tokens: 0,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as unknown as SDKResultMessage;

		const costData = extractCostData(result);
		expect(costData).toBeUndefined();
	});

	test("returns undefined when total_cost_usd is undefined", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			usage: {
				input_tokens: 100,
				output_tokens: 50,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as unknown as SDKResultMessage;

		const costData = extractCostData(result);
		expect(costData).toBeUndefined();
	});

	test("handles zero cost correctly (not treated as null)", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			total_cost_usd: 0,
			usage: {
				input_tokens: 0,
				output_tokens: 0,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as SDKResultMessage;

		const costData = extractCostData(result);
		// total_cost_usd == 0, and 0 == null is false, so should return data
		expect(costData).toBeDefined();
		expect(costData!.totalCostUsd).toBe(0);
	});

	test("handles very small fractional costs", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			total_cost_usd: 0.000001,
			usage: {
				input_tokens: 5,
				output_tokens: 2,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as SDKResultMessage;

		const costData = extractCostData(result);
		expect(costData).toBeDefined();
		expect(costData!.totalCostUsd).toBe(0.000001);
	});

	test("handles large token counts", () => {
		const result = {
			type: "result",
			subtype: "success",
			session_id: "test-session",
			result: "done",
			total_cost_usd: 5.50,
			usage: {
				input_tokens: 200000,
				output_tokens: 100000,
				cache_read_input_tokens: 50000,
				cache_creation_input_tokens: 10000,
			},
		} as SDKResultMessage;

		const costData = extractCostData(result);
		expect(costData).toBeDefined();
		expect(costData!.totalCostUsd).toBe(5.50);
		expect(costData!.inputTokens).toBe(200000);
		expect(costData!.outputTokens).toBe(100000);
		expect(costData!.cacheReadInputTokens).toBe(50000);
		expect(costData!.cacheCreationInputTokens).toBe(10000);
	});
});

describe("toProviderMessage", () => {
	test("converts SDK result message with cost data", () => {
		const sdkMsg = {
			type: "result",
			subtype: "success",
			session_id: "sess-1",
			result: "Feature implemented",
			total_cost_usd: 0.12,
			usage: {
				input_tokens: 5000,
				output_tokens: 2500,
				cache_read_input_tokens: 1000,
				cache_creation_input_tokens: 200,
			},
		} as SDKResultMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.type).toBe("result");
		expect(msg!.subtype).toBe("success");
		expect(msg!.result).toBe("Feature implemented");
		expect(msg!.costData).toBeDefined();
		expect(msg!.costData!.totalCostUsd).toBe(0.12);
		expect(msg!.costData!.inputTokens).toBe(5000);
		expect(msg!.costData!.outputTokens).toBe(2500);
	});

	test("converts SDK result message without cost data", () => {
		const sdkMsg = {
			type: "result",
			subtype: "success",
			session_id: "sess-2",
			result: "done",
			total_cost_usd: null,
			usage: {
				input_tokens: 0,
				output_tokens: 0,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as unknown as SDKResultMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.type).toBe("result");
		expect(msg!.costData).toBeUndefined();
	});

	test("converts SDK error result message", () => {
		const sdkMsg = {
			type: "result",
			subtype: "error",
			session_id: "sess-3",
			total_cost_usd: 0.01,
			usage: {
				input_tokens: 100,
				output_tokens: 50,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		} as SDKResultMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.type).toBe("result");
		expect(msg!.subtype).toBe("error");
		expect(msg!.costData).toBeDefined();
		expect(msg!.costData!.totalCostUsd).toBe(0.01);
	});

	test("converts SDK assistant message with text content", () => {
		const sdkMsg = {
			type: "assistant",
			session_id: "sess-4",
			message: {
				role: "assistant",
				content: [{ type: "text", text: "Hello world" }],
			},
		} as unknown as SDKAssistantMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.type).toBe("assistant");
		expect(msg!.message).toBeDefined();
		expect(msg!.message!.content).toHaveLength(1);
		expect(msg!.message!.content[0]!.type).toBe("text");
		expect(msg!.message!.content[0]!.text).toBe("Hello world");
	});

	test("converts SDK assistant message with tool_use content", () => {
		const sdkMsg = {
			type: "assistant",
			session_id: "sess-5",
			message: {
				role: "assistant",
				content: [
					{
						type: "tool_use",
						id: "tool-123",
						name: "Read",
						input: { file_path: "/test.ts" },
					},
				],
			},
		} as unknown as SDKAssistantMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.message!.content).toHaveLength(1);
		expect(msg!.message!.content[0]!.type).toBe("tool_use");
		expect(msg!.message!.content[0]!.name).toBe("Read");
		expect(msg!.message!.content[0]!.tool_use_id).toBe("tool-123");
	});

	test("converts SDK assistant message with thinking content", () => {
		const sdkMsg = {
			type: "assistant",
			session_id: "sess-6",
			message: {
				role: "assistant",
				content: [{ type: "thinking", thinking: "Let me analyze..." }],
			},
		} as unknown as SDKAssistantMessage;

		const msg = toProviderMessage(sdkMsg);
		expect(msg).toBeDefined();
		expect(msg!.message!.content).toHaveLength(1);
		expect(msg!.message!.content[0]!.type).toBe("thinking");
		expect(msg!.message!.content[0]!.thinking).toBe("Let me analyze...");
	});

	test("returns undefined for unhandled message types", () => {
		const sdkMsg = { type: "system" } as any;
		expect(toProviderMessage(sdkMsg)).toBeUndefined();

		const streamMsg = { type: "stream_event" } as any;
		expect(toProviderMessage(streamMsg)).toBeUndefined();

		const progressMsg = { type: "tool_progress" } as any;
		expect(toProviderMessage(progressMsg)).toBeUndefined();
	});
});

describe("classifyError", () => {
	test("classifies auth errors as non-retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("401 Unauthorized"));
		expect(result.category).toBe("auth");
		expect(result.retryable).toBe(false);
	});

	test("classifies rate limit errors as retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("429 Too Many Requests"));
		expect(result.category).toBe("rate_limit");
		expect(result.retryable).toBe(true);
	});

	test("classifies network errors as retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("ECONNREFUSED"));
		expect(result.category).toBe("network");
		expect(result.retryable).toBe(true);
	});

	test("classifies server errors as retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("503 Service Unavailable"));
		expect(result.category).toBe("server");
		expect(result.retryable).toBe(true);
	});

	test("classifies validation errors as non-retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("400 Invalid request"));
		expect(result.category).toBe("validation");
		expect(result.retryable).toBe(false);
	});

	test("classifies unknown errors as non-retryable", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError(new Error("Something unexpected happened"));
		expect(result.category).toBe("unknown");
		expect(result.retryable).toBe(false);
	});

	test("handles non-Error values", async () => {
		const { classifyError } = await import("../claude-provider");

		const result = classifyError("string error");
		expect(result.category).toBe("unknown");
		expect(result.message).toBe("string error");
	});
});
