import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventBroadcaster } from "./event-broadcaster";
import { EventService } from "./event-service";
import type { EventType } from "@nomos-ai/types";

describe("EventBroadcaster", () => {
	let eventService: EventService;
	let broadcaster: EventBroadcaster;

	beforeEach(() => {
		eventService = new EventService();
		broadcaster = new EventBroadcaster(eventService);
	});

	describe("client management", () => {
		it("should add and track clients", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");
			expect(broadcaster.clientCount).toBe(1);
		});

		it("should remove clients", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");
			broadcaster.removeClient(ws);
			expect(broadcaster.clientCount).toBe(0);
		});

		it("should track multiple clients", () => {
			const ws1 = createMockWebSocket();
			const ws2 = createMockWebSocket();
			broadcaster.addClient(ws1, "user-1");
			broadcaster.addClient(ws2, "user-2");
			expect(broadcaster.clientCount).toBe(2);
		});
	});

	describe("subscription management", () => {
		it("should track client subscriptions", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");

			broadcaster.subscribe(ws, ["feature:created", "feature:completed"]);
			const subs = broadcaster.getSubscriptions(ws);

			expect(subs).toContain("feature:created");
			expect(subs).toContain("feature:completed");
		});

		it("should unsubscribe from specific event types", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");

			broadcaster.subscribe(ws, ["feature:created", "feature:completed"]);
			broadcaster.unsubscribe(ws, ["feature:created"]);

			const subs = broadcaster.getSubscriptions(ws);
			expect(subs).not.toContain("feature:created");
			expect(subs).toContain("feature:completed");
		});

		it("should handle empty subscriptions", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");

			const subs = broadcaster.getSubscriptions(ws);
			expect(subs).toEqual([]);
		});
	});

	describe("event filtering", () => {
		it("should only send subscribed event types", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");
			broadcaster.subscribe(ws, ["feature:created"]);

			// Emit event that client subscribed to
			eventService.emit("feature:created", { id: "F001" });
			expect(ws.send).toHaveBeenCalledTimes(1);

			// Emit event that client did not subscribe to
			eventService.emit("feature:completed", { id: "F001" });
			expect(ws.send).toHaveBeenCalledTimes(1); // Still 1, not 2
		});

		it("should send all events when no subscriptions set", () => {
			const ws = createMockWebSocket();
			broadcaster.addClient(ws, "user-1");

			// No explicit subscription means receive all events
			// Note: No ownership filtering in this single-user desktop app
			eventService.emit("feature:created", { id: "F001" });
			eventService.emit("feature:completed", { id: "F001" });

			expect(ws.send).toHaveBeenCalledTimes(2);
		});

		it("should send events to all authenticated clients regardless of userId in payload", () => {
			const ws1 = createMockWebSocket();
			const ws2 = createMockWebSocket();

			broadcaster.addClient(ws1, "user-1");
			broadcaster.addClient(ws2, "user-2");

			// All clients receive events in single-user desktop app
			eventService.emit("feature:created", { id: "F001" });

			expect(ws1.send).toHaveBeenCalledTimes(1);
			expect(ws2.send).toHaveBeenCalledTimes(1);
		});
	});

	describe("error handling", () => {
		it("should remove client on send error", () => {
			const ws = createMockWebSocket();
			ws.send = vi.fn(() => {
				throw new Error("Connection closed");
			});

			broadcaster.addClient(ws, "user-1");
			expect(broadcaster.clientCount).toBe(1);

			eventService.emit("feature:created", { id: "F001" });

			// Client should be removed after send error
			expect(broadcaster.clientCount).toBe(0);
		});

		it("should skip clients with closed connection", () => {
			const ws = createMockWebSocket();
			ws.readyState = 3; // CLOSED

			broadcaster.addClient(ws, "user-1");
			eventService.emit("feature:created", { id: "F001" });

			expect(ws.send).not.toHaveBeenCalled();
		});
	});
});

function createMockWebSocket() {
	return {
		send: vi.fn(),
		readyState: 1, // OPEN
	};
}
