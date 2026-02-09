import { describe, expect, it } from "bun:test";
import {
	type FeatureId,
	FeatureIdSchema,
	type ProjectId,
	ProjectIdSchema,
} from "../ids";

describe("Branded ID Schemas", () => {
	describe("FeatureIdSchema format validation", () => {
		it("accepts valid F001-F999 format", () => {
			expect(FeatureIdSchema.safeParse("F001").success).toBe(true);
			expect(FeatureIdSchema.safeParse("F123").success).toBe(true);
			expect(FeatureIdSchema.safeParse("F999").success).toBe(true);
		});

		it("rejects wrong digit counts", () => {
			expect(FeatureIdSchema.safeParse("F0001").success).toBe(false);
			expect(FeatureIdSchema.safeParse("F00").success).toBe(false);
			expect(FeatureIdSchema.safeParse("F1").success).toBe(false);
		});

		it("rejects wrong prefix or case", () => {
			expect(FeatureIdSchema.safeParse("f001").success).toBe(false);
			expect(FeatureIdSchema.safeParse("A001").success).toBe(false);
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
