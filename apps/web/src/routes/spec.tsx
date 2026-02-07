import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileJson, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/spec")({
	component: SpecPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function SpecPage() {
	const queryClient = useQueryClient();
	const selectedProjectId = useAppStore((s) => s.selectedProjectId);
	const projects = useQuery(orpc.projects.list.queryOptions());
	const [projectPath, setProjectPath] = useState("");

	// Derive project path from selected project
	const selectedProject = projects.data?.find(
		(p) => p.id === selectedProjectId,
	);
	const effectivePath = projectPath || selectedProject?.path || "";

	const specQuery = useQuery({
		...orpc.spec.getSpec.queryOptions({
			input: { projectPath: effectivePath },
		}),
		enabled: !!effectivePath,
	});

	const extractFeatures = useMutation(
		orpc.spec.extractFeatures.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Extracted ${data.created} features`);
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const handleExtract = () => {
		if (!effectivePath || !selectedProjectId) {
			toast.error("Select a project first");
			return;
		}
		extractFeatures.mutate({
			projectPath: effectivePath,
			projectId: selectedProjectId,
			createInDb: true,
		});
	};

	const spec = specQuery.data?.spec as Record<string, unknown> | null;
	const validation = specQuery.data?.validation;

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<div className="mb-6">
				<h1 className="font-bold text-2xl">Spec Management</h1>
				<p className="text-muted-foreground text-sm">
					Load and manage your project specification
				</p>
			</div>

			{/* Project path override */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-sm">Project Path</CardTitle>
					<CardDescription>
						{selectedProject
							? `Using: ${selectedProject.name} (${selectedProject.path})`
							: "Select a project or enter a path manually"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<div className="flex-1">
							<Label htmlFor="spec-path" className="sr-only">
								Path override
							</Label>
							<Input
								id="spec-path"
								value={projectPath}
								onChange={(e) => setProjectPath(e.target.value)}
								placeholder={selectedProject?.path ?? "/path/to/project"}
							/>
						</div>
						<Button
							variant="outline"
							onClick={() =>
								specQuery.refetch()
							}
							disabled={!effectivePath}
						>
							Reload
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Loading */}
			{specQuery.isLoading && (
				<div className="space-y-4">
					<Skeleton className="h-32 w-full rounded-lg" />
					<Skeleton className="h-32 w-full rounded-lg" />
				</div>
			)}

			{/* No spec found */}
			{specQuery.data && !spec && (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<FileJson className="mb-4 size-12 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-lg">No spec found</h2>
						<p className="text-muted-foreground text-sm">
							Create an <code>app_spec.json</code> in your project root to get
							started.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Spec loaded */}
			{spec && (
				<div className="space-y-4">
					{/* Validation status */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="flex items-center gap-2 text-sm">
								{validation?.valid ? (
									<CheckCircle2 className="size-4 text-green-500" />
								) : (
									<AlertCircle className="size-4 text-red-500" />
								)}
								Validation
							</CardTitle>
						</CardHeader>
						{validation && !validation.valid && (
							<CardContent>
								<ul className="space-y-1">
									{validation.errors.map((err, i) => (
										<li
											key={`${err.path}-${i}`}
											className="flex items-start gap-2 text-sm"
										>
											<AlertCircle className="mt-0.5 size-3 shrink-0 text-red-500" />
											<span>
												{err.path && (
													<span className="font-mono text-xs text-muted-foreground">
														{err.path}:{" "}
													</span>
												)}
												{err.message}
											</span>
										</li>
									))}
								</ul>
							</CardContent>
						)}
					</Card>

					{/* Spec metadata */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<Package className="size-4" />
								Spec Info
							</CardTitle>
						</CardHeader>
						<CardContent>
							<dl className="grid grid-cols-2 gap-2 text-sm">
								{"name" in spec && spec.name != null && (
									<>
										<dt className="text-muted-foreground">Name</dt>
										<dd className="font-medium">{String(spec.name)}</dd>
									</>
								)}
								{"version" in spec && spec.version != null && (
									<>
										<dt className="text-muted-foreground">Version</dt>
										<dd className="font-mono">{String(spec.version)}</dd>
									</>
								)}
								{"description" in spec && spec.description != null && (
									<>
										<dt className="text-muted-foreground">Description</dt>
										<dd className="col-span-2">
											{String(spec.description)}
										</dd>
									</>
								)}
							</dl>
						</CardContent>
					</Card>

					{/* Extract Features */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Extract Features</CardTitle>
							<CardDescription>
								Parse spec phases and create features in the database
							</CardDescription>
						</CardHeader>
						<CardContent>
							{extractFeatures.data && (
								<div className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm">
									Created{" "}
									<span className="font-bold">
										{extractFeatures.data.created}
									</span>{" "}
									features from spec
								</div>
							)}
							<Button
								onClick={handleExtract}
								disabled={
									extractFeatures.isPending || !selectedProjectId
								}
							>
								{extractFeatures.isPending
									? "Extracting..."
									: "Extract Features to DB"}
							</Button>
							{!selectedProjectId && (
								<p className="mt-2 text-muted-foreground text-xs">
									Select a project from the sidebar first
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
