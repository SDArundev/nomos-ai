import { describe, expect, it } from "bun:test";
import type { FeatureId, SessionId } from "../ids";
import { FeatureIdSchema, SessionIdSchema } from "../ids";
import { SESSION_STATUS, SessionSchema } from "../session";

describe("SessionSchema", () => {
	const validSession = {
		id: "S001",
		featureId: "F001",
		status: "pending",
		startedAt: new Date("2026-01-28T10:00:00Z"),
	};

	describe("Date coercion", () => {
		it("coerces valid date strings to Date objects", () => {
			const result = SessionSchema.safeParse({
				id: "S001",
				featureId: "F001",
				status: "pending",
				startedAt: "2026-01-28T10:00:00Z",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.startedAt).toBeInstanceOf(Date);
			}
		});

		it("accepts timestamps in various formats (coercion)", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				startedAt: "2026-01-28T10:00:00+00:00",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.startedAt).toBeInstanceOf(Date);
			}
		});
	});

	describe("Branded type safety", () => {
		it("branded types prevent compile-time mixing", () => {
			const sessionId: SessionId = SessionIdSchema.parse("S002");
			const featureId: FeatureId = FeatureIdSchema.parse("F001");
			// @ts-expect-error - Type 'SessionId' is not assignable to type 'FeatureId'
			const _wrongAssignment: FeatureId = sessionId;
			expect(sessionId).not.toBe(featureId);
		});
	});

	describe("Session lifecycle", () => {
		it("pending session has no completedAt", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: SESSION_STATUS.PENDING,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.completedAt).toBeUndefined();
			}
		});

		it("running session has no completedAt", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: SESSION_STATUS.RUNNING,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.completedAt).toBeUndefined();
			}
		});

		it("completed session can have output", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: SESSION_STATUS.COMPLETED,
				completedAt: new Date("2026-01-28T12:00:00Z"),
				output: "Success!",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.output).toBe("Success!");
			}
		});

		it("failed session can have error", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: SESSION_STATUS.FAILED,
				completedAt: new Date("2026-01-28T12:00:00Z"),
				error: "Build failed",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.error).toBe("Build failed");
			}
		});
	});
});
