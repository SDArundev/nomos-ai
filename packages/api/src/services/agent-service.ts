import type { FeatureSelect } from "@nomos-ai/db";
import { featureRepository, sessionRepository } from "@nomos-ai/db";
import {
	DEFAULT_TOOLS,
	MODEL,
	MODEL_MAP,
	type Model,
	SESSION_STATUS,
} from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { generateSessionId } from "../utils/id-generation";

interface CreateAgentSessionInput {
	featureId: string;
	userId: string;
	model?: Model;
	tools?: string[];
	maxTurns?: number;
	maxBudgetUsd?: number;
	cwd?: string;
	permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
}

interface AgentConfig {
	model: string;
	tools: string[];
	systemPrompt: string;
	maxTurns?: number;
	maxBudgetUsd?: number;
	cwd?: string;
	permissionMode: string;
}

interface AgentSessionResult {
	session: Awaited<ReturnType<typeof sessionRepository.create>>;
	agentConfig: AgentConfig;
}

export function buildSystemPrompt(feature: FeatureSelect): string {
	const parts: string[] = [
		`# Feature Implementation: ${feature.id}`,
		"",
		"## Title",
		feature.title,
		"",
		"## Description",
		feature.description,
		"",
		"## Acceptance Criteria",
	];

	// Acceptance criteria is already parsed by Drizzle (mode: "json")
	if (Array.isArray(feature.acceptanceCriteria)) {
		feature.acceptanceCriteria
			.filter(Boolean)
			.forEach((criterion: string, index: number) => {
				parts.push(`${index + 1}. ${criterion}`);
			});
	}

	parts.push("");

	// Add optional sections
	if (feature.spec) {
		parts.push("## Specification", feature.spec, "");
	}

	if (feature.technicalNotes) {
		parts.push("## Technical Notes", feature.technicalNotes, "");
	}

	// Testing requirements is already parsed by Drizzle (mode: "json")
	if (feature.testingRequirements) {
		parts.push("## Testing Requirements");

		if (feature.testingRequirements.unit?.length) {
			parts.push("### Unit Tests");
			for (const t of feature.testingRequirements.unit.filter(Boolean)) {
				parts.push(`- ${t}`);
			}
		}
		if (feature.testingRequirements.integration?.length) {
			parts.push("### Integration Tests");
			for (const t of feature.testingRequirements.integration.filter(Boolean)) {
				parts.push(`- ${t}`);
			}
		}
		if (feature.testingRequirements.e2e?.length) {
			parts.push("### E2E Tests");
			for (const t of feature.testingRequirements.e2e.filter(Boolean)) {
				parts.push(`- ${t}`);
			}
		}
		if (feature.testingRequirements.manual?.length) {
			parts.push("### Manual Tests");
			for (const t of feature.testingRequirements.manual.filter(Boolean)) {
				parts.push(`- ${t}`);
			}
		}

		parts.push("");
	}

	return parts.join("\n");
}

export function configureTools(overrides?: string[]): string[] {
	return overrides ?? DEFAULT_TOOLS;
}

export async function createAgentSession(
	input: CreateAgentSessionInput,
): Promise<AgentSessionResult> {
	// Load feature
	const feature = await featureRepository.findById(input.featureId);
	if (!feature) {
		throw new ORPCError("NOT_FOUND", {
			message: `Feature not found: ${input.featureId}`,
		});
	}

	// Build system prompt
	const systemPrompt = buildSystemPrompt(feature);

	// Configure tools
	const tools = configureTools(input.tools);

	// Resolve model - validate feature.model against enum values
	const validModels: Model[] = ["opus", "sonnet", "haiku"];
	const featureModel =
		feature.model && validModels.includes(feature.model as Model)
			? (feature.model as Model)
			: null;
	const modelKey: Model = input.model ?? featureModel ?? MODEL.SONNET;
	const model = MODEL_MAP[modelKey];

	// Create DB session
	const session = await sessionRepository.create({
		id: await generateSessionId(),
		userId: input.userId,
		featureId: input.featureId,
		status: SESSION_STATUS.PENDING,
		cwd: input.cwd,
		startedAt: new Date(),
	});

	// Return session and agent config
	return {
		session,
		agentConfig: {
			model,
			tools,
			systemPrompt,
			maxTurns: input.maxTurns,
			maxBudgetUsd: input.maxBudgetUsd,
			cwd: input.cwd,
			permissionMode: input.permissionMode ?? "bypassPermissions",
		},
	};
}
