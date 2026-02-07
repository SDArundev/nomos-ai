import type { ServerWebSocket } from "bun";
import type { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";

export interface WSData {
	channel: "events" | "terminal";
	sessionId?: string;
	userId?: string;
}

export function createWebSocketHandlers(broadcaster: EventBroadcaster) {
	return {
		open(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.addClient(ws as unknown as Parameters<typeof broadcaster.addClient>[0]);
				ws.subscribe("events");
			} else if (ws.data.channel === "terminal") {
				ws.subscribe(`terminal:${ws.data.sessionId}`);
			}
		},
		message(_ws: ServerWebSocket<WSData>, _message: string | Buffer) {
			// Terminal input handling will be added in F261
		},
		close(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.removeClient(ws as unknown as Parameters<typeof broadcaster.removeClient>[0]);
			}
		},
	};
}
