import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { type AgentMessage, useAgentStore } from "@/store/agent-store";
import { orpc } from "@/utils/orpc";
import { AgentInput } from "./agent-input";
import { MessageList } from "./message-list";
import { SessionSidebar } from "./session-sidebar";

export function AgentChat() {
	const queryClient = useQueryClient();
	const activeSessionId = useAgentStore((s) => s.activeSessionId);
	const setActiveSession = useAgentStore((s) => s.setActiveSession);
	const messages = useAgentStore((s) => s.messages);
	const setMessages = useAgentStore((s) => s.setMessages);
	const setSessions = useAgentStore((s) => s.setSessions);
	const isSending = useAgentStore((s) => s.isSending);
	const setIsSending = useAgentStore((s) => s.setIsSending);

	const { isStreaming, pendingContent, pendingToolCalls, streamingMessages, error, clearError } =
		useAgentStream(activeSessionId);

	// Show error toast when agent errors
	useEffect(() => {
		if (error) {
			toast.error(`Agent error: ${error}`);
			clearError();
		}
	}, [error, clearError]);

	// Refetch history when streaming finishes to get persisted messages
	const wasStreaming = useRef(false);
	useEffect(() => {
		if (wasStreaming.current && !isStreaming && activeSessionId) {
			queryClient.invalidateQueries({
				queryKey: orpc.agent.getHistory.queryOptions({
					input: { sessionId: activeSessionId },
				}).queryKey,
			});
			setIsSending(false);
		}
		wasStreaming.current = isStreaming;
	}, [isStreaming, activeSessionId, queryClient, setIsSending]);

	// Fetch sessions
	const sessionsQuery = useQuery(orpc.agent.listSessions.queryOptions());

	useEffect(() => {
		if (sessionsQuery.data) {
			setSessions(sessionsQuery.data as never[]);
		}
	}, [sessionsQuery.data, setSessions]);

	// Fetch history when session changes
	const historyQuery = useQuery({
		...orpc.agent.getHistory.queryOptions({
			input: { sessionId: activeSessionId ?? "" },
		}),
		enabled: !!activeSessionId,
	});

	useEffect(() => {
		if (historyQuery.data) {
			setMessages(historyQuery.data as AgentMessage[]);
		}
	}, [historyQuery.data, setMessages]);

	// Merge streaming messages into displayed messages
	useEffect(() => {
		if (streamingMessages.length > 0 && historyQuery.data) {
			const existingIds = new Set(
				(historyQuery.data as AgentMessage[]).map((m) => m.id),
			);
			const newMsgs = streamingMessages.filter(
				(m) => !existingIds.has(m.id),
			);
			if (newMsgs.length > 0) {
				setMessages([
					...(historyQuery.data as AgentMessage[]),
					...newMsgs,
				]);
			}
		}
	}, [streamingMessages, historyQuery.data, setMessages]);

	// Create session
	const createSession = useMutation(
		orpc.agent.createSession.mutationOptions({
			onSuccess: (session) => {
				setActiveSession(session.id);
				queryClient.invalidateQueries({
					queryKey: orpc.agent.listSessions.queryOptions().queryKey,
				});
				toast.success("Session created");
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	// Send message mutation
	const sendMessage = useMutation(
		orpc.agent.sendMessage.mutationOptions({
			onError: (err) => {
				toast.error(`Failed to send: ${err.message}`);
				setIsSending(false);
			},
		}),
	);

	// Stop session
	const stopSession = useMutation(
		orpc.agent.stop.mutationOptions({
			onSuccess: () => toast.success("Agent stopped"),
			onError: (err) => toast.error(err.message),
		}),
	);

	// Clear history
	const clearHistory = useMutation(
		orpc.agent.clearHistory.mutationOptions({
			onSuccess: () => {
				useAgentStore.getState().clearMessages();
				queryClient.invalidateQueries({
					queryKey: orpc.agent.getHistory.queryOptions({
						input: { sessionId: activeSessionId ?? "" },
					}).queryKey,
				});
				toast.success("History cleared");
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const handleClearHistory = useCallback(() => {
		if (activeSessionId) {
			clearHistory.mutate({ sessionId: activeSessionId });
		}
	}, [activeSessionId, clearHistory]);

	const handleNewSession = useCallback(() => {
		createSession.mutate({
			name: `Session ${Date.now()}`,
			projectId: "default",
		});
	}, [createSession]);

	const handleSend = useCallback(
		(content: string) => {
			if (!activeSessionId) {
				toast.error("No active session. Create one first.");
				return;
			}

			// Optimistic: add user message immediately
			const userMsg: AgentMessage = {
				id: crypto.randomUUID(),
				sessionId: activeSessionId,
				role: "user",
				content,
				createdAt: new Date(),
			};
			setMessages([...messages, userMsg]);
			setIsSending(true);

			// Call RPC — response will stream via WebSocket
			sendMessage.mutate({
				sessionId: activeSessionId,
				content,
			});
		},
		[activeSessionId, messages, setMessages, setIsSending, sendMessage],
	);

	const handleStop = useCallback(() => {
		if (activeSessionId) {
			stopSession.mutate({ sessionId: activeSessionId });
		}
	}, [activeSessionId, stopSession]);

	return (
		<div className="flex h-full">
			<SessionSidebar
				sessions={(sessionsQuery.data as never[]) ?? []}
				activeSessionId={activeSessionId}
				onSelectSession={setActiveSession}
				onNewSession={handleNewSession}
			/>

			<div className="flex min-w-0 flex-1 flex-col">
				{activeSessionId ? (
					<>
						<div className="flex items-center justify-between border-b px-4 py-2">
							<div className="flex items-center gap-2">
								<span className="font-mono text-muted-foreground text-sm">
									{activeSessionId}
								</span>
								{isStreaming && (
									<span className="text-blue-500 text-xs">streaming</span>
								)}
							</div>
							<button
								type="button"
								onClick={handleClearHistory}
								disabled={clearHistory.isPending || messages.length === 0}
								className="text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
							>
								Clear History
							</button>
						</div>
						<MessageList
							messages={messages}
							isStreaming={isStreaming}
							pendingContent={pendingContent}
							pendingToolCalls={pendingToolCalls}
						/>
						<AgentInput
							onSend={handleSend}
							onStop={handleStop}
							isStreaming={isStreaming}
							disabled={isSending}
						/>
					</>
				) : (
					<div className="flex h-full items-center justify-center">
						<div className="text-center text-muted-foreground">
							<p className="text-lg">Select or create a session</p>
							<p className="text-sm">
								Choose a session from the sidebar or create a new one
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
