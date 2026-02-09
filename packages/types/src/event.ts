import { z } from "zod";
import { providerMessageSchema } from "./provider";

export const eventTypeSchema = z.enum([
	// Agent events
	"agent:stream",
	"agent:complete",
	"agent:error",
	// Feature events
	"feature:created",
	"feature:started",
	"feature:progress",
	"feature:completed",
	"feature:error",
	"feature:gate-failed",
	"feature:committed",
	"feature:verified",
	// Pipeline events
	"pipeline:step-started",
	"pipeline:step-completed",
	"pipeline:gate-completed",
	// Auto-mode events
	"auto-mode:started",
	"auto-mode:stopped",
	"auto-mode:idle",
	"auto-mode:error",
	"auto-mode:event",
	// Worktree events
	"worktree:init-started",
	"worktree:init-completed",
	// Session events
	"session:orphaned",
	// Terminal events
	"terminal:output",
	// Notification events
	"notification:created",
]);

export type EventType = z.infer<typeof eventTypeSchema>;

// --- Typed event payloads ---

export const agentStreamPayloadSchema = z.object({
	sessionId: z.string(),
	message: providerMessageSchema,
	userId: z.string(),
});
export type AgentStreamPayload = z.infer<typeof agentStreamPayloadSchema>;

export const agentCompletePayloadSchema = z.object({
	sessionId: z.string(),
	userId: z.string(),
});
export type AgentCompletePayload = z.infer<typeof agentCompletePayloadSchema>;

export const agentErrorPayloadSchema = z.object({
	sessionId: z.string(),
	error: z.string(),
	userId: z.string(),
});
export type AgentErrorPayload = z.infer<typeof agentErrorPayloadSchema>;

export const featureEventPayloadSchema = z.object({
	featureId: z.string(),
	userId: z.string(),
});
export type FeatureEventPayload = z.infer<typeof featureEventPayloadSchema>;

export const featureErrorPayloadSchema = z.object({
	featureId: z.string(),
	error: z.string(),
	userId: z.string(),
});
export type FeatureErrorPayload = z.infer<typeof featureErrorPayloadSchema>;

export const autoModeStartedPayloadSchema = z.object({
	projectId: z.string(),
	userId: z.string(),
});
export type AutoModeStartedPayload = z.infer<
	typeof autoModeStartedPayloadSchema
>;

export const autoModeStoppedPayloadSchema = z.object({
	userId: z.string(),
});
export type AutoModeStoppedPayload = z.infer<
	typeof autoModeStoppedPayloadSchema
>;

export const autoModeErrorPayloadSchema = z.object({
	featureId: z.string(),
	error: z.string(),
	userId: z.string(),
});
export type AutoModeErrorPayload = z.infer<typeof autoModeErrorPayloadSchema>;

/** Map event types to their payload types for type-safe event handling */
export interface EventPayloadMap {
	"agent:stream": AgentStreamPayload;
	"agent:complete": AgentCompletePayload;
	"agent:error": AgentErrorPayload;
	"feature:created": FeatureEventPayload;
	"feature:started": FeatureEventPayload;
	"feature:progress": FeatureEventPayload;
	"feature:completed": FeatureEventPayload;
	"feature:error": FeatureErrorPayload;
	"feature:gate-failed": unknown;
	"feature:committed": unknown;
	"feature:verified": FeatureEventPayload;
	"pipeline:step-started": unknown;
	"pipeline:step-completed": unknown;
	"pipeline:gate-completed": unknown;
	"auto-mode:started": AutoModeStartedPayload;
	"auto-mode:stopped": AutoModeStoppedPayload;
	"auto-mode:idle": AutoModeStartedPayload;
	"auto-mode:error": AutoModeErrorPayload;
	"auto-mode:event": unknown;
	"worktree:init-started": unknown;
	"worktree:init-completed": unknown;
	"session:orphaned": unknown;
	"terminal:output": unknown;
	"notification:created": unknown;
}

export type EventCallback = (type: EventType, payload: unknown) => void;
