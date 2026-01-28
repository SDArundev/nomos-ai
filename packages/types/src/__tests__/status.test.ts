import { describe, expect, it } from "bun:test";
import {
	FEATURE_STATUS,
	type FeatureStatus,
	FeatureStatusSchema,
	PROJECT_STATUS,
	ProjectStatusSchema,
	SESSION_STATUS,
	SessionStatusSchema,
} from "../status";

describe("Status Enum Schemas", () => {
	describe("FeatureStatusSchema", () => {
		it("accepts BACKLOG", () => {
			const result = FeatureStatusSchema.safeParse(FEATURE_STATUS.BACKLOG);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("backlog");
			}
		});

		it("accepts IN_PROGRESS", () => {
			const result = FeatureStatusSchema.safeParse(FEATURE_STATUS.IN_PROGRESS);
			expect(result.success).toBe(true);
		});

		it("accepts WAITING_APPROVAL", () => {
			const result = FeatureStatusSchema.safeParse(
				FEATURE_STATUS.WAITING_APPROVAL,
			);
			expect(result.success).toBe(true);
		});

		it("accepts VERIFIED", () => {
			const result = FeatureStatusSchema.safeParse(FEATURE_STATUS.VERIFIED);
			expect(result.success).toBe(true);
		});

		it("accepts PENDING", () => {
			const result = FeatureStatusSchema.safeParse(FEATURE_STATUS.PENDING);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("pending");
			}
		});

		it("accepts FAILED", () => {
			const result = FeatureStatusSchema.safeParse(FEATURE_STATUS.FAILED);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("failed");
			}
		});

		it("rejects invalid status strings", () => {
			const result = FeatureStatusSchema.safeParse("invalid");
			expect(result.success).toBe(false);
		});

		it("rejects uppercase variations", () => {
			const result = FeatureStatusSchema.safeParse("BACKLOG");
			expect(result.success).toBe(false);
		});

		it("rejects status with whitespace", () => {
			const result = FeatureStatusSchema.safeParse("backlog ");
			expect(result.success).toBe(false);
		});

		it("rejects null", () => {
			const result = FeatureStatusSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		it("rejects undefined", () => {
			const result = FeatureStatusSchema.safeParse(undefined);
			expect(result.success).toBe(false);
		});

		it("rejects empty string", () => {
			const result = FeatureStatusSchema.safeParse("");
			expect(result.success).toBe(false);
		});
	});

	describe("ProjectStatusSchema", () => {
		it("accepts all valid statuses", () => {
			const statuses = [
				PROJECT_STATUS.DRAFT,
				PROJECT_STATUS.ACTIVE,
				PROJECT_STATUS.ARCHIVED,
			];
			for (const status of statuses) {
				const result = ProjectStatusSchema.safeParse(status);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid statuses", () => {
			const result = ProjectStatusSchema.safeParse("pending");
			expect(result.success).toBe(false);
		});
	});

	describe("SessionStatusSchema", () => {
		it("accepts all valid statuses", () => {
			const statuses = [
				SESSION_STATUS.PENDING,
				SESSION_STATUS.RUNNING,
				SESSION_STATUS.COMPLETED,
				SESSION_STATUS.FAILED,
			];
			for (const status of statuses) {
				const result = SessionStatusSchema.safeParse(status);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid statuses", () => {
			const result = SessionStatusSchema.safeParse("stopped");
			expect(result.success).toBe(false);
		});

		it("rejects old status values", () => {
			expect(SessionStatusSchema.safeParse("active").success).toBe(false);
			expect(SessionStatusSchema.safeParse("paused").success).toBe(false);
		});
	});

	describe("Type inference", () => {
		it("infers FeatureStatus correctly", () => {
			const status = FeatureStatusSchema.parse(FEATURE_STATUS.BACKLOG);
			const _typed: FeatureStatus = status;
			expect(status).toBe("backlog");
		});
	});

	describe("NOMOS state machine values", () => {
		it("has exactly 6 feature statuses", () => {
			const statuses = Object.values(FEATURE_STATUS);
			expect(statuses).toEqual([
				"backlog",
				"pending",
				"in_progress",
				"waiting_approval",
				"verified",
				"failed",
			]);
		});

		it("has exactly 3 project statuses", () => {
			const statuses = Object.values(PROJECT_STATUS);
			expect(statuses).toEqual(["draft", "active", "archived"]);
		});

		it("has exactly 4 session statuses", () => {
			const statuses = Object.values(SESSION_STATUS);
			expect(statuses).toEqual(["pending", "running", "completed", "failed"]);
		});
	});
});
