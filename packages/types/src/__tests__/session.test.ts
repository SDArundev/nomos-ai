import { describe, expect, it } from "bun:test";
import type { FeatureId, SessionId } from "../ids";
import { FeatureIdSchema, SessionIdSchema } from "../ids";
import { SESSION_STATUS, type Session, SessionSchema } from "../session";

describe("SessionSchema", () => {
	const validSession = {
		id: "S001",
		featureId: "F001",
		status: "pending",
		startedAt: new Date("2026-01-28T10:00:00Z"),
	};

	describe("Valid sessions", () => {
		it("accepts minimal valid session", () => {
			const result = SessionSchema.safeParse(validSession);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("S001");
				expect(result.data.featureId).toBe("F001");
				expect(result.data.status).toBe("pending");
			}
		});

		it("accepts session with completedAt", () => {
			const completedAt = new Date("2026-01-28T11:00:00Z");
			const result = SessionSchema.safeParse({
				...validSession,
				status: "completed",
				completedAt,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.completedAt).toEqual(completedAt);
			}
		});

		it("accepts session with output", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: "completed",
				output: "Feature F001 implemented successfully",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.output).toBe(
					"Feature F001 implemented successfully",
				);
			}
		});

		it("accepts session with error", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: "failed",
				error: "TypeScript compilation failed",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.error).toBe("TypeScript compilation failed");
			}
		});

		it("accepts all valid status values", () => {
			for (const status of Object.values(SESSION_STATUS)) {
				const result = SessionSchema.safeParse({
					...validSession,
					status,
				});
				expect(result.success).toBe(true);
			}
		});
	});

	describe("Required fields", () => {
		it("rejects missing id", () => {
			const { id, ...noId } = validSession;
			const result = SessionSchema.safeParse(noId);
			expect(result.success).toBe(false);
		});

		it("rejects missing featureId", () => {
			const { featureId, ...noFeatureId } = validSession;
			const result = SessionSchema.safeParse(noFeatureId);
			expect(result.success).toBe(false);
		});

		it("rejects missing status", () => {
			const { status, ...noStatus } = validSession;
			const result = SessionSchema.safeParse(noStatus);
			expect(result.success).toBe(false);
		});

		it("rejects missing startedAt", () => {
			const { startedAt, ...noStartedAt } = validSession;
			const result = SessionSchema.safeParse(noStartedAt);
			expect(result.success).toBe(false);
		});
	});

	describe("Field validation", () => {
		it("rejects invalid featureId format", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				featureId: "invalid",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid status value", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				status: "invalid",
			});
			expect(result.success).toBe(false);
		});

		it("rejects old status values (active, paused)", () => {
			expect(
				SessionSchema.safeParse({ ...validSession, status: "active" }).success,
			).toBe(false);
			expect(
				SessionSchema.safeParse({ ...validSession, status: "paused" }).success,
			).toBe(false);
		});

		it("rejects invalid startedAt format", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				startedAt: "not-a-date",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid completedAt format", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				completedAt: "not-a-date",
			});
			expect(result.success).toBe(false);
		});

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
	});

	describe("Timestamp validation", () => {
		it("accepts ISO 8601 timestamps with Z suffix", () => {
			const result = SessionSchema.safeParse({
				...validSession,
				startedAt: "2026-01-28T10:00:00.000Z",
				completedAt: "2026-01-28T11:30:00Z",
			});
			expect(result.success).toBe(true);
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

	describe("Type inference", () => {
		it("infers Session type correctly", () => {
			const session = SessionSchema.parse(validSession);
			const _typed: Session = session;
			expect(session.id).toBe("S001");
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
