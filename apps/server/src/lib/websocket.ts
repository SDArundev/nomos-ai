import type { ServerWebSocket } from "bun";
import type { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import type { TerminalService } from "@nomos-ai/api/services/terminal-service";

export interface WSData {
	channel: "events" | "terminal";
	sessionId?: string;
	userId?: string;
}

export function createWebSocketHandlers(
	broadcaster: EventBroadcaster,
	terminalService?: TerminalService,
) {
	return {
		open(ws: ServerWebSocket<WSData>) {
			if (ws.data.channel === "events") {
				broadcaster.addClient(ws as unknown as Parameters<typeof broadcaster.addClient>[0]);
				ws.subscribe("events");
			} else if (ws.data.channel === "terminal") {
				ws.subscribe(`terminal:${ws.data.sessionId}`);
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
			}
		},
	};
}
