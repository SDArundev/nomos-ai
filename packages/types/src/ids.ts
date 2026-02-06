import { z } from "zod";

/**
 * Branded ID types for compile-time type safety.
 * These prevent mixing up different ID types at compile time.
 */

/** Schema for validating and branding Feature IDs (F001-F999 format) */
export const FeatureIdSchema = z
	.string()
	.regex(/^F[0-9]{3}$/, "Feature ID must be in format F001-F999")
	.brand<"FeatureId">();

/** Schema for validating and branding Project IDs (P001-P999 format) */
export const ProjectIdSchema = z
	.string()
	.regex(/^P[0-9]{3}$/, "Project ID must be in format P001-P999")
	.brand<"ProjectId">();

/** Schema for validating and branding Session IDs (S001-S999 format) */
export const SessionIdSchema = z
	.string()
	.regex(/^S[0-9]{3}$/, "Session ID must be in format S001-S999")
	.brand<"SessionId">();

/** Schema for validating and branding User IDs */
export const UserIdSchema = z.string().brand<"UserId">();

/** Branded Feature ID type - prevents mixing with other ID types */
export type FeatureId = z.infer<typeof FeatureIdSchema>;

/** Branded Project ID type - prevents mixing with other ID types */
export type ProjectId = z.infer<typeof ProjectIdSchema>;

/** Branded Session ID type - prevents mixing with other ID types */
export type SessionId = z.infer<typeof SessionIdSchema>;

/** Branded User ID type - prevents mixing with other ID types */
export type UserId = z.infer<typeof UserIdSchema>;
