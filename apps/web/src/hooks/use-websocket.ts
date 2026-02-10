import { useEffect, useRef, useState } from "react";
import { getEventsClient, type WebSocketClient } from "@/lib/websocket";

export function useWebSocket() {
	const clientRef = useRef<WebSocketClient>(getEventsClient());
	const [connected, setConnected] = useState(() => clientRef.current.connected);

	useEffect(() => {
		const client = clientRef.current;

		const unsubscribe = client.onConnectionChange((isConnected) => {
			setConnected(isConnected);
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
