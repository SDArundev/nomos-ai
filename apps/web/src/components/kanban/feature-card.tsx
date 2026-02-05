import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface FeatureCardProps {
	feature: {
		id: string;
		title: string;
		priority: number | null;
		estimatedSize: string | null;
		dependencies?: string[] | null;
	};
	onClick?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
	high: "bg-red-500 text-white hover:bg-red-600",
	medium: "bg-yellow-500 text-black hover:bg-yellow-600",
	low: "bg-neutral-400 text-white hover:bg-neutral-500",
};

function getPriorityLevel(priority: number | null): string {
	if (priority === null) return "low";
	if (priority <= 33) return "high";
	if (priority <= 66) return "medium";
	return "low";
}

export function FeatureCard({ feature, onClick }: FeatureCardProps) {
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
			<CardHeader className="p-4">
				<div className="mb-1 flex items-center justify-between">
					<span className="font-mono text-muted-foreground text-xs">
						{feature.id}
					</span>
					<Badge className={priorityColors[priorityLevel]}>
						{priorityLevel.toUpperCase()}
					</Badge>
				</div>
				<CardTitle className="line-clamp-1 text-sm">{feature.title}</CardTitle>
				<CardDescription className="flex items-center gap-2">
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
				</CardDescription>
			</CardHeader>
		</Card>
	);
}
