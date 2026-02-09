import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GitBranch, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface KanbanCardProps {
	feature: {
		id: string;
		title: string;
		priority: number | null;
		estimatedSize: string | null;
		dependencies?: string[] | null;
		status: string;
		pipelineStep?: string | null;
		locked?: boolean;
		lockedBy?: string | null;
		completedBy?: string | null;
		startedAt?: string | null;
	};
	onClick?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
	high: "bg-red-500 text-white hover:bg-red-600",
	medium: "bg-yellow-500 text-black hover:bg-yellow-600",
	low: "bg-neutral-400 text-white hover:bg-neutral-500",
};

const statusIndicators: Record<string, string> = {
	backlog: "bg-neutral-500",
	pending: "bg-yellow-500",
	in_progress: "bg-blue-500",
	waiting_approval: "bg-purple-500",
	verified: "bg-green-500",
	failed: "bg-red-500",
};

function getPriorityLevel(priority: number | null): string {
	if (priority === null) return "low";
	if (priority <= 33) return "high";
	if (priority <= 66) return "medium";
	return "low";
}

export function KanbanCard({ feature, onClick }: KanbanCardProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: feature.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const priorityLevel = getPriorityLevel(feature.priority);
	const dependencyCount = feature.dependencies?.length ?? 0;
	const isRunning = feature.status === "in_progress";
	const assignee = feature.lockedBy ?? feature.completedBy;

	const handleClick = () => {
		if (!isDragging && onClick) {
			onClick(feature.id);
		}
	};

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className="cursor-grab transition-colors hover:border-primary active:cursor-grabbing"
			onClick={handleClick}
			{...attributes}
			{...listeners}
		>
			<CardHeader className="p-3">
				<div className="mb-1 flex items-center justify-between">
					<div className="flex items-center gap-1.5">
						<div
							className={`size-2 rounded-full ${statusIndicators[feature.status] ?? "bg-neutral-400"}`}
						/>
						<span className="font-mono text-muted-foreground text-xs">
							{feature.id}
						</span>
					</div>
					<Badge className={priorityColors[priorityLevel]}>
						{priorityLevel.toUpperCase()}
					</Badge>
				</div>

				<CardTitle className="line-clamp-2 text-sm">{feature.title}</CardTitle>

				<CardDescription className="flex flex-wrap items-center gap-2">
					{feature.estimatedSize && (
						<Badge variant="outline" className="text-xs">
							{feature.estimatedSize}
						</Badge>
					)}
					{dependencyCount > 0 && (
						<span className="flex items-center gap-1 text-xs">
							<GitBranch className="h-3 w-3" />
							{dependencyCount}
						</span>
					)}
					{isRunning && feature.pipelineStep && (
						<span className="flex items-center gap-1 text-blue-500 text-xs">
							<Loader2 className="h-3 w-3 animate-spin" />
							{feature.pipelineStep}
						</span>
					)}
					{feature.startedAt && (
						<span className="flex items-center gap-1 text-muted-foreground text-xs">
							<Clock className="h-3 w-3" />
						</span>
					)}
				</CardDescription>

				{assignee && (
					<div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
						<User className="h-3 w-3" />
						<span className="truncate">{assignee}</span>
					</div>
				)}
			</CardHeader>
		</Card>
	);
}
