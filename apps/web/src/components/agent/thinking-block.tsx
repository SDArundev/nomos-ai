import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ThinkingBlockProps {
	content: string;
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
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
