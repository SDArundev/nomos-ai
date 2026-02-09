import { afterAll, beforeAll, describe, expect, it, test } from "bun:test";
import { HAS_DB } from "./setup";

const TEST_USER_ID = "test-user-integration";

// Guard: typeof import() causes bun to resolve the module graph at parse time,
// which fails without DATABASE_URL. Use `any` types and dynamic imports instead.
if (!HAS_DB) {
	test.skip("Pattern Repository — Integration (requires DATABASE_URL)", () => {});
} else {
	describe("Pattern Repository — Integration", () => {
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let patternRepository: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let db: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let cleanupTestData: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let sql: any;

		beforeAll(async () => {
			const drizzle = await import("drizzle-orm");
			sql = drizzle.sql;
			const setup = await import("./setup");
			cleanupTestData = setup.cleanupTestData;
			const dbMod = await import("../../index");
			db = dbMod.db;
			const mod = await import("../../repositories/pattern");
			patternRepository = mod.patternRepository;
			await setup.seedTestData(db);
		});

		afterAll(async () => {
			if (!db) return;
			await db.execute(
				sql`DELETE FROM pattern WHERE user_id = ${TEST_USER_ID}`,
			);
			await cleanupTestData(db);
		});

		describe("create and retrieve", () => {
			it("creates a pattern with explicit ID", async () => {
				const created = await patternRepository.create({
					id: "PAT-900",
					userId: TEST_USER_ID,
					name: "Integration Test Pattern",
					description: "A pattern for integration testing",
					category: "testing",
					confidence: 0.8,
					evidenceCount: 5,
					status: "active",
				});

				expect(created.id).toBe("PAT-900");
				expect(created.name).toBe("Integration Test Pattern");
				expect(created.confidence).toBeCloseTo(0.8, 1);
				expect(created.status).toBe("active");

				const retrieved = await patternRepository.findById("PAT-900");
				expect(retrieved).not.toBeNull();
				expect(retrieved?.name).toBe("Integration Test Pattern");

				await patternRepository.delete("PAT-900");
			});
		});

		describe("upsert", () => {
			it("inserts when pattern does not exist", async () => {
				const result = await patternRepository.upsert({
					id: "PAT-910",
					userId: TEST_USER_ID,
					name: "New Pattern",
					description: "Brand new",
					category: "testing",
					confidence: 0.6,
					evidenceCount: 1,
					status: "active",
				});

				expect(result.id).toBe("PAT-910");
				expect(result.name).toBe("New Pattern");

				await patternRepository.delete("PAT-910");
			});

			it("updates when pattern already exists (idempotent)", async () => {
				await patternRepository.upsert({
					id: "PAT-911",
					userId: TEST_USER_ID,
					name: "Original Name",
					description: "Original desc",
					category: "testing",
					confidence: 0.5,
					evidenceCount: 1,
					status: "active",
				});

				const updated = await patternRepository.upsert({
					id: "PAT-911",
					userId: TEST_USER_ID,
					name: "Updated Name",
					description: "Updated desc",
					category: "testing",
					confidence: 0.9,
					evidenceCount: 10,
					status: "proven",
				});

				expect(updated.id).toBe("PAT-911");
				expect(updated.name).toBe("Updated Name");
				expect(updated.confidence).toBeCloseTo(0.9, 1);
				expect(updated.status).toBe("proven");

				await patternRepository.delete("PAT-911");
			});
		});

		describe("findRelevant", () => {
			beforeAll(async () => {
				await patternRepository.create({
					id: "PAT-920",
					userId: TEST_USER_ID,
					name: "High Confidence Testing",
					description: "High confidence pattern",
					category: "testing",
					confidence: 0.9,
					evidenceCount: 10,
					status: "active",
				});
				await patternRepository.create({
					id: "PAT-921",
					userId: TEST_USER_ID,
					name: "Low Confidence Testing",
					description: "Low confidence pattern",
					category: "testing",
					confidence: 0.3,
					evidenceCount: 2,
					status: "active",
				});
				await patternRepository.create({
					id: "PAT-922",
					userId: TEST_USER_ID,
					name: "High Confidence API",
					description: "API pattern",
					category: "api",
					confidence: 0.85,
					evidenceCount: 7,
					status: "active",
				});
				await patternRepository.create({
					id: "PAT-923",
					userId: TEST_USER_ID,
					name: "Archived Pattern",
					description: "Archived",
					category: "testing",
					confidence: 0.95,
					evidenceCount: 20,
					status: "archived",
				});
			});

			afterAll(async () => {
				for (const id of ["PAT-920", "PAT-921", "PAT-922", "PAT-923"]) {
					await patternRepository.delete(id).catch(() => {});
				}
			});

			it("filters by minimum confidence (default 0.7)", async () => {
				const relevant = await patternRepository.findRelevant(
					undefined,
					0.7,
					TEST_USER_ID,
				);

				const ids = relevant.map((p: { id: string }) => p.id);
				expect(ids).toContain("PAT-920");
				expect(ids).toContain("PAT-922");
				expect(ids).not.toContain("PAT-921");
			});

			it("excludes archived patterns (only returns active)", async () => {
				const relevant = await patternRepository.findRelevant(
					undefined,
					0.0,
					TEST_USER_ID,
				);

				const ids = relevant.map((p: { id: string }) => p.id);
				expect(ids).not.toContain("PAT-923");
			});

			it("filters by category", async () => {
				const relevant = await patternRepository.findRelevant(
					"api",
					0.7,
					TEST_USER_ID,
				);

				const ids = relevant.map((p: { id: string }) => p.id);
				expect(ids).toContain("PAT-922");
				expect(ids).not.toContain("PAT-920");
			});

			it("filters by userId", async () => {
				const relevant = await patternRepository.findRelevant(
					undefined,
					0.0,
					"nonexistent-user",
				);

				expect(relevant.length).toBe(0);
			});
		});

		describe("update", () => {
			it("updates pattern fields", async () => {
				await patternRepository.create({
					id: "PAT-930",
					userId: TEST_USER_ID,
					name: "To Update",
					description: "Will be updated",
					category: "testing",
					confidence: 0.5,
					status: "active",
				});

				const updated = await patternRepository.update("PAT-930", {
					confidence: 0.95,
					status: "proven",
				});

				expect(updated.confidence).toBeCloseTo(0.95, 1);
				expect(updated.status).toBe("proven");

				await patternRepository.delete("PAT-930");
			});

			it("throws for non-existent pattern", async () => {
				await expect(
					patternRepository.update("PAT-NONEXISTENT", { name: "Nope" }),
				).rejects.toThrow("Pattern not found");
			});
		});

		describe("delete", () => {
			it("deletes a pattern and returns it", async () => {
				await patternRepository.create({
					id: "PAT-940",
					userId: TEST_USER_ID,
					name: "To Delete",
					description: "Will be deleted",
					category: "testing",
					confidence: 0.5,
					status: "active",
				});

				const deleted = await patternRepository.delete("PAT-940");
				expect(deleted.id).toBe("PAT-940");

				const check = await patternRepository.findById("PAT-940");
				expect(check).toBeNull();
			});
		});
	});
} // end else (HAS_DB)
