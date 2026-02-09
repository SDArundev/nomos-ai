import { afterAll, beforeAll, describe, expect, it, test } from "bun:test";
import { HAS_DB } from "./setup";

const TEST_USER_ID = "test-user-integration";
const TEST_PROJECT_ID = "proj_integration_test";

// Guard: typeof import() causes bun to resolve the module graph at parse time,
// which fails without DATABASE_URL. Use `any` types and dynamic imports instead.
if (!HAS_DB) {
	test.skip("Session Repository — Integration (requires DATABASE_URL)", () => {});
} else {
	describe("Session Repository — Integration", () => {
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let sessionRepository: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let featureRepository: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let db: any;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic import — avoid eager module resolution without DATABASE_URL
		let setup: any;

		beforeAll(async () => {
			setup = await import("./setup");
			const dbMod = await import("../../index");
			db = dbMod.db;
			const sessionMod = await import("../../repositories/session");
			sessionRepository = sessionMod.sessionRepository;
			const featureMod = await import("../../repositories/feature");
			featureRepository = featureMod.featureRepository;

			await setup.seedTestData(db);

			await featureRepository.create({
				id: "F850",
				userId: TEST_USER_ID,
				projectId: TEST_PROJECT_ID,
				title: "Session Test Feature",
				category: "CAT-TST",
				description: "Feature for session integration tests",
				phase: "phase-1",
				status: "in_progress",
				passes: false,
				acceptanceCriteria: ["Test"],
			});
		});

		afterAll(async () => {
			if (!sessionRepository) return;
			const sessions = await sessionRepository.findByFeature("F850");
			for (const s of sessions) {
				await sessionRepository.delete(s.id).catch(() => {});
			}
			if (featureRepository)
				await featureRepository.delete("F850").catch(() => {});
			if (db && setup) await setup.cleanupTestData(db);
		});

		describe("create and retrieve", () => {
			it("creates a session with explicit ID", async () => {
				const created = await sessionRepository.create({
					id: "S900",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "pending",
					startedAt: new Date(),
				});

				expect(created.id).toBe("S900");
				expect(created.userId).toBe(TEST_USER_ID);
				expect(created.featureId).toBe("F850");
				expect(created.status).toBe("pending");

				const retrieved = await sessionRepository.findById("S900");
				expect(retrieved).not.toBeNull();
				expect(retrieved?.id).toBe("S900");

				await sessionRepository.delete("S900");
			});

			it("creates a session with auto-generated ID", async () => {
				const created = await sessionRepository.create({
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "pending",
					startedAt: new Date(),
				});

				expect(created.id).toMatch(/^S\d{3}$/);
				await sessionRepository.delete(created.id);
			});
		});

		describe("findActive", () => {
			it("returns only pending and running sessions", async () => {
				await sessionRepository.create({
					id: "S910",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "pending",
					startedAt: new Date(),
				});
				await sessionRepository.create({
					id: "S911",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "running",
					startedAt: new Date(),
				});
				await sessionRepository.create({
					id: "S912",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "completed",
					startedAt: new Date(),
					completedAt: new Date(),
				});

				const active = await sessionRepository.findActive();
				const activeIds = active.map((s: { id: string }) => s.id);

				expect(activeIds).toContain("S910");
				expect(activeIds).toContain("S911");
				expect(activeIds).not.toContain("S912");

				await sessionRepository.delete("S910");
				await sessionRepository.delete("S911");
				await sessionRepository.delete("S912");
			});
		});

		describe("appendOutput", () => {
			it("appends text to null output", async () => {
				await sessionRepository.create({
					id: "S920",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "running",
					startedAt: new Date(),
				});

				const updated = await sessionRepository.appendOutput(
					"S920",
					"First line",
				);
				expect(updated.output).toBe("First line");

				await sessionRepository.delete("S920");
			});

			it("appends text to existing output with newline", async () => {
				await sessionRepository.create({
					id: "S921",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "running",
					startedAt: new Date(),
				});

				await sessionRepository.update("S921", { output: "First line" });
				const updated = await sessionRepository.appendOutput(
					"S921",
					"Second line",
				);
				expect(updated.output).toBe("First line\nSecond line");

				await sessionRepository.delete("S921");
			});
		});

		describe("update", () => {
			it("updates session status and completedAt", async () => {
				await sessionRepository.create({
					id: "S930",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "running",
					startedAt: new Date(),
				});

				const completedAt = new Date();
				const updated = await sessionRepository.update("S930", {
					status: "completed",
					completedAt,
				});

				expect(updated.status).toBe("completed");
				expect(updated.completedAt).toBeInstanceOf(Date);

				await sessionRepository.delete("S930");
			});

			it("throws for non-existent session", async () => {
				await expect(
					sessionRepository.update("S999_NONEXISTENT", { status: "completed" }),
				).rejects.toThrow("Session not found");
			});
		});

		describe("calculateDuration", () => {
			it("calculates duration for completed session", async () => {
				const startedAt = new Date("2026-01-28T10:00:00Z");
				const completedAt = new Date("2026-01-28T10:30:00Z");

				await sessionRepository.create({
					id: "S940",
					userId: TEST_USER_ID,
					featureId: "F850",
					status: "completed",
					startedAt,
					completedAt,
				});

				const session = await sessionRepository.findById("S940");
				expect(session).not.toBeNull();
				// biome-ignore lint/style/noNonNullAssertion: session is verified non-null by the assertion above
				const duration = sessionRepository.calculateDuration(session!);
				expect(duration).toBe(30 * 60 * 1000);

				await sessionRepository.delete("S940");
			});
		});
	});
} // end else (HAS_DB)
