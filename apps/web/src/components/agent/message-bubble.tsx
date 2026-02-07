import { Bot, ChevronDown, ChevronRight, User } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import type { AgentMessage } from "@/store/agent-store";
import { cn } from "@/lib/utils";
import { ToolCallDisplay } from "./tool-call-display";

interface MessageBubbleProps {
	message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";
	const isSystem = message.role === "system";
	const isAssistant = message.role === "assistant";

	return (
		<div
			className={cn(
				"flex gap-3 px-4 py-3",
				isUser && "flex-row-reverse",
			)}
		>
			<div
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				{isUser ? <User className="size-4" /> : <Bot className="size-4" />}
			</div>

			<div
				className={cn(
					"flex min-w-0 max-w-[80%] flex-col gap-1",
					isUser && "items-end",
				)}
			>
				{/* Thinking content (collapsible) */}
				{message.thinkingContent && <ThinkingBlock content={message.thinkingContent} />}

				<div
					className={cn(
						"rounded-lg px-4 py-2",
						isUser
							? "bg-primary text-primary-foreground"
							: "bg-muted",
						isSystem && "border border-dashed bg-transparent italic text-muted-foreground",
					)}
				>
					{isAssistant && message.content ? (
						<div className="prose prose-sm prose-invert max-w-none break-words [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/20 [&_pre]:p-3 [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
							<Markdown>{message.content}</Markdown>
						</div>
					) : (
						<p className="whitespace-pre-wrap break-words text-sm">
							{message.content}
						</p>
					)}
				</div>

				{message.toolCalls && message.toolCalls.length > 0 && (
					<div className="w-full space-y-1">
						{message.toolCalls.map((tc) => (
							<ToolCallDisplay key={tc.id} toolCall={tc} />
						))}
					</div>
				)}

				<span className="text-muted-foreground text-xs">
					{new Date(message.createdAt).toLocaleTimeString()}
				</span>
			</div>
		</div>
	);
}

function ThinkingBlock({ content }: { content: string }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<button
			type="button"
			onClick={() => setExpanded(!expanded)}
			className="w-full rounded-md border border-dashed bg-muted/30 px-3 py-2 text-left"
		>
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				{expanded ? (
					<ChevronDown className="size-3" />
				) : (
					<ChevronRight className="size-3" />
				)}
				<span className="italic">Thinking...</span>
			</div>
			{expanded && (
				<p className="mt-2 whitespace-pre-wrap text-muted-foreground text-xs">
					{content}
				</p>
			)}
		</button>
	);
}
