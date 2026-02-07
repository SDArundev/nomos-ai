import type { FeatureSelect } from "@nomos-ai/db";
import { loadProjectContext } from "../lib/context-loader";

export class PromptBuilder {
	private projectContext: string | null = null;

	/**
	 * Load project context from disk. Call once, reuse for all features.
	 */
	async loadContext(projectRoot: string): Promise<void> {
		this.projectContext = await loadProjectContext(projectRoot);
	}

	buildFeaturePrompt(feature: FeatureSelect, context?: string | null): string {
		const parts: string[] = [
			`You are implementing feature ${feature.id}: ${feature.title}`,
			"",
			"## Description",
			feature.description,
			"",
			"## Acceptance Criteria",
		];

		if (Array.isArray(feature.acceptanceCriteria)) {
			for (const [i, ac] of feature.acceptanceCriteria.entries()) {
				parts.push(`${i + 1}. ${ac}`);
			}
		}

		if (feature.spec) {
			parts.push("", "## Specification", feature.spec);
		}

		if (feature.technicalNotes) {
			parts.push("", "## Technical Notes", feature.technicalNotes);
		}

		const effectiveContext = context ?? this.projectContext;
		if (effectiveContext) {
			parts.push("", "## Project Context", effectiveContext);
		}

		parts.push(
			"",
			"## Instructions",
			"- Implement the feature according to the acceptance criteria",
			"- Write clean, type-safe TypeScript code",
			"- Follow existing patterns in the codebase",
			"- Run tests after implementation",
		);

		return parts.join("\n");
	}

	buildPlanningPrompt(feature: FeatureSelect): string {
		return `Analyze feature ${feature.id}: ${feature.title}

## Description
${feature.description}

## Acceptance Criteria
${(feature.acceptanceCriteria ?? []).map((ac: string, i: number) => `${i + 1}. ${ac}`).join("\n")}

Create an implementation plan with:
1. Files to create/modify
2. Step-by-step approach
3. Testing strategy
4. Potential risks`;
	}

	buildStepPrompt(feature: FeatureSelect, stepId: string): string {
		const featureContext = [
			`Feature: ${feature.id} — ${feature.title}`,
			`Description: ${feature.description}`,
		];

		if (Array.isArray(feature.acceptanceCriteria) && feature.acceptanceCriteria.length > 0) {
			featureContext.push(
				"Acceptance Criteria:",
				...feature.acceptanceCriteria.map((ac: string, i: number) => `  ${i + 1}. ${ac}`),
			);
		}

		const featureBlock = featureContext.join("\n");

		const stepInstructions: Record<string, string> = {
			init: `Initialize the feature workspace. Read CLAUDE.md and understand the project structure.\n\n${featureBlock}`,
			context: `Gather context about the codebase relevant to this feature. Identify existing patterns and dependencies.\n\n${featureBlock}`,
			plan: `Create a detailed implementation plan. Identify files to create/modify.\n\n${featureBlock}`,
			execute: `Implement the feature:\n\n${this.buildFeaturePrompt(feature)}`,
			verify: `Verify the implementation: run type checks, tests, and validate against acceptance criteria.\n\n${featureBlock}`,
			merge: `Prepare for merge: ensure all changes are committed, create PR if needed.\n\n${featureBlock}`,
			finish: `Finalize: update feature status, record learnings.\n\n${featureBlock}`,
		};

		return stepInstructions[stepId] ?? `Execute step: ${stepId}\n\n${featureBlock}`;
	}
}
