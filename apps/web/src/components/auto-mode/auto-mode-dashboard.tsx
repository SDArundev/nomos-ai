import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pause, Play, Settings2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAutoMode } from "@/hooks/use-auto-mode";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";
import { EventFeed } from "./event-feed";
import { FeatureQueue } from "./feature-queue";

export function AutoModeDashboard() {
	const projectId = useAppStore((s) => s.selectedProjectId);
	const queryClient = useQueryClient();
	const { status, events, start, stop, starting, stopping } = useAutoMode();
	const [showConfig, setShowConfig] = useState(false);

	const configQuery = useQuery(orpc.autoMode.getConfig.queryOptions());
	const [concurrency, setConcurrency] = useState<number>(1);
	const [maxRetries, setMaxRetries] = useState<number>(3);

	// Sync config from server
	const config = configQuery.data;
	const displayConcurrency = config?.maxConcurrency ?? concurrency;
	const _displayRetries = config?.maxRetries ?? maxRetries;

	const setConfigMutation = useMutation(
		orpc.autoMode.setConfig.mutationOptions({
			onSuccess: () => {
				toast.success("Config updated");
				queryClient.invalidateQueries({
					queryKey: orpc.autoMode.getConfig.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const retryFeatureMutation = useMutation(
		orpc.autoMode.retryFeature.mutationOptions({
			onSuccess: (data) => {
				toast.success(data.message);
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.autoMode.status.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const handleStart = () => {
		if (projectId) {
			start(projectId);
		}
	};

	const handleSaveConfig = () => {
		setConfigMutation.mutate({
			maxConcurrency: concurrency,
			maxRetries: maxRetries,
		});
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
						<div className="flex items-center gap-2">
							<Badge
								variant={status.isRunning ? "default" : "secondary"}
								className={
									status.isRunning ? "bg-green-500 hover:bg-green-600" : ""
								}
							>
								{status.isRunning ? "Running" : "Stopped"}
							</Badge>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowConfig(!showConfig)}
							>
								<Settings2 className="size-4" />
							</Button>
						</div>
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
							<div>
								<span className="text-muted-foreground">Concurrency: </span>
								<span className="font-medium">{displayConcurrency}</span>
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

			{/* Config Panel (collapsible) */}
			{showConfig && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">Configuration</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="am-concurrency">Max Concurrency</Label>
								<Input
									id="am-concurrency"
									type="number"
									min={1}
									max={5}
									value={concurrency}
									onChange={(e) =>
										setConcurrency(Number.parseInt(e.target.value, 10) || 1)
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="am-retries">Max Retries</Label>
								<Input
									id="am-retries"
									type="number"
									min={0}
									max={10}
									value={maxRetries}
									onChange={(e) =>
										setMaxRetries(Number.parseInt(e.target.value, 10) || 0)
									}
								/>
							</div>
						</div>
						<Button
							size="sm"
							className="mt-3"
							onClick={handleSaveConfig}
							disabled={setConfigMutation.isPending}
						>
							{setConfigMutation.isPending ? "Saving..." : "Save Config"}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Queue + Feed side by side */}
			<div className="grid gap-6 lg:grid-cols-2">
				<FeatureQueue
					onRetry={(featureId) => retryFeatureMutation.mutate({ featureId })}
					retrying={retryFeatureMutation.isPending}
				/>
				<EventFeed events={events} />
			</div>
		</div>
	);
}
