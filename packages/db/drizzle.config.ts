import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveDbUrl } from "./src/resolve-url";

const monorepoRoot = resolve(__dirname, "../..");

// Try multiple .env locations — monorepo root first (canonical), then fallbacks
const envPaths = [
	resolve(monorepoRoot, ".env"), // Monorepo root (canonical)
	resolve(process.cwd(), ".env"), // CWD (worktree root)
	resolve(monorepoRoot, "apps/server/.env"), // Legacy server .env
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
		"💡 Ensure .env file exists with DATABASE_URL=file:./apps/server/data/nomos.db",
	);
	process.exit(1);
}

// Validate DATABASE_URL format
if (
	!process.env.DATABASE_URL.startsWith("file:") &&
	!process.env.DATABASE_URL.startsWith("libsql://") &&
	!process.env.DATABASE_URL.startsWith("http")
) {
	console.error(`❌ Invalid DATABASE_URL format: ${process.env.DATABASE_URL}`);
	console.error(
		'💡 DATABASE_URL must start with "file:" for SQLite, "libsql://" for Turso, or "http" for remote',
	);
	process.exit(1);
}

const resolvedUrl = resolveDbUrl(process.env.DATABASE_URL, monorepoRoot);

if (loadedPath) {
	console.log(`✅ Loaded env from: ${loadedPath}`);
}
console.log(`✅ Resolved DATABASE_URL: ${resolvedUrl}`);

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "turso",
	dbCredentials: {
		url: resolvedUrl,
	},
});
