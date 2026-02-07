import {
	AlertCircle,
	CheckCircle2,
	Info,
	Loader2,
	Pause,
	Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EventFeedEvent {
	type: string;
	payload: unknown;
	timestamp: number;
}

interface EventFeedProps {
	events: EventFeedEvent[];
}

const eventIcons: Record<string, React.ElementType> = {
	"auto-mode:started": Play,
	"auto-mode:stopped": Pause,
	"auto-mode:idle": Info,
	"auto-mode:error": AlertCircle,
	"feature:started": Loader2,
	"feature:progress": Loader2,
	"feature:completed": CheckCircle2,
	"feature:error": AlertCircle,
};

const eventColors: Record<string, string> = {
	"auto-mode:started": "text-green-500",
	"auto-mode:stopped": "text-yellow-500",
	"auto-mode:idle": "text-muted-foreground",
	"auto-mode:error": "text-red-500",
	"feature:started": "text-blue-500",
	"feature:progress": "text-blue-500",
	"feature:completed": "text-green-500",
	"feature:error": "text-red-500",
};

function formatEventMessage(event: EventFeedEvent): string {
	const payload = event.payload as Record<string, unknown>;
	switch (event.type) {
		case "auto-mode:started":
			return "Auto-mode started";
		case "auto-mode:stopped":
			return "Auto-mode stopped";
		case "auto-mode:idle":
			return "Auto-mode idle - no pending features";
		case "auto-mode:error":
			return `Error: ${payload?.message ?? "Unknown error"}`;
		case "feature:started":
			return `Started: ${payload?.featureId ?? ""}`;
		case "feature:progress":
			return `${payload?.featureId ?? ""}: ${payload?.step ?? ""} ${payload?.status ?? ""}`;
		case "feature:completed":
			return `Completed: ${payload?.featureId ?? ""}`;
		case "feature:error":
			return `Failed: ${payload?.featureId ?? ""}`;
		default:
			return event.type;
	}
}

export function EventFeed({ events }: EventFeedProps) {
	const sortedEvents = [...events].reverse();

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm">Event Feed</CardTitle>
			</CardHeader>
			<CardContent>
				{sortedEvents.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No events yet
					</p>
				) : (
					<div className="max-h-64 space-y-2 overflow-y-auto">
						{sortedEvents.map((event, i) => {
							const Icon = eventIcons[event.type] ?? Info;
							const color = eventColors[event.type] ?? "text-muted-foreground";

							return (
								<div
									key={`${event.timestamp}-${i}`}
									className="flex items-start gap-2 text-sm"
								>
									<Icon
										className={cn("mt-0.5 size-4 shrink-0", color)}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate">
											{formatEventMessage(event)}
										</p>
										<span className="text-muted-foreground text-xs">
											{new Date(event.timestamp).toLocaleTimeString()}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
