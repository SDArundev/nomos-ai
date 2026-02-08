import type { EventType } from "@nomos-ai/types";
import type { EventService } from "./event-service";

export interface WebSocketClient {
	send(data: string): void;
	readyState: number;
}

interface ClientSubscription {
	ws: WebSocketClient;
	userId: string;
	eventTypes: Set<EventType>;
}

export class EventBroadcaster {
	private clients = new Map<WebSocketClient, ClientSubscription>();

	constructor(private events: EventService) {
		this.events.subscribe((type, payload) => {
			for (const [ws, subscription] of this.clients.entries()) {
				try {
					// Skip if client hasn't subscribed to this event type
					// Note: No ownership filtering needed - this is a single-user desktop app (Tauri).
					// All authenticated users receive all events matching their subscription.
					if (subscription.eventTypes.size > 0 && !subscription.eventTypes.has(type)) {
						continue;
					}

					if (ws.readyState === 1) {
						const message = JSON.stringify({
							type: "event",
							eventType: type,
							payload,
						});
						ws.send(message);
					}
				} catch (error) {
					console.error("Failed to send event to WebSocket client:", error);
					this.clients.delete(ws);
				}
			}
		});
	}

	addClient(ws: WebSocketClient, userId: string): void {
		this.clients.set(ws, {
			ws,
			userId,
			eventTypes: new Set(),
		});
	}

	removeClient(ws: WebSocketClient): void {
		this.clients.delete(ws);
	}

	subscribe(ws: WebSocketClient, eventTypes: EventType[]): void {
		const subscription = this.clients.get(ws);
		if (subscription) {
			for (const eventType of eventTypes) {
				subscription.eventTypes.add(eventType);
			}
		}
	}

	unsubscribe(ws: WebSocketClient, eventTypes: EventType[]): void {
		const subscription = this.clients.get(ws);
		if (subscription) {
			for (const eventType of eventTypes) {
				subscription.eventTypes.delete(eventType);
			}
		}
	}

	getSubscriptions(ws: WebSocketClient): EventType[] {
		const subscription = this.clients.get(ws);
		return subscription ? Array.from(subscription.eventTypes) : [];
	}

	get clientCount(): number {
		return this.clients.size;
	}
}
