import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { applyTheme, resetTheme, themes } from "@/lib/themes";

interface GeneralTabProps {
	settings: Record<string, unknown>;
	onUpdate: (key: string, value: unknown, scope?: "global" | "project") => void;
}

export function GeneralTab({ settings, onUpdate }: GeneralTabProps) {
	const currentTheme = (settings.theme as string) ?? "default";
	const { setTheme } = useTheme();

	const handleThemeChange = (themeId: string) => {
		onUpdate("theme", themeId);
		if (themeId === "default") {
			resetTheme();
			setTheme("dark");
		} else {
			applyTheme(themeId);
			setTheme("dark");
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">General</h2>
				<p className="text-muted-foreground text-sm">
					Application-wide settings
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Theme</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
						{themes.map((theme) => (
							<button
								key={theme.id}
								type="button"
								className={cn(
									"group relative flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:border-primary",
									currentTheme === theme.id && "border-primary ring-1 ring-primary",
								)}
								onClick={() => handleThemeChange(theme.id)}
							>
								<div className="flex gap-1">
									<div
										className="size-4 rounded-full border"
										style={{ backgroundColor: theme.dark.background }}
									/>
									<div
										className="size-4 rounded-full border"
										style={{ backgroundColor: theme.dark.primary }}
									/>
									<div
										className="size-4 rounded-full border"
										style={{ backgroundColor: theme.dark.accent }}
									/>
								</div>
								<span className="text-xs">{theme.name}</span>
								{currentTheme === theme.id && (
									<Check className="absolute top-1 right-1 size-3 text-primary" />
								)}
							</button>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Sidebar</CardTitle>
				</CardHeader>
				<CardContent>
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={(settings.sidebar_open as boolean) ?? true}
							onChange={(e) => onUpdate("sidebar_open", e.target.checked)}
							className="rounded border"
						/>
						<span className="text-sm">Sidebar open by default</span>
					</label>
				</CardContent>
			</Card>
		</div>
	);
}
