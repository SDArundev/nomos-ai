import { z } from "zod";

/**
 * Feature status values following the NOMOS state machine:
 * backlog → pending → in_progress → waiting_approval → verified
 * (failed is a terminal state for features that cannot be completed)
 */
export const FEATURE_STATUS = {
	BACKLOG: "backlog",
	PENDING: "pending",
	IN_PROGRESS: "in_progress",
	WAITING_APPROVAL: "waiting_approval",
	VERIFIED: "verified",
	FAILED: "failed",
} as const;

/** Feature status type derived from constant values */
export type FeatureStatus =
	(typeof FEATURE_STATUS)[keyof typeof FEATURE_STATUS];

/** Zod schema for validating feature status values */
export const FeatureStatusSchema = z.enum([
	FEATURE_STATUS.BACKLOG,
	FEATURE_STATUS.PENDING,
	FEATURE_STATUS.IN_PROGRESS,
	FEATURE_STATUS.WAITING_APPROVAL,
	FEATURE_STATUS.VERIFIED,
	FEATURE_STATUS.FAILED,
]);

/**
 * Project status values
 */
export const PROJECT_STATUS = {
	DRAFT: "draft",
	ACTIVE: "active",
	ARCHIVED: "archived",
} as const;

/** Project status type derived from constant values */
export type ProjectStatus =
	(typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

/** Zod schema for validating project status values */
export const ProjectStatusSchema = z.enum([
	PROJECT_STATUS.DRAFT,
	PROJECT_STATUS.ACTIVE,
	PROJECT_STATUS.ARCHIVED,
]);

/**
 * Session status values for agent execution sessions:
 * pending → running → completed
 * (failed is a terminal state for sessions that error)
 */
export const SESSION_STATUS = {
	PENDING: "pending",
	RUNNING: "running",
	COMPLETED: "completed",
	FAILED: "failed",
} as const;

/** Session status type derived from constant values */
export type SessionStatus =
	(typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

/** Zod schema for validating session status values */
export const SessionStatusSchema = z.enum([
	SESSION_STATUS.PENDING,
	SESSION_STATUS.RUNNING,
	SESSION_STATUS.COMPLETED,
	SESSION_STATUS.FAILED,
]);

/** Valid feature status transitions (state machine) */
export const FEATURE_VALID_TRANSITIONS: Record<FeatureStatus, FeatureStatus[]> =
	{
		[FEATURE_STATUS.BACKLOG]: [FEATURE_STATUS.PENDING, FEATURE_STATUS.FAILED],
		[FEATURE_STATUS.PENDING]: [
			FEATURE_STATUS.IN_PROGRESS,
			FEATURE_STATUS.FAILED,
		],
		[FEATURE_STATUS.IN_PROGRESS]: [
			FEATURE_STATUS.WAITING_APPROVAL,
			FEATURE_STATUS.FAILED,
		],
		[FEATURE_STATUS.WAITING_APPROVAL]: [
			FEATURE_STATUS.VERIFIED,
			FEATURE_STATUS.FAILED,
		],
		[FEATURE_STATUS.VERIFIED]: [],
		[FEATURE_STATUS.FAILED]: [FEATURE_STATUS.PENDING],
	};

/** Valid session status transitions (state machine) */
export const SESSION_VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> =
	{
		[SESSION_STATUS.PENDING]: [SESSION_STATUS.RUNNING, SESSION_STATUS.FAILED],
		[SESSION_STATUS.RUNNING]: [SESSION_STATUS.COMPLETED, SESSION_STATUS.FAILED],
		[SESSION_STATUS.COMPLETED]: [],
		[SESSION_STATUS.FAILED]: [],
	};
