import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

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
	console.error("DATABASE_URL not found. Tried paths:", envPaths);
	console.error(
		"Ensure .env file exists with DATABASE_URL=postgresql://nomos:nomos@localhost:5432/nomos",
	);
	process.exit(1);
}

// Validate DATABASE_URL format
if (
	!process.env.DATABASE_URL.startsWith("postgresql://") &&
	!process.env.DATABASE_URL.startsWith("postgres://")
) {
	console.error(`Invalid DATABASE_URL format: ${process.env.DATABASE_URL}`);
	console.error(
		'DATABASE_URL must start with "postgresql://" or "postgres://"',
	);
	process.exit(1);
}

if (loadedPath) {
	console.log(`Loaded env from: ${loadedPath}`);
}
console.log(
	`Using DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`,
);

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
