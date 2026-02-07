import { z } from "zod";

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
	"feature:verified",
	// Pipeline events
	"pipeline:step-started",
	"pipeline:step-completed",
	// Auto-mode events
	"auto-mode:started",
	"auto-mode:stopped",
	"auto-mode:idle",
	"auto-mode:error",
	"auto-mode:event",
	// Worktree events
	"worktree:init-started",
	"worktree:init-completed",
	// Terminal events
	"terminal:output",
	// Notification events
	"notification:created",
]);

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventCallback = (type: EventType, payload: unknown) => void;
