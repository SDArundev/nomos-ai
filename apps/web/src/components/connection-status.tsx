import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";

export function ConnectionStatus() {
	const { connected } = useWebSocket();

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
					connected ? "bg-green-500" : "bg-red-500 animate-pulse",
				)}
			/>
			<span className="text-muted-foreground">
				{connected ? "Connected" : "Disconnected"}
			</span>
		</button>
	);
}
