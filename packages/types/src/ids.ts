import { z } from "zod";

/**
 * Branded ID types for compile-time type safety.
 * These prevent mixing up different ID types at compile time.
 */

/** Schema for validating and branding Feature IDs */
export const FeatureIdSchema = z.string().brand<"FeatureId">();

/** Schema for validating and branding Project IDs */
export const ProjectIdSchema = z.string().brand<"ProjectId">();

/** Schema for validating and branding Session IDs */
export const SessionIdSchema = z.string().brand<"SessionId">();

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
