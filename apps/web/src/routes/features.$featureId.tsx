import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Play, Save, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PipelineMonitor } from "@/components/auto-mode/pipeline-monitor";
import { FeatureDiffViewer } from "@/components/git/feature-diff-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { requireAuth } from "@/lib/auth-guard";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/features/$featureId")({
	component: FeatureDetail,
	beforeLoad: requireAuth,
});

import { FEATURE_STATUS_COLORS as statusColors } from "@/lib/status-display";

function FeatureDetail() {
	const { featureId } = Route.useParams();
	const queryClient = useQueryClient();
	const feature = useQuery(
		orpc.features.get.queryOptions({ input: { id: featureId } }),
	);

	const worktree = useQuery(
		orpc.worktrees.getByFeature.queryOptions({ input: { featureId } }),
	);

	const [editing, setEditing] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editCategory, setEditCategory] = useState("");
	const [editPhase, setEditPhase] = useState("");

	const updateFeature = useMutation(
		orpc.features.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.get.queryOptions({ input: { id: featureId } })
						.queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature updated");
				setEditing(false);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature");
			},
		}),
	);

	const startBuild = useMutation(
		orpc.autoMode.startFeature.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.get.queryOptions({ input: { id: featureId } })
						.queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Pipeline started");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to start build");
			},
		}),
	);

	const startEditing = () => {
		if (!feature.data) return;
		setEditTitle(feature.data.title);
		setEditDescription(feature.data.description);
		setEditCategory(feature.data.category);
		setEditPhase(feature.data.phase);
		setEditing(true);
	};

	const handleSave = () => {
		const data: Record<string, string> = {};
		if (editTitle !== feature.data?.title) data.title = editTitle;
		if (editDescription !== feature.data?.description)
			data.description = editDescription;
		if (editCategory !== feature.data?.category) data.category = editCategory;
		if (editPhase !== feature.data?.phase) data.phase = editPhase;
		if (Object.keys(data).length === 0) {
			setEditing(false);
			return;
		}
		updateFeature.mutate({ id: featureId, data });
	};

	if (feature.isLoading) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<Skeleton className="mb-4 h-8 w-64" />
				<Skeleton className="mb-2 h-4 w-full" />
				<Skeleton className="mb-6 h-4 w-3/4" />
				<Skeleton className="h-48 w-full rounded-lg" />
			</div>
		);
	}

	if (feature.isError || !feature.data) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-muted-foreground">Feature not found.</p>
				<Link to="/kanban">
					<Button variant="outline" className="mt-4">
						Back to Kanban
					</Button>
				</Link>
			</div>
		);
	}

	const feat = feature.data;

	const canStartBuild =
		feat.status !== "in_progress" && feat.status !== "verified" && !editing;

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<div className="mb-6">
				{feat.projectId && (
					<Link
						to="/projects/$projectId"
						params={{ projectId: feat.projectId }}
						className="text-muted-foreground text-sm hover:underline"
					>
						&larr; Project
					</Link>
				)}
				<div className="mt-2 flex items-center justify-between">
					{editing ? (
						<Input
							value={editTitle}
							onChange={(e) => setEditTitle(e.target.value)}
							className="font-bold text-2xl"
						/>
					) : (
						<h1 className="font-bold text-2xl">{feat.title}</h1>
					)}
					<div className="flex gap-2">
						{editing ? (
							<>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setEditing(false)}
								>
									<X className="mr-1 size-4" />
									Cancel
								</Button>
								<Button
									size="sm"
									onClick={handleSave}
									disabled={updateFeature.isPending}
								>
									<Save className="mr-1 size-4" />
									{updateFeature.isPending ? "Saving..." : "Save"}
								</Button>
							</>
						) : (
							<>
								<Button
									size="sm"
									onClick={() => startBuild.mutate({ featureId })}
									disabled={!canStartBuild || startBuild.isPending}
								>
									<Play className="mr-1 size-4" />
									{startBuild.isPending ? "Starting..." : "Start Build"}
								</Button>
								<Button size="sm" variant="outline" onClick={startEditing}>
									<Pencil className="mr-1 size-4" />
									Edit
								</Button>
							</>
						)}
					</div>
				</div>
				<div className="mt-1 flex items-center gap-3">
					<span className="flex items-center gap-1.5 text-sm">
						<span
							className={`inline-block h-2 w-2 rounded-full ${statusColors[feat.status] ?? "bg-neutral-500"}`}
						/>
						{feat.status}
					</span>
					{editing ? (
						<>
							<Input
								value={editPhase}
								onChange={(e) => setEditPhase(e.target.value)}
								className="h-7 w-24 text-xs"
								placeholder="Phase"
							/>
							<Input
								value={editCategory}
								onChange={(e) => setEditCategory(e.target.value)}
								className="h-7 w-24 text-xs"
								placeholder="Category"
							/>
						</>
					) : (
						<>
							<span className="text-muted-foreground text-sm">
								{feat.phase}
							</span>
							<span className="text-muted-foreground text-sm">
								{feat.category}
							</span>
						</>
					)}
					{feat.estimatedSize && (
						<span className="text-muted-foreground text-sm">
							{feat.estimatedSize}
						</span>
					)}
					{feat.priority != null && (
						<span className="text-muted-foreground text-sm">
							P{feat.priority}
						</span>
					)}
				</div>
			</div>

			<div className="grid gap-4">
				{["in_progress", "waiting_approval", "verified", "failed"].includes(
					feat.status,
				) && <PipelineMonitor featureId={featureId} status={feat.status} />}
				<Card>
					<CardHeader>
						<CardTitle>Description</CardTitle>
					</CardHeader>
					<CardContent>
						{editing ? (
							<Textarea
								value={editDescription}
								onChange={(e) => setEditDescription(e.target.value)}
								rows={4}
							/>
						) : (
							<p className="text-sm">{feat.description}</p>
						)}
					</CardContent>
				</Card>

				{feat.acceptanceCriteria && feat.acceptanceCriteria.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Acceptance Criteria</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="grid gap-1.5">
								{feat.acceptanceCriteria.map((ac) => (
									<li key={ac} className="flex items-start gap-2 text-sm">
										<span className="mt-0.5 text-muted-foreground">
											{feat.passes ? "\u2713" : "\u2022"}
										</span>
										{ac}
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				{feat.dependencies && feat.dependencies.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Dependencies</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="grid gap-1 text-sm">
								{feat.dependencies.map((dep) => (
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

				{feat.pipelineStep && (
					<Card>
						<CardHeader>
							<CardTitle>Pipeline Progress</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm">
								Current step:{" "}
								<span className="font-medium font-mono">
									{feat.pipelineStep}
								</span>
							</p>
							{feat.lastCompletedStep && (
								<p className="text-muted-foreground text-sm">
									Last completed:{" "}
									<span className="font-mono">{feat.lastCompletedStep}</span>
								</p>
							)}
						</CardContent>
					</Card>
				)}

				{worktree.data?.path && (
					<FeatureDiffViewer
						featureId={featureId}
						projectRoot={worktree.data.path.replace(
							`/.worktrees/${featureId}`,
							"",
						)}
					/>
				)}
			</div>
		</div>
	);
}
