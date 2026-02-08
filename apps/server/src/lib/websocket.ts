import type { ServerWebSocket } from "bun";
import type { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import type { EventService } from "@nomos-ai/api/services/event-service";
import type { TerminalService } from "@nomos-ai/api/services/terminal-service";

export interface WSData {
	channel: "events" | "terminal";
	sessionId?: string;
	userId: string;
}

export function createWebSocketHandlers(
	broadcaster: EventBroadcaster,
	terminalService?: TerminalService,
	events?: EventService,
) {
	// Track terminal WebSocket clients by sessionId
	const terminalClients = new Map<string, Set<ServerWebSocket<WSData>>>();

	// Forward terminal output events to the correct terminal WebSocket clients
	if (events) {
		events.subscribe((type, payload) => {
			if (type === "terminal:output") {
				const { sessionId, data, userId } = payload as { sessionId: string; data: string; userId: string };
				const clients = terminalClients.get(sessionId);
				if (clients) {
					const msg = JSON.stringify({ type: "output", data });
					for (const ws of clients) {
						try {
							// Only send to clients whose userId matches the session owner
							if (ws.readyState === 1 && ws.data.userId === userId) {
								ws.send(msg);
							}
						} catch {
							clients.delete(ws);
						}
					}
				}
			}
		});
	}

	return {
		open(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.addClient(ws as unknown as Parameters<typeof broadcaster.addClient>[0], ws.data.userId);
				ws.subscribe("events");
			} else if (ws.data.channel === "terminal" && ws.data.sessionId) {
				let clients = terminalClients.get(ws.data.sessionId);
				if (!clients) {
					clients = new Set();
					terminalClients.set(ws.data.sessionId, clients);
				}
				clients.add(ws);
			}
		},
		message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
			if (ws.data.channel === "terminal" && ws.data.sessionId && terminalService) {
				try {
					terminalService.write(ws.data.sessionId, String(message));
				} catch {
					// Session may have been killed
				}
			}
		},
		close(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.removeClient(ws as unknown as Parameters<typeof broadcaster.removeClient>[0]);
			} else if (ws.data.channel === "terminal" && ws.data.sessionId) {
				const clients = terminalClients.get(ws.data.sessionId);
				if (clients) {
					clients.delete(ws);
					if (clients.size === 0) terminalClients.delete(ws.data.sessionId);
				}
			}
		},
	};
}
