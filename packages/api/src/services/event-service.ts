import type { EventCallback, EventType } from "@nomos-ai/types";

export class EventService {
	private subscribers = new Set<EventCallback>();

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
