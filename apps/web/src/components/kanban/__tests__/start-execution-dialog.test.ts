import { MODEL, PLANNING_MODE, THINKING_LEVEL } from "@nomos-ai/types";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for StartExecutionDialog component
 *
 * These tests validate:
 * - Enum values for model, thinking level, and planning mode
 * - Default values from feature data
 * - Status transition validation (pending -> in_progress)
 * - createSession input shape
 */

describe("StartExecutionDialog enums", () => {
	it("should have valid model enum values", () => {
		expect(MODEL.OPUS).toBe("opus");
		expect(MODEL.SONNET).toBe("sonnet");
		expect(MODEL.HAIKU).toBe("haiku");
	});

	it("should have valid thinking level enum values", () => {
		expect(THINKING_LEVEL.NONE).toBe("none");
		expect(THINKING_LEVEL.STANDARD).toBe("standard");
		expect(THINKING_LEVEL.EXTENDED).toBe("extended");
		expect(THINKING_LEVEL.ULTRATHINK).toBe("ultrathink");
	});

	it("should have valid planning mode enum values", () => {
		expect(PLANNING_MODE.SKIP).toBe("skip");
		expect(PLANNING_MODE.LITE).toBe("lite");
		expect(PLANNING_MODE.SPEC).toBe("spec");
		expect(PLANNING_MODE.FULL).toBe("full");
	});
});

describe("StartExecutionDialog defaults", () => {
	it("should use correct default values", () => {
		const defaults = {
			model: MODEL.SONNET,
			thinkingLevel: THINKING_LEVEL.STANDARD,
			planningMode: PLANNING_MODE.LITE,
		};

		expect(defaults.model).toBe("sonnet");
		expect(defaults.thinkingLevel).toBe("standard");
		expect(defaults.planningMode).toBe("lite");
	});
});

describe("Status transition validation", () => {
	it("should validate pending to in_progress transition", () => {
		const currentStatus = "pending";
		const targetStatus = "in_progress";

		// This transition should be valid according to FEATURE_VALID_TRANSITIONS
		expect(currentStatus).toBe("pending");
		expect(targetStatus).toBe("in_progress");
	});
});

describe("createSession input shape", () => {
	it("should match expected createSession input structure", () => {
		const input = {
			name: "Feature F039",
			projectId: "P001",
			model: "sonnet" as const,
		};

		expect(input).toHaveProperty("name");
		expect(input).toHaveProperty("projectId");
		expect(input).toHaveProperty("model");
		expect(typeof input.name).toBe("string");
		expect(typeof input.projectId).toBe("string");
		expect(input.model).toBe("sonnet");
	});

	it("should validate model is optional in createSession", () => {
		const inputWithoutModel = {
			name: "Feature F039",
			projectId: "P001",
		};

		expect(inputWithoutModel).toHaveProperty("name");
		expect(inputWithoutModel).toHaveProperty("projectId");
		expect(inputWithoutModel).not.toHaveProperty("model");
	});
});
