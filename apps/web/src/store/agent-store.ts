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
	sessions: AgentSession[];
	activeSessionId: string | null;
	messages: AgentMessage[];
	isStreaming: boolean;
	isSending: boolean;

	setSessions: (sessions: AgentSession[]) => void;
	addSession: (session: AgentSession) => void;
	setActiveSession: (id: string | null) => void;
	setMessages: (messages: AgentMessage[]) => void;
	addMessage: (message: AgentMessage) => void;
	setIsStreaming: (streaming: boolean) => void;
	setIsSending: (sending: boolean) => void;
	clearMessages: () => void;
}

export const useAgentStore = create<AgentStore>()(
	devtools(
		(set) => ({
			sessions: [],
			activeSessionId: null,
			messages: [],
			isStreaming: false,
			isSending: false,

			setSessions: (sessions) =>
				set({ sessions }, undefined, "agent/setSessions"),
			addSession: (session) =>
				set(
					(state) => ({ sessions: [...state.sessions, session] }),
					undefined,
					"agent/addSession",
				),
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
			setIsStreaming: (streaming) =>
				set({ isStreaming: streaming }, undefined, "agent/setIsStreaming"),
			setIsSending: (sending) =>
				set({ isSending: sending }, undefined, "agent/setIsSending"),
			clearMessages: () =>
				set({ messages: [] }, undefined, "agent/clearMessages"),
		}),
		{ name: "AgentStore" },
	),
);
