import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	AlertTriangle,
	Archive,
	BookOpen,
	Brain,
	ChevronDown,
	ChevronRight,
	Lightbulb,
	Shield,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

// ── Types matching API responses ──────────────────────────

interface Pattern {
	id: string;
	userId: string | null;
	name: string;
	description: string;
	category: string;
	confidence: number;
	evidenceCount: number | null;
	successRate: number | null;
	riskIfIgnored: string | null;
	codeExample: string | null;
	recommendation: string | null;
	appliesTo: string[] | null;
	featuresApplied: string[] | null;
	featuresSucceeded: string[] | null;
	firstSeen: string | null;
	lastSeen: string | null;
	status: string;
	createdAt: Date | string;
	updatedAt: Date | string;
}

interface Antipattern {
	id: string;
	userId: string | null;
	name: string;
	description: string;
	category: string;
	severity: string;
	evidenceCount: number | null;
	prevention: string | null;
	whatWentWrong: string | null;
	lesson: string | null;
	fixApplied: string | null;
	lastSeen: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

interface FeatureInsight {
	id: string;
	userId: string | null;
	featureId: string;
	acceptanceCriteria: Array<{
		criterion: string;
		status: string;
		details?: string;
	}> | null;
	discoveries: Array<{
		discovery: string;
		context: string;
		lesson: string;
		benefit?: string;
		code_pattern?: string;
	}> | null;
	patternsApplied: string[] | null;
	whatWorked: string[] | null;
	whatFailed: string[] | null;
	whatCouldImprove: string[] | null;
	recommendations: string[] | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

type TabId = "patterns" | "antipatterns" | "insights";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
	{ id: "patterns", label: "Pattern Catalog", icon: BookOpen },
	{ id: "antipatterns", label: "Antipattern Warnings", icon: AlertTriangle },
	{ id: "insights", label: "Insights Timeline", icon: Lightbulb },
];

function LearningsComponent() {
	const [activeTab, setActiveTab] = useState<TabId>("patterns");
	const [categoryFilter, setCategoryFilter] = useState("all");

	const patternsQuery = useQuery(orpc.learnings.listPatterns.queryOptions());
	const antipatternsQuery = useQuery(
		orpc.learnings.listAntipatterns.queryOptions(),
	);
	const insightsQuery = useQuery(orpc.learnings.listInsights.queryOptions());

	const patterns = (patternsQuery.data ?? []) as Pattern[];
	const antipatterns = (antipatternsQuery.data ?? []) as Antipattern[];
	const insights = (insightsQuery.data ?? []) as FeatureInsight[];

	const isLoading =
		patternsQuery.isLoading ||
		antipatternsQuery.isLoading ||
		insightsQuery.isLoading;
	const error =
		patternsQuery.error || antipatternsQuery.error || insightsQuery.error;

	// Build category list from actual data
	const allCategories = [
		...new Set([
			...patterns.map((p) => p.category),
			...antipatterns.map((a) => a.category),
		]),
	].sort();

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
			const sev = a.severity.toLowerCase();
			acc[sev] = (acc[sev] ?? 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const provenCount = patterns.filter((p) => p.status === "proven").length;

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<div className="mb-6">
				<h1 className="font-bold text-2xl">Learnings</h1>
				<p className="text-muted-foreground text-sm">
					Patterns, antipatterns, and insights discovered during development.
				</p>
			</div>

			{/* Summary Stats */}
			{isLoading ? (
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
						sub={provenCount > 0 ? `${provenCount} proven` : undefined}
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
						value={allCategories.length}
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
					<button
						type="button"
						onClick={() => setCategoryFilter("all")}
						className={cn(
							"whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
							categoryFilter === "all"
								? "bg-secondary text-secondary-foreground"
								: "bg-muted/50 text-muted-foreground hover:text-foreground",
						)}
					>
						All
					</button>
					{allCategories.map((cat) => (
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
							{cat}
						</button>
					))}
				</div>
			)}

			{/* Tab content */}
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			) : error ? (
				<Card>
					<CardContent className="py-8 text-center text-destructive">
						Failed to load learnings: {error.message}
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

// ── Confidence Bar ──────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
	const pct = Math.round(value * 100);
	const color =
		value >= 0.8
			? "bg-green-500"
			: value >= 0.5
				? "bg-yellow-500"
				: "bg-red-500";

	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-16 rounded-full bg-muted">
				<div
					className={cn("h-1.5 rounded-full", color)}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-muted-foreground text-xs">{pct}%</span>
		</div>
	);
}

// ── Status Badge ────────────────────────────────────────

const STATUS_STYLES: Record<string, { variant: "default" | "secondary" | "outline"; className?: string }> = {
	proven: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
	active: { variant: "secondary" },
	archived: { variant: "outline", className: "text-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
	const style = STATUS_STYLES[status] ?? STATUS_STYLES.active;
	return (
		<Badge variant={style.variant} className={style.className}>
			{status}
		</Badge>
	);
}

// ── Pattern Catalog ──────────────────────────────────────

function PatternCatalog({ patterns }: { patterns: Pattern[] }) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const curate = useMutation(
		orpc.learnings.curate.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: orpc.learnings.listPatterns.queryOptions().queryKey,
				});
				toast.success(
					`Curation complete: ${data.promoted} promoted, ${data.pruned} pruned`,
				);
			},
			onError: (error) => {
				toast.error(error.message || "Curation failed");
			},
		}),
	);

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
			{/* Curation controls */}
			<div className="mb-3 flex justify-end">
				<button
					type="button"
					onClick={() => curate.mutate({})}
					disabled={curate.isPending}
					className={cn(
						"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
						"bg-muted text-muted-foreground hover:text-foreground",
						curate.isPending && "opacity-50 cursor-not-allowed",
					)}
				>
					<Sparkles className="size-3.5" />
					{curate.isPending ? "Curating..." : "Run Curation"}
				</button>
			</div>

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
											{p.name}
										</CardTitle>
									</div>
									<div className="flex items-center gap-2">
										<ConfidenceBar value={p.confidence} />
										<StatusBadge status={p.status} />
										<Badge variant="secondary">{p.category}</Badge>
										{p.evidenceCount != null && p.evidenceCount > 0 && (
											<Badge variant="outline" className="text-xs">
												{p.evidenceCount} evidence
											</Badge>
										)}
									</div>
								</div>
							</CardHeader>
						</button>
						{isExpanded && (
							<CardContent className="border-t pt-4">
								<div className="space-y-3 text-sm">
									<p className="text-muted-foreground">{p.description}</p>

									{p.recommendation && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Recommendation
											</p>
											<p>{p.recommendation}</p>
										</div>
									)}
									{p.riskIfIgnored && (
										<div className="flex items-start gap-2 rounded bg-yellow-500/10 p-2">
											<AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
											<div>
												<p className="mb-0.5 font-medium text-xs">
													Risk if Ignored
												</p>
												<p className="text-xs">
													{p.riskIfIgnored}
												</p>
											</div>
										</div>
									)}
									{p.codeExample && (
										<div>
											<p className="mb-1 font-medium text-muted-foreground text-xs">
												Code Example
											</p>
											<pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
												<code>{p.codeExample}</code>
											</pre>
										</div>
									)}
									{p.successRate != null && (
										<div className="flex items-center gap-4 text-xs text-muted-foreground">
											<span>Success rate: {Math.round(p.successRate * 100)}%</span>
											{p.featuresApplied && (
												<span>Applied to {p.featuresApplied.length} features</span>
											)}
										</div>
									)}
									{p.appliesTo && p.appliesTo.length > 0 && (
										<div className="flex flex-wrap gap-1 pt-1">
											{p.appliesTo.map((tag) => (
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

function getSeverityConfig(severity: string) {
	const key = severity.toLowerCase();
	return SEVERITY_CONFIG[key] ?? SEVERITY_CONFIG.low;
}

function AntipatternWarnings({
	antipatterns,
}: {
	antipatterns: Antipattern[];
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
		{} as Record<string, Antipattern[]>,
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
															{ap.name}
														</CardTitle>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant="outline"
															className={cn(
																"uppercase",
																config.color,
															)}
														>
															{ap.severity}
														</Badge>
														{ap.evidenceCount != null && ap.evidenceCount > 0 && (
															<Badge variant="outline" className="text-xs">
																{ap.evidenceCount}x seen
															</Badge>
														)}
													</div>
												</div>
											</CardHeader>
										</button>
										{isExpanded && (
											<CardContent className="border-t pt-4">
												<div className="space-y-3 text-sm">
													<p className="text-muted-foreground">
														{ap.description}
													</p>
													{ap.whatWentWrong && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																What Went Wrong
															</p>
															<p>{ap.whatWentWrong}</p>
														</div>
													)}
													{ap.fixApplied && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																Fix Applied
															</p>
															<p>{ap.fixApplied}</p>
														</div>
													)}
													{ap.prevention && (
														<div className="flex items-start gap-2 rounded bg-blue-500/10 p-2">
															<TrendingUp className="mt-0.5 size-4 shrink-0 text-blue-500" />
															<div>
																<p className="mb-0.5 font-medium text-xs">
																	Prevention
																</p>
																<p className="text-xs">
																	{ap.prevention}
																</p>
															</div>
														</div>
													)}
													{ap.lesson && (
														<div>
															<p className="mb-1 font-medium text-muted-foreground text-xs">
																Lesson Learned
															</p>
															<p>{ap.lesson}</p>
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

function InsightsTimeline({ insights }: { insights: FeatureInsight[] }) {
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

	const sorted = [...insights].sort((a, b) => {
		const dateA =
			a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
		const dateB =
			b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
		return dateB.getTime() - dateA.getTime();
	});

	return (
		<div className="relative space-y-0">
			{/* Timeline line */}
			<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

			{sorted.map((insight) => {
				const isExpanded = expandedId === insight.id;
				const date =
					insight.createdAt instanceof Date
						? insight.createdAt
						: new Date(insight.createdAt);
				const formattedDate = date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});

				const hasContent =
					(insight.discoveries && insight.discoveries.length > 0) ||
					(insight.whatWorked && insight.whatWorked.length > 0) ||
					(insight.whatFailed && insight.whatFailed.length > 0) ||
					(insight.patternsApplied && insight.patternsApplied.length > 0) ||
					(insight.recommendations && insight.recommendations.length > 0);

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
								<Badge variant="outline" className="text-xs">
									{insight.featureId}
								</Badge>
							</div>
							<div className="mt-1 flex items-center gap-1">
								{isExpanded ? (
									<ChevronDown className="size-3.5 text-muted-foreground" />
								) : (
									<ChevronRight className="size-3.5 text-muted-foreground" />
								)}
								<p className="text-sm">
									{insight.discoveries?.[0]?.discovery ??
										`Insight for ${insight.featureId}`}
								</p>
							</div>
						</button>

						{isExpanded && hasContent && (
							<Card className="mt-2">
								<CardContent className="pt-4">
									<div className="space-y-3 text-sm">
										{insight.discoveries &&
											insight.discoveries.length > 0 && (
												<div>
													<p className="mb-1 font-medium text-muted-foreground text-xs">
														Discoveries
													</p>
													<ul className="space-y-2">
														{insight.discoveries.map((d, i) => (
															<li key={i} className="rounded bg-muted/50 p-2">
																<p className="font-medium text-xs">
																	{d.discovery}
																</p>
																<p className="mt-0.5 text-muted-foreground text-xs">
																	{d.context}
																</p>
																{d.lesson && (
																	<p className="mt-0.5 text-xs italic">
																		Lesson: {d.lesson}
																	</p>
																)}
															</li>
														))}
													</ul>
												</div>
											)}
										{insight.whatWorked &&
											insight.whatWorked.length > 0 && (
												<div>
													<p className="mb-1 font-medium text-muted-foreground text-xs">
														What Worked
													</p>
													<ul className="space-y-1">
														{insight.whatWorked.map((item, i) => (
															<li
																key={i}
																className="flex items-start gap-1.5 text-xs"
															>
																<span className="mt-0.5 text-green-500">
																	+
																</span>
																{item}
															</li>
														))}
													</ul>
												</div>
											)}
										{insight.whatFailed &&
											insight.whatFailed.length > 0 && (
												<div>
													<p className="mb-1 font-medium text-muted-foreground text-xs">
														What Failed
													</p>
													<ul className="space-y-1">
														{insight.whatFailed.map((item, i) => (
															<li
																key={i}
																className="flex items-start gap-1.5 text-xs"
															>
																<span className="mt-0.5 text-red-500">
																	-
																</span>
																{item}
															</li>
														))}
													</ul>
												</div>
											)}
										{insight.patternsApplied &&
											insight.patternsApplied.length > 0 && (
												<div>
													<p className="mb-1 font-medium text-muted-foreground text-xs">
														Patterns Applied
													</p>
													<div className="flex flex-wrap gap-1">
														{insight.patternsApplied.map((pat) => (
															<Badge
																key={pat}
																variant="outline"
																className="text-xs"
															>
																{pat}
															</Badge>
														))}
													</div>
												</div>
											)}
										{insight.recommendations &&
											insight.recommendations.length > 0 && (
												<div>
													<p className="mb-1 font-medium text-muted-foreground text-xs">
														Recommendations
													</p>
													<ul className="space-y-1">
														{insight.recommendations.map((rec, i) => (
															<li
																key={i}
																className="flex items-start gap-1.5 text-xs"
															>
																<TrendingUp className="mt-0.5 size-3 shrink-0 text-blue-500" />
																{rec}
															</li>
														))}
													</ul>
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
