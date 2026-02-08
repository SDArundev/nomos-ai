/**
 * UUID-based IDs for secondary entities (events, messages, notifications, settings, worktrees).
 * These are auto-generated via Drizzle $defaultFn.
 *
 * Core entities (features, projects, sessions, learnings) use sequential branded IDs
 * (F###, P###, S###, L###) generated in packages/api/src/utils/id-generation.ts
 */
function createUUID(): string {
	return crypto.randomUUID();
}

export const createEventId = () => `evt_${createUUID()}`;
export const createMessageId = () => `msg_${createUUID()}`;
export const createNotificationId = () => `ntf_${createUUID()}`;
export const createSettingId = () => `set_${createUUID()}`;
export const createWorktreeId = () => `wt_${createUUID()}`;
