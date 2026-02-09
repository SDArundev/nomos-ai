import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanFilterBar } from "./kanban-filter-bar";

interface KanbanToolbarProps {
	selectable: boolean;
	onToggleSelectable: () => void;
	onNewFeature: () => void;
	search?: string;
	category?: string;
	phase?: string;
	onSearchChange: (value: string) => void;
	onCategoryChange: (value: string) => void;
	onPhaseChange: (value: string) => void;
	onClearFilters: () => void;
	selectedCount: number;
	totalFiltered: number;
	onSelectAll: () => void;
	onBulkStatusChange: (status: string) => void;
	onBulkDelete: () => void;
}

export function KanbanToolbar({
	selectable,
	onToggleSelectable,
	onNewFeature,
	search,
	category,
	phase,
	onSearchChange,
	onCategoryChange,
	onPhaseChange,
	onClearFilters,
	selectedCount,
	totalFiltered,
	onSelectAll,
	onBulkStatusChange,
	onBulkDelete,
}: KanbanToolbarProps) {
	return (
		<div className="shrink-0 border-b px-6 py-4">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">Kanban Board</h1>
					<p className="text-muted-foreground text-sm">
						Drag and drop features to change their status
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant={selectable ? "secondary" : "outline"}
						onClick={onToggleSelectable}
					>
						<CheckSquare className="mr-2 size-4" />
						{selectable ? "Cancel Select" : "Select"}
					</Button>
					<Button onClick={onNewFeature}>
						<Plus className="mr-2 size-4" />
						New Feature
					</Button>
				</div>
			</div>
			<KanbanFilterBar
				search={search}
				category={category}
				phase={phase}
				onSearchChange={onSearchChange}
				onCategoryChange={onCategoryChange}
				onPhaseChange={onPhaseChange}
				onClear={onClearFilters}
			/>
			{selectable && selectedCount > 0 && (
				<div className="mx-6 mb-2 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
					<span className="font-medium text-sm">{selectedCount} selected</span>
					<Button size="sm" variant="outline" onClick={onSelectAll}>
						{selectedCount === totalFiltered ? "Deselect All" : "Select All"}
					</Button>
					<select
						className="h-8 rounded border bg-background px-2 text-sm"
						defaultValue=""
						onChange={(e) => {
							if (e.target.value) onBulkStatusChange(e.target.value);
							e.target.value = "";
						}}
					>
						<option value="" disabled>
							Move to...
						</option>
						<option value="backlog">Backlog</option>
						<option value="pending">Pending</option>
						<option value="in_progress">In Progress</option>
						<option value="verified">Verified</option>
					</select>
					<Button size="sm" variant="destructive" onClick={onBulkDelete}>
						<Trash2 className="mr-1 size-3.5" />
						Delete
					</Button>
				</div>
			)}
		</div>
	);
}
