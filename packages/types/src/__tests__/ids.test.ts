import { describe, expect, it } from "bun:test";
import {
	FeatureIdSchema,
	ProjectIdSchema,
	SessionIdSchema,
	UserIdSchema,
	type FeatureId,
	type ProjectId,
} from "../ids";

describe("Branded ID Schemas", () => {
	describe("FeatureIdSchema", () => {
		it("accepts valid string IDs", () => {
			const result = FeatureIdSchema.safeParse("F001");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("F001");
			}
		});

		it("accepts UUIDs", () => {
			const result = FeatureIdSchema.safeParse(
				"550e8400-e29b-41d4-a716-446655440000",
			);
			expect(result.success).toBe(true);
		});

		it("rejects numbers", () => {
			const result = FeatureIdSchema.safeParse(12345);
			expect(result.success).toBe(false);
		});

		it("rejects objects", () => {
			const result = FeatureIdSchema.safeParse({ id: "F001" });
			expect(result.success).toBe(false);
		});

		it("rejects null", () => {
			const result = FeatureIdSchema.safeParse(null);
			expect(result.success).toBe(false);
		});

		it("rejects undefined", () => {
			const result = FeatureIdSchema.safeParse(undefined);
			expect(result.success).toBe(false);
		});
	});

	describe("ProjectIdSchema", () => {
		it("accepts valid string IDs", () => {
			const result = ProjectIdSchema.safeParse("P001");
			expect(result.success).toBe(true);
		});

		it("rejects non-strings", () => {
			const result = ProjectIdSchema.safeParse(false);
			expect(result.success).toBe(false);
		});
	});

	describe("SessionIdSchema", () => {
		it("accepts valid string IDs", () => {
			const result = SessionIdSchema.safeParse("sess-abc123");
			expect(result.success).toBe(true);
		});

		it("rejects arrays", () => {
			const result = SessionIdSchema.safeParse(["S001"]);
			expect(result.success).toBe(false);
		});
	});

	describe("UserIdSchema", () => {
		it("accepts valid string IDs", () => {
			const result = UserIdSchema.safeParse("user-123");
			expect(result.success).toBe(true);
		});
	});

	describe("Type branding", () => {
		it("infers FeatureId type correctly", () => {
			const parsed = FeatureIdSchema.parse("F001");
			const _typed: FeatureId = parsed;
			expect(typeof parsed).toBe("string");
		});

		it("infers ProjectId type correctly", () => {
			const parsed = ProjectIdSchema.parse("P001");
			const _typed: ProjectId = parsed;
			expect(typeof parsed).toBe("string");
		});

		it("branded types prevent compile-time mixing", () => {
			const featureId: FeatureId = FeatureIdSchema.parse("F001");
			const projectId: ProjectId = ProjectIdSchema.parse("P001");
			// These are different types at compile time
			// @ts-expect-error - Type 'FeatureId' is not assignable to type 'ProjectId'
			const _wrongAssignment: ProjectId = featureId;
			expect(featureId).not.toBe(projectId);
		});
	});
});
