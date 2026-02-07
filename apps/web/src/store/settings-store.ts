import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface SettingsStore {
	settings: Record<string, unknown>;
	loading: boolean;

	setSettings: (settings: Record<string, unknown>) => void;
	setSetting: (key: string, value: unknown) => void;
	setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
	devtools(
		(set) => ({
			settings: {},
			loading: false,

			setSettings: (settings) =>
				set({ settings }, undefined, "settings/setSettings"),
			setSetting: (key, value) =>
				set(
					(state) => ({
						settings: { ...state.settings, [key]: value },
					}),
					undefined,
					"settings/setSetting",
				),
			setLoading: (loading) =>
				set({ loading }, undefined, "settings/setLoading"),
		}),
		{ name: "SettingsStore" },
	),
);
