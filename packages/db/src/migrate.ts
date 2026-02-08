import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import { resolveDbUrl } from "./resolve-url";
import { env } from "@nomos-ai/env/server";

const monorepoRoot = resolve(import.meta.dirname, "../../..");

/**
 * Resolve the absolute path to the SQLite database file.
 * Returns null if the DATABASE_URL is not a local file (e.g., libsql:// or http).
 */
function resolveDbFilePath(): string | null {
	const url = resolveDbUrl(env.DATABASE_URL, monorepoRoot);
	if (!url.startsWith("file:")) return null;
	return url.slice("file:".length);
}

/**
 * Create a backup of the SQLite database file before migrations.
 * Returns the backup path, or null if backup is not applicable (remote DB).
 */
export function backupDatabase(): string | null {
	const dbPath = resolveDbFilePath();
	if (!dbPath || !existsSync(dbPath)) return null;

	const backupPath = `${dbPath}.bak`;
	try {
		copyFileSync(dbPath, backupPath);
		console.log(`[db] Backup created: ${backupPath}`);
		return backupPath;
	} catch (error) {
		console.warn("[db] Backup failed:", error);
		return null;
	}
}

/**
 * Restore the database from a backup file (.bak).
 * Use this to rollback after a failed or unwanted migration.
 * @throws {Error} If backup file doesn't exist
 */
export function rollbackDatabase(): void {
	const dbPath = resolveDbFilePath();
	if (!dbPath) {
		throw new Error("Rollback only supported for local file databases");
	}

	const backupPath = `${dbPath}.bak`;
	if (!existsSync(backupPath)) {
		throw new Error(`No backup found at ${backupPath}. Cannot rollback.`);
	}

	copyFileSync(backupPath, dbPath);
	console.log(`[db] Database restored from backup: ${backupPath}`);
}

/**
 * Run all pending database migrations.
 * Automatically backs up the database before applying migrations.
 * Should be called during server startup before accepting requests.
 * @throws {Error} If migrations directory is missing or migrations fail
 */
export async function runMigrations(): Promise<void> {
	const migrationsFolder = resolve(import.meta.dirname, "./migrations");

	if (!existsSync(migrationsFolder)) {
		throw new Error(`Migrations directory not found: ${migrationsFolder}`);
	}

	// Backup before migrating
	backupDatabase();

	try {
		await migrate(db, { migrationsFolder });
		console.log("[db] Migrations complete");
	} catch (error) {
		console.error("[db] Migration failed:", error);
		throw error;
	}
}
