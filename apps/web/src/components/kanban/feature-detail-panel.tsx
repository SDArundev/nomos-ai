import { FEATURE_VALID_TRANSITIONS, type FeatureStatus, ModelSchema, ThinkingLevelSchema, PlanningModeSchema } from "@nomos-ai/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";
import { StartExecutionDialog } from "./start-execution-dialog";

interface FeatureDetailPanelProps {
	featureId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

import { FEATURE_STATUS_COLORS as statusColors } from "@/lib/status-display";

export function FeatureDetailPanel({
	featureId,
	open,
	onOpenChange,
}: FeatureDetailPanelProps) {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);
	const [editedTitle, setEditedTitle] = useState("");
	const [editedDescription, setEditedDescription] = useState("");
	const [startDialogOpen, setStartDialogOpen] = useState(false);

	// Reset edit state when panel closes
	useEffect(() => {
		if (!open) {
			setIsEditing(false);
			setEditedTitle("");
			setEditedDescription("");
			setStartDialogOpen(false);
		}
	}, [open]);

	const feature = useQuery({
		...orpc.features.get.queryOptions({ input: { id: featureId ?? "" } }),
		enabled: !!featureId,
	});

	const updateStatus = useMutation(
		orpc.features.updateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.features.get.queryOptions({
						input: { id: featureId ?? "" },
					}).queryKey,
				});
				toast.success("Feature status updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature status");
			},
		}),
	);

	const updateFeature = useMutation(
		orpc.features.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.get.queryOptions({
						input: { id: featureId ?? "" },
					}).queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature updated");
				setIsEditing(false);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature");
			},
		}),
	);

	const handleStatusChange = (status: string) => {
		if (!featureId) return;
		updateStatus.mutate({ id: featureId, status: status as FeatureStatus });
	};

	const handleEditToggle = () => {
		if (!isEditing && feature.data) {
			setEditedTitle(feature.data.title);
			setEditedDescription(feature.data.description);
		}
		setIsEditing(!isEditing);
	};

	const handleSave = () => {
		if (!featureId) return;
		const trimmedTitle = editedTitle.trim();
		const trimmedDescription = editedDescription.trim();
		if (trimmedTitle.length < 5 || trimmedTitle.length > 80) {
			toast.error("Title must be between 5 and 80 characters");
			return;
		}
		if (trimmedDescription.length < 20 || trimmedDescription.length > 500) {
			toast.error("Description must be between 20 and 500 characters");
			return;
		}
		const updates: { title?: string; description?: string } = {};
		if (trimmedTitle !== feature.data?.title) {
			updates.title = trimmedTitle;
		}
		if (trimmedDescription !== feature.data?.description) {
			updates.description = trimmedDescription;
		}
		if (Object.keys(updates).length > 0) {
			updateFeature.mutate({ id: featureId, data: updates });
		} else {
			setIsEditing(false);
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		setEditedTitle("");
		setEditedDescription("");
	};

	if (!featureId) {
		return null;
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
				{feature.isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-48 w-full rounded-lg" />
					</div>
				) : !feature.data ? (
					<div>
						<SheetHeader>
							<SheetTitle>Feature not found</SheetTitle>
						</SheetHeader>
						<p className="mt-4 text-muted-foreground">
							The requested feature could not be loaded.
						</p>
					</div>
				) : (
					<div className="space-y-6">
						<SheetHeader className="flex flex-row items-start justify-between space-y-0">
							<div className="flex-1 space-y-1.5">
								{isEditing ? (
									<Input
										value={editedTitle}
										onChange={(e) => setEditedTitle(e.target.value)}
										placeholder="Feature title"
										className="font-semibold text-lg"
									/>
								) : (
									<SheetTitle>{feature.data.title}</SheetTitle>
								)}
							</div>
							<div className="flex gap-2">
								{isEditing ? (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={handleCancel}
											disabled={updateFeature.isPending}
										>
											Cancel
										</Button>
										<Button
											size="sm"
											onClick={handleSave}
											disabled={updateFeature.isPending}
										>
											Save
										</Button>
									</>
								) : (
									<Button
										variant="outline"
										size="sm"
										onClick={handleEditToggle}
									>
										Edit
									</Button>
								)}
							</div>
						</SheetHeader>

						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1.5 text-sm">
								<span
									className={`inline-block h-2 w-2 rounded-full ${statusColors[feature.data.status] ?? "bg-neutral-500"}`}
								/>
								{feature.data.status}
							</span>
							<span className="text-muted-foreground text-sm">
								{feature.data.phase}
							</span>
							{feature.data.estimatedSize && (
								<span className="text-muted-foreground text-sm">
									{feature.data.estimatedSize}
								</span>
							)}
							{feature.data.priority != null && (
								<span className="text-muted-foreground text-sm">
									P{feature.data.priority}
								</span>
							)}
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Description</CardTitle>
							</CardHeader>
							<CardContent>
								{isEditing ? (
									<Textarea
										value={editedDescription}
										onChange={(e) => setEditedDescription(e.target.value)}
										placeholder="Feature description"
										className="min-h-32"
									/>
								) : (
									<p className="text-sm">{feature.data.description}</p>
								)}
							</CardContent>
						</Card>

						{feature.data.acceptanceCriteria &&
							feature.data.acceptanceCriteria.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle>Acceptance Criteria</CardTitle>
									</CardHeader>
									<CardContent>
										<ul className="grid gap-1.5">
											{feature.data.acceptanceCriteria.map((ac) => (
												<li key={ac} className="flex items-start gap-2 text-sm">
													<span className="mt-0.5 text-muted-foreground">
														{feature.data.passes ? "\u2713" : "\u2022"}
													</span>
													{ac}
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							)}

						{feature.data.dependencies &&
							feature.data.dependencies.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle>Dependencies</CardTitle>
									</CardHeader>
									<CardContent>
										<ul className="grid gap-1 text-sm">
											{feature.data.dependencies.map((dep) => (
												<li key={dep}>
													<Link
														to="/features/$featureId"
														params={{ featureId: dep }}
														className="text-blue-400 hover:underline"
													>
														{dep}
													</Link>
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							)}

						<div className="space-y-2">
							<h3 className="font-medium text-sm">Available Actions</h3>
							<div className="flex flex-wrap gap-2">
								{feature.data.status === "pending" && (
									<Button
										variant="default"
										size="sm"
										onClick={() => setStartDialogOpen(true)}
										disabled={updateStatus.isPending}
									>
										<Play className="size-4" />
										Start Execution
									</Button>
								)}
								{FEATURE_VALID_TRANSITIONS[feature.data.status as FeatureStatus]?.map((nextStatus) => (
									<Button
										key={nextStatus}
										variant="outline"
										size="sm"
										onClick={() => handleStatusChange(nextStatus)}
										disabled={updateStatus.isPending}
									>
										Move to {nextStatus}
									</Button>
								))}
								{FEATURE_VALID_TRANSITIONS[feature.data.status as FeatureStatus]?.length === 0 && feature.data.status !== "pending" && (
									<p className="text-muted-foreground text-sm">
										No available transitions from this status.
									</p>
								)}
							</div>
						</div>

						{feature.data && (() => {
							const modelResult = ModelSchema.safeParse(feature.data.model);
							const thinkingLevelResult = ThinkingLevelSchema.safeParse(feature.data.thinkingLevel);
							const planningModeResult = PlanningModeSchema.safeParse(feature.data.planningMode);

							return (
								<StartExecutionDialog
									open={startDialogOpen}
									onOpenChange={setStartDialogOpen}
									featureId={feature.data.id}
									projectId={feature.data.projectId}
									defaultModel={modelResult.success ? modelResult.data : undefined}
									defaultThinkingLevel={thinkingLevelResult.success ? thinkingLevelResult.data : undefined}
									defaultPlanningMode={planningModeResult.success ? planningModeResult.data : undefined}
								/>
							);
						})()}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
