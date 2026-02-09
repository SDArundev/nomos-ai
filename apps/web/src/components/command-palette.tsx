import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
	Activity,
	Bot,
	Brain,
	Columns3,
	FileJson,
	Home,
	Import,
	LayoutDashboard,
	Play,
	Plus,
	Settings,
	Terminal,
} from "lucide-react";
import { useCallback } from "react";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const navItems = [
	{ label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
	{ label: "Kanban Board", icon: Columns3, to: "/kanban" },
	{ label: "Agent Chat", icon: Bot, to: "/agent" },
	{ label: "Activity", icon: Activity, to: "/activity" },
	{ label: "Learnings", icon: Brain, to: "/learnings" },
	{ label: "Terminal", icon: Terminal, to: "/terminal" },
	{ label: "Spec", icon: FileJson, to: "/spec" },
	{ label: "Import Features", icon: Import, to: "/features/import" },
	{ label: "Settings", icon: Settings, to: "/settings" },
	{ label: "Home", icon: Home, to: "/" },
] as const;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();

	const handleSelect = useCallback(
		(to: string) => {
			navigate({ to });
			onOpenChange(false);
		},
		[navigate, onOpenChange],
	);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
			{/* biome-ignore lint/a11y/useSemanticElements: backdrop overlay, not a real button */}
			<div
				role="button"
				tabIndex={-1}
				className="fixed inset-0 bg-black/50"
				onClick={() => onOpenChange(false)}
				onKeyDown={(e) => {
					if (e.key === "Escape") onOpenChange(false);
				}}
			/>
			<Command
				className="relative w-full max-w-lg rounded-xl border bg-popover shadow-2xl"
				onKeyDown={(e) => {
					if (e.key === "Escape") onOpenChange(false);
				}}
			>
				<Command.Input
					placeholder="Type a command or search..."
					className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
					autoFocus
				/>
				<Command.List className="max-h-72 overflow-y-auto p-2">
					<Command.Empty className="py-6 text-center text-muted-foreground text-sm">
						No results found.
					</Command.Empty>

					<Command.Group
						heading="Navigation"
						className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
					>
						{navItems.map(({ label, icon: Icon, to }) => (
							<Command.Item
								key={to}
								value={label}
								onSelect={() => handleSelect(to)}
								className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
							>
								<Icon className="size-4 text-muted-foreground" />
								{label}
							</Command.Item>
						))}
					</Command.Group>

					<Command.Separator className="my-1 h-px bg-border" />

					<Command.Group
						heading="Actions"
						className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
					>
						<Command.Item
							value="New Feature"
							onSelect={() => handleSelect("/kanban")}
							className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
						>
							<Plus className="size-4 text-muted-foreground" />
							New Feature
						</Command.Item>
						<Command.Item
							value="Start Auto-Mode"
							onSelect={() => handleSelect("/dashboard")}
							className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
						>
							<Play className="size-4 text-muted-foreground" />
							Start Auto-Mode
						</Command.Item>
					</Command.Group>
				</Command.List>

				<div className="border-t px-3 py-2">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>Navigate with arrow keys</span>
						<div className="flex gap-2">
							<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								esc
							</kbd>
							<span>to close</span>
						</div>
					</div>
				</div>
			</Command>
		</div>
	);
}
