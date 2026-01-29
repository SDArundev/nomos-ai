import { type FeatureStatus, SESSION_STATUS } from "@nomos-ai/types";
import type { AppStore } from "./index";

export const selectProjectById = (id: string) => (state: AppStore) =>
	state.projects.find((p) => p.id === id);

export const selectFeaturesByStatus =
	(status: FeatureStatus) => (state: AppStore) =>
		state.features.filter((f) => f.status === status);

export const selectActiveSessions = (state: AppStore) =>
	state.sessions.filter(
		(s) =>
			s.status === SESSION_STATUS.PENDING ||
			s.status === SESSION_STATUS.RUNNING,
	);
