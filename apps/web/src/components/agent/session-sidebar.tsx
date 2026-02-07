import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { AgentSession } from "@/store/agent-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SessionSidebarProps {
	sessions: AgentSession[];
	activeSessionId: string | null;
	onSelectSession: (id: string) => void;
	onNewSession: () => void;
	onDeleteSession?: (id: string) => void;
}

const statusColors: Record<string, string> = {
	pending: "bg-yellow-500",
	running: "bg-blue-500",
	completed: "bg-green-500",
	failed: "bg-red-500",
};

export function SessionSidebar({
	sessions,
	activeSessionId,
	onSelectSession,
	onNewSession,
	onDeleteSession,
}: SessionSidebarProps) {
	return (
		<div className="flex h-full w-64 flex-col border-r bg-muted/30">
			<div className="flex items-center justify-between border-b p-3">
				<h3 className="font-semibold text-sm">Sessions</h3>
				<Button variant="ghost" size="icon-sm" onClick={onNewSession}>
					<Plus className="size-4" />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto">
				{sessions.length === 0 && (
					<div className="p-4 text-center text-muted-foreground text-sm">
						No sessions yet
					</div>
				)}

				{sessions.map((session) => (
					<button
						key={session.id}
						type="button"
						className={cn(
							"group flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
							activeSessionId === session.id && "bg-muted",
						)}
						onClick={() => onSelectSession(session.id)}
					>
						<MessageSquare className="size-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span className="truncate font-medium">
									{session.id}
								</span>
								<div
									className={cn(
										"size-2 shrink-0 rounded-full",
										statusColors[session.status] ?? "bg-neutral-400",
									)}
								/>
							</div>
							<div className="flex items-center gap-2 text-muted-foreground text-xs">
								<span>{session.model ?? "sonnet"}</span>
								{(session.messageCount ?? 0) > 0 && (
									<Badge variant="outline" className="text-xs">
										{session.messageCount} msgs
									</Badge>
								)}
							</div>
						</div>
						{onDeleteSession && (
							<button
								type="button"
								className="opacity-0 transition-opacity group-hover:opacity-100"
								onClick={(e) => {
									e.stopPropagation();
									onDeleteSession(session.id);
								}}
							>
								<Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
							</button>
						)}
					</button>
				))}
			</div>
		</div>
	);
}
