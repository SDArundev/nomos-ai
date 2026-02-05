import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface UISlice {
	sidebarCollapsed: boolean;
	commandPaletteOpen: boolean;
	detailPanelOpen: boolean;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	toggleCommandPalette: () => void;
	setCommandPaletteOpen: (open: boolean) => void;
	toggleDetailPanel: () => void;
	setDetailPanelOpen: (open: boolean) => void;
}

export const createUISlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	UISlice
> = (set) => ({
	sidebarCollapsed: false,
	commandPaletteOpen: false,
	detailPanelOpen: false,
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
	toggleDetailPanel: () =>
		set(
			(state) => ({ detailPanelOpen: !state.detailPanelOpen }),
			undefined,
			"ui/toggleDetailPanel",
		),
	setDetailPanelOpen: (open) =>
		set({ detailPanelOpen: open }, undefined, "ui/setDetailPanelOpen"),
});
