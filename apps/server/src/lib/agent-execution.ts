import { query } from "@anthropic-ai/claude-agent-sdk";
import { sessionRepository } from "@nomos-ai/db";
import {
	AGENT_EVENT_TYPE,
	type AgentStreamEvent,
	type ExecutionTokenUsage,
	type ToolCallRecord,
} from "@nomos-ai/types";

interface AgentConfig {
	model: string;
	tools: string[];
	systemPrompt: string;
	maxTurns?: number;
	maxBudgetUsd?: number;
	cwd?: string;
	permissionMode: string;
}

export async function* executeAgent(
	sessionId: string,
	agentConfig: AgentConfig,
): AsyncGenerator<AgentStreamEvent> {
	// Validate session
	const session = await sessionRepository.findById(sessionId);
	if (!session) throw new Error(`Session not found: ${sessionId}`);
	if (session.status !== "pending") {
		throw new Error(
			`Session ${sessionId} is ${session.status}, expected pending`,
		);
	}

	// Transition to running
	await sessionRepository.setRunning(sessionId);
	yield { type: AGENT_EVENT_TYPE.status, status: "running" };

	const toolCalls = new Map<
		string,
		{ name: string; inputChunks: string[]; startedAt: number; ended: boolean }
	>();
	let currentToolCallId: string | null = null;
	let textBuffer = "";

	try {
		const agentStream = query({
			prompt: agentConfig.systemPrompt,
			options: {
				model: agentConfig.model,
				tools: agentConfig.tools,
				maxTurns: agentConfig.maxTurns,
				maxBudgetUsd: agentConfig.maxBudgetUsd,
				cwd: agentConfig.cwd,
				// biome-ignore lint/suspicious/noExplicitAny: permissionMode needs to match SDK types
				permissionMode: agentConfig.permissionMode as any,
				includePartialMessages: true,
			},
		});

		for await (const message of agentStream) {
			if (message.type === "stream_event") {
				const event = message.event;

				if (event.type === "content_block_start") {
					if (event.content_block?.type === "tool_use") {
						const toolCallId = event.content_block.id;
						const toolName = event.content_block.name;
						currentToolCallId = toolCallId;
						toolCalls.set(toolCallId, {
							name: toolName,
							inputChunks: [],
							startedAt: Date.now(),
							ended: false,
						});
						yield {
							type: AGENT_EVENT_TYPE.tool_call_start,
							toolCallId,
							toolName,
						};
					}
				} else if (event.type === "content_block_delta") {
					if (event.delta?.type === "text_delta") {
						const text = event.delta.text;
						textBuffer += text;
						yield { type: AGENT_EVENT_TYPE.text, text };
					} else if (event.delta?.type === "input_json_delta") {
						const partialInput = event.delta.partial_json;
						// Use tracked currentToolCallId for delta attribution
						if (currentToolCallId) {
							const tc = toolCalls.get(currentToolCallId);
							if (tc) {
								tc.inputChunks.push(partialInput);
								yield {
									type: AGENT_EVENT_TYPE.tool_call_delta,
									toolCallId: currentToolCallId,
									partialInput,
								};
							}
						}
					}
				} else if (event.type === "content_block_stop") {
					// Check if a tool call just ended
					if (currentToolCallId) {
						const tc = toolCalls.get(currentToolCallId);
						if (tc && !tc.ended) {
							const record: ToolCallRecord = {
								id: currentToolCallId,
								name: tc.name,
								input: tc.inputChunks.join(""),
								startedAt: tc.startedAt,
								endedAt: Date.now(),
							};
							await sessionRepository.addToolCall(sessionId, record);
							tc.ended = true;
							yield {
								type: AGENT_EVENT_TYPE.tool_call_end,
								toolCallId: currentToolCallId,
							};
							currentToolCallId = null;
						}
					} else {
						// BUG-1 FIX: Defensive fallback for unexpected event ordering
						// If currentToolCallId is null but we have un-ended tool calls, end one
						for (const [id, tc] of toolCalls) {
							if (!tc.ended) {
								const record: ToolCallRecord = {
									id,
									name: tc.name,
									input: tc.inputChunks.join(""),
									startedAt: tc.startedAt,
									endedAt: Date.now(),
								};
								await sessionRepository.addToolCall(sessionId, record);
								tc.ended = true;
								yield {
									type: AGENT_EVENT_TYPE.tool_call_end,
									toolCallId: id,
								};
								break;
							}
						}
					}
				}

				// Periodically flush text to DB (BUG-3 FIX: wrap in try-catch)
				if (textBuffer.length > 200) {
					try {
						await sessionRepository.appendOutput(sessionId, textBuffer);
						textBuffer = "";
					} catch (flushError) {
						console.error(
							`Failed to flush text buffer for session ${sessionId}:`,
							flushError,
						);
						// Keep buffer for retry in final flush
					}
				}
			} else if (message.type === "result") {
				// Flush remaining text
				if (textBuffer) {
					await sessionRepository.appendOutput(sessionId, textBuffer);
					textBuffer = "";
				}

				// Extract token usage from result
				// biome-ignore lint/suspicious/noExplicitAny: usage object is not typed in SDK
				const usage = (message as any).usage;

				// BUG-4 FIX: Warn about missing token usage
				if (!usage || typeof usage.input_tokens !== "number") {
					console.warn(
						`Missing token usage in result for session ${sessionId}`,
					);
				}

				const tokenUsage: ExecutionTokenUsage = {
					inputTokens: usage?.input_tokens ?? 0,
					outputTokens: usage?.output_tokens ?? 0,
					thinkingTokens: usage?.thinking_tokens,
				};

				await sessionRepository.setCompleted(sessionId, tokenUsage);
				yield { type: AGENT_EVENT_TYPE.result, tokenUsage };
				yield { type: AGENT_EVENT_TYPE.status, status: "completed" };
			}
		}

		// In case result message wasn't received, complete anyway
		if (textBuffer) {
			await sessionRepository.appendOutput(sessionId, textBuffer);
		}
		const finalSession = await sessionRepository.findById(sessionId);
		if (finalSession && finalSession.status === "running") {
			await sessionRepository.setCompleted(sessionId);
			yield {
				type: AGENT_EVENT_TYPE.result,
				tokenUsage: { inputTokens: 0, outputTokens: 0 },
			};
			yield { type: AGENT_EVENT_TYPE.status, status: "completed" };
		}
	} catch (error) {
		// Flush any remaining text
		if (textBuffer) {
			await sessionRepository.appendOutput(sessionId, textBuffer);
		}
		const errorMessage = error instanceof Error ? error.message : String(error);
		await sessionRepository.setFailed(sessionId, errorMessage);
		yield { type: AGENT_EVENT_TYPE.error, message: errorMessage };
		yield { type: AGENT_EVENT_TYPE.status, status: "failed" };
	}
}
