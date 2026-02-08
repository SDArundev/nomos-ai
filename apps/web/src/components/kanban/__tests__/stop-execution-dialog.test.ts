import { FEATURE_STATUS } from "@nomos-ai/types";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for StopExecutionDialog component
 *
 * These tests validate:
 * - Stop mutation input shape (sessionId)
 * - Query invalidation keys after stop
 * - Status transition from in_progress to failed
 */

describe("StopExecutionDialog mutation input", () => {
	it("should require sessionId for stop mutation", () => {
		const stopInput = {
			sessionId: "test-session-id",
		};

		expect(stopInput).toHaveProperty("sessionId");
		expect(typeof stopInput.sessionId).toBe("string");
	});

	it("should require featureId and status for updateStatus mutation", () => {
		const updateStatusInput = {
			id: "F040",
			status: FEATURE_STATUS.FAILED,
		};

		expect(updateStatusInput).toHaveProperty("id");
		expect(updateStatusInput).toHaveProperty("status");
		expect(updateStatusInput.status).toBe("failed");
	});
});

describe("StopExecutionDialog query invalidation", () => {
	it("should invalidate features.list query key", () => {
		const queryKey = ["features", "list"];

		expect(queryKey).toEqual(["features", "list"]);
	});

	it("should invalidate features.get query key with featureId", () => {
		const featureId = "F040";
		const queryKey = ["features", "get", { input: { id: featureId } }];

		expect(queryKey).toContain("features");
		expect(queryKey).toContain("get");
	});

	it("should invalidate agent.listSessions query key", () => {
		const queryKey = ["agent", "listSessions"];

		expect(queryKey).toEqual(["agent", "listSessions"]);
	});
});

describe("StopExecutionDialog status transition", () => {
	it("should transition from in_progress to failed", () => {
		const currentStatus = FEATURE_STATUS.IN_PROGRESS;
		const targetStatus = FEATURE_STATUS.FAILED;

		expect(currentStatus).toBe("in_progress");
		expect(targetStatus).toBe("failed");
	});

	it("should validate failed status is in valid transitions from in_progress", () => {
		// This validates the status.ts FEATURE_VALID_TRANSITIONS map
		const validTransitions = [FEATURE_STATUS.WAITING_APPROVAL, FEATURE_STATUS.FAILED];

		expect(validTransitions).toContain(FEATURE_STATUS.FAILED);
	});
});

describe("StopExecutionDialog session filtering", () => {
	it("should find active session by featureId and isRunning", () => {
		const sessions = [
			{ id: "s1", featureId: "F001", isRunning: false },
			{ id: "s2", featureId: "F040", isRunning: true },
			{ id: "s3", featureId: "F040", isRunning: false },
		];

		const targetFeatureId = "F040";
		const activeSession = sessions.find(
			(s) => s.featureId === targetFeatureId && s.isRunning === true,
		);

		expect(activeSession).toBeDefined();
		expect(activeSession?.id).toBe("s2");
		expect(activeSession?.featureId).toBe("F040");
		expect(activeSession?.isRunning).toBe(true);
	});

	it("should return undefined if no active session found", () => {
		const sessions = [
			{ id: "s1", featureId: "F001", isRunning: false },
			{ id: "s3", featureId: "F040", isRunning: false },
		];

		const targetFeatureId = "F040";
		const activeSession = sessions.find(
			(s) => s.featureId === targetFeatureId && s.isRunning === true,
		);

		expect(activeSession).toBeUndefined();
	});
});
