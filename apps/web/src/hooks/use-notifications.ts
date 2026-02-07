import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEventSubscription } from "@/hooks/use-websocket";
import { orpc } from "@/utils/orpc";

export function useNotifications(projectId: string | null) {
	const queryClient = useQueryClient();

	const notificationsQuery = useQuery({
		...orpc.notifications.list.queryOptions({
			input: { projectId: projectId ?? "" },
		}),
		enabled: !!projectId,
	});

	const unreadCountQuery = useQuery({
		...orpc.notifications.countUnread.queryOptions({
			input: { projectId: projectId ?? "" },
		}),
		enabled: !!projectId,
	});

	// Refetch on new notifications
	useEventSubscription("notification:created", () => {
		queryClient.invalidateQueries({
			queryKey: orpc.notifications.list.queryOptions({
				input: { projectId: projectId ?? "" },
			}).queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.notifications.countUnread.queryOptions({
				input: { projectId: projectId ?? "" },
			}).queryKey,
		});
	});

	const markRead = useMutation(
		orpc.notifications.markRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.notifications.list.queryOptions({
						input: { projectId: projectId ?? "" },
					}).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.notifications.countUnread.queryOptions({
						input: { projectId: projectId ?? "" },
					}).queryKey,
				});
			},
		}),
	);

	const markAllRead = useMutation(
		orpc.notifications.markAllRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.notifications.list.queryOptions({
						input: { projectId: projectId ?? "" },
					}).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.notifications.countUnread.queryOptions({
						input: { projectId: projectId ?? "" },
					}).queryKey,
				});
			},
		}),
	);

	const dismiss = useMutation(
		orpc.notifications.dismiss.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.notifications.list.queryOptions({
						input: { projectId: projectId ?? "" },
					}).queryKey,
				});
			},
		}),
	);

	return {
		notifications: notificationsQuery.data ?? [],
		unreadCount: unreadCountQuery.data?.count ?? 0,
		loading: notificationsQuery.isLoading,
		markRead: (id: string) => markRead.mutate({ id }),
		markAllRead: () => projectId && markAllRead.mutate({ projectId }),
		dismiss: (id: string) => dismiss.mutate({ id }),
	};
}
