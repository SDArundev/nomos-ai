import type { ExecuteOptions, ProviderMessage } from "@nomos-ai/types";
import type { AgentProvider } from "./claude-provider";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_RESPONSES = [
	"I'll help you with that. Let me analyze the codebase first.",
	"Looking at the project structure, I can see the relevant files.",
	"I've identified the changes needed. Let me implement them now.",
	"The implementation is complete. Here's a summary of what I did:",
	"All acceptance criteria have been met. The feature is ready for review.",
];

/**
 * Detect whether this executeQuery call is for feature expansion
 * by checking the prompt for keywords used by ExpansionService.
 */
function isExpansionRequest(options: ExecuteOptions): boolean {
	const text = `${options.prompt} ${options.systemPrompt ?? ""}`.toLowerCase();
	return (
		text.includes("feature specification") ||
		(text.includes("structured") && text.includes("json") && text.includes("feature"))
	);
}

/**
 * Extract a short title from the user's natural language input
 * embedded in the expansion prompt (between --- USER INPUT --- markers).
 */
function extractUserInput(prompt: string): string {
	const match = prompt.match(/--- USER INPUT ---\s*([\s\S]*?)\s*--- END USER INPUT ---/);
	return match?.[1]?.trim() ?? "User-requested feature";
}

/**
 * Build a mock ExpandedFeature JSON response that incorporates the user's input.
 */
function buildMockExpansionResponse(prompt: string): string {
	const userInput = extractUserInput(prompt);
	const title = userInput.length > 80 ? `${userInput.slice(0, 77)}...` : userInput;
	const description =
		userInput.length >= 20
			? userInput.slice(0, 500)
			: `${userInput}. This feature implements the requested functionality with proper error handling and tests.`;

	return JSON.stringify({
		title: title.length >= 5 ? title : `Implement ${title}`,
		description: description.slice(0, 500),
		category: "CAT-GEN",
		phase: "phase-1",
		estimatedSize: "M",
		acceptanceCriteria: [
			`${userInput.slice(0, 100)} works as described`,
			"No regressions in existing functionality",
			"Unit tests cover the new behavior",
		],
	});
}

export class MockProvider implements AgentProvider {
	async *executeQuery(
		options: ExecuteOptions,
	): AsyncGenerator<ProviderMessage> {
		const sessionId = `mock-${crypto.randomUUID().slice(0, 8)}`;

		// Simulate initial thinking delay
		await sleep(200);

		// If this is an expansion request, return valid JSON directly
		if (isExpansionRequest(options)) {
			const jsonResponse = buildMockExpansionResponse(options.prompt);

			yield {
				type: "assistant",
				session_id: sessionId,
				message: {
					role: "assistant",
					content: [{ type: "text", text: jsonResponse }],
				},
			} as ProviderMessage;

			await sleep(100);
			yield {
				type: "result",
				subtype: "success",
				session_id: sessionId,
				result: jsonResponse,
				costData: {
					totalCostUsd: 0.001,
					inputTokens: 100,
					outputTokens: 50,
					cacheReadInputTokens: 0,
					cacheCreationInputTokens: 0,
				},
			} as ProviderMessage;
			return;
		}

		// Pick a random response
		const response =
			MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] ??
			MOCK_RESPONSES[0];
		const words = (response as string).split(" ");

		// Stream text word by word
		let accumulated = "";
		for (const word of words) {
			accumulated += (accumulated ? " " : "") + word;
			await sleep(50);

			yield {
				type: "assistant",
				session_id: sessionId,
				message: {
					role: "assistant",
					content: [{ type: "text", text: `${word} ` }],
				},
			} as ProviderMessage;
		}

		// Simulate a tool use
		await sleep(100);
		yield {
			type: "assistant",
			session_id: sessionId,
			message: {
				role: "assistant",
				content: [
					{
						type: "tool_use",
						name: "Read",
						input: { file_path: "/mock/example.ts" },
						tool_use_id: `mock-tool-${crypto.randomUUID().slice(0, 8)}`,
					},
				],
			},
		} as ProviderMessage;

		// Simulate tool result
		await sleep(150);
		yield {
			type: "assistant",
			session_id: sessionId,
			message: {
				role: "assistant",
				content: [
					{
						type: "tool_result",
						tool_use_id: `mock-tool-${crypto.randomUUID().slice(0, 8)}`,
						content: "// Mock file content\nexport const example = true;",
					},
				],
			},
		} as ProviderMessage;

		// Final result with simulated cost data
		await sleep(100);
		yield {
			type: "result",
			subtype: "success",
			session_id: sessionId,
			result: accumulated,
			costData: {
				totalCostUsd: 0.003,
				inputTokens: 150,
				outputTokens: words.length * 2,
				cacheReadInputTokens: 50,
				cacheCreationInputTokens: 0,
			},
		} as ProviderMessage;
	}
}
