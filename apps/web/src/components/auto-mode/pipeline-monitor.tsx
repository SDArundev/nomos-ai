import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface PipelineMonitorProps {
	featureId: string;
	/** Current feature status — polling is active only when "in_progress" */
	status: string;
}

const PHASE_LABELS: Record<string, string> = {
	init: "Init",
	context: "Understand",
	plan: "Plan",
	execute: "Execute",
	verify: "Review",
	merge: "Ship",
	finish: "Learn",
};

function StepIcon({ status }: { status: string }) {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="size-5 text-green-500" />;
		case "running":
			return <Loader2 className="size-5 animate-spin text-blue-500" />;
		case "failed":
			return <XCircle className="size-5 text-red-500" />;
		default:
			return <Circle className="size-5 text-muted-foreground" />;
	}
}

function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return `${minutes}m ${seconds}s`;
}

const TERMINAL_STATUSES = new Set(["verified", "waiting_approval", "failed"]);

export function PipelineMonitor({ featureId, status }: PipelineMonitorProps) {
	const isActive = status === "in_progress";
	const isTerminal = TERMINAL_STATUSES.has(status);
	const [startTime] = useState(() => Date.now());
	const [elapsed, setElapsed] = useState(0);

	// Poll every 3s while the feature is in_progress, fetch once for terminal states
	const progressQuery = useQuery(
		orpc.pipeline.progress.queryOptions({
			input: { featureId },
			refetchInterval: isActive ? 3000 : false,
			enabled: !!featureId,
		}),
	);

	// Elapsed time ticker
	useEffect(() => {
		if (!isActive) return;
		const interval = setInterval(() => {
			setElapsed(Date.now() - startTime);
		}, 1000);
		return () => clearInterval(interval);
	}, [isActive, startTime]);

	const progress = progressQuery.data;
	const steps = progress?.steps ?? [];
	const currentStep = progress?.currentStep;
	const completedPhase = progress?.completedPhase;

	const currentLabel = currentStep
		? (PHASE_LABELS[currentStep] ?? currentStep)
		: null;

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Pipeline Progress</CardTitle>
					{isActive ? (
						<div className="flex items-center gap-1 text-muted-foreground text-xs">
							<Clock className="size-3" />
							{formatElapsed(elapsed)}
						</div>
					) : isTerminal ? (
						<span
							className={cn(
								"font-medium text-xs",
								status === "failed"
									? "text-red-500"
									: status === "verified"
										? "text-green-500"
										: "text-yellow-500",
							)}
						>
							{status === "failed"
								? "Failed"
								: status === "verified"
									? "Completed"
									: "Pending Review"}
						</span>
					) : null}
				</div>
			</CardHeader>
			<CardContent>
				{progressQuery.isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						Loading progress...
					</div>
				) : steps.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No pipeline data available
					</p>
				) : (
					<div className="space-y-3">
						{/* Step progress bar */}
						<div className="flex items-center gap-1">
							{steps.map((step, i) => (
								<div key={step.id} className="flex items-center">
									<div className="flex flex-col items-center">
										<StepIcon status={step.status} />
										<span
											className={cn(
												"mt-1 text-[10px] leading-none",
												step.status === "running"
													? "font-medium text-blue-500"
													: step.status === "completed"
														? "text-green-500"
														: "text-muted-foreground",
											)}
										>
											{PHASE_LABELS[step.id] ?? step.name}
										</span>
									</div>
									{i < steps.length - 1 && (
										<div
											className={cn(
												"mx-1 h-0.5 w-6",
												step.status === "completed"
													? "bg-green-500"
													: "bg-muted-foreground/30",
											)}
										/>
									)}
								</div>
							))}
						</div>

						{/* Current phase + checkpoint info */}
						<div className="flex items-center justify-between text-xs">
							{isTerminal ? (
								<span
									className={cn(
										"font-medium",
										status === "failed"
											? "text-red-500"
											: status === "verified"
												? "text-green-500"
												: "text-yellow-500",
									)}
								>
									{status === "failed"
										? "Pipeline failed"
										: status === "verified"
											? "Pipeline completed"
											: "Awaiting approval"}
								</span>
							) : currentLabel ? (
								<span className="font-medium text-blue-500">
									Phase: {currentLabel}
								</span>
							) : (
								<span className="text-muted-foreground">Waiting...</span>
							)}
							{completedPhase != null && (
								<span className="text-muted-foreground">
									Checkpoint: {completedPhase}/6
								</span>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
