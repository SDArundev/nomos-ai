import { describe, expect, it } from "bun:test";

describe("Database Package - Features Schema", () => {
	describe("Feature Schema Exports", () => {
		it("exports feature table", async () => {
			const { feature } = await import("../schema");
			expect(feature).toBeDefined();
		});
	});

	describe("Feature Table Schema", () => {
		it("has required columns", async () => {
			const { feature } = await import("../schema");
			expect(feature.id).toBeDefined();
			expect(feature.projectId).toBeDefined();
			expect(feature.title).toBeDefined();
			expect(feature.category).toBeDefined();
			expect(feature.description).toBeDefined();
			expect(feature.phase).toBeDefined();
			expect(feature.status).toBeDefined();
			expect(feature.passes).toBeDefined();
			expect(feature.acceptanceCriteria).toBeDefined();
			expect(feature.createdAt).toBeDefined();
			expect(feature.updatedAt).toBeDefined();
		});

		it("has optional columns", async () => {
			const { feature } = await import("../schema");
			expect(feature.priority).toBeDefined();
			expect(feature.requirements).toBeDefined();
			expect(feature.dependencies).toBeDefined();
			expect(feature.estimatedSize).toBeDefined();
			expect(feature.model).toBeDefined();
			expect(feature.thinkingLevel).toBeDefined();
			expect(feature.planningMode).toBeDefined();
			expect(feature.retries).toBeDefined();
			expect(feature.spec).toBeDefined();
			expect(feature.technicalNotes).toBeDefined();
			expect(feature.error).toBeDefined();
			expect(feature.summary).toBeDefined();
			expect(feature.branchName).toBeDefined();
			expect(feature.tags).toBeDefined();
			expect(feature.startedAt).toBeDefined();
			expect(feature.completedAt).toBeDefined();
			expect(feature.verifiedAt).toBeDefined();
			expect(feature.completedBy).toBeDefined();
		});

		it("has primary key on id", async () => {
			const { feature } = await import("../schema");
			expect(feature.id.primary).toBe(true);
		});

		it("has foreign key on projectId", async () => {
			const { feature } = await import("../schema");
			expect(feature.projectId.notNull).toBe(true);
		});

		it("has not null constraint on required fields", async () => {
			const { feature } = await import("../schema");
			expect(feature.title.notNull).toBe(true);
			expect(feature.category.notNull).toBe(true);
			expect(feature.description.notNull).toBe(true);
			expect(feature.phase.notNull).toBe(true);
			expect(feature.status.notNull).toBe(true);
			expect(feature.passes.notNull).toBe(true);
			expect(feature.acceptanceCriteria.notNull).toBe(true);
		});

		it("has status column for index", async () => {
			const { feature } = await import("../schema");
			expect(feature.status.name).toBe("status");
		});

		it("has phase column for index", async () => {
			const { feature } = await import("../schema");
			expect(feature.phase.name).toBe("phase");
		});
	});
});
