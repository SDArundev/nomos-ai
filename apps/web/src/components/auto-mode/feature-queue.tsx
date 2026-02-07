import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export function FeatureQueue() {
	const featuresQuery = useQuery(
		orpc.features.list.queryOptions({ input: { status: "pending" } }),
	);
	const inProgressQuery = useQuery(
		orpc.features.list.queryOptions({ input: { status: "in_progress" } }),
	);

	const pending = featuresQuery.data ?? [];
	const inProgress = inProgressQuery.data ?? [];

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Feature Queue</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{inProgress.length > 0 && (
					<div>
						<h4 className="mb-1 flex items-center gap-1 text-blue-500 text-xs font-medium">
							<Loader2 className="size-3 animate-spin" />
							In Progress
						</h4>
						{inProgress.map((f) => (
							<div
								key={f.id}
								className="flex items-center gap-2 rounded bg-blue-500/10 px-2 py-1 text-sm"
							>
								<span className="font-mono text-xs">{f.id}</span>
								<span className="flex-1 truncate">{f.title}</span>
								{f.pipelineStep && (
									<Badge variant="outline" className="text-xs">
										{f.pipelineStep}
									</Badge>
								)}
							</div>
						))}
					</div>
				)}

				{pending.length > 0 ? (
					<div>
						<h4 className="mb-1 flex items-center gap-1 text-muted-foreground text-xs font-medium">
							<Clock className="size-3" />
							Up Next ({pending.length})
						</h4>
						<div className="space-y-1">
							{pending.slice(0, 5).map((f) => (
								<div
									key={f.id}
									className="flex items-center gap-2 text-sm"
								>
									<ArrowRight className="size-3 text-muted-foreground" />
									<span className="font-mono text-xs text-muted-foreground">
										{f.id}
									</span>
									<span className="flex-1 truncate">{f.title}</span>
								</div>
							))}
							{pending.length > 5 && (
								<p className="text-muted-foreground text-xs">
									+{pending.length - 5} more
								</p>
							)}
						</div>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						No pending features in queue
					</p>
				)}
			</CardContent>
		</Card>
	);
}
