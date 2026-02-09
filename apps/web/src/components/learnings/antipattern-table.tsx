import { AlertTriangle, Lightbulb, Shield, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Antipattern } from "./types";

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

export function AntipatternTable({
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
											onClick={() => setExpandedId(isExpanded ? null : ap.id)}
										>
											<CardHeader className="pb-2">
												<div className="flex items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<SevIcon
															className={cn("size-4 shrink-0", config.color)}
														/>
														<CardTitle className="text-sm">{ap.name}</CardTitle>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant="outline"
															className={cn("uppercase", config.color)}
														>
															{ap.severity}
														</Badge>
														{ap.evidenceCount != null &&
															ap.evidenceCount > 0 && (
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
																<p className="text-xs">{ap.prevention}</p>
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
