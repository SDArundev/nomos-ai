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

/**
 * Agent stream event types
 */
export const AGENT_EVENT_TYPE = {
	text: "text",
	tool_call_start: "tool_call_start",
	tool_call_delta: "tool_call_delta",
	tool_call_end: "tool_call_end",
	status: "status",
	result: "result",
	error: "error",
} as const;

export type AgentEventType =
	(typeof AGENT_EVENT_TYPE)[keyof typeof AGENT_EVENT_TYPE];

/**
 * Agent stream event discriminated union
 */
export type AgentStreamEvent =
	| { type: "text"; text: string }
	| { type: "tool_call_start"; toolCallId: string; toolName: string }
	| { type: "tool_call_delta"; toolCallId: string; partialInput: string }
	| { type: "tool_call_end"; toolCallId: string }
	| { type: "status"; status: string }
	| { type: "result"; tokenUsage: ExecutionTokenUsage }
	| { type: "error"; message: string };

/**
 * Tool call record stored in database
 */
export type ToolCallRecord = {
	id: string;
	name: string;
	input: string;
	startedAt: number;
	endedAt?: number;
};

/**
 * Token usage for agent execution
 */
export type ExecutionTokenUsage = {
	inputTokens: number;
	outputTokens: number;
	thinkingTokens?: number;
};
