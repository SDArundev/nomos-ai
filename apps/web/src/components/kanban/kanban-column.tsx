import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { FeatureCard } from "./feature-card";

interface KanbanColumnProps {
	status: string;
	title: string;
	features: Array<{
		id: string;
		title: string;
		priority: number | null;
		estimatedSize: string | null;
		dependencies?: string[] | null;
	}>;
	color: string;
	onFeatureSelect?: (id: string) => void;
	selectable?: boolean;
	selectedIds?: Set<string>;
	onToggleSelect?: (id: string) => void;
}

export function KanbanColumn({
	status,
	title,
	features,
	color,
	onFeatureSelect,
	selectable,
	selectedIds,
	onToggleSelect,
}: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const isCollapsed = useAppStore((s) => s.collapsedColumns[status] ?? false);
	const toggleCollapsed = useAppStore((s) => s.toggleColumnCollapsed);

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
					<span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
						{features.length}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => toggleCollapsed(status)}
						className="h-6 w-6"
						aria-label={isCollapsed ? "Expand column" : "Collapse column"}
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform",
								isCollapsed && "-rotate-90",
							)}
						/>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-xs"
									className="h-6 w-6"
									aria-label="Column options"
								/>
							}
						>
							<MoreHorizontal className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => toggleCollapsed(status)}>
								{isCollapsed ? "Expand column" : "Collapse column"}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{!isCollapsed && (
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
								<FeatureCard
									key={feature.id}
									feature={feature}
									onClick={onFeatureSelect}
									selectable={selectable}
									selected={selectedIds?.has(feature.id)}
									onSelect={onToggleSelect}
								/>
							))
						)}
					</div>
				</SortableContext>
			)}
		</div>
	);
}
