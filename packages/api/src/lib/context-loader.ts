import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface CacheEntry {
	content: string;
	expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function readFileSafe(path: string): Promise<string> {
	try {
		return await readFile(path, "utf-8");
	} catch {
		return "";
	}
}

async function readContextDirectory(dirPath: string): Promise<string> {
	try {
		const entries = await readdir(dirPath, { withFileTypes: true });
		const mdFiles = entries.filter(
			(e) => e.isFile() && e.name.endsWith(".md"),
		);

		const parts: string[] = [];
		for (const file of mdFiles) {
			const content = await readFileSafe(join(dirPath, file.name));
			if (content) {
				parts.push(`## File: ${file.name}\n${content}\n---`);
			}
		}
		return parts.join("\n\n");
	} catch {
		return "";
	}
}

/**
 * Loads CLAUDE.md and context files from a project directory.
 * Results are cached per projectPath for 5 minutes.
 */
export async function loadProjectContext(
	projectPath: string,
): Promise<string> {
	const now = Date.now();
	const cached = cache.get(projectPath);
	if (cached && cached.expiresAt > now) {
		return cached.content;
	}

	const parts: string[] = [];

	// Load CLAUDE.md
	const claudeMd = await readFileSafe(join(projectPath, "CLAUDE.md"));
	if (claudeMd) {
		parts.push(`## File: CLAUDE.md\n${claudeMd}\n---`);
	}

	// Load .nomos/context/ directory
	const contextDir = join(projectPath, ".nomos", "context");
	const contextContent = await readContextDirectory(contextDir);
	if (contextContent) {
		parts.push(contextContent);
	}

	const content = parts.join("\n\n");

	cache.set(projectPath, {
		content,
		expiresAt: now + CACHE_TTL_MS,
	});

	return content;
}
