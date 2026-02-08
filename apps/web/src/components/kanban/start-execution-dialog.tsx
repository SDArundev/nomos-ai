"use client";

import { MODEL, PLANNING_MODE, THINKING_LEVEL, type Model, type PlanningMode, type ThinkingLevel } from "@nomos-ai/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface StartExecutionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	featureId: string;
	projectId: string;
	defaultModel?: Model;
	defaultThinkingLevel?: ThinkingLevel;
	defaultPlanningMode?: PlanningMode;
}

export function StartExecutionDialog({
	open,
	onOpenChange,
	featureId,
	projectId,
	defaultModel = MODEL.SONNET,
	defaultThinkingLevel = THINKING_LEVEL.STANDARD,
	defaultPlanningMode = PLANNING_MODE.LITE,
}: StartExecutionDialogProps) {
	const queryClient = useQueryClient();

	const [model, setModel] = useState<Model>(defaultModel);
	const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(defaultThinkingLevel);
	const [planningMode, setPlanningMode] = useState<PlanningMode>(defaultPlanningMode);

	const createSession = useMutation(
		orpc.agent.createSession.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "Failed to create agent session");
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

	const sendMessage = useMutation(
		orpc.agent.sendMessage.mutationOptions({
			onError: (error) => {
				toast.error(error.message || "Failed to send message to agent");
			},
		}),
	);

	const handleConfirm = async () => {
		try {
			// Step 1: Create agent session
			const session = await createSession.mutateAsync({
				name: `Feature ${featureId}`,
				projectId,
				featureId,
				model,
			});

			// Step 2: Send initial message with execution parameters
			const initialMessage = `Implement feature ${featureId} with the following parameters:
- Model: ${model}
- Thinking Level: ${thinkingLevel}
- Planning Mode: ${planningMode}

Please begin the implementation.`;

			await sendMessage.mutateAsync({
				sessionId: session.id,
				content: initialMessage,
			});

			// Step 3: Update feature status to in_progress (only after message sent successfully)
			await updateStatus.mutateAsync({
				id: featureId,
				status: "in_progress",
			});

			// Step 4: Invalidate queries
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

			toast.success("Feature execution started");
			onOpenChange(false);
		} catch (error) {
			// Errors are already handled by individual mutation handlers
		}
	};

	const isPending = createSession.isPending || updateStatus.isPending || sendMessage.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Start Feature Execution</DialogTitle>
					<DialogDescription>
						Configure the AI agent parameters for implementing this feature.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<label htmlFor="model" className="font-medium text-sm">
							Model
						</label>
						<Select
							value={model}
							onValueChange={(value) => setModel(value as Model)}
						>
							<SelectTrigger id="model" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={MODEL.OPUS}>Opus (Most Capable)</SelectItem>
								<SelectItem value={MODEL.SONNET}>Sonnet (Balanced)</SelectItem>
								<SelectItem value={MODEL.HAIKU}>Haiku (Fast)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label htmlFor="thinking-level" className="font-medium text-sm">
							Thinking Level
						</label>
						<Select
							value={thinkingLevel}
							onValueChange={(value) => setThinkingLevel(value as ThinkingLevel)}
						>
							<SelectTrigger id="thinking-level" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={THINKING_LEVEL.NONE}>None</SelectItem>
								<SelectItem value={THINKING_LEVEL.STANDARD}>Standard</SelectItem>
								<SelectItem value={THINKING_LEVEL.EXTENDED}>Extended</SelectItem>
								<SelectItem value={THINKING_LEVEL.ULTRATHINK}>Ultrathink</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<label htmlFor="planning-mode" className="font-medium text-sm">
							Planning Mode
						</label>
						<Select
							value={planningMode}
							onValueChange={(value) => setPlanningMode(value as PlanningMode)}
						>
							<SelectTrigger id="planning-mode" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={PLANNING_MODE.SKIP}>Skip Planning</SelectItem>
								<SelectItem value={PLANNING_MODE.LITE}>Lite Planning</SelectItem>
								<SelectItem value={PLANNING_MODE.SPEC}>Spec Planning</SelectItem>
								<SelectItem value={PLANNING_MODE.FULL}>Full Planning</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isPending}
					>
						{isPending ? "Starting..." : "Start Execution"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
