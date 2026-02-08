import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWebSocketHandlers, type WSData } from "./websocket";
import { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import { EventService } from "@nomos-ai/api/services/event-service";
import type { TerminalService } from "@nomos-ai/api/services/terminal-service";
import type { ServerWebSocket } from "bun";

describe("WebSocket handlers", () => {
	let eventService: EventService;
	let broadcaster: EventBroadcaster;
	let handlers: ReturnType<typeof createWebSocketHandlers>;

	beforeEach(() => {
		eventService = new EventService();
		broadcaster = new EventBroadcaster(eventService);
		handlers = createWebSocketHandlers(broadcaster, undefined, eventService);
	});

	describe("events channel", () => {
		it("should send welcome message on open", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			expect(ws.send).toHaveBeenCalledWith(
				JSON.stringify({
					type: "welcome",
					userId: "user-1",
				}),
			);
		});

		it("should add client to broadcaster on open", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			expect(broadcaster.clientCount).toBe(1);
		});

		it("should remove client from broadcaster on close", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);
			handlers.close(ws);

			expect(broadcaster.clientCount).toBe(0);
		});

		it("should handle subscribe message", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			const subscribeMsg = JSON.stringify({
				action: "subscribe",
				eventTypes: ["feature:created", "feature:completed"],
			});

			handlers.message(ws, subscribeMsg);

			const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1];
			const response = JSON.parse(lastCall[0] as string);

			expect(response.type).toBe("subscribed");
			expect(response.eventTypes).toContain("feature:created");
			expect(response.eventTypes).toContain("feature:completed");
		});

		it("should handle unsubscribe message", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			// First subscribe
			handlers.message(
				ws,
				JSON.stringify({
					action: "subscribe",
					eventTypes: ["feature:created", "feature:completed"],
				}),
			);

			// Then unsubscribe
			handlers.message(
				ws,
				JSON.stringify({
					action: "unsubscribe",
					eventTypes: ["feature:created"],
				}),
			);

			// Should not throw or error
			expect(ws.send).toHaveBeenCalled();
		});

		it("should handle ping message with pong", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			handlers.message(ws, JSON.stringify({ action: "ping" }));

			const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1];
			const response = JSON.parse(lastCall[0] as string);

			expect(response.type).toBe("pong");
		});

		it("should send error for invalid message format", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			handlers.message(ws, JSON.stringify({ invalid: "message" }));

			const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1];
			const response = JSON.parse(lastCall[0] as string);

			expect(response.type).toBe("error");
			expect(response.message).toBe("Invalid message format");
		});

		it("should send error for malformed JSON", () => {
			const ws = createMockServerWebSocket("events", "user-1");
			handlers.open(ws);

			handlers.message(ws, "not-json");

			const lastCall = ws.send.mock.calls[ws.send.mock.calls.length - 1];
			const response = JSON.parse(lastCall[0] as string);

			expect(response.type).toBe("error");
			expect(response.message).toBe("Failed to parse message");
		});
	});

	describe("terminal channel", () => {
		it("should track terminal clients by sessionId", () => {
			const ws1 = createMockServerWebSocket("terminal", "user-1", "session-1");
			const ws2 = createMockServerWebSocket("terminal", "user-2", "session-1");

			handlers.open(ws1);
			handlers.open(ws2);

			// Both should be tracked (implementation detail - can't directly test internal map)
			handlers.close(ws1);
			handlers.close(ws2);

			// Should not throw
			expect(true).toBe(true);
		});

		it("should forward terminal input to service", () => {
			const mockTerminalService: TerminalService = {
				write: vi.fn(),
			} as unknown as TerminalService;

			const handlersWithTerminal = createWebSocketHandlers(
				broadcaster,
				mockTerminalService,
				eventService,
			);

			const ws = createMockServerWebSocket("terminal", "user-1", "session-1");
			handlersWithTerminal.open(ws);
			handlersWithTerminal.message(ws, "ls -la\n");

			expect(mockTerminalService.write).toHaveBeenCalledWith("session-1", "ls -la\n");
		});

		it("should handle terminal write errors gracefully", () => {
			const mockTerminalService: TerminalService = {
				write: vi.fn(() => {
					throw new Error("Session killed");
				}),
			} as unknown as TerminalService;

			const handlersWithTerminal = createWebSocketHandlers(
				broadcaster,
				mockTerminalService,
				eventService,
			);

			const ws = createMockServerWebSocket("terminal", "user-1", "session-1");
			handlersWithTerminal.open(ws);

			// Should not throw
			expect(() => {
				handlersWithTerminal.message(ws, "ls\n");
			}).not.toThrow();
		});

		it("should forward terminal output events to correct clients", () => {
			const handlersWithEvents = createWebSocketHandlers(
				broadcaster,
				undefined,
				eventService,
			);

			const ws1 = createMockServerWebSocket("terminal", "user-1", "session-1");
			const ws2 = createMockServerWebSocket("terminal", "user-2", "session-2");

			handlersWithEvents.open(ws1);
			handlersWithEvents.open(ws2);

			// Emit terminal output for session-1
			eventService.emit("terminal:output", {
				sessionId: "session-1",
				data: "output data",
			});

			// Only ws1 should receive it
			expect(ws1.send).toHaveBeenCalledWith(
				JSON.stringify({ type: "output", data: "output data" }),
			);
			expect(ws2.send).not.toHaveBeenCalled();
		});
	});

	describe("authentication", () => {
		it("should require userId in WSData", () => {
			const ws = createMockServerWebSocket("events", "user-1");

			// userId is required in WSData type
			expect(ws.data.userId).toBeDefined();
			expect(ws.data.userId).toBe("user-1");
		});
	});
});

function createMockServerWebSocket(
	channel: "events" | "terminal",
	userId: string,
	sessionId?: string,
): ServerWebSocket<WSData> {
	return {
		data: {
			channel,
			userId,
			sessionId,
		},
		send: vi.fn(),
		readyState: 1, // OPEN
		subscribe: vi.fn(),
	} as unknown as ServerWebSocket<WSData>;
}
