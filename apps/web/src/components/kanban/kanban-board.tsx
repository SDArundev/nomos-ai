import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureCard } from "./feature-card";
import { KanbanColumn } from "./kanban-column";

interface KanbanBoardProps {
	features: Array<{
		id: string;
		title: string;
		status: string;
		priority: number | null;
		estimatedSize: string | null;
		dependencies?: string[] | null;
	}>;
	onStatusChange: (id: string, status: string) => void;
}

// Note: 'failed' is a valid transition target but not shown as a column
// Features with 'failed' status won't appear on the board (filtered out intentionally)
const VALID_TRANSITIONS: Record<string, string[]> = {
	backlog: ["pending", "failed"],
	pending: ["in_progress", "failed"],
	in_progress: ["waiting_approval", "failed"],
	waiting_approval: ["verified", "failed"],
	verified: [],
	failed: [],
};

const KANBAN_COLUMNS = [
	{
		status: "backlog",
		title: "Backlog",
		color: "bg-neutral-500",
	},
	{
		status: "pending",
		title: "Pending",
		color: "bg-yellow-500",
	},
	{
		status: "in_progress",
		title: "In Progress",
		color: "bg-blue-500",
	},
	{
		status: "waiting_approval",
		title: "Waiting Approval",
		color: "bg-purple-500",
	},
	{
		status: "verified",
		title: "Verified",
		color: "bg-green-500",
	},
] as const;

export function KanbanBoard({ features, onStatusChange }: KanbanBoardProps) {
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const featureId = active.id as string;
			const newStatus = over.id as string;

			// Only update if dropped on a column (not on another card)
			if (KANBAN_COLUMNS.some((col) => col.status === newStatus)) {
				const feature = features.find((f) => f.id === featureId);
				if (!feature) {
					toast.error("Feature not found");
					setActiveId(null);
					return;
				}

				const currentStatus = feature.status;
				const allowedTransitions = VALID_TRANSITIONS[currentStatus];

				if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
					toast.error(
						`Cannot move directly from ${currentStatus} to ${newStatus}`,
					);
					setActiveId(null);
					return;
				}

				onStatusChange(featureId, newStatus);
			}
		}

		setActiveId(null);
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const activeFeature = activeId
		? features.find((f) => f.id === activeId)
		: null;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<div className="flex h-full gap-4 overflow-x-auto p-4">
				{KANBAN_COLUMNS.map((column) => (
					<KanbanColumn
						key={column.status}
						status={column.status}
						title={column.title}
						color={column.color}
						features={features.filter((f) => f.status === column.status)}
					/>
				))}
			</div>

			<DragOverlay>
				{activeFeature ? <FeatureCard feature={activeFeature} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
