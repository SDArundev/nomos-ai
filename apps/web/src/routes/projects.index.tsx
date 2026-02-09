import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth-guard";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/projects/")({
	component: ProjectsIndex,
	beforeLoad: requireAuth,
});

function ProjectsIndex() {
	const queryClient = useQueryClient();
	const projects = useQuery(orpc.projects.list.queryOptions());
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [path, setPath] = useState("");

	const createProject = useMutation(
		orpc.projects.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.projects.list.queryOptions().queryKey,
				});
				setName("");
				setPath("");
				setShowForm(false);
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !path.trim()) return;
		createProject.mutate({ name: name.trim(), path: path.trim() });
	};

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Projects</h1>
				<Button
					variant={showForm ? "outline" : "default"}
					onClick={() => setShowForm(!showForm)}
				>
					{showForm ? "Cancel" : "New Project"}
				</Button>
			</div>

			{showForm && (
				<Card className="mb-6">
					<CardHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="project-name">Name</Label>
								<Input
									id="project-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="My Project"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="project-path">Path</Label>
								<Input
									id="project-path"
									value={path}
									onChange={(e) => setPath(e.target.value)}
									placeholder="/Users/me/projects/my-project"
									required
								/>
							</div>
							<Button type="submit" disabled={createProject.isPending}>
								{createProject.isPending ? "Creating..." : "Create Project"}
							</Button>
						</form>
					</CardHeader>
				</Card>
			)}

			{projects.isLoading && (
				<div className="grid gap-4">
					<Skeleton className="h-24 w-full rounded-lg" />
					<Skeleton className="h-24 w-full rounded-lg" />
					<Skeleton className="h-24 w-full rounded-lg" />
				</div>
			)}

			{projects.data?.length === 0 && !showForm && (
				<p className="text-muted-foreground">No projects yet.</p>
			)}

			{projects.data && projects.data.length > 0 && (
				<div className="grid gap-4">
					{projects.data.map((project) => (
						<Link
							key={project.id}
							to="/projects/$projectId"
							params={{ projectId: project.id }}
							className="block"
						>
							<Card className="transition-colors hover:bg-accent/50">
								<CardHeader>
									<CardTitle>{project.name}</CardTitle>
									<CardDescription className="font-mono text-xs">
										{project.path}
									</CardDescription>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
