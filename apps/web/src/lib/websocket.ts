import { env } from "@nomos-ai/env/web";

type EventHandler = (data: { type: string; payload: unknown }) => void;

interface WebSocketClientOptions {
	onMessage?: EventHandler;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (error: Event) => void;
}

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const BACKOFF_MULTIPLIER = 2;

export class WebSocketClient {
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = INITIAL_RECONNECT_DELAY;
	private shouldReconnect = true;
	private handlers: EventHandler[] = [];
	private connectionHandlers: Array<(connected: boolean) => void> = [];
	private options: WebSocketClientOptions;

	constructor(
		private channel: string,
		options: WebSocketClientOptions = {},
	) {
		this.options = options;
		if (options.onMessage) {
			this.handlers.push(options.onMessage);
		}
	}

	connect(): void {
		this.shouldReconnect = true;
		this.createConnection();
	}

	disconnect(): void {
		this.shouldReconnect = false;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	subscribe(handler: EventHandler): () => void {
		this.handlers.push(handler);
		return () => {
			this.handlers = this.handlers.filter((h) => h !== handler);
		};
	}

	onConnectionChange(handler: (connected: boolean) => void): () => void {
		this.connectionHandlers.push(handler);
		return () => {
			this.connectionHandlers = this.connectionHandlers.filter(
				(h) => h !== handler,
			);
		};
	}

	private notifyConnectionChange(connected: boolean): void {
		for (const handler of this.connectionHandlers) {
			handler(connected);
		}
	}

	send(data: unknown): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
		}
	}

	get connected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	private createConnection(): void {
		if (this.ws) {
			this.ws.close();
		}

		// In development, use same-origin WebSocket (Vite proxies /ws/* to backend)
		// In production, connect directly to the server URL
		const isDev = import.meta.env.DEV;
		const wsUrl = isDev
			? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
			: env.VITE_SERVER_URL.replace(/^http/, "ws");
		this.ws = new WebSocket(`${wsUrl}/ws/${this.channel}`);

		this.ws.onopen = () => {
			this.reconnectDelay = INITIAL_RECONNECT_DELAY;
			this.options.onOpen?.();
			this.notifyConnectionChange(true);
		};

		this.ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data as string);
				for (const handler of this.handlers) {
					handler(data);
				}
			} catch {
				// Ignore malformed messages
			}
		};

		this.ws.onclose = () => {
			this.options.onClose?.();
			this.notifyConnectionChange(false);
			this.scheduleReconnect();
		};

		this.ws.onerror = (error) => {
			this.options.onError?.(error);
		};
	}

	private scheduleReconnect(): void {
		if (!this.shouldReconnect) return;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectDelay = Math.min(
				this.reconnectDelay * BACKOFF_MULTIPLIER,
				MAX_RECONNECT_DELAY,
			);
			this.createConnection();
		}, this.reconnectDelay);
	}
}

let eventsClient: WebSocketClient | null = null;

export function getEventsClient(): WebSocketClient {
	if (!eventsClient) {
		eventsClient = new WebSocketClient("events");
	}
	return eventsClient;
}

export function createTerminalClient(sessionId: string): WebSocketClient {
	return new WebSocketClient(`terminal?sessionId=${sessionId}`);
}
