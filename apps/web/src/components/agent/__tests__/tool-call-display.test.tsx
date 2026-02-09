import { describe, expect, it } from "bun:test";
import { getToolCategory, isFileModifyingTool } from "@/lib/tool-categories";

describe("ToolCallDisplay - Tool Categories", () => {
	it("applies color coding for read tools (blue)", () => {
		const toolInfo = getToolCategory("Read");
		expect(toolInfo.category).toBe("read");
		expect(toolInfo.colorClass).toContain("blue");
	});

	it("applies color coding for write tools (amber)", () => {
		const toolInfo = getToolCategory("Write");
		expect(toolInfo.category).toBe("write");
		expect(toolInfo.colorClass).toContain("amber");
	});

	it("applies color coding for execute tools (red)", () => {
		const toolInfo = getToolCategory("Bash");
		expect(toolInfo.category).toBe("execute");
		expect(toolInfo.colorClass).toContain("red");
	});

	it("applies default gray for unknown tools", () => {
		const toolInfo = getToolCategory("UnknownTool");
		expect(toolInfo.category).toBe("other");
		expect(toolInfo.colorClass).toContain("gray");
	});
});

describe("ToolCallDisplay - File Modification Detection", () => {
	it("detects Write tool as file-modifying", () => {
		expect(isFileModifyingTool("Write")).toBe(true);
	});

	it("detects Edit tool as file-modifying", () => {
		expect(isFileModifyingTool("Edit")).toBe(true);
	});

	it("detects Read tool as non-file-modifying", () => {
		expect(isFileModifyingTool("Read")).toBe(false);
	});
});
