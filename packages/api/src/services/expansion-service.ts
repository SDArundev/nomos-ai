import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { ClaudeProvider } from "./claude-provider";

const expandedFeatureSchema = z.object({
	title: z.string().min(5).max(80),
	description: z.string().min(20).max(500),
	category: z.string().regex(/^CAT-[A-Z]{3}$/),
	phase: z.string().regex(/^phase-[0-9]+$/),
	estimatedSize: z.enum(["XS", "S", "M", "L", "XL"]),
	acceptanceCriteria: z.array(z.string()).min(1).max(10),
});

export type ExpandedFeature = z.infer<typeof expandedFeatureSchema>;

export interface ExpandIntentInput {
	naturalLanguage: string;
	projectId: string;
	userId: string;
}

/** Max tokens budget for expansion (keep costs low) */
const EXPANSION_BUDGET_USD = 0.05;

export class ExpansionService {
	private provider = ClaudeProvider.create();

	/**
	 * Expand a natural language intent into a structured feature spec.
	 * Returns a preview -- does NOT create the feature in the database.
	 */
	async expandIntent(input: ExpandIntentInput): Promise<ExpandedFeature> {
		const project = await projectRepository.findById(input.projectId);
		if (!project || project.userId !== input.userId) {
			throw new ORPCError("NOT_FOUND", {
				message: `Project not found: ${input.projectId}`,
			});
		}

		const agentPrompt = await this.loadAgentPrompt();

		const prompt = [
			"Convert the following natural language description into a structured feature specification.",
			"",
			`Project: ${project.name}`,
			`Project path: ${project.path}`,
			"",
			"--- USER INPUT ---",
			input.naturalLanguage,
			"--- END USER INPUT ---",
			"",
			"Return ONLY a valid JSON object matching the schema described in your instructions. No markdown, no explanation.",
		].join("\n");

		let resultText = "";

		for await (const message of this.provider.executeQuery({
			prompt,
			model: "sonnet",
			cwd: project.path,
			systemPrompt: agentPrompt,
			maxTurns: 1,
			permissionMode: "plan",
			thinkingLevel: "standard",
			maxBudgetUsd: EXPANSION_BUDGET_USD,
		})) {
			if (message.type === "result" && message.result) {
				resultText = message.result;
			} else if (message.type === "assistant" && message.message?.content) {
				for (const block of message.message.content) {
					if (block.type === "text" && block.text) {
						resultText += block.text;
					}
				}
			} else if (message.type === "error") {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: `Expansion agent error: ${message.error ?? "Unknown error"}`,
				});
			}
		}

		return this.parseAndValidate(resultText);
	}

	/**
	 * Load the expansion agent prompt from the agent definition file.
	 */
	private async loadAgentPrompt(): Promise<string> {
		const agentPath = resolve(
			import.meta.dirname,
			"../../../../.claude/agents/expansion.md",
		);
		try {
			return await readFile(agentPath, "utf-8");
		} catch {
			// Fallback: inline minimal prompt if file not found
			return "You are a feature specification writer. Convert natural language into structured JSON feature specs with title, description, category (CAT-XXX), phase (phase-N), estimatedSize (XS/S/M/L/XL), and acceptanceCriteria (array of testable strings).";
		}
	}

	/**
	 * Parse the LLM response and validate against the feature schema.
	 */
	private parseAndValidate(text: string): ExpandedFeature {
		// Strip markdown code fences if present
		const cleaned = text
			.replace(/^```(?:json)?\s*/m, "")
			.replace(/\s*```\s*$/m, "")
			.trim();

		let parsed: unknown;
		try {
			parsed = JSON.parse(cleaned);
		} catch {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Expansion agent returned invalid JSON",
			});
		}

		const result = expandedFeatureSchema.safeParse(parsed);
		if (!result.success) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: `Expansion output validation failed: ${result.error.issues.map((i) => i.message).join(", ")}`,
			});
		}

		return result.data;
	}
}
