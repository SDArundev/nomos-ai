import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { FeatureCard } from "./feature-card";

interface KanbanColumnProps {
	status: string;
	title: string;
	features: Array<{
		id: string;
		title: string;
		priority: number | null;
		estimatedSize: string | null;
	}>;
	color: string;
}

export function KanbanColumn({
	status,
	title,
	features,
	color,
}: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: status });

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex h-full w-72 flex-col rounded-lg border bg-card p-4 transition-colors",
				isOver && "bg-accent/30",
			)}
		>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className={`h-2 w-2 rounded-full ${color}`} />
					<h3 className="font-semibold text-sm">{title}</h3>
				</div>
				<span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
					{features.length}
				</span>
			</div>

			<SortableContext
				items={features.map((f) => f.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="flex flex-1 flex-col gap-2 overflow-y-auto">
					{features.length === 0 ? (
						<p className="text-center text-muted-foreground text-sm">
							No features
						</p>
					) : (
						features.map((feature) => (
							<FeatureCard key={feature.id} feature={feature} />
						))
					)}
				</div>
			</SortableContext>
		</div>
	);
}
