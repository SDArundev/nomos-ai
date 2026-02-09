import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface AgentMessage {
	id: string;
	sessionId: string;
	role: string;
	content: string;
	toolCalls?: Array<{
		id: string;
		name: string;
		input: unknown;
		result?: string;
		startedAt?: number;
		completedAt?: number;
	}> | null;
	thinkingContent?: string | null;
	createdAt: Date;
}

export interface AgentSession {
	id: string;
	featureId: string | null;
	status: string;
	startedAt: Date;
	model: string | null;
	messageCount: number | null;
	sdkSessionId?: string | null;
	isRunning?: boolean | null;
	workingDirectory?: string | null;
}

interface AgentStore {
	activeSessionId: string | null;
	/** Transient message buffer: merges history query data with streaming messages */
	messages: AgentMessage[];
	isSending: boolean;

	setActiveSession: (id: string | null) => void;
	setMessages: (messages: AgentMessage[]) => void;
	addMessage: (message: AgentMessage) => void;
	setIsSending: (sending: boolean) => void;
	clearMessages: () => void;
}

export const useAgentStore = create<AgentStore>()(
	devtools(
		(set) => ({
			activeSessionId: null,
			messages: [],
			isSending: false,

			setActiveSession: (id) =>
				set({ activeSessionId: id }, undefined, "agent/setActiveSession"),
			setMessages: (messages) =>
				set({ messages }, undefined, "agent/setMessages"),
			addMessage: (message) =>
				set(
					(state) => ({ messages: [...state.messages, message] }),
					undefined,
					"agent/addMessage",
				),
			setIsSending: (sending) =>
				set({ isSending: sending }, undefined, "agent/setIsSending"),
			clearMessages: () =>
				set({ messages: [] }, undefined, "agent/clearMessages"),
		}),
		{ name: "AgentStore" },
	),
);
