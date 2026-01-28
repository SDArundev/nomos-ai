import { describe, expect, it } from "bun:test";

describe("Database Package - Learnings Schema", () => {
	describe("Learning Schema Exports", () => {
		it("exports learning table", async () => {
			const { learning } = await import("../schema");
			expect(learning).toBeDefined();
		});
	});

	describe("Learning Table Schema", () => {
		it("has required columns", async () => {
			const { learning } = await import("../schema");
			expect(learning.id).toBeDefined();
			expect(learning.category).toBeDefined();
			expect(learning.createdAt).toBeDefined();
			expect(learning.updatedAt).toBeDefined();
		});

		it("has optional columns", async () => {
			const { learning } = await import("../schema");
			expect(learning.featureId).toBeDefined();
			expect(learning.pattern).toBeDefined();
			expect(learning.antiPattern).toBeDefined();
			expect(learning.context).toBeDefined();
			expect(learning.severity).toBeDefined();
			expect(learning.tags).toBeDefined();
		});

		it("has primary key on id", async () => {
			const { learning } = await import("../schema");
			expect(learning.id.primary).toBe(true);
		});

		it("has not null constraint on required fields", async () => {
			const { learning } = await import("../schema");
			expect(learning.category.notNull).toBe(true);
			expect(learning.createdAt.notNull).toBe(true);
			expect(learning.updatedAt.notNull).toBe(true);
		});

		it("has foreign key reference to feature", async () => {
			const { learning } = await import("../schema");
			expect(learning.featureId.name).toBe("feature_id");
		});

		it("has category column for index", async () => {
			const { learning } = await import("../schema");
			expect(learning.category.name).toBe("category");
		});

		it("has context column for metadata", async () => {
			const { learning } = await import("../schema");
			expect(learning.context.name).toBe("context");
		});

		it("has tags column for filtering", async () => {
			const { learning } = await import("../schema");
			expect(learning.tags.name).toBe("tags");
		});
	});
});
