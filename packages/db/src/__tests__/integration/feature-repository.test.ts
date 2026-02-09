import { afterAll, beforeAll, describe, expect, it, test } from "bun:test";
import { HAS_DB } from "./setup";

const TEST_USER_ID = "test-user-integration";
const TEST_PROJECT_ID = "proj_integration_test";

// Guard: bun's describe.skipIf still runs beforeAll/afterAll, so use a plain if
if (!HAS_DB) {
	test.skip("Feature Repository — Integration (requires DATABASE_URL)", () => {});
} else {
	describe("Feature Repository — Integration", () => {
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import types
		let featureRepository: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import types
		let db: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import types
		let setup: any;

		beforeAll(async () => {
			setup = await import("./setup");
			const dbMod = await import("../../index");
			db = dbMod.db;
			const mod = await import("../../repositories/feature");
			featureRepository = mod.featureRepository;
			await setup.seedTestData(db);
		});

		afterAll(async () => {
			if (db && setup) await setup.cleanupTestData(db);
		});

		const createTestFeature = (overrides: Record<string, unknown> = {}) => ({
			userId: TEST_USER_ID,
			projectId: TEST_PROJECT_ID,
			title: "Integration Test Feature",
			category: "CAT-TST",
			description: "A test feature for integration testing purposes",
			phase: "phase-1",
			status: "backlog",
			passes: false,
			acceptanceCriteria: ["Test criterion 1"],
			...overrides,
		});

		describe("create and retrieve", () => {
			it("creates a feature with explicit ID and retrieves it", async () => {
				const data = createTestFeature({ id: "F900" });
				const created = await featureRepository.create(data);

				expect(created.id).toBe("F900");
				expect(created.title).toBe("Integration Test Feature");
				expect(created.userId).toBe(TEST_USER_ID);
				expect(created.projectId).toBe(TEST_PROJECT_ID);
				expect(created.status).toBe("backlog");
				expect(created.createdAt).toBeInstanceOf(Date);

				const retrieved = await featureRepository.findById("F900");
				expect(retrieved).not.toBeNull();
				expect(retrieved?.id).toBe("F900");

				await featureRepository.delete("F900");
			});

			it("creates a feature with auto-generated ID", async () => {
				const data = createTestFeature();
				const created = await featureRepository.create(data);

				expect(created.id).toMatch(/^F\d{3}$/);
				await featureRepository.delete(created.id);
			});

			it("returns null for non-existent feature", async () => {
				const result = await featureRepository.findById("F999_NONEXISTENT");
				expect(result).toBeNull();
			});
		});

		describe("findPaginated", () => {
			const featureIds: string[] = [];

			beforeAll(async () => {
				for (let i = 0; i < 5; i++) {
					const created = await featureRepository.create(
						createTestFeature({
							id: `F8${String(i).padStart(2, "0")}`,
							title: `Pagination Feature ${i}`,
						}),
					);
					featureIds.push(created.id);
				}
			});

			afterAll(async () => {
				for (const id of featureIds) {
					await featureRepository.delete(id).catch(() => {});
				}
			});

			it("returns paginated results with correct total", async () => {
				const result = await featureRepository.findPaginated({
					limit: 2,
					offset: 0,
					userId: TEST_USER_ID,
				});

				expect(result.rows.length).toBe(2);
				expect(result.total).toBeGreaterThanOrEqual(5);
			});

			it("respects offset", async () => {
				const page1 = await featureRepository.findPaginated({
					limit: 2,
					offset: 0,
					userId: TEST_USER_ID,
				});
				const page2 = await featureRepository.findPaginated({
					limit: 2,
					offset: 2,
					userId: TEST_USER_ID,
				});

				expect(page1.rows[0]?.id).not.toBe(page2.rows[0]?.id);
			});

			it("caps limit at 200", async () => {
				const result = await featureRepository.findPaginated({
					limit: 500,
					userId: TEST_USER_ID,
				});

				expect(result.rows.length).toBeLessThanOrEqual(200);
			});
		});

		describe("update", () => {
			it("updates a feature and returns updated data", async () => {
				await featureRepository.create(createTestFeature({ id: "F910" }));

				const updated = await featureRepository.update("F910", {
					title: "Updated Title",
					status: "pending",
				});

				expect(updated.title).toBe("Updated Title");
				expect(updated.status).toBe("pending");

				await featureRepository.delete("F910");
			});

			it("throws for non-existent feature", async () => {
				await expect(
					featureRepository.update("F999_NONEXISTENT", { title: "Nope" }),
				).rejects.toThrow("Feature not found");
			});
		});

		describe("delete", () => {
			it("deletes a feature and returns it", async () => {
				await featureRepository.create(createTestFeature({ id: "F920" }));

				const deleted = await featureRepository.delete("F920");
				expect(deleted.id).toBe("F920");

				const check = await featureRepository.findById("F920");
				expect(check).toBeNull();
			});

			it("throws for non-existent feature", async () => {
				await expect(
					featureRepository.delete("F999_NONEXISTENT"),
				).rejects.toThrow("Feature not found");
			});
		});

		describe("bulkUpdateStatus", () => {
			it("updates status for multiple features", async () => {
				await featureRepository.create(createTestFeature({ id: "F930" }));
				await featureRepository.create(createTestFeature({ id: "F931" }));

				const updated = await featureRepository.bulkUpdateStatus(
					["F930", "F931"],
					"pending",
				);

				expect(updated.length).toBe(2);
				expect(updated.every((f) => f.status === "pending")).toBe(true);

				await featureRepository.delete("F930");
				await featureRepository.delete("F931");
			});

			it("throws for empty IDs array", async () => {
				await expect(
					featureRepository.bulkUpdateStatus([], "pending"),
				).rejects.toThrow("ids array is empty");
			});
		});
	});
} // end else (HAS_DB)
