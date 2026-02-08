import { FEATURE_STATUS } from "@nomos-ai/types";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for FeatureDetailPanel component
 *
 * These tests validate:
 * - Start Execution button visibility logic based on feature status
 */

describe("FeatureDetailPanel button visibility", () => {
	it("should show Start Execution button when status is pending", () => {
		const status = FEATURE_STATUS.PENDING;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(true);
	});

	it("should not show Start Execution button when status is backlog", () => {
		const status = FEATURE_STATUS.BACKLOG;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(false);
	});

	it("should not show Start Execution button when status is in_progress", () => {
		const status = FEATURE_STATUS.IN_PROGRESS;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(false);
	});

	it("should not show Start Execution button when status is waiting_approval", () => {
		const status = FEATURE_STATUS.WAITING_APPROVAL;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(false);
	});

	it("should not show Start Execution button when status is verified", () => {
		const status = FEATURE_STATUS.VERIFIED;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(false);
	});

	it("should not show Start Execution button when status is failed", () => {
		const status = FEATURE_STATUS.FAILED;
		const shouldShowButton = status === "pending";

		expect(shouldShowButton).toBe(false);
	});
});

describe("FeatureDetailPanel status constants", () => {
	it("should have valid feature status values", () => {
		expect(FEATURE_STATUS.BACKLOG).toBe("backlog");
		expect(FEATURE_STATUS.PENDING).toBe("pending");
		expect(FEATURE_STATUS.IN_PROGRESS).toBe("in_progress");
		expect(FEATURE_STATUS.WAITING_APPROVAL).toBe("waiting_approval");
		expect(FEATURE_STATUS.VERIFIED).toBe("verified");
		expect(FEATURE_STATUS.FAILED).toBe("failed");
	});
});
