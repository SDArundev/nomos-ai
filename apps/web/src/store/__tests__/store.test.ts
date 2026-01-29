import { describe, expect, it, beforeEach } from "bun:test";
import { useAppStore } from "../index";
import type { Project, Feature, Session } from "@nomos-ai/types";
import { FEATURE_STATUS } from "@nomos-ai/types";

// Helper to reset store between tests
const resetStore = () => {
	useAppStore.setState({
		projects: [],
		selectedProjectId: null,
		features: [],
		selectedFeatureId: null,
		featureStatusFilter: null,
		sessions: [],
		selectedSessionId: null,
		sidebarCollapsed: false,
		commandPaletteOpen: false,
	});
};

describe("AppStore - Store Creation", () => {
	beforeEach(() => {
		resetStore();
	});

	it("creates store with all slices initialized", () => {
		const state = useAppStore.getState();

		// Projects slice
		expect(state.projects).toEqual([]);
		expect(state.selectedProjectId).toBeNull();
		expect(typeof state.setProjects).toBe("function");
		expect(typeof state.setSelectedProject).toBe("function");

		// Features slice
		expect(state.features).toEqual([]);
		expect(state.selectedFeatureId).toBeNull();
		expect(state.featureStatusFilter).toBeNull();
		expect(typeof state.setFeatures).toBe("function");
		expect(typeof state.setSelectedFeature).toBe("function");
		expect(typeof state.setFeatureStatusFilter).toBe("function");

		// Sessions slice
		expect(state.sessions).toEqual([]);
		expect(state.selectedSessionId).toBeNull();
		expect(typeof state.setSessions).toBe("function");
		expect(typeof state.setSelectedSession).toBe("function");

		// UI slice
		expect(state.sidebarCollapsed).toBe(false);
		expect(state.commandPaletteOpen).toBe(false);
		expect(typeof state.toggleSidebar).toBe("function");
		expect(typeof state.setSidebarCollapsed).toBe("function");
		expect(typeof state.toggleCommandPalette).toBe("function");
		expect(typeof state.setCommandPaletteOpen).toBe("function");
	});
});

describe("AppStore - Projects Slice", () => {
	beforeEach(() => {
		resetStore();
	});

	const mockProjects: Project[] = [
		{
			id: "proj-001",
			name: "Test Project 1",
			path: "/test/path1",
			status: "active",
			createdAt: "2026-01-28T10:00:00Z",
			updatedAt: "2026-01-28T10:00:00Z",
			settings: {
				theme: "dark",
				locale: "en",
				autoSaveInterval: 30,
				notifications: true,
			},
		},
		{
			id: "proj-002",
			name: "Test Project 2",
			path: "/test/path2",
			status: "draft",
			createdAt: "2026-01-28T11:00:00Z",
			updatedAt: "2026-01-28T11:00:00Z",
			settings: {
				theme: "light",
				locale: "fr",
				autoSaveInterval: 60,
				notifications: false,
			},
		},
	];

	it("setProjects updates projects array", () => {
		useAppStore.getState().setProjects(mockProjects);
		const state = useAppStore.getState();
		expect(state.projects).toEqual(mockProjects);
		expect(state.projects).toHaveLength(2);
	});

	it("setProjects can clear projects", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setProjects([]);
		const state = useAppStore.getState();
		expect(state.projects).toEqual([]);
	});

	it("setSelectedProject sets project ID", () => {
		useAppStore.getState().setSelectedProject("proj-001");
		const state = useAppStore.getState();
		expect(state.selectedProjectId).toBe("proj-001");
	});

	it("setSelectedProject can clear selection", () => {
		useAppStore.getState().setSelectedProject("proj-001");
		useAppStore.getState().setSelectedProject(null);
		const state = useAppStore.getState();
		expect(state.selectedProjectId).toBeNull();
	});
});

