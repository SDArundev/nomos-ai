import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface UISlice {
	sidebarCollapsed: boolean;
	commandPaletteOpen: boolean;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	toggleCommandPalette: () => void;
	setCommandPaletteOpen: (open: boolean) => void;
}

export const createUISlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	UISlice
> = (set) => ({
	sidebarCollapsed: false,
	commandPaletteOpen: false,
	toggleSidebar: () =>
		set(
			(state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
			undefined,
			"ui/toggleSidebar",
		),
	setSidebarCollapsed: (collapsed) =>
		set({ sidebarCollapsed: collapsed }, undefined, "ui/setSidebarCollapsed"),
	toggleCommandPalette: () =>
		set(
			(state) => ({ commandPaletteOpen: !state.commandPaletteOpen }),
			undefined,
			"ui/toggleCommandPalette",
		),
	setCommandPaletteOpen: (open) =>
		set({ commandPaletteOpen: open }, undefined, "ui/setCommandPaletteOpen"),
});
