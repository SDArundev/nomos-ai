import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/use-websocket";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
	const { connected } = useWebSocket();
	const hasEverConnectedRef = useRef(false);
	const wasConnectedRef = useRef(connected);

	useEffect(() => {
		if (connected) {
			if (hasEverConnectedRef.current && !wasConnectedRef.current) {
				toast.success("Reconnected to server", { id: "ws-status" });
			}
			hasEverConnectedRef.current = true;
		} else if (hasEverConnectedRef.current && wasConnectedRef.current) {
			toast.warning("Connection lost — reconnecting...", { id: "ws-status" });
		}
		wasConnectedRef.current = connected;
	}, [connected]);

	return (
		<button
			type="button"
			onClick={() => {
				if (!connected) {
					// Trigger reconnect by getting a fresh client
					window.location.reload();
				}
			}}
			className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
			title={connected ? "Connected" : "Disconnected — click to reconnect"}
		>
			<span
				className={cn(
					"inline-block size-2 rounded-full",
					connected ? "bg-green-500" : "animate-pulse bg-red-500",
				)}
			/>
			<span className="text-muted-foreground">
				{connected ? "Connected" : "Disconnected"}
			</span>
		</button>
	);
}
