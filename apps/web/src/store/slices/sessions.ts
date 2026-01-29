import type { Session } from "@nomos-ai/types";
import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface SessionsSlice {
	sessions: Session[];
	selectedSessionId: string | null;
	setSessions: (sessions: Session[]) => void;
	setSelectedSession: (id: string | null) => void;
}

export const createSessionsSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	SessionsSlice
> = (set) => ({
	sessions: [],
	selectedSessionId: null,
	setSessions: (sessions) =>
		set({ sessions }, undefined, "sessions/setSessions"),
	setSelectedSession: (id) =>
		set({ selectedSessionId: id }, undefined, "sessions/setSelectedSession"),
});
