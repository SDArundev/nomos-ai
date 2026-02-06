import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

/**
 * Rollback strategy:
 * Drizzle ORM does not provide automatic rollback for applied migrations.
 * To rollback, manually:
 * 1. Identify the migration to revert in ./migrations/
 * 2. Write a new "down" migration SQL file
 * 3. Apply it via: bun drizzle-kit push
 * 4. Or restore from database backup: cp .nomos/nomos.db.bak .nomos/nomos.db
 *
 * For safety, always backup before migrating:
 *   cp .nomos/nomos.db .nomos/nomos.db.bak
 */

/**
 * Run all pending database migrations.
 * Should be called during server startup before accepting requests.
 * @throws {Error} If migrations directory is missing or migrations fail
 */
export async function runMigrations(): Promise<void> {
	const migrationsFolder = resolve(import.meta.dirname, "./migrations");

	if (!existsSync(migrationsFolder)) {
		throw new Error(`Migrations directory not found: ${migrationsFolder}`);
	}

	try {
		await migrate(db, { migrationsFolder });
		console.log("[db] Migrations complete");
	} catch (error) {
		console.error("[db] Migration failed:", error);
		throw error;
	}
}
