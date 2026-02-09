import { eventLogger } from "../lib/logger";
import type { IEventService } from "./event-service";

export interface WebSocketClient {
	send(data: string): void;
	readyState: number;
	bufferedAmount?: number;
}

interface TrackedClient {
	ws: WebSocketClient;
	userId: string;
}

export class EventBroadcaster {
	private clients = new Map<WebSocketClient, TrackedClient>();
	private unsubscribe: (() => void) | null = null;

	constructor(private events: IEventService) {
		this.unsubscribe = this.events.subscribe((type, payload) => {
			let data: string;
			try {
				data = JSON.stringify({ type, payload });
			} catch (error) {
				eventLogger.error({ err: error }, "JSON serialization failed");
				return;
			}

			// Determine if this event is user-scoped
			const eventPayload = payload as Record<string, unknown> | undefined;
			const eventUserId = eventPayload?.userId as string | undefined;

			for (const [, tracked] of this.clients) {
				try {
					if (tracked.ws.readyState === 1) {
						// Check backpressure
						if (
							tracked.ws.bufferedAmount &&
							tracked.ws.bufferedAmount > 1024 * 1024
						) {
							continue;
						}
						// If event has userId, only send to matching client
						if (eventUserId && eventUserId !== tracked.userId) {
							continue;
						}
						tracked.ws.send(data);
					}
				} catch {
					this.clients.delete(tracked.ws);
				}
			}
		});
	}

	addClient(ws: WebSocketClient, userId: string): void {
		this.clients.set(ws, { ws, userId });
	}

	removeClient(ws: WebSocketClient): void {
		this.clients.delete(ws);
	}

	get clientCount(): number {
		return this.clients.size;
	}

	destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.clients.clear();
	}
}
