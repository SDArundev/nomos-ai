import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	BookOpen,
	Brain,
	ChevronDown,
	ChevronRight,
	Lightbulb,
	Shield,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/learnings")({
	component: LearningsComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

interface LearningEntry {
	id: string;
	userId: string;
	featureId?: string | null;
	category: string;
	pattern?: string | null;
	antiPattern?: string | null;
	context?: {
		problem?: string;
		solution?: string;
		codeExample?: string;
		gotcha?: string;
		recommendation?: string;
	} | null;
	severity?: string | null;
	tags?: string[] | null;
	createdAt: Date;
	updatedAt: Date;
}

type TabId = "patterns" | "antipatterns" | "insights";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
	{ id: "patterns", label: "Pattern Catalog", icon: BookOpen },
	{ id: "antipatterns", label: "Antipattern Warnings", icon: AlertTriangle },
	{ id: "insights", label: "Insights Timeline", icon: Lightbulb },
];

const CATEGORIES = [
	"all",
	"typescript",
	"frontend",
	"server",
	"database",
	"testing",
	"infra",
	"security",
	"websocket",
] as const;

function LearningsComponent() {
	const [activeTab, setActiveTab] = useState<TabId>("patterns");
	const [categoryFilter, setCategoryFilter] = useState("all");

	const learnings = useQuery(orpc.learnings.list.queryOptions());

	const allLearnings = (learnings.data ?? []) as LearningEntry[];
	const patterns = allLearnings.filter((l) => l.pattern);
	const antipatterns = allLearnings.filter((l) => l.antiPattern);
	const insights = allLearnings.filter(
		(l) => l.featureId && !l.pattern && !l.antiPattern,
	);

	const filteredPatterns =
		categoryFilter === "all"
			? patterns
			: patterns.filter((p) => p.category === categoryFilter);
	const filteredAntipatterns =
		categoryFilter === "all"
			? antipatterns
			: antipatterns.filter((a) => a.category === categoryFilter);

	const severityCounts = antipatterns.reduce(
		(acc, a) => {
			const sev = (a.severity ?? "low").toLowerCase();
			acc[sev] = (acc[sev] ?? 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<div className="mb-6">
				<h1 className="font-bold text-2xl">Learnings</h1>
				<p className="text-muted-foreground text-sm">
					Patterns, antipatterns, and insights discovered during development.
				</p>
			</div>

			{/* Summary Stats */}
			{learnings.isLoading ? (
				<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="flex items-center gap-3 pt-6">
								<Skeleton className="size-9" />
								<div>
									<Skeleton className="mb-1 h-6 w-8" />
									<Skeleton className="h-4 w-16" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
					<StatCard
						label="Patterns"
						value={patterns.length}
						icon={<BookOpen className="size-4 text-blue-500" />}
					/>
					<StatCard
						label="Antipatterns"
						value={antipatterns.length}
						icon={<AlertTriangle className="size-4 text-orange-500" />}
						sub={
							severityCounts.critical
								? `${severityCounts.critical} critical`
								: undefined
						}
					/>
					<StatCard
						label="Insights"
						value={insights.length}
						icon={<Lightbulb className="size-4 text-yellow-500" />}
					/>
					<StatCard
						label="Categories"
						value={
							new Set(allLearnings.map((l) => l.category)).size
						}
						icon={<Brain className="size-4 text-purple-500" />}
					/>
				</div>
			)}

			{/* Tabs */}
			<div className="mb-4 flex gap-2">
				{TABS.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						className={cn(
							"flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
							activeTab === tab.id
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground",
						)}
					>
						<tab.icon className="size-4" />
						{tab.label}
					</button>
				))}
			</div>

			{/* Category filter for patterns/antipatterns */}
			{(activeTab === "patterns" || activeTab === "antipatterns") && (
				<div className="mb-4 flex gap-2 overflow-x-auto">
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setCategoryFilter(cat)}
							className={cn(
								"whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
								categoryFilter === cat
									? "bg-secondary text-secondary-foreground"
									: "bg-muted/50 text-muted-foreground hover:text-foreground",
							)}
						>
							{cat === "all" ? "All" : cat}
						</button>
					))}
				</div>
			)}

			{/* Tab content */}
			{learnings.isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			) : learnings.error ? (
				<Card>
					<CardContent className="py-8 text-center text-destructive">
						Failed to load learnings: {learnings.error.message}
					</CardContent>
				</Card>
			) : (
				<>
					{activeTab === "patterns" && (
						<PatternCatalog patterns={filteredPatterns} />
					)}
					{activeTab === "antipatterns" && (
						<AntipatternWarnings antipatterns={filteredAntipatterns} />
					)}
					{activeTab === "insights" && (
						<InsightsTimeline insights={insights} />
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
	sub,
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
	sub?: string;
}) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 pt-6">
				<div className="flex size-9 items-center justify-center rounded-md bg-muted">
					{icon}
				</div>
				<div>
					<p className="font-bold text-2xl">{value}</p>
					<p className="text-muted-foreground text-xs">{label}</p>
					{sub && (
						<p className="text-destructive text-xs">{sub}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ── Pattern Catalog ──────────────────────────────────────

function PatternCatalog({ patterns }: { patterns: LearningEntry[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (patterns.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<BookOpen className="mb-4 size-12 text-muted-foreground" />
					<h2 className="mb-2 font-semibold text-lg">No patterns yet</h2>
					<p className="max-w-sm text-muted-foreground text-sm">
						Patterns are discovered during feature implementation and recorded
						by the learning system.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			{patterns.map((p) => {
				const isExpanded = expandedId === p.id;
				return (
					<Card key={p.id}>
						<button
							type="button"
							className="w-full text-left"
							onClick={() => setExpandedId(isExpanded ? null : p.id)}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										{isExpanded ? (
											<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
										) : (
											<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
										)}
										<CardTitle className="text-sm">
											{p.pattern}
										</CardTitle>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{p.category}</Badge>
										{p.featureId && (
											<Badge variant="outline">{p.featureId}</Badge>
										)}
									</div>
								</div>
							</CardHeader>
						</button>
						{isExpanded && p.context && (
							<CardContent className="border-t pt-4">
								<div className="space-y-3 text-sm">
									{p.context.problem && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Problem
											</p>
											<p>{p.context.problem}</p>
										</div>
									)}
									{p.context.solution && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Solution
											</p>
											<p>{p.context.solution}</p>
										</div>
									)}
									{p.context.codeExample && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Code Example
											</p>
											<pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
												<code>{p.context.codeExample}</code>
											</pre>
										</div>
									)}
									{p.context.recommendation && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Recommendation
											</p>
											<p>{p.context.recommendation}</p>
										</div>
									)}
									{p.context.gotcha && (
										<div className="flex items-start gap-2 rounded bg-yellow-500/10 p-2">
											<AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
											<div>
												<p className="mb-0.5 font-medium text-xs">
													Gotcha
												</p>
												<p className="text-xs">
													{p.context.gotcha}
												</p>
											</div>
										</div>
									)}
									{p.tags && p.tags.length > 0 && (
										<div className="flex flex-wrap gap-1 pt-1">
											{p.tags.map((tag) => (
												<Badge key={tag} variant="outline" className="text-xs">
													{tag}
												</Badge>
											))}
										</div>
									)}
								</div>
							</CardContent>
						)}
					</Card>
				);
			})}
		</div>
	);
}

// ── Antipattern Warnings ─────────────────────────────────

const SEVERITY_CONFIG: Record<
	string,
	{ color: string; bgColor: string; icon: typeof Shield }
> = {
	critical: {
		color: "text-red-500",
		bgColor: "bg-red-500/10",
		icon: Shield,
	},
	high: {
		color: "text-orange-500",
		bgColor: "bg-orange-500/10",
		icon: AlertTriangle,
	},
	medium: {
		color: "text-yellow-500",
		bgColor: "bg-yellow-500/10",
		icon: AlertTriangle,
	},
	low: {
		color: "text-muted-foreground",
		bgColor: "bg-muted",
		icon: Lightbulb,
	},
};

function getSeverityConfig(severity?: string | null) {
	const key = (severity ?? "low").toLowerCase();
	return SEVERITY_CONFIG[key] ?? SEVERITY_CONFIG.low;
}

function AntipatternWarnings({
	antipatterns,
}: {
	antipatterns: LearningEntry[];
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (antipatterns.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<Shield className="mb-4 size-12 text-muted-foreground" />
					<h2 className="mb-2 font-semibold text-lg">
						No antipatterns recorded
					</h2>
					<p className="max-w-sm text-muted-foreground text-sm">
						Antipatterns are captured when the system detects problematic
						approaches during feature implementation.
					</p>
				</CardContent>
			</Card>
		);
	}

	// Group by category
	const grouped = antipatterns.reduce(
		(acc, ap) => {
			const cat = ap.category;
			if (!acc[cat]) acc[cat] = [];
			acc[cat].push(ap);
			return acc;
		},
		{} as Record<string, LearningEntry[]>,
	);

	return (
		<div className="space-y-6">
			{Object.entries(grouped)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([category, items]) => (
					<div key={category}>
						<h3 className="mb-2 font-semibold text-sm capitalize">
							{category}
						</h3>
						<div className="space-y-2">
							{items.map((ap) => {
								const config = getSeverityConfig(ap.severity);
								const SevIcon = config.icon;
								const isExpanded = expandedId === ap.id;

								return (
									<Card key={ap.id} className={config.bgColor}>
										<button
											type="button"
											className="w-full text-left"
											onClick={() =>
												setExpandedId(isExpanded ? null : ap.id)
											}
										>
											<CardHeader className="pb-2">
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<SevIcon
															className={cn(
																"size-4 shrink-0",
																config.color,
															)}
														/>
														<CardTitle className="text-sm">
															{ap.antiPattern}
														</CardTitle>
													</div>
													<Badge
														variant="outline"
														className={cn(
															"uppercase",
															config.color,
														)}
													>
														{ap.severity ?? "low"}
													</Badge>
												</div>
											</CardHeader>
										</button>
										{isExpanded && ap.context && (
											<CardContent className="border-t pt-4">
												<div className="space-y-3 text-sm">
													{ap.context.problem && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																What Went Wrong
															</p>
															<p>{ap.context.problem}</p>
														</div>
													)}
													{ap.context.solution && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																Fix Applied
															</p>
															<p>{ap.context.solution}</p>
														</div>
													)}
													{ap.context.recommendation && (
														<div className="flex items-start gap-2 rounded bg-blue-500/10 p-2">
															<TrendingUp className="mt-0.5 size-4 shrink-0 text-blue-500" />
															<div>
																<p className="mb-0.5 font-medium text-xs">
																	Prevention Tip
																</p>
																<p className="text-xs">
																	{ap.context.recommendation}
																</p>
															</div>
														</div>
													)}
													{ap.context.gotcha && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																Lesson Learned
															</p>
															<p>{ap.context.gotcha}</p>
														</div>
													)}
													{ap.tags && ap.tags.length > 0 && (
														<div className="flex flex-wrap gap-1 pt-1">
															{ap.tags.map((tag) => (
																<Badge
																	key={tag}
																	variant="outline"
																	className="text-xs"
																>
																	{tag}
																</Badge>
															))}
														</div>
													)}
												</div>
											</CardContent>
										)}
									</Card>
								);
							})}
						</div>
					</div>
				))}
		</div>
	);
}

