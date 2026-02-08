import { Bot, User } from "lucide-react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/store/agent-store";
import { ThinkingBlock } from "./thinking-block";
import { ToolCallDisplay } from "./tool-call-display";

interface MessageBubbleProps {
	message: AgentMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const isUser = message.role === "user";
	const isSystem = message.role === "system";
	const isAssistant = message.role === "assistant";

	return (
		<div className={cn("flex gap-3 px-4 py-3", isUser && "flex-row-reverse")}>
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
				{message.thinkingContent && (
					<ThinkingBlock content={message.thinkingContent} />
				)}

				<div
					className={cn(
						"rounded-lg px-4 py-2",
						isUser ? "bg-primary text-primary-foreground" : "bg-muted",
						isSystem &&
							"border border-dashed bg-transparent text-muted-foreground italic",
					)}
				>
					{isAssistant && message.content ? (
						<div className="prose prose-sm prose-invert max-w-none break-words [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/20 [&_pre]:p-3">
							<Markdown rehypePlugins={[rehypeSanitize]}>
								{message.content}
							</Markdown>
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
