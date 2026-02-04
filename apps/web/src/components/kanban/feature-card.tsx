import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
	};
}

export function FeatureCard({ feature }: FeatureCardProps) {
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

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className="cursor-grab active:cursor-grabbing"
			{...attributes}
			{...listeners}
		>
			<CardHeader className="p-4">
				<CardTitle className="line-clamp-1 text-sm">{feature.title}</CardTitle>
				<CardDescription className="flex items-center gap-2">
					{feature.priority && (
						<span className="font-medium text-xs">P{feature.priority}</span>
					)}
					{feature.estimatedSize && (
						<span className="text-xs">{feature.estimatedSize}</span>
					)}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}
