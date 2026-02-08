import type { EventService } from "./event-service";

export interface WebSocketClient {
	send(data: string): void;
	readyState: number;
	bufferedAmount?: number;
}

export class EventBroadcaster {
	private clients = new Set<WebSocketClient>();
	private unsubscribe: (() => void) | null = null;

	constructor(private events: EventService) {
		this.unsubscribe = this.events.subscribe((type, payload) => {
			let data: string;
			try {
				data = JSON.stringify({ type, payload });
			} catch (error) {
				console.error("EventBroadcaster: JSON serialization failed", error);
				return;
			}

			for (const ws of this.clients) {
				try {
					if (ws.readyState === 1) {
						// Check backpressure: skip if buffered data exceeds 1MB
						if (ws.bufferedAmount && ws.bufferedAmount > 1024 * 1024) {
							continue;
						}
						ws.send(data);
					}
				} catch {
					this.clients.delete(ws);
				}
			}
		});
	}

	addClient(ws: WebSocketClient): void {
		this.clients.add(ws);
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
