import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_EVENT_TYPES } from "@nomos-ai/types";
import { getEventsClient, WebSocketClient } from "@/lib/websocket";

export function useWebSocket() {
	const [connected, setConnected] = useState(false);
	const clientRef = useRef<WebSocketClient | null>(null);
	const hasEverConnectedRef = useRef(false);
	const wasConnectedRef = useRef(false);

	useEffect(() => {
		const client = getEventsClient();
		clientRef.current = client;

		const unsubscribe = client.onConnectionChange((isConnected) => {
			setConnected(isConnected);

			if (isConnected) {
				// Send subscription on connect/reconnect
				client.sendSubscription(ALL_EVENT_TYPES);

				// Only show "Reconnected" if we previously had a connection that dropped
				if (hasEverConnectedRef.current && !wasConnectedRef.current) {
					toast.success("Reconnected to server", { id: "ws-status" });
				}
				hasEverConnectedRef.current = true;
			} else if (!isConnected && hasEverConnectedRef.current && wasConnectedRef.current) {
				// Only show "Connection lost" if we had a stable connection before
				toast.warning("Connection lost — reconnecting...", { id: "ws-status" });
			}
			wasConnectedRef.current = isConnected;
		});

		if (!client.connected) {
			client.connect();
		}
		setConnected(client.connected);

		return unsubscribe;
	}, []);

	return { connected, client: clientRef.current };
}

export function useEventSubscription(
	eventType: string | string[],
	handler: (payload: unknown) => void,
) {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const client = getEventsClient();
		const types = Array.isArray(eventType) ? eventType : [eventType];

		const unsubscribe = client.subscribe((data) => {
			if (types.includes(data.type)) {
				handlerRef.current(data.payload);
			}
		});

		return unsubscribe;
	}, [eventType]);
}
