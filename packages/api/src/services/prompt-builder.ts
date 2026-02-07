import type { FeatureSelect } from "@nomos-ai/db";

export class PromptBuilder {
	buildFeaturePrompt(feature: FeatureSelect, context?: string): string {
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

		if (context) {
			parts.push("", "## Project Context", context);
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
		const stepInstructions: Record<string, string> = {
			init: "Initialize the feature workspace. Read CLAUDE.md and understand the project structure.",
			context: "Gather context about the codebase relevant to this feature. Identify existing patterns and dependencies.",
			plan: "Create a detailed implementation plan. Identify files to create/modify.",
			execute: `Implement the feature:\n\n${this.buildFeaturePrompt(feature)}`,
			verify: "Verify the implementation: run type checks, tests, and validate against acceptance criteria.",
			merge: "Prepare for merge: ensure all changes are committed, create PR if needed.",
			finish: "Finalize: update feature status, record learnings.",
		};

		return stepInstructions[stepId] ?? `Execute step: ${stepId}`;
	}
}
