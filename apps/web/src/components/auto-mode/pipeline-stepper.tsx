import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
	id: string;
	name: string;
	status: string;
}

interface PipelineStepperProps {
	steps: PipelineStep[];
	currentStep?: string | null;
}

export function PipelineStepper({ steps, currentStep }: PipelineStepperProps) {
	return (
		<div className="flex items-center gap-1">
			{steps.map((step, i) => (
				<div key={step.id} className="flex items-center">
					<div className="flex flex-col items-center">
						{step.status === "completed" ? (
							<CheckCircle2 className="size-5 text-green-500" />
						) : step.status === "running" || step.id === currentStep ? (
							<Loader2 className="size-5 animate-spin text-blue-500" />
						) : step.status === "failed" ? (
							<XCircle className="size-5 text-red-500" />
						) : (
							<Circle className="size-5 text-muted-foreground" />
						)}
						<span
							className={cn(
								"mt-1 text-[10px] leading-none",
								step.status === "running" || step.id === currentStep
									? "font-medium text-blue-500"
									: step.status === "completed"
										? "text-green-500"
										: "text-muted-foreground",
							)}
						>
							{step.name}
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
	);
}
