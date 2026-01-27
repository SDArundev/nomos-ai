import { z } from "zod";

/**
 * Feature status values following the NOMOS state machine:
 * backlog → in_progress → waiting_approval → verified
 */
export const FEATURE_STATUS = {
	BACKLOG: "backlog",
	IN_PROGRESS: "in_progress",
	WAITING_APPROVAL: "waiting_approval",
	VERIFIED: "verified",
} as const;

/** Feature status type derived from constant values */
export type FeatureStatus =
	(typeof FEATURE_STATUS)[keyof typeof FEATURE_STATUS];

/** Zod schema for validating feature status values */
export const FeatureStatusSchema = z.enum([
	FEATURE_STATUS.BACKLOG,
	FEATURE_STATUS.IN_PROGRESS,
	FEATURE_STATUS.WAITING_APPROVAL,
	FEATURE_STATUS.VERIFIED,
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
 * Session status values
 */
export const SESSION_STATUS = {
	ACTIVE: "active",
	PAUSED: "paused",
	COMPLETED: "completed",
	FAILED: "failed",
} as const;

/** Session status type derived from constant values */
export type SessionStatus =
	(typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

/** Zod schema for validating session status values */
export const SessionStatusSchema = z.enum([
	SESSION_STATUS.ACTIVE,
	SESSION_STATUS.PAUSED,
	SESSION_STATUS.COMPLETED,
	SESSION_STATUS.FAILED,
]);
