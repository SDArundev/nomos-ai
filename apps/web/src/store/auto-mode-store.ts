import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AutoModeStatus {
	isRunning: boolean;
	runningFeatures: string[];
	consecutiveFailures: number;
}

interface AutoModeEvent {
	type: string;
	payload: unknown;
	timestamp: number;
}

interface AutoModeStore {
	status: AutoModeStatus;
	events: AutoModeEvent[];

	setStatus: (status: AutoModeStatus) => void;
	addEvent: (event: AutoModeEvent) => void;
	clearEvents: () => void;
}

export const useAutoModeStore = create<AutoModeStore>()(
	devtools(
		(set) => ({
			status: {
				isRunning: false,
				runningFeatures: [],
				consecutiveFailures: 0,
			},
			events: [],

			setStatus: (status) =>
				set({ status }, undefined, "autoMode/setStatus"),
			addEvent: (event) =>
				set(
					(state) => ({
						events: [...state.events.slice(-99), event],
					}),
					undefined,
					"autoMode/addEvent",
				),
			clearEvents: () =>
				set({ events: [] }, undefined, "autoMode/clearEvents"),
		}),
		{ name: "AutoModeStore" },
	),
);
