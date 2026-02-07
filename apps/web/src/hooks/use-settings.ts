import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useSettingsStore } from "@/store/settings-store";
import { orpc } from "@/utils/orpc";

export function useSettings(projectId?: string) {
	const queryClient = useQueryClient();
	const setSettings = useSettingsStore((s) => s.setSettings);
	const settings = useSettingsStore((s) => s.settings);

	const globalQuery = useQuery(
		orpc.settings.getAll.queryOptions({
			input: { scope: "global" },
		}),
	);

	const projectQuery = useQuery({
		...orpc.settings.getAll.queryOptions({
			input: { scope: "project", scopeId: projectId ?? "" },
		}),
		enabled: !!projectId,
	});

	useEffect(() => {
		const merged = {
			...(globalQuery.data ?? {}),
			...(projectQuery.data ?? {}),
		};
		setSettings(merged as Record<string, unknown>);
	}, [globalQuery.data, projectQuery.data, setSettings]);

	const saveSetting = useMutation(
		orpc.settings.set.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.settings.getAll.queryOptions({
						input: { scope: "global" },
					}).queryKey,
				});
				if (projectId) {
					queryClient.invalidateQueries({
						queryKey: orpc.settings.getAll.queryOptions({
							input: { scope: "project", scopeId: projectId },
						}).queryKey,
					});
				}
				toast.success("Setting saved");
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const updateSetting = (
		key: string,
		value: unknown,
		scope: "global" | "project" = "global",
	) => {
		saveSetting.mutate({
			key,
			value,
			scope,
			scopeId: scope === "project" ? projectId : undefined,
		});
	};

	return {
		settings,
		loading: globalQuery.isLoading,
		updateSetting,
		saving: saveSetting.isPending,
	};
}
