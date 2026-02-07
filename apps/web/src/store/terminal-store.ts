import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface TerminalTab {
	id: string;
	cwd: string;
	title: string;
}

interface TerminalStore {
	tabs: TerminalTab[];
	activeTabId: string | null;

	addTab: (tab: TerminalTab) => void;
	removeTab: (id: string) => void;
	setActiveTab: (id: string | null) => void;
	setTabs: (tabs: TerminalTab[]) => void;
}

export const useTerminalStore = create<TerminalStore>()(
	devtools(
		(set) => ({
			tabs: [],
			activeTabId: null,

			addTab: (tab) =>
				set(
					(state) => ({
						tabs: [...state.tabs, tab],
						activeTabId: tab.id,
					}),
					undefined,
					"terminal/addTab",
				),
			removeTab: (id) =>
				set(
					(state) => {
						const filtered = state.tabs.filter((t) => t.id !== id);
						return {
							tabs: filtered,
							activeTabId:
								state.activeTabId === id
									? (filtered[filtered.length - 1]?.id ?? null)
									: state.activeTabId,
						};
					},
					undefined,
					"terminal/removeTab",
				),
			setActiveTab: (id) =>
				set({ activeTabId: id }, undefined, "terminal/setActiveTab"),
			setTabs: (tabs) =>
				set({ tabs }, undefined, "terminal/setTabs"),
		}),
		{ name: "TerminalStore" },
	),
);
