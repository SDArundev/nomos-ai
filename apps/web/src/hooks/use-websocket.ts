import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getEventsClient, WebSocketClient } from "@/lib/websocket";

export function useWebSocket() {
	const [connected, setConnected] = useState(false);
	const clientRef = useRef<WebSocketClient | null>(null);
	const wasConnectedRef = useRef(false);

	useEffect(() => {
		const client = getEventsClient();
		clientRef.current = client;

		const unsubscribe = client.onConnectionChange((isConnected) => {
			setConnected(isConnected);

			if (isConnected && wasConnectedRef.current === false && wasConnectedRef.current !== undefined) {
				// Only show reconnected toast if we were previously disconnected (not first connect)
				if (wasConnectedRef.current === false && clientRef.current) {
					toast.success("Reconnected to server");
				}
			} else if (!isConnected && wasConnectedRef.current) {
				toast.warning("Connection lost — reconnecting...");
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
