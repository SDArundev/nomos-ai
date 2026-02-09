import { resolve } from "node:path";

export const ALLOWED_ROOTS = ["/home", "/Users", "/tmp", "/var/projects"];

export function isAllowedRoot(path: string): boolean {
	const resolved = resolve(path);
	return ALLOWED_ROOTS.some((root) => resolved.startsWith(`${root}/`));
}

export function validateProjectRoot(projectRoot: string): string {
	const resolved = resolve(projectRoot);
	if (!isAllowedRoot(resolved)) {
		throw new Error("projectRoot must be under an allowed directory");
	}
	return resolved;
}
