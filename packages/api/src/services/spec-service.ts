import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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
	 * Load project.json (preferred) or app_spec.json (legacy fallback) from a project path.
	 */
	async loadProjectConfig(
		projectPath: string,
	): Promise<ProjectConfig | null> {
		const projectJsonPath = join(projectPath, ".nomos", "project.json");
		try {
			const content = await readFile(projectJsonPath, "utf-8");
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
		try {
			const content = await readFile(specPath, "utf-8");
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
		await mkdir(dirname(configPath), { recursive: true });
		await writeFile(configPath, JSON.stringify(config, null, "\t"), "utf-8");
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
