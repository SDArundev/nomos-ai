import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/store/agent-store";
import { useAgentStore } from "@/store/agent-store";
import { getEventsClient } from "@/lib/websocket";

interface ContentBlock {
	type: string;
	text?: string;
	thinking?: string;
	name?: string;
	input?: unknown;
	tool_use_id?: string;
	content?: string;
}

interface StreamPayload {
	sessionId: string;
	message: {
		type: string;
		session_id?: string;
		message?: { role: string; content: ContentBlock[] };
		result?: string;
		error?: string;
	};
}

interface StreamState {
	isStreaming: boolean;
	pendingContent: string;
	pendingToolCalls: Array<{
		id: string;
		name: string;
		input: unknown;
		result?: string;
	}>;
}

export function useAgentStream(sessionId: string | null) {
	const [streamState, setStreamState] = useState<StreamState>({
		isStreaming: false,
		pendingContent: "",
		pendingToolCalls: [],
	});
	const [streamingMessages, setStreamingMessages] = useState<AgentMessage[]>(
		[],
	);
	const [error, setError] = useState<string | null>(null);
	const contentRef = useRef("");
	const toolCallsRef = useRef<StreamState["pendingToolCalls"]>([]);
	const setIsSending = useAgentStore((s) => s.setIsSending);

	useEffect(() => {
		if (!sessionId) return;

		const client = getEventsClient();
		if (!client.connected) {
			client.connect();
		}

		const unsubscribe = client.subscribe((data) => {
			if (data.type === "agent:stream") {
				const payload = data.payload as StreamPayload;
				if (payload.sessionId !== sessionId) return;

				const msg = payload.message;

				if (msg.type === "assistant" && msg.message?.content) {
					setStreamState((prev) => ({
						...prev,
						isStreaming: true,
					}));

					for (const block of msg.message.content) {
						if (block.type === "text" && block.text) {
							contentRef.current += block.text;
							setStreamState((prev) => ({
								...prev,
								pendingContent: contentRef.current,
							}));
						} else if (block.type === "tool_use" && block.name) {
							toolCallsRef.current = [
								...toolCallsRef.current,
								{
									id: block.tool_use_id ?? crypto.randomUUID(),
									name: block.name,
									input: block.input,
								},
							];
							setStreamState((prev) => ({
								...prev,
								pendingToolCalls: toolCallsRef.current,
							}));
						} else if (block.type === "tool_result" && block.tool_use_id) {
							toolCallsRef.current = toolCallsRef.current.map((tc) =>
								tc.id === block.tool_use_id
									? { ...tc, result: block.content ?? "" }
									: tc,
							);
							setStreamState((prev) => ({
								...prev,
								pendingToolCalls: toolCallsRef.current,
							}));
						}
					}
				}

				if (msg.type === "result" || msg.type === "error") {
					if (contentRef.current || toolCallsRef.current.length > 0) {
						const finalMsg: AgentMessage = {
							id: crypto.randomUUID(),
							sessionId,
							role: "assistant",
							content: contentRef.current,
							toolCalls:
								toolCallsRef.current.length > 0
									? toolCallsRef.current
									: undefined,
							createdAt: new Date(),
						};
						setStreamingMessages((prev) => [...prev, finalMsg]);
					}

					contentRef.current = "";
					toolCallsRef.current = [];
					setStreamState({
						isStreaming: false,
						pendingContent: "",
						pendingToolCalls: [],
					});
					setIsSending(false);
				}
			}

			if (data.type === "agent:complete") {
				const payload = data.payload as { sessionId: string };
				if (payload.sessionId === sessionId) {
					contentRef.current = "";
					toolCallsRef.current = [];
					setStreamState({
						isStreaming: false,
						pendingContent: "",
						pendingToolCalls: [],
					});
					setIsSending(false);
				}
			}

			if (data.type === "agent:error") {
				const payload = data.payload as { sessionId: string; error: string };
				if (payload.sessionId === sessionId) {
					setError(payload.error);
					contentRef.current = "";
					toolCallsRef.current = [];
					setStreamState({
						isStreaming: false,
						pendingContent: "",
						pendingToolCalls: [],
					});
					setIsSending(false);
				}
			}
		});

		return () => {
			unsubscribe();
		};
	}, [sessionId, setIsSending]);

	const clearStreamingMessages = useCallback(
		() => setStreamingMessages([]),
		[],
	);

	const clearError = useCallback(() => setError(null), []);

	return {
		isStreaming: streamState.isStreaming,
		pendingContent: streamState.pendingContent,
		pendingToolCalls: streamState.pendingToolCalls,
		streamingMessages,
		clearStreamingMessages,
		error,
		clearError,
	};
}
