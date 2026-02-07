import { useState } from "react";
import { useEventSubscription } from "./use-websocket";

interface AutoModeStatus {
	isRunning: boolean;
	activeFeatureCount: number;
	lastEvent: string | null;
}

export function useAutoModeStatus(): AutoModeStatus {
	const [status, setStatus] = useState<AutoModeStatus>({
		isRunning: false,
		activeFeatureCount: 0,
		lastEvent: null,
	});

	useEventSubscription(
		["auto-mode:start", "auto-mode:stop", "auto-mode:progress"],
		(payload) => {
			const data = payload as { type?: string; activeCount?: number };
			if (data.type === "start" || (data as { running?: boolean }).running) {
				setStatus((prev) => ({
					...prev,
					isRunning: true,
					activeFeatureCount: data.activeCount ?? prev.activeFeatureCount,
					lastEvent: "started",
				}));
			} else if (data.type === "stop") {
				setStatus({
					isRunning: false,
					activeFeatureCount: 0,
					lastEvent: "stopped",
				});
			} else {
				setStatus((prev) => ({
					...prev,
					activeFeatureCount: data.activeCount ?? prev.activeFeatureCount,
					lastEvent: "progress",
				}));
			}
		},
	);

	return status;
}
