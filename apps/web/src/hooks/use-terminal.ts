import { useCallback, useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";
import { createTerminalClient, type WebSocketClient } from "@/lib/websocket";

interface UseTerminalOptions {
	sessionId: string | null;
	onData?: (data: string) => void;
}

export function useTerminal({ sessionId, onData }: UseTerminalOptions) {
	const termRef = useRef<Terminal | null>(null);
	const wsRef = useRef<WebSocketClient | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const initTerminal = useCallback(
		async (container: HTMLDivElement) => {
			if (!sessionId) return;

			// Dynamic imports to code-split xterm
			const { Terminal } = await import("@xterm/xterm");
			const { FitAddon } = await import("@xterm/addon-fit");
			const { WebLinksAddon } = await import("@xterm/addon-web-links");

			const term = new Terminal({
				cursorBlink: true,
				fontSize: 14,
				fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
				theme: {
					background: "#1a1b26",
					foreground: "#c0caf5",
					cursor: "#c0caf5",
					selectionBackground: "#33467c",
				},
				allowProposedApi: true,
			});

			const fitAddon = new FitAddon();
			term.loadAddon(fitAddon);
			term.loadAddon(new WebLinksAddon());

			term.open(container);
			fitAddon.fit();

			containerRef.current = container;
			termRef.current = term;

			// Connect WebSocket for I/O
			const ws = createTerminalClient(sessionId);
			wsRef.current = ws;

			ws.subscribe((data) => {
				if (data.type === "terminal:output") {
					const payload = data.payload as { data: string };
					term.write(payload.data);
				}
			});

			ws.connect();

			// Forward terminal input to WebSocket
			term.onData((data) => {
				ws.send(data);
				onData?.(data);
			});

			// Handle resize
			const observer = new ResizeObserver(() => {
				fitAddon.fit();
			});
			observer.observe(container);

			return () => {
				observer.disconnect();
				term.dispose();
				ws.disconnect();
				termRef.current = null;
				wsRef.current = null;
			};
		},
		[sessionId, onData],
	);

	useEffect(() => {
		return () => {
			termRef.current?.dispose();
			wsRef.current?.disconnect();
		};
	}, []);

	const write = useCallback((data: string) => {
		termRef.current?.write(data);
	}, []);

	const focus = useCallback(() => {
		termRef.current?.focus();
	}, []);

	return { initTerminal, write, focus, termRef };
}
