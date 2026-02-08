import { beforeEach, describe, expect, it } from "bun:test";
import { EventBroadcaster } from "../event-broadcaster";
import { EventService } from "../event-service";

describe("EventBroadcaster", () => {
	let eventService: EventService;
	let broadcaster: EventBroadcaster;

	beforeEach(() => {
		eventService = new EventService();
		broadcaster = new EventBroadcaster(eventService);
	});

	describe("User-scoped event filtering", () => {
		it("rejects sending user-scoped events to non-matching clients", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");
			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_bob",
			});

			expect(messages.length).toBe(0);
		});

		it("sends user-scoped events only to matching clients", () => {
			const aliceMessages: string[] = [];
			const bobMessages: string[] = [];

			const aliceClient = {
				send: (data: string) => aliceMessages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			const bobClient = {
				send: (data: string) => bobMessages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(aliceClient, "user_alice");
			broadcaster.addClient(bobClient, "user_bob");

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(aliceMessages.length).toBe(1);
			expect(bobMessages.length).toBe(0);

			const parsed = JSON.parse(aliceMessages[0]!);
			expect(parsed.type).toBe("agent:stream");
			expect(parsed.payload.userId).toBe("user_alice");
		});

		it("sends global events (no userId) to all clients", () => {
			const aliceMessages: string[] = [];
			const bobMessages: string[] = [];

			const aliceClient = {
				send: (data: string) => aliceMessages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			const bobClient = {
				send: (data: string) => bobMessages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(aliceClient, "user_alice");
			broadcaster.addClient(bobClient, "user_bob");

			eventService.emit("system:status", { status: "healthy" });

			expect(aliceMessages.length).toBe(1);
			expect(bobMessages.length).toBe(1);
		});

		it("handles client disconnection cleanup", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");
			expect(broadcaster.clientCount).toBe(1);

			broadcaster.removeClient(mockClient);
			expect(broadcaster.clientCount).toBe(0);

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(messages.length).toBe(0);
		});

		it("skips sending when backpressure is high", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 2 * 1024 * 1024, // 2MB > 1MB threshold
			};

			broadcaster.addClient(mockClient, "user_alice");

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(messages.length).toBe(0);
		});

		it("skips sending when client is not in ready state", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 0, // CONNECTING
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(messages.length).toBe(0);
		});

		it("auto-removes client on send failure", () => {
			const mockClient = {
				send: () => {
					throw new Error("Connection closed");
				},
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");
			expect(broadcaster.clientCount).toBe(1);

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(broadcaster.clientCount).toBe(0);
		});
	});

	describe("Cleanup and destruction", () => {
		it("destroy unsubscribes from events and clears clients", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");
			expect(broadcaster.clientCount).toBe(1);

			broadcaster.destroy();

			expect(broadcaster.clientCount).toBe(0);

			eventService.emit("agent:stream", {
				sessionId: "sess_1",
				message: { type: "assistant" },
				userId: "user_alice",
			});

			expect(messages.length).toBe(0);
		});

		it("destroy can be called multiple times safely", () => {
			broadcaster.destroy();
			broadcaster.destroy();
			expect(broadcaster.clientCount).toBe(0);
		});
	});

	describe("JSON serialization safety", () => {
		it("handles serialization errors gracefully", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");

			// Create circular reference that will cause JSON.stringify to throw
			// Error message: "JSON.stringify cannot serialize cyclic structures"
			const circular: Record<string, unknown> = { userId: "user_alice" };
			circular.self = circular;

			// The EventBroadcaster should catch the JSON.stringify error
			// (see event-broadcaster.ts lines 21-26) and skip sending this event
			eventService.emit("test:event", circular);

			// No message should be sent because serialization failed
			expect(messages.length).toBe(0);
		});

		it("continues processing after serialization error", () => {
			const messages: string[] = [];
			const mockClient = {
				send: (data: string) => messages.push(data),
				readyState: 1,
				bufferedAmount: 0,
			};

			broadcaster.addClient(mockClient, "user_alice");

			// First event: circular reference (should fail silently)
			const circular: Record<string, unknown> = { userId: "user_alice" };
			circular.self = circular;
			eventService.emit("test:event", circular);

			// Second event: valid payload (should succeed)
			eventService.emit("test:event2", {
				userId: "user_alice",
				message: "valid",
			});

			// Only the second event should be sent
			expect(messages.length).toBe(1);
			const parsed = JSON.parse(messages[0]!);
			expect(parsed.type).toBe("test:event2");
		});
	});
});
