import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import FeatureForm from "@/components/feature-form";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

// Feature type from database - inferred from API router
type FeatureFromAPI = {
	id: string;
	title: string;
	category: string;
	description: string;
	phase: string;
	priority: number | null;
	status: string;
	acceptanceCriteria: string[];
	estimatedSize: string | null;
	projectId: string;
	[key: string]: unknown;
};

export const Route = createFileRoute("/projects/$projectId")({
	component: ProjectDetail,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

const statusColors: Record<string, string> = {
	backlog: "bg-neutral-500",
	pending: "bg-yellow-500",
	in_progress: "bg-blue-500",
	waiting_approval: "bg-purple-500",
	verified: "bg-green-500",
	failed: "bg-red-500",
};

function ProjectDetail() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [showFeatureForm, setShowFeatureForm] = useState(false);
	const [editingFeature, setEditingFeature] = useState<
		FeatureFromAPI | undefined
	>(undefined);

	const project = useQuery(
		orpc.projects.get.queryOptions({ input: { id: projectId } }),
	);
	const allFeatures = useQuery(orpc.features.list.queryOptions());

	const deleteProject = useMutation(
		orpc.projects.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.projects.list.queryOptions().queryKey,
				});
				navigate({ to: "/projects" });
			},
		}),
	);

	const features = allFeatures.data?.filter((f) => f.projectId === projectId);

	if (project.isLoading) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<Skeleton className="mb-4 h-8 w-48" />
				<Skeleton className="mb-6 h-4 w-96" />
				<div className="grid gap-3">
					<Skeleton className="h-16 w-full rounded-lg" />
					<Skeleton className="h-16 w-full rounded-lg" />
					<Skeleton className="h-16 w-full rounded-lg" />
				</div>
			</div>
		);
	}

	if (!project.data) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-muted-foreground">Project not found.</p>
				<Link to="/projects">
					<Button variant="outline" className="mt-4">
						Back to Projects
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6">
				<Link
					to="/projects"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Projects
				</Link>
				<div className="mt-2 flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl">{project.data.name}</h1>
						<p className="font-mono text-muted-foreground text-xs">
							{project.data.path}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={() => {
								setEditingFeature(undefined);
								setShowFeatureForm(true);
							}}
						>
							Create Feature
						</Button>
						{confirmDelete ? (
							<>
								<span className="text-muted-foreground text-sm">
									Delete this project?
								</span>
								<Button
									variant="destructive"
									size="sm"
									disabled={deleteProject.isPending}
									onClick={() => deleteProject.mutate({ id: projectId })}
								>
									{deleteProject.isPending ? "Deleting..." : "Confirm"}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setConfirmDelete(false)}
								>
									Cancel
								</Button>
							</>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setConfirmDelete(true)}
							>
								Delete
							</Button>
						)}
					</div>
				</div>
			</div>

			<section>
				<h2 className="mb-4 font-semibold text-lg">Features</h2>

				{allFeatures.isLoading && (
					<div className="grid gap-3">
						<Skeleton className="h-16 w-full rounded-lg" />
						<Skeleton className="h-16 w-full rounded-lg" />
						<Skeleton className="h-16 w-full rounded-lg" />
					</div>
				)}

				{features?.length === 0 && (
					<p className="text-muted-foreground">No features for this project.</p>
				)}

				{features && features.length > 0 && (
					<div className="grid gap-3">
						{features.map((feat) => (
							<div key={feat.id} className="flex items-center gap-2">
								<Link
									to="/features/$featureId"
									params={{ featureId: feat.id }}
									className="block flex-1"
								>
									<Card className="transition-colors hover:bg-accent/50">
										<CardHeader>
											<div className="flex items-center gap-2">
												<div
													className={`h-2 w-2 rounded-full ${statusColors[feat.status] ?? "bg-neutral-500"}`}
												/>
												<CardTitle>{feat.title}</CardTitle>
											</div>
											<CardDescription>
												{feat.status} &middot; {feat.phase}
												{feat.estimatedSize && ` · ${feat.estimatedSize}`}
											</CardDescription>
										</CardHeader>
									</Card>
								</Link>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setEditingFeature(feat);
										setShowFeatureForm(true);
									}}
								>
									Edit
								</Button>
							</div>
						))}
					</div>
				)}
			</section>

			<Sheet
				open={showFeatureForm}
				onOpenChange={(open) => {
					setShowFeatureForm(open);
					if (!open) {
						setEditingFeature(undefined);
					}
				}}
			>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>
							{editingFeature ? "Edit Feature" : "Create Feature"}
						</SheetTitle>
					</SheetHeader>
					<div className="mt-4">
						<FeatureForm
							feature={editingFeature}
							projectId={projectId}
							onSuccess={() => {
								setShowFeatureForm(false);
								setEditingFeature(undefined);
							}}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
