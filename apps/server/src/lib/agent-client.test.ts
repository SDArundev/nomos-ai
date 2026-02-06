import { describe, expect, test } from "bun:test";
import { DEFAULT_TOOLS, MODEL_MAP } from "@nomos-ai/types";
import { createAgentQuery, PERMISSION_MODES } from "./agent-client";

describe("agent-client", () => {
	test("MODEL_MAP has entries for all Model enum values", () => {
		expect(MODEL_MAP).toHaveProperty("opus");
		expect(MODEL_MAP).toHaveProperty("sonnet");
		expect(MODEL_MAP).toHaveProperty("haiku");
		expect(MODEL_MAP.opus).toBe("claude-opus-4-20250514");
		expect(MODEL_MAP.sonnet).toBe("claude-sonnet-4-5-20250929");
		expect(MODEL_MAP.haiku).toBe("claude-haiku-4-5-20251001");
	});

	test("DEFAULT_TOOLS is non-empty array containing expected tools", () => {
		expect(Array.isArray(DEFAULT_TOOLS)).toBe(true);
		expect(DEFAULT_TOOLS.length).toBeGreaterThan(0);
		expect(DEFAULT_TOOLS).toContain("Read");
		expect(DEFAULT_TOOLS).toContain("Write");
		expect(DEFAULT_TOOLS).toContain("Edit");
		expect(DEFAULT_TOOLS).toContain("Bash");
		expect(DEFAULT_TOOLS).toContain("Glob");
		expect(DEFAULT_TOOLS).toContain("Grep");
	});

	test("PERMISSION_MODES has all 6 modes", () => {
		expect(PERMISSION_MODES).toHaveProperty("default");
		expect(PERMISSION_MODES).toHaveProperty("acceptEdits");
		expect(PERMISSION_MODES).toHaveProperty("bypassPermissions");
		expect(PERMISSION_MODES).toHaveProperty("plan");
		expect(PERMISSION_MODES).toHaveProperty("delegate");
		expect(PERMISSION_MODES).toHaveProperty("dontAsk");
		expect(PERMISSION_MODES.default).toBe("default");
		expect(PERMISSION_MODES.acceptEdits).toBe("acceptEdits");
		expect(PERMISSION_MODES.bypassPermissions).toBe("bypassPermissions");
		expect(PERMISSION_MODES.plan).toBe("plan");
		expect(PERMISSION_MODES.delegate).toBe("delegate");
		expect(PERMISSION_MODES.dontAsk).toBe("dontAsk");
	});

	test("createAgentQuery is a function", () => {
		expect(typeof createAgentQuery).toBe("function");
	});
});
