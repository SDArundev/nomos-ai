import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface ModelTabProps {
	settings: Record<string, unknown>;
	onUpdate: (key: string, value: unknown, scope?: "global" | "project") => void;
}

const thinkingLevels = [
	{ value: "none", label: "None", description: "No thinking" },
	{ value: "low", label: "Low", description: "1K tokens" },
	{ value: "standard", label: "Standard", description: "10K tokens" },
	{ value: "high", label: "High", description: "16K tokens" },
	{ value: "ultrathink", label: "Ultrathink", description: "32K tokens" },
];

export function ModelTab({ settings, onUpdate }: ModelTabProps) {
	const modelsQuery = useQuery(orpc.models.list.queryOptions());
	const models = modelsQuery.data ?? [];

	const currentModel = (settings.default_model as string) ?? "sonnet";
	const currentThinking = (settings.thinking_level as string) ?? "standard";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Model Configuration</h2>
				<p className="text-muted-foreground text-sm">
					Default model and thinking settings
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Default Model</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Select
						value={currentModel}
						onValueChange={(v) => onUpdate("default_model", v)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{models.map((m: { alias: string; modelId: string }) => (
								<SelectItem key={m.alias} value={m.alias}>
									<div className="flex items-center gap-2">
										<span>{m.alias}</span>
										<Badge variant="outline" className="text-xs">
											{m.modelId}
										</Badge>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Thinking Level</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{thinkingLevels.map((level) => (
							<label
								key={level.value}
								className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary"
							>
								<input
									type="radio"
									name="thinking"
									value={level.value}
									checked={currentThinking === level.value}
									onChange={() => onUpdate("thinking_level", level.value)}
									className="accent-primary"
								/>
								<div>
									<span className="font-medium text-sm">{level.label}</span>
									<p className="text-muted-foreground text-xs">
										{level.description}
									</p>
								</div>
							</label>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
