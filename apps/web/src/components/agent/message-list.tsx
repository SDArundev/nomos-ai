import { useEffect, useRef } from "react";
import type { AgentMessage } from "@/store/agent-store";
import { MessageBubble } from "./message-bubble";
import { StreamingIndicator } from "./streaming-indicator";

interface MessageListProps {
	messages: AgentMessage[];
	isStreaming: boolean;
	pendingContent: string;
	pendingToolCalls: Array<{
		id: string;
		name: string;
		input: unknown;
		result?: string;
	}>;
}

export function MessageList({
	messages,
	isStreaming,
	pendingContent,
	pendingToolCalls,
}: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length, pendingContent, isStreaming]);

	return (
		<div className="flex-1 overflow-y-auto">
			{messages.length === 0 && !isStreaming && (
				<div className="flex h-full items-center justify-center">
					<div className="text-center text-muted-foreground">
						<p className="text-lg">No messages yet</p>
						<p className="text-sm">Send a message to start the conversation</p>
					</div>
				</div>
			)}

			{messages.map((msg) => (
				<MessageBubble key={msg.id} message={msg} />
			))}

			{isStreaming && pendingContent && (
				<MessageBubble
					message={{
						id: "streaming",
						sessionId: "",
						role: "assistant",
						content: pendingContent,
						toolCalls:
							pendingToolCalls.length > 0 ? pendingToolCalls : undefined,
						createdAt: new Date(),
					}}
				/>
			)}

			{isStreaming && !pendingContent && <StreamingIndicator />}

			<div ref={bottomRef} />
		</div>
	);
}
