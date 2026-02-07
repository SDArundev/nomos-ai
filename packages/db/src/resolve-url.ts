import { resolve } from "node:path";

/**
 * Resolves a DATABASE_URL with a relative `file:./` path against the monorepo root,
 * so the resolved path is identical regardless of which package CWD runs the command.
 *
 * - `file:./apps/server/data/nomos.db` → `file:{absolute}/apps/server/data/nomos.db`
 * - `file:/data/nomos.db` (Docker absolute) → passed through unchanged
 * - `libsql://`, `http` → passed through unchanged
 */
export function resolveDbUrl(url: string, monorepoRoot: string): string {
	if (!url.startsWith("file:")) return url;
	const filePath = url.slice("file:".length);
	if (filePath.startsWith("/")) return url; // already absolute
	return `file:${resolve(monorepoRoot, filePath)}`;
}
