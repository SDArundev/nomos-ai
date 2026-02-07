import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

export class FSService {
	constructor(private allowedRoot: string) {}

	private validatePath(requestedPath: string): string {
		const resolved = resolve(this.allowedRoot, requestedPath);
		const rel = relative(this.allowedRoot, resolved);
		if (rel.startsWith("..") || resolve(resolved) !== resolved) {
			throw new Error("Path traversal detected");
		}
		return resolved;
	}

	async readFile(path: string): Promise<string> {
		const safe = this.validatePath(path);
		return readFile(safe, "utf-8");
	}

	async writeFile(path: string, content: string): Promise<void> {
		const safe = this.validatePath(path);
		await writeFile(safe, content, "utf-8");
	}

	async listDir(path: string): Promise<string[]> {
		const safe = this.validatePath(path);
		const entries = await readdir(safe);
		return entries;
	}

	getAllowedRoot(): string {
		return this.allowedRoot;
	}
}
