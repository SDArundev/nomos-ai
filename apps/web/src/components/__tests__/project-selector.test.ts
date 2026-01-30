import { beforeEach, describe, expect, it } from "bun:test";
import type { Project } from "@nomos-ai/types";
import { ProjectIdSchema } from "@nomos-ai/types";
import { useAppStore } from "@/store";

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

const resetStore = () => {
	useAppStore.setState({
		projects: [],
		selectedProjectId: null,
	});
};

describe("ProjectSelector - Store Integration", () => {
	beforeEach(resetStore);

	it("starts with no projects", () => {
		expect(useAppStore.getState().projects).toEqual([]);
	});

	it("starts with no selected project", () => {
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});

	it("can set projects list", () => {
		useAppStore.getState().setProjects(mockProjects);
		expect(useAppStore.getState().projects).toHaveLength(2);
	});

	it("can select a project by ID", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setSelectedProject("P001");

		expect(useAppStore.getState().selectedProjectId).toBe("P001");
	});

	it("can clear selected project", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");

		useAppStore.getState().setSelectedProject(null);
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});
});

describe("ProjectSelector - Project Selection Logic", () => {
	beforeEach(resetStore);

	it("finds selected project when ID matches", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setSelectedProject("P001");

		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		expect(selectedProject).toBeDefined();
		expect(selectedProject?.name).toBe("Test Project 1");
		expect(selectedProject?.path).toBe("/test/path1");
	});

	it("returns undefined when selected project ID does not match any project", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setSelectedProject("P999");

		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		expect(selectedProject).toBeUndefined();
	});

	it("returns undefined when no project is selected", () => {
		useAppStore.getState().setProjects(mockProjects);

		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		expect(selectedProject).toBeUndefined();
	});

	it("handles selecting different projects", () => {
		useAppStore.getState().setProjects(mockProjects);

		// Select first project
		useAppStore.getState().setSelectedProject("P001");
		let state = useAppStore.getState();
		let selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);
		expect(selectedProject?.name).toBe("Test Project 1");

		// Select second project
		useAppStore.getState().setSelectedProject("P002");
		state = useAppStore.getState();
		selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);
		expect(selectedProject?.name).toBe("Test Project 2");
	});
});

describe("ProjectSelector - Empty State", () => {
	beforeEach(resetStore);

	it("handles empty projects list", () => {
		expect(useAppStore.getState().projects).toHaveLength(0);
	});

	it("returns undefined when searching in empty projects list", () => {
		useAppStore.getState().setSelectedProject("P001");

		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		expect(selectedProject).toBeUndefined();
	});

	it("can clear projects list", () => {
		useAppStore.getState().setProjects(mockProjects);
		expect(useAppStore.getState().projects).toHaveLength(2);

		useAppStore.getState().setProjects([]);
		expect(useAppStore.getState().projects).toHaveLength(0);
	});
});

describe("ProjectSelector - Display Logic", () => {
	beforeEach(resetStore);

	it("should display 'Select Project' when no project selected", () => {
		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		const displayText = selectedProject
			? selectedProject.name
			: "Select Project";
		expect(displayText).toBe("Select Project");
	});

	it("should display project name when project is selected", () => {
		useAppStore.getState().setProjects(mockProjects);
		useAppStore.getState().setSelectedProject("P001");

		const state = useAppStore.getState();
		const selectedProject = state.projects.find(
			(p) => p.id === state.selectedProjectId,
		);

		const displayText = selectedProject
			? selectedProject.name
			: "Select Project";
		expect(displayText).toBe("Test Project 1");
	});
});
