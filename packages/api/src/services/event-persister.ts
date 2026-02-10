import { eventRepository } from "@nomos-ai/db";
import { eventLogger } from "../lib/logger";
import type { IEventService } from "./event-service";

/** High-volume event types that should NOT be persisted to avoid DB bloat */
const SKIP_TYPES = new Set([
	"agent:stream",
	"terminal:output",
]);

/**
 * Subscribes to the in-memory event bus and persists events to the database.
 * Skips high-volume streaming events to avoid bloating the events table.
 */
export function startEventPersister(events: IEventService): () => void {
	return events.subscribe(async (type, payload) => {
		if (SKIP_TYPES.has(type)) return;

		const data = payload as Record<string, unknown> | undefined;

		try {
			await eventRepository.create({
				type,
				payload: data ? JSON.stringify(data) : null,
				featureId: (data?.featureId as string) ?? null,
				projectId: (data?.projectId as string) ?? null,
				sessionId: (data?.sessionId as string) ?? null,
			});
		} catch (error) {
			eventLogger.warn(
				{ err: error, type },
				"Failed to persist event (non-fatal)",
			);
		}
	});
}
