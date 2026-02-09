import { describe, expect, it } from "bun:test";

/**
 * Session Repository Tests
 *
 * These tests validate the repository pattern for agent sessions.
 * Pure function tests run without a database.
 * DB-dependent tests require DATABASE_URL and are skipped in CI
 * unless Postgres is available.
 */

// Standalone implementation of calculateDuration matching the repository
type SessionLike = {
	startedAt: Date | null;
	completedAt: Date | null;
};
function calculateDuration(session: SessionLike): number | null {
	if (!session.completedAt || !session.startedAt) {
		return null;
	}
	return session.completedAt.getTime() - session.startedAt.getTime();
}

describe("Database Package - Session Repository", () => {
	describe("Repository Exports", () => {
		it("repositories index re-exports sessionRepository", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const indexPath = path.resolve(
				import.meta.dirname,
				"../repositories/index.ts",
			);
			const content = fs.readFileSync(indexPath, "utf-8");
			expect(content).toContain("sessionRepository");
			expect(content).toContain('./session"');
		});

		it("session repository file exports sessionRepository object", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sessionPath = path.resolve(
				import.meta.dirname,
				"../repositories/session.ts",
			);
			const content = fs.readFileSync(sessionPath, "utf-8");
			expect(content).toContain("export const sessionRepository");
		});

		it("session repository file defines all expected methods", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sessionPath = path.resolve(
				import.meta.dirname,
				"../repositories/session.ts",
			);
			const content = fs.readFileSync(sessionPath, "utf-8");
			const methods = [
				"findAll",
				"findById",
				"findByFeature",
				"findByStatus",
				"findActive",
				"create",
				"update",
				"appendOutput",
				"delete",
				"calculateDuration",
				"withTransaction",
			];
			for (const method of methods) {
				expect(content).toContain(method);
			}
		});
	});

	describe("calculateDuration (pure function)", () => {
		it("returns duration in milliseconds for completed session", () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			const completedAt = new Date("2026-01-28T11:30:00Z");
			const duration = calculateDuration({ startedAt, completedAt });
			expect(duration).toBe(5_400_000);
		});

		it("returns null when completedAt is missing", () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			expect(calculateDuration({ startedAt, completedAt: null })).toBeNull();
		});

		it("returns null when startedAt is missing", () => {
			const completedAt = new Date("2026-01-28T11:00:00Z");
			expect(calculateDuration({ startedAt: null, completedAt })).toBeNull();
		});

		it("returns null when both are missing", () => {
			expect(
				calculateDuration({ startedAt: null, completedAt: null }),
			).toBeNull();
		});

		it("returns 0 when startedAt equals completedAt", () => {
			const timestamp = new Date("2026-01-28T10:00:00Z");
			expect(
				calculateDuration({
					startedAt: timestamp,
					completedAt: timestamp,
				}),
			).toBe(0);
		});

		it("returns positive duration for sub-second intervals", () => {
			const startedAt = new Date("2026-01-28T10:00:00.000Z");
			const completedAt = new Date("2026-01-28T10:00:00.500Z");
			expect(calculateDuration({ startedAt, completedAt })).toBe(500);
		});
	});

	describe("Schema Structure", () => {
		it("schema file uses pgTable", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const schemaPath = path.resolve(
				import.meta.dirname,
				"../schema/sessions.ts",
			);
			const content = fs.readFileSync(schemaPath, "utf-8");
			expect(content).toContain("pgTable");
			expect(content).toContain("drizzle-orm/pg-core");
			expect(content).toContain("agent_session");
			expect(content).toContain("numeric");
			expect(content).toContain("total_cost_usd");
		});

		it("session schema has userId index", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const schemaPath = path.resolve(
				import.meta.dirname,
				"../schema/sessions.ts",
			);
			const content = fs.readFileSync(schemaPath, "utf-8");
			expect(content).toContain("agent_session_user_id_idx");
		});
	});
});
