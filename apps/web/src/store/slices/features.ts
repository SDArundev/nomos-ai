import type { Feature, FeatureStatus } from "@nomos-ai/types";
import type { StateCreator } from "zustand";
import type { AppStore } from "../index";

export interface FeaturesSlice {
	features: Feature[];
	selectedFeatureId: string | null;
	featureStatusFilter: FeatureStatus | null;
	setFeatures: (features: Feature[]) => void;
	setSelectedFeature: (id: string | null) => void;
	setFeatureStatusFilter: (status: FeatureStatus | null) => void;
}

export const createFeaturesSlice: StateCreator<
	AppStore,
	[["zustand/devtools", never]],
	[],
	FeaturesSlice
> = (set) => ({
	features: [],
	selectedFeatureId: null,
	featureStatusFilter: null,
	setFeatures: (features) =>
		set({ features }, undefined, "features/setFeatures"),
	setSelectedFeature: (id) =>
		set({ selectedFeatureId: id }, undefined, "features/setSelectedFeature"),
	setFeatureStatusFilter: (status) =>
		set(
			{ featureStatusFilter: status },
			undefined,
			"features/setFeatureStatusFilter",
		),
});
