import type { ExecuteOptions } from "@nomos-ai/types";

export function createAgentOptions(
	overrides: Partial<ExecuteOptions> & { prompt: string; cwd: string },
): ExecuteOptions {
	return {
		model: "sonnet",
		maxTurns: 10,
		thinkingLevel: "standard",
		...overrides,
	};
}

export function createAutoModeOptions(
	overrides: Partial<ExecuteOptions> & { prompt: string; cwd: string },
): ExecuteOptions {
	return {
		model: "opus",
		maxTurns: 50,
		thinkingLevel: "high",
		...overrides,
	};
}
