import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface UISlice {
	sidebarCollapsed: boolean;
	commandPaletteOpen: boolean;
	detailPanelOpen: boolean;
	collapsedColumns: Record<string, boolean>;
	toggleSidebar: () => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	toggleCommandPalette: () => void;
	setCommandPaletteOpen: (open: boolean) => void;
	toggleDetailPanel: () => void;
	setDetailPanelOpen: (open: boolean) => void;
	toggleColumnCollapsed: (status: string) => void;
	setColumnCollapsed: (status: string, collapsed: boolean) => void;
}

export const createUISlice: StateCreator<
	AppStore,
	[["zustand/devtools", never], ["zustand/persist", unknown]],
	[],
	UISlice
> = (set) => ({
	sidebarCollapsed: false,
	commandPaletteOpen: false,
	detailPanelOpen: false,
	collapsedColumns: {},
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
	toggleColumnCollapsed: (status) =>
		set(
			(state) => ({
				collapsedColumns: {
					...state.collapsedColumns,
					[status]: !state.collapsedColumns[status],
				},
			}),
			undefined,
			"ui/toggleColumnCollapsed",
		),
	setColumnCollapsed: (status, collapsed) =>
		set(
			(state) => ({
				collapsedColumns: {
					...state.collapsedColumns,
					[status]: collapsed,
				},
			}),
			undefined,
			"ui/setColumnCollapsed",
		),
});