// ── Insights Timeline ────────────────────────────────────

function InsightsTimeline({ insights }: { insights: LearningEntry[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	if (insights.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<Lightbulb className="mb-4 size-12 text-muted-foreground" />
					<h2 className="mb-2 font-semibold text-lg">No insights yet</h2>
					<p className="max-w-sm text-muted-foreground text-sm">
						Insights are recorded after features are implemented, capturing what
						worked and what didn't.
					</p>
				</CardContent>
			</Card>
		);
	}

	const sorted = [...insights].sort(
		(a, b) => {
			const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
			const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
			return dateB.getTime() - dateA.getTime();
		},
	);

	return (
		<div className="relative space-y-0">
			{/* Timeline line */}
			<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

			{sorted.map((insight) => {
				const isExpanded = expandedId === insight.id;
				const date = insight.createdAt instanceof Date ? insight.createdAt : new Date(insight.createdAt);
				const formattedDate = date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});

				return (
					<div key={insight.id} className="relative pl-10 pb-6">
						{/* Timeline dot */}
						<div className="absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-background bg-primary" />

						<button
							type="button"
							className="w-full text-left"
							onClick={() =>
								setExpandedId(isExpanded ? null : insight.id)
							}
						>
							<div className="flex items-baseline gap-2">
								<span className="text-muted-foreground text-xs">
									{formattedDate}
								</span>
								{insight.featureId && (
									<Badge variant="outline" className="text-xs">
										{insight.featureId}
									</Badge>
								)}
								<Badge variant="secondary" className="text-xs">
									{insight.category}
								</Badge>
							</div>
							<div className="mt-1 flex items-center gap-1">
								{isExpanded ? (
									<ChevronDown className="size-3.5 text-muted-foreground" />
								) : (
									<ChevronRight className="size-3.5 text-muted-foreground" />
								)}
								<p className="text-sm">
									{insight.context?.problem ??
										insight.context?.solution ??
										`Insight for ${insight.featureId}`}
								</p>
							</div>
						</button>

						{isExpanded && insight.context && (
							<Card className="mt-2">
								<CardContent className="pt-4">
									<div className="space-y-3 text-sm">
										{insight.context.problem && (
											<div>
												<p className="mb-1 font-medium text-muted-foreground text-xs">
													Discovery
												</p>
												<p>{insight.context.problem}</p>
											</div>
										)}
										{insight.context.solution && (
											<div>
												<p className="mb-1 font-medium text-muted-foreground text-xs">
													What Worked
												</p>
												<p>{insight.context.solution}</p>
											</div>
										)}
										{insight.context.recommendation && (
											<div>
												<p className="mb-1 font-medium text-muted-foreground text-xs">
													Recommendation
												</p>
												<p>{insight.context.recommendation}</p>
											</div>
										)}
										{insight.context.codeExample && (
											<div>
												<p className="mb-1 font-medium text-muted-foreground text-xs">
													Code Reference
												</p>
												<pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
													<code>
														{insight.context.codeExample}
													</code>
												</pre>
											</div>
										)}
										{insight.tags && insight.tags.length > 0 && (
											<div className="flex flex-wrap gap-1 pt-1">
												{insight.tags.map((tag) => (
													<Badge
														key={tag}
														variant="outline"
														className="text-xs"
													>
														{tag}
													</Badge>
												))}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				);
			})}
		</div>
	);
}
