import { beforeEach, describe, expect, it } from "bun:test";
import {
	FEATURE_STATUS,
	FeatureIdSchema,
	type FeatureStatus,
	ProjectIdSchema,
	SESSION_STATUS,
	SessionIdSchema,
} from "@nomos-ai/types";
import type { Feature, Project, Session } from "@nomos-ai/types";
import { useAppStore } from "../index";
import {
	selectActiveSessions,
	selectFeaturesByStatus,
	selectProjectById,
} from "../selectors";

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

const mockProjects: Project[] = [
	{
		id: ProjectIdSchema.parse("P001"),
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
		id: ProjectIdSchema.parse("P002"),
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

const mockFeatures: Feature[] = [
	{
		id: FeatureIdSchema.parse("F001"),
		title: "Feature One Title",
		category: "CAT-TST",
		description: "A test feature for unit testing purposes",
		phase: "phase-1",
		acceptanceCriteria: ["AC1"],
		status: FEATURE_STATUS.BACKLOG,
		passes: false,
	},
	{
		id: FeatureIdSchema.parse("F002"),
		title: "Feature Two Title",
		category: "CAT-TST",
		description: "Another test feature for testing",
		phase: "phase-1",
		acceptanceCriteria: ["AC1"],
		status: FEATURE_STATUS.IN_PROGRESS,
		passes: false,
	},
	{
		id: FeatureIdSchema.parse("F003"),
		title: "Feature Three Title",
		category: "CAT-TST",
		description: "A verified test feature for testing",
		phase: "phase-1",
		acceptanceCriteria: ["AC1"],
		status: FEATURE_STATUS.VERIFIED,
		passes: true,
	},
];

const mockSessions: Session[] = [
	{
		id: SessionIdSchema.parse("S001"),
		featureId: FeatureIdSchema.parse("F001"),
		startedAt: "2026-01-28T10:00:00Z",
		status: SESSION_STATUS.RUNNING,
	},
	{
		id: SessionIdSchema.parse("S002"),
		featureId: FeatureIdSchema.parse("F002"),
		startedAt: "2026-01-28T11:00:00Z",
		completedAt: "2026-01-28T12:00:00Z",
		status: SESSION_STATUS.COMPLETED,
	},
];

describe("AppStore - Store Creation", () => {
	beforeEach(resetStore);

	it("creates store with all slices initialized", () => {
		const state = useAppStore.getState();
		expect(state.projects).toEqual([]);
		expect(state.selectedProjectId).toBeNull();
		expect(state.features).toEqual([]);
		expect(state.selectedFeatureId).toBeNull();
		expect(state.featureStatusFilter).toBeNull();
		expect(state.sessions).toEqual([]);
		expect(state.selectedSessionId).toBeNull();
		expect(state.sidebarCollapsed).toBe(false);
		expect(state.commandPaletteOpen).toBe(false);
	});
});

describe("AppStore - Projects Slice", () => {
	beforeEach(resetStore);

	it("setProjects updates projects array", () => {
		useAppStore.getState().setProjects(mockProjects);
		expect(useAppStore.getState().projects).toHaveLength(2);
	});

	it("setProjects can clear projects", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setProjects([]);
		expect(useAppStore.getState().projects).toEqual([]);
	});

	it("setSelectedProject sets and clears project ID", () => {
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");
		useAppStore.getState().setSelectedProject(null);
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});
});

describe("AppStore - Features Slice", () => {
	beforeEach(resetStore);

	it("setFeatures updates features array", () => {
		useAppStore.getState().setFeatures(mockFeatures);
		expect(useAppStore.getState().features).toHaveLength(3);
	});

	it("setFeatures can clear features", () => {
		useAppStore.getState().setFeatures(mockFeatures);
		useAppStore.getState().setFeatures([]);
		expect(useAppStore.getState().features).toEqual([]);
	});

	it("setSelectedFeature sets and clears feature ID", () => {
		useAppStore.getState().setSelectedFeature("F001");
		expect(useAppStore.getState().selectedFeatureId).toBe("F001");
		useAppStore.getState().setSelectedFeature(null);
		expect(useAppStore.getState().selectedFeatureId).toBeNull();
	});

	it("setFeatureStatusFilter sets and clears status filter", () => {
		useAppStore
			.getState()
			.setFeatureStatusFilter(FEATURE_STATUS.IN_PROGRESS);
		expect(useAppStore.getState().featureStatusFilter).toBe(
			FEATURE_STATUS.IN_PROGRESS,
		);
		useAppStore.getState().setFeatureStatusFilter(null);
		expect(useAppStore.getState().featureStatusFilter).toBeNull();
	});

	it("setFeatureStatusFilter accepts all valid statuses", () => {
		for (const status of Object.values(FEATURE_STATUS)) {
			useAppStore
				.getState()
				.setFeatureStatusFilter(status as FeatureStatus);
			expect(useAppStore.getState().featureStatusFilter).toBe(status);
		}
	});
});

describe("AppStore - Sessions Slice", () => {
	beforeEach(resetStore);

	it("setSessions updates sessions array", () => {
		useAppStore.getState().setSessions(mockSessions);
		expect(useAppStore.getState().sessions).toHaveLength(2);
	});

	it("setSessions can clear sessions", () => {
		useAppStore.getState().setSessions(mockSessions);
		useAppStore.getState().setSessions([]);
		expect(useAppStore.getState().sessions).toEqual([]);
	});

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
});

describe("AppStore - Selectors", () => {
	beforeEach(resetStore);

	it("selectProjectById finds project by ID", () => {
		useAppStore.getState().setProjects(mockProjects);
		const state = useAppStore.getState();
		const project = selectProjectById("P001")(state);
		expect(project?.name).toBe("Test Project 1");
	});

	it("selectProjectById returns undefined for missing ID", () => {
		useAppStore.getState().setProjects(mockProjects);
		const state = useAppStore.getState();
		const project = selectProjectById("MISSING")(state);
		expect(project).toBeUndefined();
	});

	it("selectFeaturesByStatus filters by status", () => {
		useAppStore.getState().setFeatures(mockFeatures);
		const state = useAppStore.getState();
		const backlog = selectFeaturesByStatus(FEATURE_STATUS.BACKLOG)(state);
		expect(backlog).toHaveLength(1);
		expect(backlog[0].id).toBe("F001");
	});

	it("selectActiveSessions returns pending/running sessions", () => {
		useAppStore.getState().setSessions(mockSessions);
		const state = useAppStore.getState();
		const active = selectActiveSessions(state);
		expect(active).toHaveLength(1);
		expect(active[0].status).toBe(SESSION_STATUS.RUNNING);
	});
});

describe("AppStore - Devtools Integration", () => {
	it("store is functional with devtools middleware", () => {
		const state = useAppStore.getState();
		expect(state).toBeDefined();
		state.setProjects([]);
		expect(state.projects).toBeDefined();
	});
});
