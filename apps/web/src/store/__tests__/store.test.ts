import { beforeEach, describe, expect, it } from "bun:test";
import {
	FEATURE_STATUS,
	type FeatureStatus,
} from "@nomos-ai/types";
import { useAppStore } from "../index";

const resetStore = () => {
	useAppStore.setState({
		selectedProjectId: null,
		selectedFeatureId: null,
		featureStatusFilter: null,
		selectedSessionId: null,
		sidebarCollapsed: false,
		commandPaletteOpen: false,
		detailPanelOpen: false,
		collapsedColumns: {},
	});
};

describe("AppStore - Store Creation", () => {
	beforeEach(resetStore);

	it("creates store with all slices initialized", () => {
		const state = useAppStore.getState();
		expect(state.selectedProjectId).toBeNull();
		expect(state.selectedFeatureId).toBeNull();
		expect(state.featureStatusFilter).toBeNull();
		expect(state.selectedSessionId).toBeNull();
		expect(state.sidebarCollapsed).toBe(false);
		expect(state.commandPaletteOpen).toBe(false);
		expect(state.detailPanelOpen).toBe(false);
	});
});

describe("AppStore - Projects Slice", () => {
	beforeEach(resetStore);

	it("setSelectedProject sets and clears project ID", () => {
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");
		useAppStore.getState().setSelectedProject(null);
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});
});

describe("AppStore - Features Slice", () => {
	beforeEach(resetStore);

	it("setSelectedFeature sets and clears feature ID", () => {
		useAppStore.getState().setSelectedFeature("F001");
		expect(useAppStore.getState().selectedFeatureId).toBe("F001");
		useAppStore.getState().setSelectedFeature(null);
		expect(useAppStore.getState().selectedFeatureId).toBeNull();
	});

	it("setFeatureStatusFilter sets and clears status filter", () => {
		useAppStore.getState().setFeatureStatusFilter(FEATURE_STATUS.IN_PROGRESS);
		expect(useAppStore.getState().featureStatusFilter).toBe(
			FEATURE_STATUS.IN_PROGRESS,
		);
		useAppStore.getState().setFeatureStatusFilter(null);
		expect(useAppStore.getState().featureStatusFilter).toBeNull();
	});

	it("setFeatureStatusFilter accepts all valid statuses", () => {
		for (const status of Object.values(FEATURE_STATUS)) {
			useAppStore.getState().setFeatureStatusFilter(status as FeatureStatus);
			expect(useAppStore.getState().featureStatusFilter).toBe(status);
		}
	});
});

describe("AppStore - Sessions Slice", () => {
	beforeEach(resetStore);

	it("setSelectedSession sets and clears session ID", () => {
		useAppStore.getState().setSelectedSession("S001");
		expect(useAppStore.getState().selectedSessionId).toBe("S001");
		useAppStore.getState().setSelectedSession(null);
		expect(useAppStore.getState().selectedSessionId).toBeNull();
	});
});

describe("AppStore - UI Slice", () => {
	beforeEach(resetStore);

	it("toggleSidebar switches collapsed state", () => {
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
		useAppStore.getState().toggleSidebar();
		expect(useAppStore.getState().sidebarCollapsed).toBe(true);
		useAppStore.getState().toggleSidebar();
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
	});

	it("setSidebarCollapsed sets collapsed state directly", () => {
		useAppStore.getState().setSidebarCollapsed(true);
		expect(useAppStore.getState().sidebarCollapsed).toBe(true);
		useAppStore.getState().setSidebarCollapsed(false);
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
	});

	it("toggleCommandPalette switches open state", () => {
		expect(useAppStore.getState().commandPaletteOpen).toBe(false);
		useAppStore.getState().toggleCommandPalette();
		expect(useAppStore.getState().commandPaletteOpen).toBe(true);
		useAppStore.getState().toggleCommandPalette();
		expect(useAppStore.getState().commandPaletteOpen).toBe(false);
	});

	it("setCommandPaletteOpen sets open state directly", () => {
		useAppStore.getState().setCommandPaletteOpen(true);
		expect(useAppStore.getState().commandPaletteOpen).toBe(true);
		useAppStore.getState().setCommandPaletteOpen(false);
		expect(useAppStore.getState().commandPaletteOpen).toBe(false);
	});

	it("toggleDetailPanel switches open state", () => {
		expect(useAppStore.getState().detailPanelOpen).toBe(false);
		useAppStore.getState().toggleDetailPanel();
		expect(useAppStore.getState().detailPanelOpen).toBe(true);
	});

	it("toggleColumnCollapsed switches column state", () => {
		expect(useAppStore.getState().collapsedColumns).toEqual({});
		useAppStore.getState().toggleColumnCollapsed("backlog");
		expect(useAppStore.getState().collapsedColumns.backlog).toBe(true);
		useAppStore.getState().toggleColumnCollapsed("backlog");
		expect(useAppStore.getState().collapsedColumns.backlog).toBe(false);
	});
});

describe("AppStore - Devtools Integration", () => {
	it("store is functional with devtools middleware", () => {
		const state = useAppStore.getState();
		expect(state).toBeDefined();
		expect(state.setSelectedProject).toBeDefined();
	});
});
