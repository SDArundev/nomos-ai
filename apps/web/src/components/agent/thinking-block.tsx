import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ThinkingBlockProps {
	content: string;
	tokenCount?: number;
	durationMs?: number;
	defaultExpanded?: boolean;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(count: number): string {
	if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
	return String(count);
}

export function ThinkingBlock({
	content,
	tokenCount,
	durationMs,
	defaultExpanded = false,
}: ThinkingBlockProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<Collapsible open={expanded} onOpenChange={setExpanded}>
			<div className="mb-2 rounded-md border border-dashed bg-muted/30">
				<CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
					{expanded ? (
						<ChevronDown className="size-3 text-muted-foreground" />
					) : (
						<ChevronRight className="size-3 text-muted-foreground" />
					)}
					<Brain className="size-3 text-purple-400" />
					<span className="text-muted-foreground text-xs italic">
						Thinking...
					</span>
					{tokenCount != null && (
						<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
							{formatTokens(tokenCount)} tokens
						</span>
					)}
					{durationMs != null && (
						<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
							{formatDuration(durationMs)}
						</span>
					)}
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="border-t border-dashed px-3 py-2">
						<div className="prose prose-sm prose-invert max-w-none text-muted-foreground text-xs [&_code]:rounded [&_code]:bg-black/20 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/20 [&_pre]:p-3">
							<Markdown rehypePlugins={[rehypeSanitize]}>
								{content}
							</Markdown>
						</div>
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
