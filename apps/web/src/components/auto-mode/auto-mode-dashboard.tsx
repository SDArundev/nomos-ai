import { AlertTriangle, Pause, Play, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoMode } from "@/hooks/use-auto-mode";
import { useAppStore } from "@/store";
import { EventFeed } from "./event-feed";
import { FeatureQueue } from "./feature-queue";

export function AutoModeDashboard() {
	const projectId = useAppStore((s) => s.selectedProjectId);
	const { status, events, start, stop, starting, stopping } = useAutoMode();

	const handleStart = () => {
		if (projectId) {
			start(projectId, ".");
		}
	};

	return (
		<div className="space-y-6">
			{/* Status Bar */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Zap className="size-4" />
							Auto-Mode
						</CardTitle>
						<Badge
							variant={status.isRunning ? "default" : "secondary"}
							className={
								status.isRunning
									? "bg-green-500 hover:bg-green-600"
									: ""
							}
						>
							{status.isRunning ? "Running" : "Stopped"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4 text-sm">
							<div>
								<span className="text-muted-foreground">Active: </span>
								<span className="font-medium">
									{status.runningFeatures.length}
								</span>
							</div>
							{status.consecutiveFailures > 0 && (
								<div className="flex items-center gap-1 text-yellow-500">
									<AlertTriangle className="size-3" />
									<span>{status.consecutiveFailures} failures</span>
								</div>
							)}
						</div>
						{status.isRunning ? (
							<Button
								variant="destructive"
								size="sm"
								onClick={stop}
								disabled={stopping}
							>
								<Pause className="mr-1 size-4" />
								Stop
							</Button>
						) : (
							<Button
								size="sm"
								onClick={handleStart}
								disabled={starting || !projectId}
							>
								<Play className="mr-1 size-4" />
								Start
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Queue + Feed side by side */}
			<div className="grid gap-6 lg:grid-cols-2">
				<FeatureQueue />
				<EventFeed events={events} />
			</div>
		</div>
	);
}
