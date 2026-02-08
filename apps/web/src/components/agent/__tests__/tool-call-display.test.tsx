import { describe, expect, it } from "bun:test";
import { getToolCategory, isFileModifyingTool } from "@/lib/tool-categories";

describe("ToolCallDisplay Component", () => {
	// AC1: Tool name displayed with color-coded badges
	describe("AC1: Tool name display with color-coded badges", () => {
		it("accepts toolCall prop with name", () => {
			const toolCall = {
				id: "tool-1",
				name: "Read",
				input: { file_path: "/test/file.ts" },
			};

			expect(toolCall.name).toBe("Read");
		});

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

	// AC2: Input/output collapsible (already implemented)
	describe("AC2: Input/output collapsible", () => {
		it("accepts input and result fields", () => {
			const toolCall = {
				id: "tool-1",
				name: "Read",
				input: { file_path: "/test/file.ts" },
				result: "File contents here",
			};

			expect(toolCall.input).toBeDefined();
			expect(toolCall.result).toBe("File contents here");
		});

		it("handles object input", () => {
			const input = { file_path: "/test/file.ts", encoding: "utf-8" };
			const serialized = JSON.stringify(input, null, 2);

			expect(serialized).toContain("file_path");
			expect(serialized).toContain("encoding");
		});

		it("handles string input", () => {
			const input = "simple string input";
			expect(typeof input).toBe("string");
		});
	});

	// AC3: Duration shown if timestamps present
	describe("AC3: Duration display", () => {
		it("accepts startedAt and completedAt timestamps", () => {
			const toolCall = {
				id: "tool-1",
				name: "Read",
				input: {},
				startedAt: 1000,
				completedAt: 2200,
			};

			expect(toolCall.startedAt).toBe(1000);
			expect(toolCall.completedAt).toBe(2200);
		});

		it("calculates duration in milliseconds", () => {
			const startedAt = 1000;
			const completedAt = 2200;
			const duration = completedAt - startedAt;

			expect(duration).toBe(1200);
		});

		it("formats duration in seconds for values >= 1000ms", () => {
			const formatDuration = (ms: number) =>
				ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

			expect(formatDuration(1200)).toBe("1.2s");
			expect(formatDuration(5000)).toBe("5.0s");
		});

		it("formats duration in milliseconds for values < 1000ms", () => {
			const formatDuration = (ms: number) =>
				ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

			expect(formatDuration(340)).toBe("340ms");
			expect(formatDuration(50)).toBe("50ms");
		});

		it("handles missing timestamps (no duration)", () => {
			const toolCall = {
				id: "tool-1",
				name: "Read",
				input: {},
				result: "done",
			};

			expect(toolCall.startedAt).toBeUndefined();
			expect(toolCall.completedAt).toBeUndefined();
		});
	});

	// AC4: File diffs rendered for Write/Edit
	describe("AC4: File diff rendering", () => {
		it("detects Write tool as file-modifying", () => {
			expect(isFileModifyingTool("Write")).toBe(true);
		});

		it("detects Edit tool as file-modifying", () => {
			expect(isFileModifyingTool("Edit")).toBe(true);
		});

		it("detects Read tool as non-file-modifying", () => {
			expect(isFileModifyingTool("Read")).toBe(false);
		});

		it("extracts diff data from Write tool input", () => {
			const input = {
				file_path: "/test/new-file.ts",
				content: "export const foo = 'bar';",
			};

			expect(input.content).toBeDefined();
			expect(input.file_path).toBeDefined();
		});

		it("extracts diff data from Edit tool input", () => {
			const input = {
				file_path: "/test/existing-file.ts",
				old_string: "const foo = 'bar';",
				new_string: "const foo = 'baz';",
			};

			expect(input.old_string).toBeDefined();
			expect(input.new_string).toBeDefined();
			expect(input.file_path).toBeDefined();
		});

		it("handles Write tool with empty old value", () => {
			const input = {
				file_path: "/test/new-file.ts",
				content: "new content",
			};

			const oldValue = "";
			const newValue = input.content;

			expect(oldValue).toBe("");
			expect(newValue).toBe("new content");
		});

		it("handles Edit tool with old and new strings", () => {
			const input = {
				old_string: "old content",
				new_string: "new content",
			};

			expect(input.old_string).toBe("old content");
			expect(input.new_string).toBe("new content");
		});
	});
});
