import {
	AlertTriangle,
	BookOpen,
	ChevronDown,
	ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Pattern, SortDir, SortField } from "./types";

const STATUS_STYLES: Record<
	string,
	{ variant: "default" | "secondary" | "outline"; className?: string }
> = {
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

export function PatternTable({
	patterns,
	onSort,
	sortIndicator,
}: {
	patterns: Pattern[];
	onSort: (field: SortField) => void;
	sortIndicator: (field: SortField) => string | null;
}) {
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
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-8" />
					<TableHead>
						<button
							type="button"
							onClick={() => onSort("name")}
							className="flex items-center gap-1 hover:text-foreground"
						>
							Name{sortIndicator("name")}
						</button>
					</TableHead>
					<TableHead>
						<button
							type="button"
							onClick={() => onSort("category")}
							className="flex items-center gap-1 hover:text-foreground"
						>
							Category{sortIndicator("category")}
						</button>
					</TableHead>
					<TableHead>
						<button
							type="button"
							onClick={() => onSort("confidence")}
							className="flex items-center gap-1 hover:text-foreground"
						>
							Confidence{sortIndicator("confidence")}
						</button>
					</TableHead>
					<TableHead>
						<button
							type="button"
							onClick={() => onSort("status")}
							className="flex items-center gap-1 hover:text-foreground"
						>
							Status{sortIndicator("status")}
						</button>
					</TableHead>
					<TableHead>Evidence</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{patterns.map((p) => {
					const isExpanded = expandedId === p.id;
					const pct = Math.round(p.confidence * 100);
					return (
						<>
							<TableRow
								key={p.id}
								className="cursor-pointer"
								onClick={() => setExpandedId(isExpanded ? null : p.id)}
							>
								<TableCell>
									{isExpanded ? (
										<ChevronDown className="size-4 text-muted-foreground" />
									) : (
										<ChevronRight className="size-4 text-muted-foreground" />
									)}
								</TableCell>
								<TableCell>
									<Tooltip>
										<TooltipTrigger className="max-w-[200px] truncate text-left">
											{p.name}
										</TooltipTrigger>
										<TooltipContent>{p.description}</TooltipContent>
									</Tooltip>
								</TableCell>
								<TableCell>
									<Badge variant="secondary">{p.category}</Badge>
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Progress value={pct} className="w-16" />
										<span className="text-muted-foreground text-xs">
											{pct}%
										</span>
									</div>
								</TableCell>
								<TableCell>
									<StatusBadge status={p.status} />
								</TableCell>
								<TableCell>
									{p.evidenceCount != null && p.evidenceCount > 0 && (
										<Badge variant="outline" className="text-xs">
											{p.evidenceCount}
										</Badge>
									)}
								</TableCell>
							</TableRow>
							{isExpanded && (
								<TableRow key={`${p.id}-detail`}>
									<TableCell colSpan={6} className="bg-muted/30">
										<div className="space-y-3 p-3 text-sm">
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
														<p className="text-xs">{p.riskIfIgnored}</p>
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
													<span>
														Success rate: {Math.round(p.successRate * 100)}%
													</span>
													{p.featuresApplied && (
														<span>
															Applied to {p.featuresApplied.length} features
														</span>
													)}
												</div>
											)}
											{p.appliesTo && p.appliesTo.length > 0 && (
												<div className="flex flex-wrap gap-1 pt-1">
													{p.appliesTo.map((tag) => (
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
									</TableCell>
								</TableRow>
							)}
						</>
					);
				})}
			</TableBody>
		</Table>
	);
}
