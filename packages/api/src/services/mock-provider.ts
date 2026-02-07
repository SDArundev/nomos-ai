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

export class MockProvider implements AgentProvider {
	async *executeQuery(
		options: ExecuteOptions,
	): AsyncGenerator<ProviderMessage> {
		const sessionId = `mock-${crypto.randomUUID().slice(0, 8)}`;

		// Simulate initial thinking delay
		await sleep(200);

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

		// Final result
		await sleep(100);
		yield {
			type: "result",
			subtype: "success",
			session_id: sessionId,
			result: accumulated,
		} as ProviderMessage;
	}
}
