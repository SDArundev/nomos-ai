import { settingRepository } from "@nomos-ai/db";
import { SETTING_KEYS } from "@nomos-ai/types";

const DEFAULT_SETTINGS: Record<string, unknown> = {
	[SETTING_KEYS.THEME]: "system",
	[SETTING_KEYS.MAX_CONCURRENCY]: 1,
	[SETTING_KEYS.DEFAULT_MODEL]: "sonnet",
	[SETTING_KEYS.THINKING_LEVEL]: "standard",
	[SETTING_KEYS.PLANNING_MODE]: "lite",
	[SETTING_KEYS.USE_WORKTREES]: false,
	[SETTING_KEYS.SKIP_TESTS]: false,
	[SETTING_KEYS.SIDEBAR_OPEN]: true,
};

export class SettingsService {
	async get<T>(key: string, projectId?: string, userId?: string): Promise<T> {
		// Project-level
		if (projectId) {
			const projectSetting = await settingRepository.findByKeyAndScope(
				key,
				"project",
				projectId,
			);
			if (projectSetting) return JSON.parse(projectSetting.value) as T;
		}

		// Global-level (user-scoped)
		if (userId) {
			const globalSetting = await settingRepository.findByKeyAndScope(
				key,
				"global",
				userId,
			);
			if (globalSetting) return JSON.parse(globalSetting.value) as T;
		}

		// Default
		return DEFAULT_SETTINGS[key] as T;
	}

	async set(
		key: string,
		value: unknown,
		scope: "global" | "project",
		scopeId?: string,
		userId?: string,
	): Promise<void> {
		const effectiveScopeId = scope === "global" && userId ? userId : scopeId;
		await settingRepository.upsert({
			key,
			value: JSON.stringify(value),
			scope,
			scopeId: effectiveScopeId ?? null,
		});
	}

	async getAll(
		scope: "global" | "project",
		scopeId?: string,
		userId?: string,
	): Promise<Record<string, unknown>> {
		const effectiveScopeId = scope === "global" && userId ? userId : scopeId;
		const settings = await settingRepository.getAllForScope(scope, effectiveScopeId);
		const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };

		for (const s of settings) {
			try {
				result[s.key] = JSON.parse(s.value);
			} catch {
				result[s.key] = s.value;
			}
		}

		return result;
	}

	async deleteProjectSettings(projectId: string): Promise<void> {
		await settingRepository.deleteByScope("project", projectId);
	}
}
