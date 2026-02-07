import { useEffect, useRef, useState } from "react";
import { getEventsClient, WebSocketClient } from "@/lib/websocket";

export function useWebSocket() {
	const [connected, setConnected] = useState(false);
	const clientRef = useRef<WebSocketClient | null>(null);

	useEffect(() => {
		const client = getEventsClient();
		clientRef.current = client;

		const unsubOpen = () => setConnected(true);
		const unsubClose = () => setConnected(false);

		// Create a new client with callbacks
		client.disconnect();
		Object.assign(client, {
			connect: client.connect.bind(client),
		});

		// Subscribe to connection state via a lightweight approach
		const originalConnect = client.connect.bind(client);
		const wrappedClient = getEventsClient();
		wrappedClient.connect();

		// Poll connection state
		const interval = setInterval(() => {
			setConnected(wrappedClient.connected);
		}, 1000);

		setConnected(wrappedClient.connected);

		return () => {
			clearInterval(interval);
		};
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
