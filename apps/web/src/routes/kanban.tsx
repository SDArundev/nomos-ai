import type { FeatureStatus } from "@nomos-ai/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/kanban")({
	component: KanbanPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function KanbanPage() {
	const queryClient = useQueryClient();
	const features = useQuery(orpc.features.list.queryOptions());

	const updateStatus = useMutation(
		orpc.features.updateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature status updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature status");
			},
		}),
	);

	const handleStatusChange = (id: string, status: string) => {
		updateStatus.mutate({ id, status: status as FeatureStatus });
	};

	if (features.isLoading) {
		return (
			<div className="container mx-auto max-w-full px-4 py-6">
				<div className="mb-6">
					<Skeleton className="h-8 w-48" />
				</div>
				<div className="flex gap-4">
					{[
						"backlog",
						"pending",
						"in_progress",
						"waiting_approval",
						"verified",
					].map((status) => (
						<div key={status} className="w-72">
							<Skeleton className="mb-4 h-6 w-32" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-24 w-full rounded-lg" />
								<Skeleton className="h-24 w-full rounded-lg" />
								<Skeleton className="h-24 w-full rounded-lg" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (features.error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive">
					Error loading features: {features.error.message}
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-6 py-4">
				<h1 className="font-bold text-2xl">Kanban Board</h1>
				<p className="text-muted-foreground text-sm">
					Drag and drop features to change their status
				</p>
			</div>
			<div className="flex-1 overflow-hidden">
				<KanbanBoard
					features={features.data ?? []}
					onStatusChange={handleStatusChange}
				/>
			</div>
		</div>
	);
}
