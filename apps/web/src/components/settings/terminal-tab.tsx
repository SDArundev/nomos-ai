import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TerminalTabProps {
	settings: Record<string, unknown>;
	onUpdate: (key: string, value: unknown, scope?: "global" | "project") => void;
}

export function TerminalTab({ settings, onUpdate }: TerminalTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Terminal</h2>
				<p className="text-muted-foreground text-sm">
					Terminal appearance and behavior
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Font Size</CardTitle>
				</CardHeader>
				<CardContent>
					<Input
						type="number"
						min={10}
						max={24}
						value={(settings.terminal_font_size as number) ?? 14}
						onChange={(e) =>
							onUpdate("terminal_font_size", Number(e.target.value))
						}
						className="w-24"
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Font Family</CardTitle>
				</CardHeader>
				<CardContent>
					<Input
						value={
							(settings.terminal_font_family as string) ??
							"'JetBrains Mono', 'Fira Code', monospace"
						}
						onChange={(e) => onUpdate("terminal_font_family", e.target.value)}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Scrollback Buffer</CardTitle>
				</CardHeader>
				<CardContent>
					<Input
						type="number"
						min={1000}
						max={100000}
						step={1000}
						value={(settings.terminal_scrollback as number) ?? 50000}
						onChange={(e) =>
							onUpdate("terminal_scrollback", Number(e.target.value))
						}
						className="w-32"
					/>
					<p className="mt-1 text-muted-foreground text-xs">
						Maximum scrollback buffer in bytes
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
