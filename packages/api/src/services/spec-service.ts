import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { FeatureInsert } from "@nomos-ai/db";

interface ProjectConfig {
	meta: {
		name: string;
		version: string;
		tagline?: string;
		description?: string;
		repository?: string;
	};
	stack?: Record<string, unknown>;
	settings?: Record<string, unknown>;
	constitution?: string[];
}

interface AppSpec {
	meta: {
		name: string;
		version: string;
		tagline?: string | Record<string, string>;
		description?: string | Record<string, string>;
	};
	vision?: Record<string, unknown>;
	constitution?: Record<string, unknown>;
	architecture?: Record<string, unknown>;
	requirements?: Record<string, unknown>;
	phases?:
		| Array<{
				id: string;
				name: string;
				features?: Array<{
					id?: string;
					title: string;
					description: string;
					category?: string;
					priority?: number;
					estimatedSize?: string;
					acceptanceCriteria?: string[];
				}>;
		  }>
		| Record<string, unknown>;
	constraints?: Record<string, unknown>;
	[key: string]: unknown;
}

export class SpecService {
	/**
	 * Validate that a resolved file path is contained within the given project root.
	 * Prevents path traversal via ../ or symlinks.
	 */
	private async validatePath(
		projectPath: string,
		filePath: string,
	): Promise<string> {
		const root = resolve(projectPath);
		const resolved = resolve(filePath);

		if (resolved.includes("\0")) {
			throw new Error("Path traversal detected");
		}

		if (!resolved.startsWith(`${root}/`) && resolved !== root) {
			throw new Error("Path traversal detected");
		}

		// Check for symlinks before following them
		try {
			const stats = await lstat(resolved);
			if (stats.isSymbolicLink()) {
				throw new Error("Symlinks are not allowed");
			}
		} catch (e) {
			if (
				e instanceof Error &&
				(e.message === "Symlinks are not allowed" ||
					e.message === "Path traversal detected")
			) {
				throw e;
			}
			// File may not exist yet — allow
		}

		// Resolve real path to prevent symlink-based traversal
		let real: string;
		try {
			real = await realpath(resolved);
		} catch {
			real = resolved;
		}

		if (!real.startsWith(`${root}/`) && real !== root) {
			throw new Error("Path traversal detected");
		}

		return real;
	}

	/**
	 * Load project.json (preferred) or app_spec.json (legacy fallback) from a project path.
	 */
	async loadProjectConfig(projectPath: string): Promise<ProjectConfig | null> {
		const projectJsonPath = join(projectPath, ".nomos", "project.json");
		const safePath = await this.validatePath(projectPath, projectJsonPath);
		try {
			const content = await readFile(safePath, "utf-8");
			return JSON.parse(content) as ProjectConfig;
		} catch {
			// Fallback: try loading app_spec.json and converting
			const spec = await this.loadSpec(projectPath);
			if (!spec) return null;
			return {
				meta: {
					name: spec.meta.name,
					version: spec.meta.version,
					tagline:
						typeof spec.meta.tagline === "string"
							? spec.meta.tagline
							: spec.meta.tagline?.en,
					description:
						typeof spec.meta.description === "string"
							? spec.meta.description
							: spec.meta.description?.en,
				},
			};
		}
	}

	/**
	 * Load app_spec.json from a project path (legacy).
	 */
	async loadSpec(projectPath: string): Promise<AppSpec | null> {
		const specPath = join(projectPath, ".nomos", "app_spec.json");
		const safePath = await this.validatePath(projectPath, specPath);
		try {
			const content = await readFile(safePath, "utf-8");
			return JSON.parse(content) as AppSpec;
		} catch {
			return null;
		}
	}

	/**
	 * Save project.json to a project path.
	 */
	async saveProjectConfig(
		projectPath: string,
		config: ProjectConfig,
	): Promise<void> {
		const configPath = join(projectPath, ".nomos", "project.json");
		const safePath = await this.validatePath(projectPath, configPath);
		await mkdir(dirname(safePath), { recursive: true });
		await writeFile(safePath, JSON.stringify(config, null, "\t"), "utf-8");
	}

	/**
	 * Extract features from a spec's phases.
	 */
	extractFeatures(
		spec: AppSpec,
		projectId: string,
		userId: string,
	): Omit<FeatureInsert, "id" | "createdAt" | "updatedAt">[] {
		const features: Omit<FeatureInsert, "id" | "createdAt" | "updatedAt">[] =
			[];

		if (!Array.isArray(spec.phases)) return features;

		for (const phase of spec.phases) {
			if (!phase.features || !Array.isArray(phase.features)) continue;

			for (const f of phase.features) {
				features.push({
					userId,
					projectId,
					title: f.title,
					description: f.description,
					category: f.category ?? phase.name ?? "general",
					phase: phase.id,
					status: "backlog",
					passes: false,
					acceptanceCriteria: f.acceptanceCriteria ?? [],
					priority: f.priority,
					estimatedSize: f.estimatedSize,
				});
			}
		}

		return features;
	}
}
