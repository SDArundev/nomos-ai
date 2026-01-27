import { describe, expect, it } from "bun:test";
import {
	FEATURE_STATUS,
	FeatureIdSchema,
	FeatureStatusSchema,
	PROJECT_STATUS,
	ProjectIdSchema,
	ProjectStatusSchema,
	SESSION_STATUS,
	SessionIdSchema,
	SessionStatusSchema,
	UserIdSchema,
} from "../index";

describe("Package exports", () => {
	it("exports all ID schemas", () => {
		expect(FeatureIdSchema).toBeDefined();
		expect(ProjectIdSchema).toBeDefined();
		expect(SessionIdSchema).toBeDefined();
		expect(UserIdSchema).toBeDefined();
	});

	it("exports all status schemas", () => {
		expect(FeatureStatusSchema).toBeDefined();
		expect(ProjectStatusSchema).toBeDefined();
		expect(SessionStatusSchema).toBeDefined();
	});

	it("exports all status constants", () => {
		expect(FEATURE_STATUS).toBeDefined();
		expect(PROJECT_STATUS).toBeDefined();
		expect(SESSION_STATUS).toBeDefined();
	});

	it("status constants match schema values", () => {
		for (const status of Object.values(FEATURE_STATUS)) {
			const result = FeatureStatusSchema.safeParse(status);
			expect(result.success).toBe(true);
		}
	});
});
