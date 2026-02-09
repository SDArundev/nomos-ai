"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";

interface StopExecutionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	featureId: string;
}

export function StopExecutionDialog({
	open,
	onOpenChange,
	featureId,
}: StopExecutionDialogProps) {
	const queryClient = useQueryClient();

	// Query to find the active session for this feature
	const sessionsQuery = useQuery({
		...orpc.agent.listSessions.queryOptions(),
		enabled: open,
		refetchOnMount: true,
		staleTime: 0,
	});

	const stopAgent = useMutation(
		orpc.agent.stop.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "Failed to stop agent");
			},
		}),
	);

	const updateStatus = useMutation(
		orpc.features.updateStatus.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "Failed to update feature status");
			},
		}),
	);

	const handleConfirm = async () => {
		try {
			// Find the active session for this feature
			const sessions = sessionsQuery.data;
			if (!sessions) {
				toast.error("Could not load sessions");
				return;
			}

			// Find session that matches featureId and is running
			const activeSession = sessions.find(
				(s) =>
					s.featureId === featureId &&
					s.isRunning === true &&
					s.status === "running",
			);

			if (!activeSession) {
				toast.error("No active session found for this feature");
				return;
			}

			// Step 1: Stop the agent session
			await stopAgent.mutateAsync({
				sessionId: activeSession.id,
			});

			// Step 2: Update feature status to failed
			await updateStatus.mutateAsync({
				id: featureId,
				status: "failed",
			});

			// Step 3: Invalidate queries
			queryClient.invalidateQueries({
				queryKey: orpc.features.list.queryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: orpc.features.get.queryOptions({
					input: { id: featureId },
				}).queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: orpc.agent.listSessions.queryOptions().queryKey,
			});

			toast.success("Feature execution stopped");
			onOpenChange(false);
		} catch (_error) {
			// Errors are already handled by individual mutation handlers
			// Close dialog so user isn't stuck
			onOpenChange(false);
		}
	};

	const isPending = stopAgent.isPending || updateStatus.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Stop Feature Execution</DialogTitle>
					<DialogDescription>
						Are you sure you want to stop the execution of this feature? This
						will cancel the running agent and mark the feature as failed.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={isPending}
					>
						{isPending ? "Stopping..." : "Stop Execution"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
