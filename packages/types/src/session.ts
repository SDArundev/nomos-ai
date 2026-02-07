import { z } from "zod";
import { FeatureIdSchema, SessionIdSchema } from "./ids";
import { SESSION_STATUS, SessionStatusSchema } from "./status";

/**
 * Session schema for tracking agent execution sessions.
 *
 * Sessions track the lifecycle of a single agent run for a feature:
 * - When it started
 * - Current status (pending → running → completed/failed)
 * - When it completed (if applicable)
 * - Output from the agent (if successful)
 * - Error message (if failed)
 */
export const SessionSchema = z.object({
	/** Unique session identifier (branded type) */
	id: SessionIdSchema,

	/** Feature being worked on (branded type) */
	featureId: FeatureIdSchema,

	/** Current session status */
	status: SessionStatusSchema,

	/** When the session was created/started */
	startedAt: z.coerce.date(),

	/** When the session completed (undefined if still running) */
	completedAt: z.coerce.date().optional(),

	/** Agent output/response (undefined if not yet complete or failed) */
	output: z.string().optional(),

	/** Error message if session failed (undefined if successful) */
	error: z.string().optional(),

	// F258 additions
	/** Claude SDK session ID for resume */
	sdkSessionId: z.string().nullable().default(null),
	/** Model used for this session */
	model: z.string().default("sonnet"),
	/** Whether the session is currently running */
	isRunning: z.boolean().default(false),
	/** Working directory for agent execution */
	workingDirectory: z.string().nullable().default(null),
	/** Number of messages in this session */
	messageCount: z.number().default(0),
});

/** Session type inferred from schema */
export type Session = z.infer<typeof SessionSchema>;

/** Re-export session status constant for convenience */
export { SESSION_STATUS };
