import { Check, Copy } from "lucide-react";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { AgentMessage } from "@/store/agent-store";
import { StreamingIndicator } from "./streaming-indicator";
import { ThinkingBlock } from "./thinking-block";
import { ToolCallDisplay } from "./tool-call-display";

interface AgentOutputViewerProps {
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

export function AgentOutputViewer({
	messages,
	isStreaming,
	pendingContent,
	pendingToolCalls,
}: AgentOutputViewerProps) {
	const bottomRef = useRef<HTMLDivElement>(null);
	const { copy, copied } = useCopyToClipboard();

	// Auto-scroll to bottom on content changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: These deps are intentional - we want to scroll when messages change, pending content updates, or streaming state changes
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length, pendingContent, isStreaming]);

	// Extract all text content for copying
	const handleCopy = () => {
		const messageContent = messages
			.map((msg) => {
				const content = msg.content || "";
				const thinking = msg.thinkingContent
					? `[Thinking: ${msg.thinkingContent}]`
					: "";
				return [thinking, content].filter(Boolean).join("\n");
			})
			.join("\n\n");

		// Include pending streaming content if present
		const allContent = [messageContent, pendingContent]
			.filter(Boolean)
			.join("\n\n");

		copy(allContent);
	};

	return (
		<div className="relative flex flex-1 flex-col">
			{/* Scrollable message area */}
			<div className="flex-1 overflow-y-auto">
				{messages.length === 0 && !isStreaming && (
					<div className="flex h-full items-center justify-center">
						<div className="text-center text-muted-foreground">
							<p className="text-lg">No output yet</p>
							<p className="text-sm">Agent output will appear here</p>
						</div>
					</div>
				)}

				{/* Render messages */}
				{messages.map((msg) => (
					<div key={msg.id} className="border-b px-4 py-3">
						{/* Role label */}
						<div className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
							{msg.role}
						</div>

						{/* Thinking content (collapsible) */}
						{msg.thinkingContent && (
							<ThinkingBlock content={msg.thinkingContent} />
						)}

						{/* Message content with markdown rendering */}
						{msg.content && (
							<div className="prose prose-sm prose-invert max-w-none break-words [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/20 [&_pre]:p-3">
								<Markdown rehypePlugins={[rehypeSanitize]}>
									{msg.content}
								</Markdown>
							</div>
						)}

						{/* Tool calls */}
						{msg.toolCalls && msg.toolCalls.length > 0 && (
							<div className="mt-2 space-y-1">
								{msg.toolCalls.map((tc) => (
									<ToolCallDisplay key={tc.id} toolCall={tc} />
								))}
							</div>
						)}

						{/* Timestamp */}
						<div className="mt-2 text-muted-foreground text-xs">
							{new Date(msg.createdAt).toLocaleTimeString()}
						</div>
					</div>
				))}

				{/* Pending streaming content */}
				{isStreaming && pendingContent && (
					<div className="border-b px-4 py-3">
						<div className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
							assistant
						</div>
						<div className="prose prose-sm prose-invert max-w-none break-words [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/20 [&_pre]:p-3">
							<Markdown rehypePlugins={[rehypeSanitize]}>
								{pendingContent}
							</Markdown>
						</div>
						{pendingToolCalls.length > 0 && (
							<div className="mt-2 space-y-1">
								{pendingToolCalls.map((tc) => (
									<ToolCallDisplay key={tc.id} toolCall={tc} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Streaming indicator when no pending content */}
				{isStreaming && !pendingContent && <StreamingIndicator />}

				{/* Auto-scroll anchor */}
				<div ref={bottomRef} />
			</div>

			{/* Floating copy button */}
			{messages.length > 0 && (
				<button
					type="button"
					onClick={handleCopy}
					className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-muted-foreground text-xs shadow-md backdrop-blur-sm hover:bg-muted hover:text-foreground"
					title="Copy all output to clipboard"
				>
					{copied ? (
						<>
							<Check className="size-3.5" />
							<span>Copied</span>
						</>
					) : (
						<>
							<Copy className="size-3.5" />
							<span>Copy</span>
						</>
					)}
				</button>
			)}
		</div>
	);
}
