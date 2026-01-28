import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// Try multiple .env locations to support both normal dev and worktrees
const envPaths = [
	resolve(process.cwd(), ".env"), // CWD (worktree root)
	resolve(process.cwd(), "apps/server/.env"), // Monorepo root running db commands
	resolve(__dirname, "../../apps/server/.env"), // From packages/db directory
];

const loadedPath = envPaths.find((p) => {
	if (existsSync(p)) {
		dotenv.config({ path: p });
		return true;
	}
	return false;
});

if (!process.env.DATABASE_URL) {
	console.error("❌ DATABASE_URL not found. Tried paths:", envPaths);
	console.error(
		'💡 Ensure .env file exists with DATABASE_URL=file:/path/to/db.sqlite'
	);
	process.exit(1);
}

// Validate DATABASE_URL format
if (
	!process.env.DATABASE_URL.startsWith("file:") &&
	!process.env.DATABASE_URL.startsWith("libsql://") &&
	!process.env.DATABASE_URL.startsWith("http")
) {
	console.error(
		`❌ Invalid DATABASE_URL format: ${process.env.DATABASE_URL}`
	);
	console.error(
		'💡 DATABASE_URL must start with "file:" for SQLite, "libsql://" for Turso, or "http" for remote'
	);
	process.exit(1);
}

if (loadedPath) {
	console.log(`✅ Loaded env from: ${loadedPath}`);
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "turso",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
