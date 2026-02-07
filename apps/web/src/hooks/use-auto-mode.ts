import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useEventSubscription } from "@/hooks/use-websocket";
import { useAutoModeStore } from "@/store/auto-mode-store";
import { orpc } from "@/utils/orpc";

export function useAutoMode() {
	const queryClient = useQueryClient();
	const status = useAutoModeStore((s) => s.status);
	const setStatus = useAutoModeStore((s) => s.setStatus);
	const addEvent = useAutoModeStore((s) => s.addEvent);
	const events = useAutoModeStore((s) => s.events);

	const statusQuery = useQuery(orpc.autoMode.status.queryOptions());

	useEffect(() => {
		if (statusQuery.data) {
			setStatus(statusQuery.data);
		}
	}, [statusQuery.data, setStatus]);

	// Subscribe to auto-mode events
	useEventSubscription(
		[
			"auto-mode:started",
			"auto-mode:stopped",
			"auto-mode:idle",
			"auto-mode:error",
			"auto-mode:event",
			"feature:started",
			"feature:progress",
			"feature:completed",
			"feature:error",
		],
		(payload) => {
			addEvent({
				type: "auto-mode:event",
				payload,
				timestamp: Date.now(),
			});
			// Refetch status on state changes
			queryClient.invalidateQueries({
				queryKey: orpc.autoMode.status.queryOptions().queryKey,
			});
		},
	);

	const startMutation = useMutation(
		orpc.autoMode.start.mutationOptions({
			onSuccess: () => {
				toast.success("Auto-mode started");
				queryClient.invalidateQueries({
					queryKey: orpc.autoMode.status.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const stopMutation = useMutation(
		orpc.autoMode.stop.mutationOptions({
			onSuccess: () => {
				toast.success("Auto-mode stopped");
				queryClient.invalidateQueries({
					queryKey: orpc.autoMode.status.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const start = (projectId: string, projectRoot: string) =>
		startMutation.mutate({ projectId, projectRoot });

	const stop = () => stopMutation.mutate({});

	return {
		status,
		events,
		start,
		stop,
		loading: statusQuery.isLoading,
		starting: startMutation.isPending,
		stopping: stopMutation.isPending,
	};
}
