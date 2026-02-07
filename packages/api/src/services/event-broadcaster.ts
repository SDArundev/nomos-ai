import type { EventService } from "./event-service";

export interface WebSocketClient {
	send(data: string): void;
	readyState: number;
}

export class EventBroadcaster {
	private clients = new Set<WebSocketClient>();

	constructor(private events: EventService) {
		this.events.subscribe((type, payload) => {
			const data = JSON.stringify({ type, payload });
			for (const ws of this.clients) {
				try {
					if (ws.readyState === 1) {
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
}
