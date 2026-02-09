import type { FeatureSelect } from "@nomos-ai/db";
import {
	featureRepository,
	messageRepository,
	sessionRepository,
} from "@nomos-ai/db";
import {
	DEFAULT_TOOLS,
	MODEL,
	MODEL_MAP,
	type Model,
	ModelSchema,
	SESSION_STATUS,
} from "@nomos-ai/types";
import { ORPCError } from "@orpc/server";
import { loadProjectContext } from "../lib/context-loader";
import type { AgentProvider } from "./claude-provider";
import type { EventService } from "./event-service";

/** Max concurrent running sessions across all users */
const MAX_CONCURRENT_SESSIONS = 5;
/** Max message content length (100KB) */
const MAX_MESSAGE_LENGTH = 100_000;
/** Max session name length */
const MAX_SESSION_NAME_LENGTH = 200;

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

	if (Array.isArray(feature.acceptanceCriteria)) {
		feature.acceptanceCriteria
			.filter(Boolean)
			.forEach((criterion: string, index: number) => {
				parts.push(`${index + 1}. ${criterion}`);
			});
	}

	parts.push("");

	if (feature.spec) {
		parts.push("## Specification", feature.spec, "");
	}

	if (feature.technicalNotes) {
		parts.push("## Technical Notes", feature.technicalNotes, "");
	}

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
	const feature = await featureRepository.findById(input.featureId);
	if (!feature) {
		throw new ORPCError("NOT_FOUND", {
			message: `Feature not found: ${input.featureId}`,
		});
	}

	const systemPrompt = buildSystemPrompt(feature);
	const tools = configureTools(input.tools);

	const modelResult = feature.model
		? ModelSchema.safeParse(feature.model)
		: null;
	const featureModel = modelResult?.success ? modelResult.data : null;
	const modelKey: Model = input.model ?? featureModel ?? MODEL.SONNET;
	const model = MODEL_MAP[modelKey];

	const session = await sessionRepository.create({
		userId: input.userId,
		featureId: input.featureId,
		status: SESSION_STATUS.PENDING,
		startedAt: new Date(),
	});

	return {
		session,
		agentConfig: {
			model,
			tools,
			systemPrompt,
			maxTurns: input.maxTurns,
			maxBudgetUsd: input.maxBudgetUsd,
			cwd: input.cwd,
			permissionMode: input.permissionMode ?? "default",
		},
	};
}

/**
 * AgentService class with full session management, streaming, and persistence.
 * Used by the agent router for interactive agent sessions.
 */
export class AgentService {
	private runningSessions = new Map<string, AbortController>();

	constructor(
		private events: EventService,
		private provider: AgentProvider,
	) {}

