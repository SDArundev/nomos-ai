import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createFeaturesSlice, type FeaturesSlice } from "./slices/features";
import { createProjectsSlice, type ProjectsSlice } from "./slices/projects";
import { createSessionsSlice, type SessionsSlice } from "./slices/sessions";
import { createUISlice, type UISlice } from "./slices/ui";

export type AppStore = ProjectsSlice & FeaturesSlice & SessionsSlice & UISlice;

export const useAppStore = create<AppStore>()(
	devtools(
		persist(
			(...a) => ({
				...createProjectsSlice(...a),
				...createFeaturesSlice(...a),
				...createSessionsSlice(...a),
				...createUISlice(...a),
			}),
			{
				name: "nomos-store",
				partialize: (state) => ({
					selectedProjectId: state.selectedProjectId,
				}),
			},
		),
		{ name: "NomosStore" },
	),
);
