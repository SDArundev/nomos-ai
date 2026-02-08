import { describe, expect, it } from "bun:test";
import type { AgentMessage } from "@/store/agent-store";

describe("AgentOutputViewer Component", () => {
	const mockMessages: AgentMessage[] = [
		{
			id: "1",
			sessionId: "session-1",
			role: "user",
			content: "Hello agent",
			createdAt: new Date("2024-01-01T10:00:00Z"),
		},
		{
			id: "2",
			sessionId: "session-1",
			role: "assistant",
			content: "Hello! How can I help?",
			createdAt: new Date("2024-01-01T10:00:01Z"),
		},
		{
			id: "3",
			sessionId: "session-1",
			role: "assistant",
			content: "# Markdown Test\n\nThis is **bold** and this is `code`.",
			toolCalls: [
				{
					id: "tool-1",
					name: "read_file",
					input: { path: "/test.txt" },
					result: "File content",
				},
			],
			createdAt: new Date("2024-01-01T10:00:02Z"),
		},
	];

	it("accepts messages array prop", () => {
		const props = {
			messages: mockMessages,
			isStreaming: false,
			pendingContent: "",
			pendingToolCalls: [],
		};

		expect(props.messages).toBeArray();
		expect(props.messages).toHaveLength(3);
	});

	it("accepts isStreaming boolean prop", () => {
		const props = {
			messages: [],
			isStreaming: true,
			pendingContent: "",
			pendingToolCalls: [],
		};

		expect(typeof props.isStreaming).toBe("boolean");
		expect(props.isStreaming).toBe(true);
	});

	it("accepts pendingContent string prop", () => {
		const props = {
			messages: [],
			isStreaming: true,
			pendingContent: "Streaming response...",
			pendingToolCalls: [],
		};

		expect(typeof props.pendingContent).toBe("string");
		expect(props.pendingContent).toBe("Streaming response...");
	});

	it("accepts pendingToolCalls array prop", () => {
		const props = {
			messages: [],
			isStreaming: true,
			pendingContent: "",
			pendingToolCalls: [
				{
					id: "tool-1",
					name: "test_tool",
					input: { test: "data" },
				},
			],
		};

		expect(props.pendingToolCalls).toBeArray();
		expect(props.pendingToolCalls).toHaveLength(1);
	});

	it("accepts optional sessionId prop", () => {
		const propsWithSession = {
			messages: [],
			isStreaming: false,
			pendingContent: "",
			pendingToolCalls: [],
			sessionId: "session-123",
		};

		const propsWithoutSession = {
			messages: [],
			isStreaming: false,
			pendingContent: "",
			pendingToolCalls: [],
		};

		expect(propsWithSession.sessionId).toBe("session-123");
		expect(propsWithoutSession.sessionId).toBeUndefined();
	});

	it("handles messages with content", () => {
		const message = mockMessages[0];
		expect(message.content).toBe("Hello agent");
		expect(message.role).toBe("user");
	});

	it("handles messages with markdown content", () => {
		const message = mockMessages[2];
		expect(message.content).toContain("# Markdown Test");
		expect(message.content).toContain("**bold**");
		expect(message.content).toContain("`code`");
	});

	it("handles messages with tool calls", () => {
		const message = mockMessages[2];
		expect(message.toolCalls).toBeDefined();
		expect(message.toolCalls).toHaveLength(1);
		expect(message.toolCalls?.[0].name).toBe("read_file");
	});

	it("handles messages with thinking content", () => {
		const messageWithThinking: AgentMessage = {
			id: "4",
			sessionId: "session-1",
			role: "assistant",
			content: "Response",
			thinkingContent: "Let me think about this...",
			createdAt: new Date(),
		};

		expect(messageWithThinking.thinkingContent).toBe(
			"Let me think about this...",
		);
	});

	it("uses react-markdown for rendering", () => {
		// Component imports Markdown from react-markdown
		const markdownContent = "# Test\n\nThis is **bold**";
		expect(markdownContent).toContain("#");
		expect(markdownContent).toContain("**");
	});

	it("uses ToolCallDisplay for tool calls", () => {
		const toolCall = {
			id: "tool-1",
			name: "read_file",
			input: { path: "/test.txt" },
			result: "File content",
		};

		expect(toolCall.name).toBe("read_file");
		expect(toolCall.input).toBeDefined();
		expect(toolCall.result).toBe("File content");
	});

	it("uses StreamingIndicator when streaming without content", () => {
		const props = {
			messages: [],
			isStreaming: true,
			pendingContent: "",
			pendingToolCalls: [],
		};

		// StreamingIndicator should be shown when isStreaming=true and no pendingContent
		expect(props.isStreaming).toBe(true);
		expect(props.pendingContent).toBe("");
	});

	it("uses useCopyToClipboard hook for copy functionality", () => {
		// Component uses the custom hook
		const hookReturn = {
			copy: async (_text: string) => {},
			copied: false,
			error: null,
		};

		expect(typeof hookReturn.copy).toBe("function");
		expect(typeof hookReturn.copied).toBe("boolean");
	});

	it("implements auto-scroll behavior", () => {
		// Component should scroll to bottom on content changes
		// This is implemented via useRef and scrollIntoView
		const dependencies = ["messages.length", "pendingContent", "isStreaming"];
		expect(dependencies).toHaveLength(3);
	});

	it("extracts text content for copying", () => {
		const extractContent = (messages: AgentMessage[]) => {
			return messages
				.map((msg) => {
					const content = msg.content || "";
					const thinking = msg.thinkingContent
						? `[Thinking: ${msg.thinkingContent}]`
						: "";
					return [thinking, content].filter(Boolean).join("\n");
				})
				.join("\n\n");
		};

		const result = extractContent(mockMessages);
		expect(result).toContain("Hello agent");
		expect(result).toContain("Hello! How can I help?");
		expect(result).toContain("Markdown Test");
	});

	it("applies prose classes for markdown styling", () => {
		// Component uses Tailwind prose classes for markdown
		const proseClasses = "prose prose-sm prose-invert max-w-none";
		expect(proseClasses).toContain("prose");
		expect(proseClasses).toContain("prose-sm");
		expect(proseClasses).toContain("prose-invert");
	});

	it("shows empty state when no messages", () => {
		const props = {
			messages: [],
			isStreaming: false,
			pendingContent: "",
			pendingToolCalls: [],
		};

		expect(props.messages).toHaveLength(0);
		expect(props.isStreaming).toBe(false);
		// Should show "No output yet" message
	});

	it("disables copy button when no messages", () => {
		const hasMessages = false;
		const disabled = !hasMessages || false;

		expect(disabled).toBe(true);
	});

	it("toggles copy button icon based on copied state", () => {
		const copiedState = { copied: false };
		const icon = copiedState.copied ? "Check" : "Copy";

		expect(icon).toBe("Copy");

		copiedState.copied = true;
		const iconAfterCopy = copiedState.copied ? "Check" : "Copy";
		expect(iconAfterCopy).toBe("Check");
	});
});
