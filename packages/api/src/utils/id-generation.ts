/**
 * Re-export ID generation from the db package.
 * ID generation now lives in the repository layer (packages/db/src/lib/id-generation.ts).
 * Repositories auto-generate IDs when not provided, so direct usage of these
 * functions in routers is no longer necessary.
 */
export {
	generateFeatureId,
	generateLearningId,
	generateProjectId,
	generateSessionId,
} from "@nomos-ai/db";
