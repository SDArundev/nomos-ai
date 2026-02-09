import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { AlertTriangle, BookOpen, Brain, Lightbulb } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { AntipatternTable } from "@/components/learnings/antipattern-table";
import { CurationControls } from "@/components/learnings/curation-controls";
import { InsightTimeline } from "@/components/learnings/insight-timeline";
import { PatternTable } from "@/components/learnings/pattern-table";
import type {
	Antipattern,
	FeatureInsight,
	Pattern,
	SortDir,
	SortField,
} from "@/components/learnings/types";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireAuth } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const learningsSearchSchema = z.object({
	pp: z.number().int().min(1).optional().catch(undefined),
	pps: z.number().int().min(1).optional().catch(undefined),
	ap: z.number().int().min(1).optional().catch(undefined),
	aps: z.number().int().min(1).optional().catch(undefined),
	ip: z.number().int().min(1).optional().catch(undefined),
	ips: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/learnings")({
	component: LearningsComponent,
	beforeLoad: requireAuth,
	validateSearch: learningsSearchSchema,
});

function LearningsComponent() {
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [sortField, setSortField] = useState<SortField>("confidence");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	const search = useSearch({ from: "/learnings" });
	const navigate = useNavigate({ from: "/learnings" });

	const patternPage = search.pp ?? 1;
	const patternPageSize = search.pps ?? 20;
	const antipatternPage = search.ap ?? 1;
	const antipatternPageSize = search.aps ?? 20;
	const insightPage = search.ip ?? 1;
	const insightPageSize = search.ips ?? 20;

	const setPatternPage = (page: number) =>
		navigate({ search: (prev) => ({ ...prev, pp: page }), replace: true });
	const setPatternPageSize = (size: number) =>
		navigate({
			search: (prev) => ({ ...prev, pps: size, pp: 1 }),
			replace: true,
		});
	const setAntipatternPage = (page: number) =>
		navigate({ search: (prev) => ({ ...prev, ap: page }), replace: true });
	const setAntipatternPageSize = (size: number) =>
		navigate({
			search: (prev) => ({ ...prev, aps: size, ap: 1 }),
			replace: true,
		});
	const setInsightPage = (page: number) =>
		navigate({ search: (prev) => ({ ...prev, ip: page }), replace: true });
	const setInsightPageSize = (size: number) =>
		navigate({
			search: (prev) => ({ ...prev, ips: size, ip: 1 }),
			replace: true,
		});

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

	const sortedPatterns = [...filteredPatterns].sort((a, b) => {
		const dir = sortDir === "asc" ? 1 : -1;
		switch (sortField) {
			case "name":
				return dir * a.name.localeCompare(b.name);
			case "confidence":
				return dir * (a.confidence - b.confidence);
			case "status":
				return dir * a.status.localeCompare(b.status);
			case "category":
				return dir * a.category.localeCompare(b.category);
			default:
				return 0;
		}
	});

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDir("desc");
		}
	};

	const sortIndicator = (field: SortField) => {
		if (sortField !== field) return null;
		return sortDir === "asc" ? " \u2191" : " \u2193";
	};

	return (
		<TooltipProvider>
			<div className="container mx-auto max-w-5xl px-4 py-6">
				<div className="mb-6">
					<h1 className="font-bold text-2xl">Learnings</h1>
					<p className="text-muted-foreground text-sm">
						Patterns, antipatterns, and insights discovered during development.
					</p>
				</div>

				{isLoading ? (
					<StatsLoading />
				) : (
					<StatsSummary
						patternCount={patterns.length}
						provenCount={provenCount}
						antipatternCount={antipatterns.length}
						criticalCount={severityCounts.critical}
						insightCount={insights.length}
						categoryCount={allCategories.length}
					/>
				)}

				<Tabs defaultValue="patterns">
					<TabsList>
						<TabsTrigger value="patterns">
							<BookOpen className="size-4" />
							Pattern Catalog
						</TabsTrigger>
						<TabsTrigger value="antipatterns">
							<AlertTriangle className="size-4" />
							Antipattern Warnings
						</TabsTrigger>
						<TabsTrigger value="insights">
							<Lightbulb className="size-4" />
							Insights Timeline
						</TabsTrigger>
					</TabsList>

					<TabsContent value="patterns">
						<CategoryFilter
							categories={allCategories}
							value={categoryFilter}
							onChange={(v) => {
								setCategoryFilter(v);
								navigate({
									search: (prev) => ({ ...prev, pp: 1 }),
									replace: true,
								});
							}}
						/>
						{isLoading ? (
							<LoadingSkeleton />
						) : error ? (
							<ErrorCard error={error} />
						) : (
							<>
								<CurationControls />
								<PatternTable
									patterns={sortedPatterns.slice(
										(patternPage - 1) * patternPageSize,
										patternPage * patternPageSize,
									)}
									onSort={handleSort}
									sortIndicator={sortIndicator}
								/>
								<PaginationControls
									page={patternPage}
									pageSize={patternPageSize}
									total={sortedPatterns.length}
									onPageChange={setPatternPage}
									onPageSizeChange={(ps) => {
										setPatternPageSize(ps);
									}}
								/>
							</>
						)}
					</TabsContent>

					<TabsContent value="antipatterns">
						<CategoryFilter
							categories={allCategories}
							value={categoryFilter}
							onChange={(v) => {
								setCategoryFilter(v);
								navigate({
									search: (prev) => ({ ...prev, ap: 1 }),
									replace: true,
								});
							}}
						/>
						{isLoading ? (
							<LoadingSkeleton />
						) : error ? (
							<ErrorCard error={error} />
						) : (
							<>
								<AntipatternTable
									antipatterns={filteredAntipatterns.slice(
										(antipatternPage - 1) * antipatternPageSize,
										antipatternPage * antipatternPageSize,
									)}
								/>
								<PaginationControls
									page={antipatternPage}
									pageSize={antipatternPageSize}
									total={filteredAntipatterns.length}
									onPageChange={setAntipatternPage}
									onPageSizeChange={(ps) => {
										setAntipatternPageSize(ps);
									}}
								/>
							</>
						)}
					</TabsContent>

					<TabsContent value="insights">
						{isLoading ? (
							<LoadingSkeleton />
						) : error ? (
							<ErrorCard error={error} />
						) : (
							<>
								<InsightTimeline
									insights={insights.slice(
										(insightPage - 1) * insightPageSize,
										insightPage * insightPageSize,
									)}
								/>
								<PaginationControls
									page={insightPage}
									pageSize={insightPageSize}
									total={insights.length}
									onPageChange={setInsightPage}
									onPageSizeChange={(ps) => {
										setInsightPageSize(ps);
									}}
								/>
							</>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</TooltipProvider>
	);
}

function CategoryFilter({
	categories,
	value,
	onChange,
}: {
	categories: string[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="mb-4 flex gap-2 overflow-x-auto">
			<button
				type="button"
				onClick={() => onChange("all")}
				className={cn(
					"whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
					value === "all"
						? "bg-secondary text-secondary-foreground"
						: "bg-muted/50 text-muted-foreground hover:text-foreground",
				)}
			>
				All
			</button>
			{categories.map((cat) => (
				<button
					key={cat}
					type="button"
					onClick={() => onChange(cat)}
					className={cn(
						"whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
						value === cat
							? "bg-secondary text-secondary-foreground"
							: "bg-muted/50 text-muted-foreground hover:text-foreground",
					)}
				>
					{cat}
				</button>
			))}
		</div>
	);
}

function StatsLoading() {
	return (
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
	);
}

function StatsSummary({
	patternCount,
	provenCount,
	antipatternCount,
	criticalCount,
	insightCount,
	categoryCount,
}: {
	patternCount: number;
	provenCount: number;
	antipatternCount: number;
	criticalCount?: number;
	insightCount: number;
	categoryCount: number;
}) {
	return (
		<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
			<StatCard
				label="Patterns"
				value={patternCount}
				icon={<BookOpen className="size-4 text-blue-500" />}
				sub={provenCount > 0 ? `${provenCount} proven` : undefined}
			/>
			<StatCard
				label="Antipatterns"
				value={antipatternCount}
				icon={<AlertTriangle className="size-4 text-orange-500" />}
				sub={criticalCount ? `${criticalCount} critical` : undefined}
			/>
			<StatCard
				label="Insights"
				value={insightCount}
				icon={<Lightbulb className="size-4 text-yellow-500" />}
			/>
			<StatCard
				label="Categories"
				value={categoryCount}
				icon={<Brain className="size-4 text-purple-500" />}
			/>
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
					{sub && <p className="text-destructive text-xs">{sub}</p>}
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 3 }).map((_, i) => (
				<Skeleton key={i} className="h-24 w-full" />
			))}
		</div>
	);
}

function ErrorCard({ error }: { error: Error }) {
	return (
		<Card>
			<CardContent className="py-8 text-center text-destructive">
				Failed to load learnings: {error.message}
			</CardContent>
		</Card>
	);
}
