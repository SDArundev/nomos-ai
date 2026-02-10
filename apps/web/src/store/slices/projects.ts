import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface ProjectsSlice {
	selectedProjectId: string | null;
	setSelectedProject: (id: string | null) => void;
}

export const createProjectsSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never], ["zustand/persist", unknown]],
	[],
	ProjectsSlice
> = (set) => ({
	selectedProjectId: null,
	setSelectedProject: (id) =>
		set({ selectedProjectId: id }, undefined, "projects/setSelectedProject"),
});
