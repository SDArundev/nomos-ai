import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

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
