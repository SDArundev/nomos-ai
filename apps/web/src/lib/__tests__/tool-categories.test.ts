import { describe, expect, it } from "bun:test";
import { getToolCategory, isFileModifyingTool } from "../tool-categories";

describe("tool-categories", () => {
	describe("getToolCategory", () => {
		it("should return read category for Read tool", () => {
			const result = getToolCategory("Read");
			expect(result.category).toBe("read");
			expect(result.colorClass).toContain("blue");
		});

		it("should return read category for Grep tool", () => {
			const result = getToolCategory("Grep");
			expect(result.category).toBe("read");
			expect(result.colorClass).toContain("blue");
		});

		it("should return read category for Glob tool", () => {
			const result = getToolCategory("Glob");
			expect(result.category).toBe("read");
			expect(result.colorClass).toContain("blue");
		});

		it("should return write category for Write tool", () => {
			const result = getToolCategory("Write");
			expect(result.category).toBe("write");
			expect(result.colorClass).toContain("amber");
		});

		it("should return write category for Edit tool", () => {
			const result = getToolCategory("Edit");
			expect(result.category).toBe("write");
			expect(result.colorClass).toContain("amber");
		});

		it("should return execute category for Bash tool", () => {
			const result = getToolCategory("Bash");
			expect(result.category).toBe("execute");
			expect(result.colorClass).toContain("red");
		});

		it("should return other category for unknown tool", () => {
			const result = getToolCategory("UnknownTool");
			expect(result.category).toBe("other");
			expect(result.colorClass).toContain("gray");
		});
	});

	describe("isFileModifyingTool", () => {
		it("should return true for Write tool", () => {
			expect(isFileModifyingTool("Write")).toBe(true);
		});

		it("should return true for Edit tool", () => {
			expect(isFileModifyingTool("Edit")).toBe(true);
		});

		it("should return false for Read tool", () => {
			expect(isFileModifyingTool("Read")).toBe(false);
		});

		it("should return false for Bash tool", () => {
			expect(isFileModifyingTool("Bash")).toBe(false);
		});

		it("should return false for unknown tool", () => {
			expect(isFileModifyingTool("UnknownTool")).toBe(false);
		});
	});
});
