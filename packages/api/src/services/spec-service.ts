import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { FeatureInsert } from "@nomos-ai/db";
import { validateSpec } from "../lib/spec-validator";

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
	 * Load app_spec.json from a project path.
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
	 * Save app_spec.json to a project path.
	 */
	async saveSpec(projectPath: string, spec: AppSpec): Promise<void> {
		const specPath = join(projectPath, ".nomos", "app_spec.json");
		await mkdir(dirname(specPath), { recursive: true });
		await writeFile(specPath, JSON.stringify(spec, null, "\t"), "utf-8");
	}

	/**
	 * Validate a spec object.
	 */
	validate(spec: Record<string, unknown>) {
		return validateSpec(spec);
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
