import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface AutoModeTabProps {
	settings: Record<string, unknown>;
	onUpdate: (key: string, value: unknown, scope?: "global" | "project") => void;
}

const planningModes = [
	{ value: "skip", label: "Skip", description: "No planning phase" },
	{ value: "lite", label: "Lite", description: "Quick plan overview" },
	{ value: "spec", label: "Spec", description: "Detailed specification" },
	{ value: "full", label: "Full", description: "Full plan with approval" },
];

export function AutoModeTab({ settings, onUpdate }: AutoModeTabProps) {
	const concurrency = (settings.max_concurrency as number) ?? 1;
	const planningMode = (settings.planning_mode as string) ?? "lite";
	const useWorktrees = (settings.use_worktrees as boolean) ?? false;
	const skipTests = (settings.skip_tests as boolean) ?? false;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Auto-Mode</h2>
				<p className="text-muted-foreground text-sm">
					Configure autonomous feature development
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Concurrency</CardTitle>
				</CardHeader>
				<CardContent>
					<Select
						value={String(concurrency)}
						onValueChange={(v) => onUpdate("max_concurrency", Number(v))}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[1, 2, 3, 4, 5].map((n) => (
								<SelectItem key={n} value={String(n)}>
									{n} {n === 1 ? "feature" : "features"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="mt-1 text-muted-foreground text-xs">
						Max features processed concurrently
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Planning Mode</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{planningModes.map((mode) => (
							<label
								key={mode.value}
								className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary"
							>
								<input
									type="radio"
									name="planning"
									value={mode.value}
									checked={planningMode === mode.value}
									onChange={() => onUpdate("planning_mode", mode.value)}
									className="accent-primary"
								/>
								<div>
									<span className="text-sm font-medium">{mode.label}</span>
									<p className="text-muted-foreground text-xs">
										{mode.description}
									</p>
								</div>
							</label>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Options</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={useWorktrees}
							onChange={(e) => onUpdate("use_worktrees", e.target.checked)}
							className="rounded border"
						/>
						<div>
							<span className="text-sm">Use Git Worktrees</span>
							<p className="text-muted-foreground text-xs">
								Isolate each feature in its own worktree
							</p>
						</div>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={skipTests}
							onChange={(e) => onUpdate("skip_tests", e.target.checked)}
							className="rounded border"
						/>
						<div>
							<span className="text-sm">Skip Tests</span>
							<p className="text-muted-foreground text-xs">
								Skip test execution during pipeline
							</p>
						</div>
					</label>
				</CardContent>
			</Card>
		</div>
	);
}
