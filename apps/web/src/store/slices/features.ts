import type { FeatureStatus } from "@nomos-ai/types";
import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface FeaturesSlice {
	selectedFeatureId: string | null;
	featureStatusFilter: FeatureStatus | null;
	setSelectedFeature: (id: string | null) => void;
	setFeatureStatusFilter: (status: FeatureStatus | null) => void;
}

export const createFeaturesSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	FeaturesSlice
> = (set) => ({
	selectedFeatureId: null,
	featureStatusFilter: null,
	setSelectedFeature: (id) =>
		set({ selectedFeatureId: id }, undefined, "features/setSelectedFeature"),
	setFeatureStatusFilter: (status) =>
		set(
			{ featureStatusFilter: status },
			undefined,
			"features/setFeatureStatusFilter",
		),
});
