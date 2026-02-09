import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface SessionsSlice {
	selectedSessionId: string | null;
	setSelectedSession: (id: string | null) => void;
}

export const createSessionsSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	SessionsSlice
> = (set) => ({
	selectedSessionId: null,
	setSelectedSession: (id) =>
		set({ selectedSessionId: id }, undefined, "sessions/setSelectedSession"),
});
