import { featureRepository } from "@nomos-ai/db";
import type { PipelineStep, PipelineStepId, PipelineStepStatus } from "@nomos-ai/types";
import type { EventService } from "./event-service";
import { PromptBuilder } from "./prompt-builder";

const PIPELINE_STEPS: Array<{ id: PipelineStepId; name: string; order: number }> = [
	{ id: "init", name: "Initialize", order: 0 },
	{ id: "context", name: "Gather Context", order: 1 },
	{ id: "plan", name: "Plan Implementation", order: 2 },
	{ id: "execute", name: "Execute", order: 3 },
	{ id: "verify", name: "Verify", order: 4 },
	{ id: "merge", name: "Merge", order: 5 },
	{ id: "finish", name: "Finish", order: 6 },
];

export class PipelineService {
	private promptBuilder = new PromptBuilder();

	constructor(private events: EventService) {}

	getSteps(): typeof PIPELINE_STEPS {
		return PIPELINE_STEPS;
	}

	buildInitialSteps(): PipelineStep[] {
		return PIPELINE_STEPS.map((s) => ({
			id: s.id,
			name: s.name,
			order: s.order,
			status: "pending" as PipelineStepStatus,
		}));
	}

	async executeFeature(
		featureId: string,
		executeStep: (prompt: string, cwd: string) => Promise<void>,
		cwd: string,
	): Promise<void> {
		const feature = await featureRepository.findById(featureId);
		if (!feature) throw new Error(`Feature not found: ${featureId}`);

		for (const step of PIPELINE_STEPS) {
			// Emit running
			this.events.emit("feature:progress", {
				featureId,
				step: step.id,
				status: "running",
			});

			await featureRepository.update(featureId, {
				pipelineStep: step.id,
			});

			// Build prompt and execute
			const prompt = this.promptBuilder.buildStepPrompt(feature, step.id);
			await executeStep(prompt, cwd);

			// Emit completed
			this.events.emit("feature:progress", {
				featureId,
				step: step.id,
				status: "completed",
			});
		}
	}

	async getProgress(featureId: string): Promise<{
		currentStep: string | null;
		steps: Array<{ id: string; name: string; status: string }>;
	}> {
		const feature = await featureRepository.findById(featureId);
		if (!feature) throw new Error(`Feature not found: ${featureId}`);

		const currentStep = feature.pipelineStep ?? null;
		const currentIdx = currentStep
			? PIPELINE_STEPS.findIndex((s) => s.id === currentStep)
			: -1;

		const steps = PIPELINE_STEPS.map((s, i) => ({
			id: s.id,
			name: s.name,
			status: i < currentIdx ? "completed" : i === currentIdx ? "running" : "pending",
		}));

		return { currentStep, steps };
	}
}
