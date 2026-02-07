import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ToolCallDisplayProps {
	toolCall: {
		id: string;
		name: string;
		input: unknown;
		result?: string;
	};
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="my-1 rounded-md border bg-muted/30">
			<button
				type="button"
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
				onClick={() => setExpanded(!expanded)}
			>
				{expanded ? (
					<ChevronDown className="size-4 shrink-0" />
				) : (
					<ChevronRight className="size-4 shrink-0" />
				)}
				<Wrench className="size-4 shrink-0 text-muted-foreground" />
				<span className="font-mono text-xs">{toolCall.name}</span>
				{toolCall.result !== undefined && (
					<Badge variant="outline" className="ml-auto text-xs">
						done
					</Badge>
				)}
			</button>
			{expanded && (
				<div className="border-t px-3 py-2">
					<div className="mb-2">
						<span className="text-muted-foreground text-xs">Input</span>
						<pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
							{typeof toolCall.input === "string"
								? toolCall.input
								: JSON.stringify(toolCall.input, null, 2)}
						</pre>
					</div>
					{toolCall.result !== undefined && (
						<div>
							<span className="text-muted-foreground text-xs">Result</span>
							<pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
								{toolCall.result}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
