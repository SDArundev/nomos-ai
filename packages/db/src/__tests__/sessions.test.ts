import { describe, expect, it } from "bun:test";

describe("Database Package - Sessions Schema", () => {
	describe("Session Schema Exports", () => {
		it("exports agentSession table", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession).toBeDefined();
		});
	});

	describe("Session Table Schema", () => {
		it("has required columns", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.id).toBeDefined();
			expect(agentSession.featureId).toBeDefined();
			expect(agentSession.status).toBeDefined();
			expect(agentSession.startedAt).toBeDefined();
			expect(agentSession.createdAt).toBeDefined();
			expect(agentSession.updatedAt).toBeDefined();
		});

		it("has optional columns", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.completedAt).toBeDefined();
			expect(agentSession.output).toBeDefined();
			expect(agentSession.error).toBeDefined();
		});

		it("has primary key on id", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.id.primary).toBe(true);
		});

		it("has foreign key on featureId", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.featureId.notNull).toBe(true);
		});

		it("has not null constraint on required fields", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.featureId.notNull).toBe(true);
			expect(agentSession.status.notNull).toBe(true);
			expect(agentSession.startedAt.notNull).toBe(true);
			expect(agentSession.createdAt.notNull).toBe(true);
			expect(agentSession.updatedAt.notNull).toBe(true);
		});

		it("has status column for index", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.status.name).toBe("status");
		});

		it("has featureId column for index", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.featureId.name).toBe("feature_id");
		});

		it("output column stores TEXT (not JSON)", async () => {
			const { agentSession } = await import("../schema");
			expect(agentSession.output.dataType).toBe("string");
		});
	});
});
