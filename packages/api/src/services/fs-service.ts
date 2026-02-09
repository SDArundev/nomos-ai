import {
	lstat,
	readdir,
	readFile,
	realpath,
	writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

export class FSService {
	constructor(private allowedRoot: string) {}

	private async validatePath(requestedPath: string): Promise<string> {
		if (requestedPath.includes("\0")) {
			throw new Error("Path traversal detected");
		}
		const resolved = resolve(this.allowedRoot, requestedPath);
		if (
			!resolved.startsWith(`${this.allowedRoot}/`) &&
			resolved !== this.allowedRoot
		) {
			throw new Error("Path traversal detected");
		}

		// Check for symlinks before following them
		try {
			const stats = await lstat(resolved);
			if (stats.isSymbolicLink()) {
				throw new Error("Symlinks are not allowed");
			}
		} catch (e) {
			if (e instanceof Error && e.message === "Symlinks are not allowed") {
				throw e;
			}
			// File may not exist yet (e.g. writeFile to new path) — allow
		}

		// Resolve real path to prevent symlink-based traversal
		let real: string;
		try {
			real = await realpath(resolved);
		} catch {
			// File doesn't exist yet — use the resolved path
			real = resolved;
		}

		if (!real.startsWith(`${this.allowedRoot}/`) && real !== this.allowedRoot) {
			throw new Error("Path traversal detected");
		}

		return real;
	}

	async readFile(path: string): Promise<string> {
		const safe = await this.validatePath(path);
		return readFile(safe, "utf-8");
	}

	async writeFile(path: string, content: string): Promise<void> {
		const safe = await this.validatePath(path);
		await writeFile(safe, content, "utf-8");
	}

	async listDir(path: string): Promise<string[]> {
		const safe = await this.validatePath(path);
		const entries = await readdir(safe);
		return entries;
	}

	getAllowedRoot(): string {
		return this.allowedRoot;
	}
}
