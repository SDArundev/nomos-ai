import { useCallback, useEffect, useRef, useState } from "react";
import { getEventsClient } from "@/lib/websocket";

interface EventStreamMessage {
	type: string;
	payload: unknown;
	timestamp: number;
}

export function useEventStream(eventTypes?: string[]) {
	const [events, setEvents] = useState<EventStreamMessage[]>([]);
	const [connected, setConnected] = useState(false);
	const maxEvents = useRef(200);

	useEffect(() => {
		const client = getEventsClient();

		if (!client.connected) {
			client.connect();
		}

		const interval = setInterval(() => {
			setConnected(client.connected);
		}, 1000);

		const unsubscribe = client.subscribe((data) => {
			if (!eventTypes || eventTypes.includes(data.type)) {
				setEvents((prev) => {
					const next = [
						...prev,
						{ ...data, timestamp: Date.now() },
					];
					if (next.length > maxEvents.current) {
						return next.slice(-maxEvents.current);
					}
					return next;
				});
			}
		});

		return () => {
			clearInterval(interval);
			unsubscribe();
		};
	}, [eventTypes]);

	const clearEvents = useCallback(() => setEvents([]), []);

	return { events, connected, clearEvents };
}
