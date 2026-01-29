import type { Project } from "@nomos-ai/types";
import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface ProjectsSlice {
	projects: Project[];
	selectedProjectId: string | null;
	setProjects: (projects: Project[]) => void;
	setSelectedProject: (id: string | null) => void;
}

export const createProjectsSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	ProjectsSlice
> = (set) => ({
	projects: [],
	selectedProjectId: null,
	setProjects: (projects) =>
		set({ projects }, undefined, "projects/setProjects"),
	setSelectedProject: (id) =>
		set({ selectedProjectId: id }, undefined, "projects/setSelectedProject"),
});
