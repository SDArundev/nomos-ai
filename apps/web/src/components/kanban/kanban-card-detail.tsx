import { useQuery } from "@tanstack/react-query";
import {
	CheckCircle2,
	Clock,
	FileCode2,
	GitBranch,
	Loader2,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

interface KanbanCardDetailProps {
	featureId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
	backlog: { icon: Clock, color: "text-neutral-500", label: "Backlog" },
	pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
	in_progress: { icon: Loader2, color: "text-blue-500", label: "In Progress" },
	waiting_approval: { icon: GitBranch, color: "text-purple-500", label: "Waiting Approval" },
	verified: { icon: CheckCircle2, color: "text-green-500", label: "Verified" },
	failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

export function KanbanCardDetail({
	featureId,
	open,
	onOpenChange,
}: KanbanCardDetailProps) {
	const featureQuery = useQuery({
		...orpc.features.get.queryOptions({
			input: { id: featureId ?? "" },
		}),
		enabled: !!featureId && open,
	});

	const pipelineQuery = useQuery({
		...orpc.pipeline.progress.queryOptions({
			input: { featureId: featureId ?? "" },
		}),
		enabled: !!featureId && open,
	});

	const feature = featureQuery.data;
	const pipeline = pipelineQuery.data;
	const status = statusConfig[feature?.status ?? ""] ?? statusConfig.backlog;
	const StatusIcon = status.icon;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-[480px] overflow-y-auto sm:max-w-lg">
				{featureQuery.isLoading ? (
					<div className="space-y-4 pt-6">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : feature ? (
					<>
						<SheetHeader>
							<div className="flex items-center gap-2">
								<span className="font-mono text-muted-foreground text-sm">
									{feature.id}
								</span>
								<Badge variant="outline" className={status.color}>
									<StatusIcon className="mr-1 size-3" />
									{status.label}
								</Badge>
							</div>
							<SheetTitle>{feature.title}</SheetTitle>
							<SheetDescription>{feature.description}</SheetDescription>
						</SheetHeader>

						<div className="mt-6 space-y-6">
							{/* Metadata */}
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-muted-foreground">Category</span>
									<p>{feature.category}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Phase</span>
									<p>{feature.phase}</p>
								</div>
								<div>
									<span className="text-muted-foreground">Size</span>
									<p>
										{feature.estimatedSize ? (
											<Badge variant="outline">{feature.estimatedSize}</Badge>
										) : (
											"—"
										)}
									</p>
								</div>
								<div>
									<span className="text-muted-foreground">Priority</span>
									<p>{feature.priority ?? "—"}</p>
								</div>
							</div>

							{/* Acceptance Criteria */}
							{feature.acceptanceCriteria && feature.acceptanceCriteria.length > 0 && (
								<div>
									<h4 className="mb-2 font-semibold text-sm">
										Acceptance Criteria
									</h4>
									<ul className="space-y-1">
										{feature.acceptanceCriteria.map((ac: string, i: number) => (
											<li
												key={`ac-${i}`}
												className="flex items-start gap-2 text-sm"
											>
												<span className="mt-0.5 size-4 shrink-0 rounded-full border text-center text-xs leading-4">
													{i + 1}
												</span>
												<span>{ac}</span>
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Pipeline Progress */}
							{pipeline && pipeline.steps && (
								<div>
									<h4 className="mb-2 font-semibold text-sm">
										Pipeline Progress
									</h4>
									<div className="space-y-2">
										{pipeline.steps.map(
											(step: { id: string; name: string; status: string }) => (
												<div
													key={step.id}
													className="flex items-center gap-2 text-sm"
												>
													{step.status === "completed" ? (
														<CheckCircle2 className="size-4 text-green-500" />
													) : step.status === "running" ? (
														<Loader2 className="size-4 animate-spin text-blue-500" />
													) : step.status === "failed" ? (
														<XCircle className="size-4 text-red-500" />
													) : (
														<div className="size-4 rounded-full border" />
													)}
													<span
														className={
															step.status === "running"
																? "font-medium text-blue-500"
																: step.status === "completed"
																	? "text-muted-foreground"
																	: ""
														}
													>
														{step.name}
													</span>
												</div>
											),
										)}
									</div>
								</div>
							)}

							{/* Files */}
							{feature.files && (
								<div>
									<h4 className="mb-2 font-semibold text-sm">Files</h4>
									<div className="space-y-1">
										{feature.files.create?.map((f: string) => (
											<div
												key={f}
												className="flex items-center gap-2 text-sm"
											>
												<FileCode2 className="size-3 text-green-500" />
												<span className="font-mono text-xs">{f}</span>
											</div>
										))}
										{feature.files.modify?.map((f: string) => (
											<div
												key={f}
												className="flex items-center gap-2 text-sm"
											>
												<FileCode2 className="size-3 text-yellow-500" />
												<span className="font-mono text-xs">{f}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Dependencies */}
							{feature.dependencies && feature.dependencies.length > 0 && (
								<div>
									<h4 className="mb-2 font-semibold text-sm">Dependencies</h4>
									<div className="flex flex-wrap gap-1">
										{feature.dependencies.map((dep: string) => (
											<Badge key={dep} variant="outline" className="font-mono">
												{dep}
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* Error */}
							{feature.error && (
								<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
									<h4 className="mb-1 font-semibold text-destructive text-sm">
										Error
									</h4>
									<pre className="whitespace-pre-wrap font-mono text-xs">
										{feature.error}
									</pre>
								</div>
							)}
						</div>
					</>
				) : (
					<div className="flex h-full items-center justify-center">
						<p className="text-muted-foreground">Feature not found</p>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
