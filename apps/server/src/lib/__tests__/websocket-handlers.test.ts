import { beforeEach, describe, expect, it } from "bun:test";
import { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import { EventService } from "@nomos-ai/api/services/event-service";
import { TerminalService } from "@nomos-ai/api/services/terminal-service";
import { createWebSocketHandlers } from "../websocket";

/**
 * WebSocket Handlers Tests
 *
 * These tests validate the WebSocket handler behavior:
 * 1. open handler registers event client with userId
 * 2. open handler registers terminal client with sessionId
 * 3. close handler removes clients
 * 4. terminal message handler forwards input
 * 5. terminal output only reaches session-matching AND user-matching clients
 */

describe("WebSocket Handlers", () => {
	let eventService: EventService;
	let broadcaster: EventBroadcaster;
	let terminalService: TerminalService;
	let handlers: ReturnType<typeof createWebSocketHandlers>;

	beforeEach(() => {
		eventService = new EventService();
		broadcaster = new EventBroadcaster(eventService);
		terminalService = new TerminalService(eventService);
		handlers = createWebSocketHandlers(broadcaster, terminalService, eventService);
	});

	describe("Event channel handlers", () => {
		it("open handler registers event client with userId", () => {
			const mockWs = {
				data: { channel: "events" as const, userId: "user_alice" },
				subscribe: () => {},
				readyState: 1,
			} as unknown as Parameters<typeof handlers.open>[0];

			expect(broadcaster.clientCount).toBe(0);
			handlers.open(mockWs);
			expect(broadcaster.clientCount).toBe(1);
		});

		it("close handler removes event client", () => {
			const mockWs = {
				data: { channel: "events" as const, userId: "user_alice" },
				subscribe: () => {},
				readyState: 1,
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(mockWs);
			expect(broadcaster.clientCount).toBe(1);

			handlers.close(mockWs);
			expect(broadcaster.clientCount).toBe(0);
		});
	});

	describe("Terminal channel handlers", () => {
		it("open handler registers terminal client with sessionId", () => {
			const mockWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(mockWs);

			// Verify client is registered by emitting a terminal event
			const messages: string[] = [];
			mockWs.send = (data: string) => messages.push(data);

			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "$ ls\n",
				userId: "user_alice",
			});

			expect(messages.length).toBe(1);
			const parsed = JSON.parse(messages[0]!);
			expect(parsed.type).toBe("output");
			expect(parsed.data).toBe("$ ls\n");
		});

		it("close handler removes terminal client", () => {
			const mockWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: () => {},
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(mockWs);
			handlers.close(mockWs);

			// Verify client is removed by emitting a terminal event
			const messages: string[] = [];
			mockWs.send = (data: string) => messages.push(data);

			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "$ ls\n",
				userId: "user_alice",
			});

			expect(messages.length).toBe(0);
		});

		it("message handler forwards input to terminal service", () => {
			const mockWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
			} as unknown as Parameters<typeof handlers.message>[0];

			// Create a terminal session
			terminalService.createSession("/tmp/test", "user_alice");

			// Mock the terminal write to track calls
			let writtenData = "";
			const originalWrite = terminalService.write.bind(terminalService);
			terminalService.write = (sessionId: string, data: string) => {
				writtenData = data;
				return originalWrite(sessionId, data);
			};

			// Note: The handler uses the sessionId from ws.data, not from the message
			// So we need to create a session with the ID that matches
			const sessions = terminalService.listSessions();
			if (sessions[0]) {
				mockWs.data.sessionId = sessions[0].id;
				handlers.message(mockWs, "ls -la\n");
				expect(writtenData).toBe("ls -la\n");
			}
		});
	});

	describe("AC3: Terminal output user isolation", () => {
		it("terminal output only reaches clients matching sessionId AND userId", () => {
			const aliceMessages: string[] = [];
			const bobMessages: string[] = [];

			const aliceWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => aliceMessages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			const bobWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_bob",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => bobMessages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(aliceWs);
			handlers.open(bobWs);

			// Emit terminal output for user_alice's session
			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "$ whoami\nalice\n",
				userId: "user_alice",
			});

			// Only Alice should receive the output
			expect(aliceMessages.length).toBe(1);
			expect(bobMessages.length).toBe(0);

			const parsed = JSON.parse(aliceMessages[0]!);
			expect(parsed.type).toBe("output");
			expect(parsed.data).toBe("$ whoami\nalice\n");
		});

		it("prevents cross-user session eavesdropping", () => {
			const aliceMessages: string[] = [];
			const bobMessages: string[] = [];

			const aliceWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_alice",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => aliceMessages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			const bobWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_alice", // Bob tries to connect to Alice's session
					userId: "user_bob",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => bobMessages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(aliceWs);
			handlers.open(bobWs);

			// Emit terminal output for Alice's session
			eventService.emit("terminal:output", {
				sessionId: "term_alice",
				data: "$ cat secrets.txt\nAPI_KEY=super_secret\n",
				userId: "user_alice",
			});

			// Only Alice should receive the output, Bob should be blocked
			expect(aliceMessages.length).toBe(1);
			expect(bobMessages.length).toBe(0);
		});

		it("allows same user to connect to same session from multiple clients", () => {
			const client1Messages: string[] = [];
			const client2Messages: string[] = [];

			const client1 = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => client1Messages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			const client2 = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: (data: string) => client2Messages.push(data),
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(client1);
			handlers.open(client2);

			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "$ echo 'hello'\nhello\n",
				userId: "user_alice",
			});

			// Both clients should receive the output
			expect(client1Messages.length).toBe(1);
			expect(client2Messages.length).toBe(1);
		});
	});

	describe("Error handling", () => {
		it("handles terminal write on non-existent session gracefully", () => {
			const mockWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "nonexistent",
					userId: "user_alice",
				},
			} as unknown as Parameters<typeof handlers.message>[0];

			// Should not throw
			expect(() => handlers.message(mockWs, "test")).not.toThrow();
		});

		it("removes terminal client on send error", () => {
			const mockWs = {
				data: {
					channel: "terminal" as const,
					sessionId: "term_1",
					userId: "user_alice",
				},
				subscribe: () => {},
				readyState: 1,
				send: () => {
					throw new Error("Connection closed");
				},
			} as unknown as Parameters<typeof handlers.open>[0];

			handlers.open(mockWs);

			// Emit event that will trigger send error
			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "test",
				userId: "user_alice",
			});

			// Client should be removed after error
			mockWs.send = () => {
				throw new Error("Should not be called");
			};

			// Second emit should not call send
			eventService.emit("terminal:output", {
				sessionId: "term_1",
				data: "test2",
				userId: "user_alice",
			});
		});
	});
});
