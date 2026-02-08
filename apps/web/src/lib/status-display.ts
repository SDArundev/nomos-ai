/**
 * Shared status display metadata (colors, labels) for features and sessions.
 * Single source of truth — all components import from here.
 */

/** Feature status → Tailwind background color class */
export const FEATURE_STATUS_COLORS: Record<string, string> = {
	backlog: "bg-neutral-500",
	pending: "bg-yellow-500",
	in_progress: "bg-blue-500",
	waiting_approval: "bg-purple-500",
	verified: "bg-green-500",
	failed: "bg-red-500",
};

/** Feature status → Tailwind text color class */
export const FEATURE_STATUS_TEXT_COLORS: Record<string, string> = {
	backlog: "text-neutral-500",
	pending: "text-yellow-500",
	in_progress: "text-blue-500",
	waiting_approval: "text-purple-500",
	verified: "text-green-500",
	failed: "text-red-500",
};

/** Feature status → human-readable label */
export const FEATURE_STATUS_LABELS: Record<string, string> = {
	backlog: "Backlog",
	pending: "Pending",
	in_progress: "In Progress",
	waiting_approval: "Waiting Approval",
	verified: "Verified",
	failed: "Failed",
};

/** Session status → Tailwind background color class */
export const SESSION_STATUS_COLORS: Record<string, string> = {
	pending: "bg-yellow-500",
	running: "bg-blue-500",
	completed: "bg-green-500",
	failed: "bg-red-500",
};
