import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Note: We cannot import the migrate module directly because it imports
// the db client which requires DATABASE_URL environment variable.
// Instead, we verify the migration infrastructure exists.

describe("Database Package - Migration", () => {
	describe("Migration Files", () => {
		it("has migrations directory", () => {
			const migrationsDir = resolve(import.meta.dirname, "../migrations");
			expect(existsSync(migrationsDir)).toBe(true);
		});

		it("has initial auth migration", () => {
			const migration = resolve(
				import.meta.dirname,
				"../migrations/0000_clear_selene.sql",
			);
			expect(existsSync(migration)).toBe(true);
		});

		it("has schema tables migration", () => {
			const migrationsDir = resolve(import.meta.dirname, "../migrations");
			// Find a migration file starting with 0001
			const files = new Bun.Glob("0001_*.sql").scanSync(migrationsDir);
			const migrationFiles = [...files];
			expect(migrationFiles.length).toBe(1);
		});

		it("has migration journal", () => {
			const journal = resolve(
				import.meta.dirname,
				"../migrations/meta/_journal.json",
			);
			expect(existsSync(journal)).toBe(true);
		});

		it("journal tracks all migrations", async () => {
			const journalPath = resolve(
				import.meta.dirname,
				"../migrations/meta/_journal.json",
			);
			const journal = await Bun.file(journalPath).json();
			expect(journal.entries).toBeDefined();
			expect(journal.entries.length).toBe(8);
		});
	});

	describe("Migrate Module", () => {
		it("migrate.ts file exists", () => {
			const migratePath = resolve(import.meta.dirname, "../migrate.ts");
			expect(existsSync(migratePath)).toBe(true);
		});

		it("exports runMigrations function", async () => {
			const migrateSource = await Bun.file(
				resolve(import.meta.dirname, "../migrate.ts"),
			).text();
			expect(migrateSource).toContain("export async function runMigrations");
			expect(migrateSource).toContain("drizzle-orm/libsql/migrator");
		});
	});
});