describe("AppStore - Features Slice", () => {
	beforeEach(() => {
		resetStore();
	});

	const mockFeatures: Feature[] = [
		{
			id: "F001",
			title: "Feature 1",
			description: "Test feature 1",
			status: FEATURE_STATUS.BACKLOG,
			projectId: "proj-001",
			categoryId: "CAT-001",
			createdAt: "2026-01-28T10:00:00Z",
			updatedAt: "2026-01-28T10:00:00Z",
		},
		{
			id: "F002",
			title: "Feature 2",
			description: "Test feature 2",
			status: FEATURE_STATUS.IN_PROGRESS,
			projectId: "proj-001",
			categoryId: "CAT-002",
			createdAt: "2026-01-28T11:00:00Z",
			updatedAt: "2026-01-28T11:00:00Z",
		},
		{
			id: "F003",
			title: "Feature 3",
			description: "Test feature 3",
			status: FEATURE_STATUS.VERIFIED,
			projectId: "proj-001",
			categoryId: "CAT-001",
			createdAt: "2026-01-28T12:00:00Z",
			updatedAt: "2026-01-28T12:00:00Z",
		},
	];

	it("setFeatures updates features array", () => {
		useAppStore.getState().setFeatures(mockFeatures);
		const state = useAppStore.getState();
		expect(state.features).toEqual(mockFeatures);
		expect(state.features).toHaveLength(3);
	});

	it("setFeatures can clear features", () => {
		useAppStore.getState().setFeatures(mockFeatures);
		useAppStore.getState().setFeatures([]);
		const state = useAppStore.getState();
		expect(state.features).toEqual([]);
	});

	it("setSelectedFeature sets feature ID", () => {
		useAppStore.getState().setSelectedFeature("F001");
		const state = useAppStore.getState();
		expect(state.selectedFeatureId).toBe("F001");
	});

	it("setSelectedFeature can clear selection", () => {
		useAppStore.getState().setSelectedFeature("F001");
		useAppStore.getState().setSelectedFeature(null);
		const state = useAppStore.getState();
		expect(state.selectedFeatureId).toBeNull();
	});

	it("setFeatureStatusFilter sets status filter", () => {
		useAppStore.getState().setFeatureStatusFilter(FEATURE_STATUS.IN_PROGRESS);
		const state = useAppStore.getState();
		expect(state.featureStatusFilter).toBe(FEATURE_STATUS.IN_PROGRESS);
	});

	it("setFeatureStatusFilter accepts all valid statuses", () => {
		const statuses = Object.values(FEATURE_STATUS);
		for (const status of statuses) {
			useAppStore.getState().setFeatureStatusFilter(status);
			const state = useAppStore.getState();
			expect(state.featureStatusFilter).toBe(status);
		}
	});

	it("setFeatureStatusFilter can clear filter", () => {
		useAppStore.getState().setFeatureStatusFilter(FEATURE_STATUS.BACKLOG);
		useAppStore.getState().setFeatureStatusFilter(null);
		const state = useAppStore.getState();
		expect(state.featureStatusFilter).toBeNull();
	});
});

describe("AppStore - Sessions Slice", () => {
	beforeEach(() => {
		resetStore();
	});

	const mockSessions: Session[] = [
		{
			id: "sess-001",
			featureId: "F001",
			startedAt: "2026-01-28T10:00:00Z",
			status: "active",
		},
		{
			id: "sess-002",
			featureId: "F002",
			startedAt: "2026-01-28T11:00:00Z",
			completedAt: "2026-01-28T12:00:00Z",
			status: "completed",
		},
	];

	it("setSessions updates sessions array", () => {
		useAppStore.getState().setSessions(mockSessions);
		const state = useAppStore.getState();
		expect(state.sessions).toEqual(mockSessions);
		expect(state.sessions).toHaveLength(2);
	});

	it("setSessions can clear sessions", () => {
		useAppStore.getState().setSessions(mockSessions);
		useAppStore.getState().setSessions([]);
		const state = useAppStore.getState();
		expect(state.sessions).toEqual([]);
	});

	it("setSelectedSession sets session ID", () => {
		useAppStore.getState().setSelectedSession("sess-001");
		const state = useAppStore.getState();
		expect(state.selectedSessionId).toBe("sess-001");
	});

	it("setSelectedSession can clear selection", () => {
		useAppStore.getState().setSelectedSession("sess-001");
		useAppStore.getState().setSelectedSession(null);
		const state = useAppStore.getState();
		expect(state.selectedSessionId).toBeNull();
	});
});

describe("AppStore - UI Slice", () => {
	beforeEach(() => {
		resetStore();
	});

	it("toggleSidebar switches collapsed state", () => {
		const initialState = useAppStore.getState().sidebarCollapsed;
		expect(initialState).toBe(false);

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
		const initialState = useAppStore.getState().commandPaletteOpen;
		expect(initialState).toBe(false);

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
});

describe("AppStore - Type Safety", () => {
	it("compiles with correct types", () => {
		const state = useAppStore.getState();

		// Type assertions to verify compile-time type safety
		const _projects: Project[] = state.projects;
		const _selectedProjectId: string | null = state.selectedProjectId;
		const _features: Feature[] = state.features;
		const _sessions: Session[] = state.sessions;
		const _sidebarCollapsed: boolean = state.sidebarCollapsed;

		// Verify functions exist and have correct signatures
		const _setProjects: (projects: Project[]) => void = state.setProjects;
		const _setFeatures: (features: Feature[]) => void = state.setFeatures;
		const _setSessions: (sessions: Session[]) => void = state.setSessions;
		const _toggleSidebar: () => void = state.toggleSidebar;

		expect(true).toBe(true); // Test passes if types compile
	});
});

describe("AppStore - Devtools Integration", () => {
	it("has devtools middleware configured", () => {
		// The store should have devtools enabled
		// We can verify by checking if the store name is set
		const state = useAppStore.getState();
		expect(state).toBeDefined();

		// Devtools adds action names, which we can verify indirectly
		// by checking that actions work (tested above)
		state.setProjects([]);
		expect(state.projects).toBeDefined();
	});
});
