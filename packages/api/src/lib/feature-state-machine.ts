import { featureRepository } from "@nomos-ai/db";
import {
	FEATURE_VALID_TRANSITIONS,
	type FeatureStatus,
} from "@nomos-ai/types";

/**
 * Extended transitions map for pipeline services.
 * Adds: failed → pending/in_progress (retry/resume), in_progress → in_progress (idempotent re-lock).
 */
const EXTENDED_TRANSITIONS: Record<FeatureStatus, FeatureStatus[]> = {
	...FEATURE_VALID_TRANSITIONS,
	in_progress: [...FEATURE_VALID_TRANSITIONS.in_progress, "in_progress"],
	failed: ["pending", "in_progress"],
};

/**
 * Validate that a status transition is allowed.
 * Uses extended transitions that include retry support (failed → pending).
 */
export function isValidTransition(
	from: FeatureStatus,
	to: FeatureStatus,
): boolean {
	const allowed = EXTENDED_TRANSITIONS[from];
	return !!allowed && allowed.includes(to);
}

/**
 * Transition a feature's status through the state machine.
 * Validates the transition is allowed before applying.
 *
 * @param featureId - The feature ID to update
 * @param targetStatus - The desired new status
 * @param additionalData - Optional extra fields to update alongside the status
 * @returns The updated feature record
 * @throws Error if the feature is not found or the transition is invalid
 */
export async function transitionFeatureStatus(
	featureId: string,
	targetStatus: FeatureStatus,
	additionalData?: Record<string, unknown>,
): Promise<void> {
	const feature = await featureRepository.findById(featureId);
	if (!feature) {
		throw new Error(`Feature not found: ${featureId}`);
	}

	const currentStatus = feature.status as FeatureStatus;

	if (!isValidTransition(currentStatus, targetStatus)) {
		throw new Error(
			`Invalid status transition: ${currentStatus} → ${targetStatus}`,
		);
	}

	const updateData: Record<string, unknown> = {
		...additionalData,
		status: targetStatus,
	};

	await featureRepository.update(featureId, updateData);
}
