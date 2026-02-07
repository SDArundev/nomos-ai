import {
	Bot,
	GitBranch,
	Layers,
	Play,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
	event: {
		id: string;
		type: string;
		payload: string | null;
		createdAt: Date;
	};
}

const typeConfig: Record<string, { icon: typeof Bot; label: string }> = {
	"agent:stream": { icon: Bot, label: "Agent" },
	"agent:complete": { icon: Bot, label: "Agent" },
	"agent:error": { icon: Bot, label: "Agent Error" },
	"feature:update": { icon: Layers, label: "Feature" },
	"feature:create": { icon: Layers, label: "Feature" },
	"auto-mode:start": { icon: Play, label: "Auto-Mode" },
	"auto-mode:stop": { icon: Play, label: "Auto-Mode" },
	"worktree:create": { icon: GitBranch, label: "Worktree" },
	"worktree:delete": { icon: GitBranch, label: "Worktree" },
};

function getRelativeTime(date: Date): string {
	const now = Date.now();
	const then = date.getTime();
	const diff = Math.max(0, now - then);
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function formatPayload(payload: string): string {
	try {
		return JSON.stringify(JSON.parse(payload), null, 2);
	} catch {
		return payload;
	}
}

export function EventCard({ event }: EventCardProps) {
	const [expanded, setExpanded] = useState(false);
	const config = typeConfig[event.type] ?? { icon: Layers, label: event.type };
	const Icon = config.icon;

	return (
		<Card className="transition-colors hover:bg-accent/30">
			<CardContent className="flex items-start gap-3 py-3">
				<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
					<Icon className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
							{config.label}
						</span>
						<span className="text-muted-foreground text-xs">
							{getRelativeTime(event.createdAt)}
						</span>
					</div>
					<p className="mt-1 truncate text-sm">{event.type}</p>
					{event.payload && (
						<button
							type="button"
							onClick={() => setExpanded(!expanded)}
							className="mt-1 flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
						>
							{expanded ? (
								<ChevronUp className="size-3" />
							) : (
								<ChevronDown className="size-3" />
							)}
							{expanded ? "Hide" : "Show"} payload
						</button>
					)}
					{expanded && event.payload && (
						<pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
							{formatPayload(event.payload)}
						</pre>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
