import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

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
	const project = useQuery(
		orpc.projects.get.queryOptions({ input: { id: projectId } }),
	);
	const allFeatures = useQuery(orpc.features.list.queryOptions());

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
				<h1 className="mt-2 font-bold text-2xl">{project.data.name}</h1>
				<p className="font-mono text-muted-foreground text-xs">
					{project.data.path}
				</p>
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
							<Link
								key={feat.id}
								to="/features/$featureId"
								params={{ featureId: feat.id }}
								className="block"
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
						))}
					</div>
				)}
			</section>
		</div>
	);
}
