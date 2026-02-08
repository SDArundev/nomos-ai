export type ToolCategory = "read" | "write" | "execute" | "other";

export interface ToolCategoryInfo {
	category: ToolCategory;
	colorClass: string;
}

const TOOL_CATEGORY_MAP: Record<string, ToolCategoryInfo> = {
	// Read operations (blue)
	Read: { category: "read", colorClass: "bg-blue-500/20 text-blue-400" },
	Grep: { category: "read", colorClass: "bg-blue-500/20 text-blue-400" },
	Glob: { category: "read", colorClass: "bg-blue-500/20 text-blue-400" },

	// Write operations (amber)
	Write: { category: "write", colorClass: "bg-amber-500/20 text-amber-400" },
	Edit: { category: "write", colorClass: "bg-amber-500/20 text-amber-400" },

	// Execute operations (red)
	Bash: { category: "execute", colorClass: "bg-red-500/20 text-red-400" },
};

/**
 * Get category info for a tool by name.
 * Returns default gray styling for unknown tools.
 */
export function getToolCategory(toolName: string): ToolCategoryInfo {
	return (
		TOOL_CATEGORY_MAP[toolName] ?? {
			category: "other",
			colorClass: "bg-gray-500/20 text-gray-400",
		}
	);
}

/**
 * Check if a tool modifies files (Write or Edit).
 */
export function isFileModifyingTool(toolName: string): boolean {
	const info = getToolCategory(toolName);
	return info.category === "write";
}
