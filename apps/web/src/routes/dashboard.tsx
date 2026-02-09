import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
	CheckCircle2,
	DollarSign,
	FolderOpen,
	GitBranch,
	Layers,
	Plus,
} from "lucide-react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { AutoModeDashboard } from "@/components/auto-mode/auto-mode-dashboard";
import { IntentBox } from "@/components/intent-box";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { requireAuth } from "@/lib/auth-guard";
import { orpc } from "@/utils/orpc";

const dashboardSearchSchema = z.object({
	sessionPage: z.number().int().min(1).optional(),
	sessionPageSize: z.number().int().min(1).max(200).optional(),
});

export const Route = createFileRoute("/dashboard")({
	component: DashboardComponent,
	validateSearch: dashboardSearchSchema,
	beforeLoad: requireAuth,
});

function DashboardComponent() {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate({ from: Route.fullPath });
	const searchParams = Route.useSearch();
	const sessionPage = searchParams.sessionPage ?? 1;
	const sessionPageSize = searchParams.sessionPageSize ?? 20;
	const sessionOffset = (sessionPage - 1) * sessionPageSize;

	const projects = useQuery(orpc.projects.list.queryOptions());
	const features = useQuery(orpc.features.list.queryOptions());
	const sessions = useQuery(
		orpc.sessions.listPaginated.queryOptions({
			input: { limit: sessionPageSize, offset: sessionOffset },
		}),
	);

	const featuresByStatus = (features.data ?? []).reduce(
		(acc, f) => {
			acc[f.status] = (acc[f.status] ?? 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const totalFeatures = features.data?.length ?? 0;
	const projectCount = projects.data?.length ?? 0;
	const hasProjects = projectCount > 0;

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<div className="mb-8">
				<h1 className="font-bold text-2xl">
					Welcome back, {session?.user.name ?? "there"}
				</h1>
				<p className="text-muted-foreground">
					Autonomous development studio overview.
				</p>
			</div>

			{/* Intent Box — primary input surface */}
			<div className="mb-8">
				<IntentBox />
			</div>

			{/* Auto-Mode Dashboard */}
			<div className="mb-8">
				<AutoModeDashboard />
			</div>

			{/* Cost Summary */}
			<div className="mb-8">
				<CostCard sessions={sessions.data?.rows ?? []} loading={sessions.isLoading} />
				<PaginationControls
					page={sessionPage}
					pageSize={sessionPageSize}
					total={sessions.data?.total ?? 0}
					onPageChange={(p) =>
						navigate({
							search: {
								...searchParams,
								sessionPage: p === 1 ? undefined : p,
							},
						})
					}
					onPageSizeChange={(ps) =>
						navigate({
							search: {
								...searchParams,
								sessionPage: undefined,
								sessionPageSize: ps === 20 ? undefined : ps,
							},
						})
					}
				/>
			</div>

			{/* Empty state: no projects */}
			{!projects.isLoading && !hasProjects && (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<FolderOpen className="mb-4 size-12 text-muted-foreground" />
						<h2 className="mb-2 font-semibold text-lg">No projects yet</h2>
						<p className="mb-6 max-w-sm text-muted-foreground text-sm">
							Create your first project to start building features with
							AI-powered autonomous development.
						</p>
						<Link to="/projects">
							<Button>
								<Plus className="mr-2 size-4" />
								Create your first project
							</Button>
						</Link>
					</CardContent>
				</Card>
			)}

			{/* Stats cards */}
			{(projects.isLoading || hasProjects) && (
				<>
					<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
						<StatCard
							label="Projects"
							value={projectCount}
							icon={<FolderOpen className="size-4" />}
							loading={projects.isLoading}
						/>
						<StatCard
							label="Total Features"
							value={totalFeatures}
							icon={<Layers className="size-4" />}
							loading={features.isLoading}
						/>
						<StatCard
							label="Verified"
							value={featuresByStatus.verified ?? 0}
							icon={<CheckCircle2 className="size-4 text-green-500" />}
							loading={features.isLoading}
						/>
						<StatCard
							label="In Progress"
							value={featuresByStatus.in_progress ?? 0}
							icon={<GitBranch className="size-4 text-blue-500" />}
							loading={features.isLoading}
						/>
					</div>

					{/* Feature status breakdown */}
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Features by Status</CardTitle>
								<CardDescription>
									Distribution across your pipeline
								</CardDescription>
							</CardHeader>
							<CardContent>
								{features.isLoading ? (
									<div className="space-y-3">
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-full" />
									</div>
								) : totalFeatures === 0 ? (
									<p className="text-muted-foreground text-sm">
										No features yet.
									</p>
								) : (
									<div className="space-y-3">
										<StatusRow
											label="Backlog"
											count={featuresByStatus.backlog ?? 0}
											total={totalFeatures}
											color="bg-gray-500"
										/>
										<StatusRow
											label="Pending"
											count={featuresByStatus.pending ?? 0}
											total={totalFeatures}
											color="bg-yellow-500"
										/>
										<StatusRow
											label="In Progress"
											count={featuresByStatus.in_progress ?? 0}
											total={totalFeatures}
											color="bg-blue-500"
										/>
										<StatusRow
											label="Waiting Approval"
											count={featuresByStatus.waiting_approval ?? 0}
											total={totalFeatures}
											color="bg-purple-500"
										/>
										<StatusRow
											label="Verified"
											count={featuresByStatus.verified ?? 0}
											total={totalFeatures}
											color="bg-green-500"
										/>
										<StatusRow
											label="Failed"
											count={featuresByStatus.failed ?? 0}
											total={totalFeatures}
											color="bg-red-500"
										/>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Recent Activity</CardTitle>
								<CardDescription>
									Latest events in your workspace
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ActivityFeed limit={10} />
							</CardContent>
						</Card>
					</div>

					{/* Recent projects */}
					{hasProjects && (
						<div className="mt-6">
							<h2 className="mb-3 font-semibold text-base">Your Projects</h2>
							<div className="grid gap-3 md:grid-cols-2">
								{projects.data?.slice(0, 4).map((project) => (
									<Link
										key={project.id}
										to="/projects/$projectId"
										params={{ projectId: project.id }}
									>
										<Card className="transition-colors hover:bg-accent/50">
											<CardHeader className="pb-2">
												<CardTitle className="text-sm">
													{project.name}
												</CardTitle>
												<CardDescription className="font-mono text-xs">
													{project.path}
												</CardDescription>
											</CardHeader>
										</Card>
									</Link>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	icon,
	loading,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 pt-6">
				<div className="flex size-9 items-center justify-center rounded-md bg-muted">
					{icon}
				</div>
				<div>
					{loading ? (
						<Skeleton className="mb-1 h-6 w-8" />
					) : (
						<p className="font-bold text-2xl">{value}</p>
					)}
					<p className="text-muted-foreground text-xs">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function StatusRow({
	label,
	count,
	total,
	color,
}: {
	label: string;
	count: number;
	total: number;
	color: string;
}) {
	const pct = total > 0 ? (count / total) * 100 : 0;
	return (
		<div className="flex items-center gap-3">
			<span className="w-32 text-sm">{label}</span>
			<div className="flex-1">
				<div className="h-2 rounded-full bg-muted">
					<div
						className={`h-2 rounded-full ${color}`}
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>
			<span className="w-8 text-right font-mono text-muted-foreground text-xs">
				{count}
			</span>
		</div>
	);
}

interface SessionData {
	totalCostUsd?: string | null;
	inputTokens?: number | null;
	outputTokens?: number | null;
	featureId?: string | null;
	completedAt?: Date | string | null;
}

function formatCost(usd: number): string {
	return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

function formatTokens(count: number): string {
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
	return String(count);
}

function CostCard({
	sessions,
	loading,
}: {
	sessions: SessionData[];
	loading: boolean;
}) {
	const totalCost = sessions.reduce((sum, s) => {
		return sum + (s.totalCostUsd ? Number.parseFloat(s.totalCostUsd) : 0);
	}, 0);

	const totalInput = sessions.reduce(
		(sum, s) => sum + (s.inputTokens ?? 0),
		0,
	);
	const totalOutput = sessions.reduce(
		(sum, s) => sum + (s.outputTokens ?? 0),
		0,
	);

	// Last session cost (most recently completed)
	const completedSessions = sessions
		.filter((s) => s.completedAt)
		.sort((a, b) => {
			const da = a.completedAt instanceof Date ? a.completedAt : new Date(a.completedAt ?? 0);
			const db = b.completedAt instanceof Date ? b.completedAt : new Date(b.completedAt ?? 0);
			return db.getTime() - da.getTime();
		});
	const lastCost = completedSessions[0]?.totalCostUsd
		? Number.parseFloat(completedSessions[0].totalCostUsd)
		: 0;

	// Average cost per feature (unique features with cost)
	const featureCosts = new Map<string, number>();
	for (const s of sessions) {
		if (s.featureId && s.totalCostUsd) {
			const existing = featureCosts.get(s.featureId) ?? 0;
			featureCosts.set(
				s.featureId,
				existing + Number.parseFloat(s.totalCostUsd),
			);
		}
	}
	const avgPerFeature =
		featureCosts.size > 0
			? [...featureCosts.values()].reduce((a, b) => a + b, 0) /
				featureCosts.size
			: 0;

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<DollarSign className="size-4" />
						Cost Summary
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (sessions.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<DollarSign className="size-4" />
					Cost Summary
				</CardTitle>
				<CardDescription>
					Token usage and costs across all sessions
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div>
						<p className="font-bold text-xl">{formatCost(totalCost)}</p>
						<p className="text-muted-foreground text-xs">Total cost</p>
					</div>
					<div>
						<p className="font-bold text-xl">{formatCost(lastCost)}</p>
						<p className="text-muted-foreground text-xs">Last session</p>
					</div>
					<div>
						<p className="font-bold text-xl">{formatCost(avgPerFeature)}</p>
						<p className="text-muted-foreground text-xs">Avg per feature</p>
					</div>
					<div>
						<p className="font-bold text-xl">
							{formatTokens(totalInput + totalOutput)}
						</p>
						<p className="text-muted-foreground text-xs">
							Total tokens ({formatTokens(totalInput)} in / {formatTokens(totalOutput)} out)
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
