import { describe, expect, it } from "bun:test";

describe("Database Package - Projects Schema", () => {
	describe("Project Schema Exports", () => {
		it("exports project table", async () => {
			const { project } = await import("../schema");
			expect(project).toBeDefined();
		});
	});

	describe("Project Table Schema", () => {
		it("has required columns", async () => {
			const { project } = await import("../schema");
			expect(project.id).toBeDefined();
			expect(project.name).toBeDefined();
			expect(project.path).toBeDefined();
			expect(project.settings).toBeDefined();
			expect(project.createdAt).toBeDefined();
			expect(project.updatedAt).toBeDefined();
		});

		it("has primary key on id", async () => {
			const { project } = await import("../schema");
			expect(project.id.primary).toBe(true);
		});

		it("has unique constraint on path (via composite index)", async () => {
			const { project } = await import("../schema");
			expect(project.path).toBeDefined();
			expect(project.path.notNull).toBe(true);
		});

		it("has not null constraint on name", async () => {
			const { project } = await import("../schema");
			expect(project.name.notNull).toBe(true);
		});

		it("has settings column defined", async () => {
			const { project } = await import("../schema");
			expect(project.settings.name).toBe("settings");
		});
	});
});
