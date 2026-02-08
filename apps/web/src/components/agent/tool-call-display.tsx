import { ChevronDown, ChevronRight, Clock, Wrench } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/diff/diff-viewer";
import { getToolCategory, isFileModifyingTool } from "@/lib/tool-categories";

interface ToolCallDisplayProps {
	toolCall: {
		id: string;
		name: string;
		input: unknown;
		result?: string;
		startedAt?: number;
		completedAt?: number;
	};
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Extract file diff data from Write or Edit tool calls
 */
function extractDiffData(
	toolName: string,
	input: unknown,
): { oldValue: string; newValue: string; fileName?: string } | null {
	if (!input || typeof input !== "object") {
		return null;
	}

	const inputObj = input as Record<string, unknown>;

	if (toolName === "Write") {
		// Write tool: no old value, new value from content
		const content =
			typeof inputObj.content === "string" ? inputObj.content : "";
		const filePath =
			typeof inputObj.file_path === "string" ? inputObj.file_path : undefined;
		return {
			oldValue: "",
			newValue: content,
			fileName: filePath,
		};
	}

	if (toolName === "Edit") {
		// Edit tool: old_string and new_string from input
		const oldString =
			typeof inputObj.old_string === "string" ? inputObj.old_string : "";
		const newString =
			typeof inputObj.new_string === "string" ? inputObj.new_string : "";
		const filePath =
			typeof inputObj.file_path === "string" ? inputObj.file_path : undefined;
		return {
			oldValue: oldString,
			newValue: newString,
			fileName: filePath,
		};
	}

	return null;
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
	const [expanded, setExpanded] = useState(false);

	// Get tool category for color-coded badge
	const { colorClass } = getToolCategory(toolCall.name);

	// Calculate duration if timestamps available
	const duration =
		toolCall.startedAt && toolCall.completedAt
			? toolCall.completedAt - toolCall.startedAt
			: null;

	// Check if tool modifies files and extract diff data
	const isFileTool = isFileModifyingTool(toolCall.name);
	const diffData = isFileTool
		? extractDiffData(toolCall.name, toolCall.input)
		: null;

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
				<Badge className={`font-mono text-xs ${colorClass}`}>
					{toolCall.name}
				</Badge>
				{duration !== null && (
					<div className="ml-auto flex items-center gap-1 text-muted-foreground text-xs">
						<Clock className="size-3" />
						<span>{formatDuration(duration)}</span>
					</div>
				)}
				{toolCall.result !== undefined && duration === null && (
					<Badge variant="outline" className="ml-auto text-xs">
						done
					</Badge>
				)}
			</button>
			{expanded && (
				<div className="border-t px-3 py-2">
					{/* File diff rendering for Write/Edit tools */}
					{diffData && (
						<div className="mb-3">
							<span className="text-muted-foreground text-xs">File Changes</span>
							<div className="mt-1">
								<DiffViewer
									oldValue={diffData.oldValue}
									newValue={diffData.newValue}
									fileName={diffData.fileName}
									splitView={false}
								/>
							</div>
						</div>
					)}

					{/* Input section */}
					<div className="mb-2">
						<span className="text-muted-foreground text-xs">Input</span>
						<pre className="mt-1 max-h-40 overflow-auto rounded bg-muted/50 p-2 font-mono text-xs">
							{typeof toolCall.input === "string"
								? toolCall.input
								: JSON.stringify(toolCall.input, null, 2)}
						</pre>
					</div>

					{/* Result section */}
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
