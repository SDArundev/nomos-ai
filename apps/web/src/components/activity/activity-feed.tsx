import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { EventCard } from "./event-card";
import { useEventSubscription } from "@/hooks/use-websocket";
import { orpc } from "@/utils/orpc";

interface ActivityFeedProps {
	limit?: number;
	typeFilter?: string;
}

export function ActivityFeed({ limit = 50, typeFilter }: ActivityFeedProps) {
	const queryOptions = typeFilter
		? orpc.events.byType.queryOptions({ input: { type: typeFilter, limit } })
		: orpc.events.recent.queryOptions({ input: { limit } });

	const { data: events, refetch, isLoading } = useQuery(queryOptions);

	// Auto-refresh on new events
	useEventSubscription(
		["agent:complete", "agent:error", "feature:update", "feature:create", "auto-mode:start", "auto-mode:stop"],
		() => {
			refetch();
		},
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const eventList = events ?? [];

	if (eventList.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				No activity yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{eventList.map((event) => (
				<EventCard key={event.id} event={event} />
			))}
		</div>
	);
}
