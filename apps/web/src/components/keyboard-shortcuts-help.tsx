import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS, type ShortcutDefinition } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsHelpProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const GROUPS = ["General", "Navigation", "Actions"] as const;

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
	return (
		<div className="flex items-center justify-between py-1.5">
			<span className="text-sm">{shortcut.label}</span>
			<div className="flex items-center gap-1">
				{shortcut.keys.map((key, i) => (
					<span key={`${shortcut.label}-${key}-${i}`}>
						{i > 0 && (
							<span className="mx-0.5 text-muted-foreground text-xs">
								then
							</span>
						)}
						<kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
							{key}
						</kbd>
					</span>
				))}
			</div>
		</div>
	);
}

export function KeyboardShortcutsHelp({
	open,
	onOpenChange,
}: KeyboardShortcutsHelpProps) {
	const grouped = GROUPS.reduce(
		(acc, group) => {
			acc[group] = SHORTCUTS.filter((s) => s.group === group);
			return acc;
		},
		{} as Record<string, ShortcutDefinition[]>,
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Keyboard Shortcuts</DialogTitle>
					<DialogDescription>
						Quick reference for all available keyboard shortcuts.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					{GROUPS.map((group) => (
						<div key={group}>
							<h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
								{group}
							</h3>
							<div className="divide-y divide-border/50">
								{grouped[group].map((shortcut) => (
									<ShortcutRow
										key={shortcut.label}
										shortcut={shortcut}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
