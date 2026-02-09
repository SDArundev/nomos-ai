import { ChevronDown, ChevronRight, Lightbulb, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FeatureInsight } from "./types";

export function InsightTimeline({ insights }: { insights: FeatureInsight[] }) {
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
			<div className="absolute bottom-0 left-4 top-0 w-px bg-border" />

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
					<div key={insight.id} className="relative pb-6 pl-10">
						<div className="absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-background bg-primary" />

						<button
							type="button"
							className="w-full text-left"
							onClick={() => setExpandedId(isExpanded ? null : insight.id)}
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
										{insight.discoveries && insight.discoveries.length > 0 && (
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
										{insight.whatWorked && insight.whatWorked.length > 0 && (
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
															<span className="mt-0.5 text-green-500">+</span>
															{item}
														</li>
													))}
												</ul>
											</div>
										)}
										{insight.whatFailed && insight.whatFailed.length > 0 && (
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
															<span className="mt-0.5 text-red-500">-</span>
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
