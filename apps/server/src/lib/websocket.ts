import type { ServerWebSocket } from "bun";
import type { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import type { EventService } from "@nomos-ai/api/services/event-service";
import type { TerminalService } from "@nomos-ai/api/services/terminal-service";
import {
	wsClientMessageSchema,
	type WsServerMessage,
	type EventType,
} from "@nomos-ai/types";

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
				// Validate payload before casting
				if (
					!payload ||
					typeof payload !== "object" ||
					!("sessionId" in payload) ||
					!("data" in payload) ||
					typeof payload.sessionId !== "string" ||
					typeof payload.data !== "string"
				) {
					console.error("Invalid terminal:output payload:", payload);
					return;
				}

				const { sessionId, data } = payload as { sessionId: string; data: string };
				const clients = terminalClients.get(sessionId);
				if (clients) {
					const msg = JSON.stringify({ type: "output", data });
					for (const ws of clients) {
						try {
							if (ws.readyState === 1) ws.send(msg);
						} catch {
							clients.delete(ws);
						}
					}
				}
			}
		});
	}

	function sendMessage(ws: ServerWebSocket<WSData>, message: WsServerMessage): void {
		try {
			if (ws.readyState === 1) {
				ws.send(JSON.stringify(message));
			}
		} catch (error) {
			console.error("Failed to send WebSocket message:", error);
		}
	}

	return {
		open(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.addClient(
					ws as unknown as Parameters<typeof broadcaster.addClient>[0],
					ws.data.userId,
				);
				ws.subscribe("events");

				// Send welcome message
				sendMessage(ws, {
					type: "welcome",
					userId: ws.data.userId,
				});
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
			if (ws.data.channel === "events") {
				// Handle typed client messages
				try {
					const parsed = JSON.parse(String(message));
					const result = wsClientMessageSchema.safeParse(parsed);

					if (!result.success) {
						sendMessage(ws, {
							type: "error",
							message: "Invalid message format",
						});
						return;
					}

					const clientMessage = result.data;

					switch (clientMessage.action) {
						case "subscribe": {
							broadcaster.subscribe(
								ws as unknown as Parameters<typeof broadcaster.subscribe>[0],
								clientMessage.eventTypes as EventType[],
							);
							sendMessage(ws, {
								type: "subscribed",
								eventTypes: clientMessage.eventTypes as EventType[],
							});
							break;
						}
						case "unsubscribe": {
							broadcaster.unsubscribe(
								ws as unknown as Parameters<typeof broadcaster.unsubscribe>[0],
								clientMessage.eventTypes as EventType[],
							);
							break;
						}
						case "ping": {
							sendMessage(ws, { type: "pong" });
							break;
						}
					}
				} catch {
					sendMessage(ws, {
						type: "error",
						message: "Failed to parse message",
					});
				}
			} else if (ws.data.channel === "terminal" && ws.data.sessionId && terminalService) {
				try {
					terminalService.write(ws.data.sessionId, String(message));
				} catch (error) {
					console.error("Failed to write to terminal session:", ws.data.sessionId, error);
				}
			}
		},
		close(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.removeClient(
					ws as unknown as Parameters<typeof broadcaster.removeClient>[0],
				);
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
