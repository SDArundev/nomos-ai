import type {
	EventCallback,
	EventPayloadMap,
	EventType,
} from "@nomos-ai/types";

export class EventService {
	private subscribers = new Set<EventCallback>();

	/** Emit a typed event with payload matching the EventPayloadMap */
	emit<T extends keyof EventPayloadMap>(
		type: T,
		payload: EventPayloadMap[T],
	): void;
	/** Emit an event with an untyped payload (backward compatible) */
	emit(type: EventType, payload: unknown): void;
	emit(type: EventType, payload: unknown): void {
		for (const cb of this.subscribers) {
			try {
				cb(type, payload);
			} catch {
				// Isolate subscriber errors
			}
		}
	}

	subscribe(callback: EventCallback): () => void {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	get subscriberCount(): number {
		return this.subscribers.size;
	}
}
