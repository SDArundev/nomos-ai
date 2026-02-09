import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	SHORTCUTS,
	type ShortcutDefinition,
	shortcutSettingsKey,
} from "@/hooks/use-keyboard-shortcuts";

interface ShortcutsTabProps {
	settings: Record<string, unknown>;
	onUpdate: (key: string, value: unknown, scope?: "global" | "project") => void;
}

const GROUPS = ["General", "Navigation", "Actions"] as const;

function keysToDisplay(keys: string[]): string {
	return keys.join(" + ");
}

function ShortcutEditor({
	shortcut,
	customKeys,
	onSave,
	onReset,
}: {
	shortcut: ShortcutDefinition;
	customKeys: string[] | undefined;
	onSave: (keys: string[]) => void;
	onReset: () => void;
}) {
	const [recording, setRecording] = useState(false);
	const [pendingKeys, setPendingKeys] = useState<string[]>([]);

	useEffect(() => {
		if (!recording) return;

		const handler = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			// Ignore modifier-only presses
			if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

			const keys: string[] = [];
			if (e.metaKey) keys.push("Cmd");
			if (e.ctrlKey) keys.push("Ctrl");
			if (e.altKey) keys.push("Alt");
			if (e.shiftKey) keys.push("Shift");
			keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);

			setPendingKeys(keys);
			setRecording(false);
			onSave(keys);
		};

		window.addEventListener("keydown", handler, { capture: true });
		return () =>
			window.removeEventListener("keydown", handler, { capture: true });
	}, [recording, onSave]);

	const displayKeys = customKeys ?? shortcut.keys;
	const isCustom = customKeys !== undefined;

	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-sm">{shortcut.label}</span>
			<div className="flex items-center gap-2">
				{recording ? (
					<span className="animate-pulse rounded border border-primary bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
						Press keys...
					</span>
				) : (
					<button
						type="button"
						onClick={() => {
							setPendingKeys([]);
							setRecording(true);
						}}
						className="rounded border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:border-primary hover:text-foreground"
						title="Click to change shortcut"
					>
						{keysToDisplay(pendingKeys.length > 0 ? pendingKeys : displayKeys)}
					</button>
				)}
				{isCustom && (
					<button
						type="button"
						onClick={onReset}
						className="text-muted-foreground hover:text-foreground"
						title="Reset to default"
						aria-label={`Reset ${shortcut.label} shortcut`}
					>
						<RotateCcw className="size-3.5" />
					</button>
				)}
			</div>
		</div>
	);
}

export function ShortcutsTab({ settings, onUpdate }: ShortcutsTabProps) {
	const getCustomKeys = useCallback(
		(label: string): string[] | undefined => {
			const key = shortcutSettingsKey(label);
			const value = settings[key];
			return Array.isArray(value) ? value : undefined;
		},
		[settings],
	);

	const handleSave = useCallback(
		(label: string, keys: string[]) => {
			const key = shortcutSettingsKey(label);
			onUpdate(key, keys, "global");
		},
		[onUpdate],
	);

	const handleReset = useCallback(
		(label: string) => {
			const key = shortcutSettingsKey(label);
			onUpdate(key, null, "global");
		},
		[onUpdate],
	);

	const handleResetAll = useCallback(() => {
		for (const shortcut of SHORTCUTS) {
			const key = shortcutSettingsKey(shortcut.label);
			if (settings[key] != null) {
				onUpdate(key, null, "global");
			}
		}
	}, [settings, onUpdate]);

	const grouped = GROUPS.reduce(
		(acc, group) => {
			acc[group] = SHORTCUTS.filter((s) => s.group === group);
			return acc;
		},
		{} as Record<string, ShortcutDefinition[]>,
	);

	const hasCustomShortcuts = SHORTCUTS.some(
		(s) => settings[shortcutSettingsKey(s.label)] != null,
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold text-lg">Keyboard Shortcuts</h2>
					<p className="text-muted-foreground text-sm">
						Customize keyboard shortcuts. Click a binding to change it.
					</p>
				</div>
				{hasCustomShortcuts && (
					<button
						type="button"
						onClick={handleResetAll}
						className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground"
					>
						<RotateCcw className="size-3.5" />
						Reset All
					</button>
				)}
			</div>

			{GROUPS.map((group) => (
				<Card key={group}>
					<CardHeader>
						<CardTitle className="text-sm">{group}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="divide-y divide-border/50">
							{grouped[group].map((shortcut) => (
								<ShortcutEditor
									key={shortcut.label}
									shortcut={shortcut}
									customKeys={getCustomKeys(shortcut.label)}
									onSave={(keys) => handleSave(shortcut.label, keys)}
									onReset={() => handleReset(shortcut.label)}
								/>
							))}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