	async createSession(input: {
		name: string;
		projectId: string;
		userId: string;
		featureId?: string;
		workingDirectory?: string;
		model?: string;
	}) {
		// Validate name
		if (!input.name || input.name.trim().length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Session name is required",
			});
		}
		if (input.name.length > MAX_SESSION_NAME_LENGTH) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Session name must be at most ${MAX_SESSION_NAME_LENGTH} characters`,
			});
		}

		// Validate projectId
		if (!input.projectId || input.projectId.trim().length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Project ID is required",
			});
		}

		// Validate userId
		if (!input.userId || input.userId.trim().length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "User ID is required",
			});
		}

		// Check concurrent session limit
		if (this.runningSessions.size >= MAX_CONCURRENT_SESSIONS) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Maximum concurrent sessions reached (${MAX_CONCURRENT_SESSIONS}). Stop an existing session first.`,
			});
		}

		const session = await sessionRepository.create({
			userId: input.userId,
			projectId: input.projectId,
			featureId: input.featureId ?? null,
			status: SESSION_STATUS.PENDING,
			startedAt: new Date(),
			model: input.model ?? "sonnet",
			workingDirectory: input.workingDirectory ?? null,
			isRunning: false,
			messageCount: 0,
		});

		return session;
	}

	async sendMessage(sessionId: string, content: string): Promise<void> {
		// Validate message content
		if (!content || content.trim().length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Message content cannot be empty",
			});
		}
		if (content.length > MAX_MESSAGE_LENGTH) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Message too long (${content.length} chars). Maximum is ${MAX_MESSAGE_LENGTH} characters.`,
			});
		}

		const session = await sessionRepository.findById(sessionId);
		if (!session)
			throw new ORPCError("NOT_FOUND", { message: "Session not found" });

		// Prevent sending to an already-running session
		if (this.runningSessions.has(sessionId)) {
			throw new ORPCError("CONFLICT", {
				message:
					"Session is already processing a message. Wait for completion or stop it first.",
			});
		}

		const abortController = new AbortController();
		this.runningSessions.set(sessionId, abortController);

		// Mark as running
		await sessionRepository.update(sessionId, {
			status: SESSION_STATUS.RUNNING,
			isRunning: true,
		});

		// Persist user message
		await messageRepository.create({
			sessionId,
			role: "user",
			content,
		});

		try {
			// Load project context for system prompt
			const cwd = session.workingDirectory ?? process.cwd();
			const projectContext = await loadProjectContext(cwd);
			const systemPrompt = projectContext
				? `# Project Context\n\n${projectContext}`
				: undefined;

			let fullResponse = "";
			let costData:
				| { totalCostUsd: number; inputTokens: number; outputTokens: number }
				| undefined;
			const stream = this.provider.executeQuery({
				prompt: content,
				cwd,
				systemPrompt,
				sdkSessionId: session.sdkSessionId ?? undefined,
				model: session.model ?? "sonnet",
				maxTurns: 10,
				thinkingLevel: "standard",
				abortController,
			});

			for await (const msg of stream) {
				// Emit streaming event
				this.events.emit("agent:stream", {
					sessionId,
					message: msg,
					userId: session.userId,
				});

				// Accumulate text for persistence
				if (msg.type === "assistant" && msg.message?.content) {
					for (const block of msg.message.content) {
						if (block.type === "text" && block.text) {
							fullResponse += block.text;
						}
					}
				}

				// Capture SDK session ID for resumption
				if (msg.session_id) {
					await sessionRepository.update(sessionId, {
						sdkSessionId: msg.session_id,
					});
				}

				// Capture cost data from result messages
				if (msg.type === "result" && msg.costData) {
					costData = msg.costData;
				}
			}

			// Persist assistant message
			if (fullResponse) {
				await messageRepository.create({
					sessionId,
					role: "assistant",
					content: fullResponse,
				});
			}

			const count = await messageRepository.countBySessionId(sessionId);
			await sessionRepository.update(sessionId, {
				isRunning: false,
				messageCount: count,
				...(costData && {
					totalCostUsd: String(costData.totalCostUsd),
					inputTokens: costData.inputTokens,
					outputTokens: costData.outputTokens,
				}),
			});

			this.events.emit("agent:complete", { sessionId, userId: session.userId });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			try {
				await sessionRepository.update(sessionId, {
					isRunning: false,
					status: SESSION_STATUS.FAILED,
					error: errorMessage,
				});
			} catch (dbError) {
				console.error("Failed to update session after error:", dbError);
			}
			this.events.emit("agent:error", {
				sessionId,
				error: errorMessage,
				userId: session.userId,
			});
		} finally {
			this.runningSessions.delete(sessionId);
		}
	}

	async stop(sessionId: string): Promise<void> {
		const controller = this.runningSessions.get(sessionId);
		if (controller) {
			controller.abort();
			this.runningSessions.delete(sessionId);
		}
		const session = await sessionRepository.findById(sessionId);
		await sessionRepository.update(sessionId, {
			isRunning: false,
			status: SESSION_STATUS.FAILED,
		});
		if (session) {
			this.events.emit("agent:complete", { sessionId, userId: session.userId });
		}
	}

	async listSessions() {
		return sessionRepository.findAll();
	}

	async getHistory(sessionId: string) {
		return messageRepository.findBySessionId(sessionId);
	}

	async clearHistory(sessionId: string): Promise<void> {
		await messageRepository.deleteBySessionId(sessionId);
		await sessionRepository.update(sessionId, { messageCount: 0 });
	}

	isRunning(sessionId: string): boolean {
		return this.runningSessions.has(sessionId);
	}

	get runningSessionCount(): number {
		return this.runningSessions.size;
	}
}
