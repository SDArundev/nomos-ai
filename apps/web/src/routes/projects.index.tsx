import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/projects/")({
	component: ProjectsIndex,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function ProjectsIndex() {
	const projects = useQuery(orpc.projects.list.queryOptions());

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Projects</h1>

			{projects.isLoading && (
				<div className="grid gap-4">
					<Skeleton className="h-24 w-full rounded-lg" />
					<Skeleton className="h-24 w-full rounded-lg" />
					<Skeleton className="h-24 w-full rounded-lg" />
				</div>
			)}

			{projects.data?.length === 0 && (
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
