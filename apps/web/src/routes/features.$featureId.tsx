import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/features/$featureId")({
	component: FeatureDetail,
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

function FeatureDetail() {
	const { featureId } = Route.useParams();
	const feature = useQuery(
		orpc.features.get.queryOptions({ input: { id: featureId } }),
	);

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

	if (!feature.data) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-muted-foreground">Feature not found.</p>
				<Link to="/projects">
					<Button variant="outline" className="mt-4">
						Back to Projects
					</Button>
				</Link>
			</div>
		);
	}

	const feat = feature.data;

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
				<h1 className="mt-2 font-bold text-2xl">{feat.title}</h1>
				<div className="mt-1 flex items-center gap-3">
					<span className="flex items-center gap-1.5 text-sm">
						<span
							className={`inline-block h-2 w-2 rounded-full ${statusColors[feat.status] ?? "bg-neutral-500"}`}
						/>
						{feat.status}
					</span>
					<span className="text-muted-foreground text-sm">{feat.phase}</span>
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
				<Card>
					<CardHeader>
						<CardTitle>Description</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">{feat.description}</p>
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
			</div>
		</div>
	);
}
