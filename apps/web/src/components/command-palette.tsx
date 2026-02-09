import { useQuery } from "@tanstack/react-query";
import { useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
	Activity,
	Bot,
	Brain,
	Clock,
	Columns3,
	FileJson,
	Home,
	Import,
	LayoutDashboard,
	Play,
	Plus,
	Search,
	Settings,
	Terminal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { orpc } from "@/utils/orpc";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const RECENT_ACTIONS_KEY = "nomos:recent-actions";
const MAX_RECENT = 5;

interface RecentAction {
	label: string;
	to: string;
	timestamp: number;
}

function getRecentActions(): RecentAction[] {
	try {
		const stored = localStorage.getItem(RECENT_ACTIONS_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function addRecentAction(label: string, to: string) {
	const recent = getRecentActions().filter((a) => a.to !== to);
	recent.unshift({ label, to, timestamp: Date.now() });
	localStorage.setItem(
		RECENT_ACTIONS_KEY,
		JSON.stringify(recent.slice(0, MAX_RECENT)),
	);
}

const navItems = [
	{ label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", shortcut: "g d" },
	{ label: "Kanban Board", icon: Columns3, to: "/kanban", shortcut: "g k" },
	{ label: "Agent Chat", icon: Bot, to: "/agent", shortcut: "g a" },
	{ label: "Activity", icon: Activity, to: "/activity", shortcut: "g l" },
	{ label: "Learnings", icon: Brain, to: "/learnings", shortcut: undefined },
	{ label: "Terminal", icon: Terminal, to: "/terminal", shortcut: "g t" },
	{ label: "Spec", icon: FileJson, to: "/spec", shortcut: undefined },
	{ label: "Import Features", icon: Import, to: "/features/import", shortcut: undefined },
	{ label: "Settings", icon: Settings, to: "/settings", shortcut: "g s" },
	{ label: "Home", icon: Home, to: "/", shortcut: "g h" },
] as const;

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const [search, setSearch] = useState("");
	const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

	const isOnKanban = matchRoute({ to: "/kanban" });
	const isOnAgent = matchRoute({ to: "/agent" });
	const isOnDashboard = matchRoute({ to: "/dashboard" });

	// Load recent actions when palette opens
	useEffect(() => {
		if (open) {
			setRecentActions(getRecentActions());
			setSearch("");
		}
	}, [open]);

	// Feature search query — only when there's search text
	const featuresQuery = useQuery({
		...orpc.features.list.queryOptions(),
		enabled: open && search.length > 0,
	});

	const filteredFeatures = search.length > 0
		? (Array.isArray(featuresQuery.data) ? featuresQuery.data : [])
				.filter(
					(f: { title: string; id: string }) =>
						f.title.toLowerCase().includes(search.toLowerCase()) ||
						f.id.toLowerCase().includes(search.toLowerCase()),
				)
				.slice(0, 8)
		: [];

	const handleSelect = useCallback(
		(to: string, label?: string) => {
			if (label) addRecentAction(label, to);
			navigate({ to });
			onOpenChange(false);
		},
		[navigate, onOpenChange],
	);

	if (!open) return null;

	// Build context-aware actions based on current route
	const contextActions: Array<{
		label: string;
		icon: typeof Plus;
		to: string;
		shortcut?: string;
	}> = [];

	if (isOnKanban) {
		contextActions.push({
			label: "Create New Feature",
			icon: Plus,
			to: "/kanban",
			shortcut: "n",
		});
	} else if (isOnAgent) {
		contextActions.push({
			label: "New Agent Session",
			icon: Bot,
			to: "/agent",
		});
	} else if (isOnDashboard) {
		contextActions.push({
			label: "Start Auto-Mode",
			icon: Play,
			to: "/dashboard",
			shortcut: "s",
		});
	}

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
					placeholder="Type a command or search features..."
					className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
					autoFocus
					value={search}
					onValueChange={setSearch}
				/>
				<Command.List className="max-h-80 overflow-y-auto p-2">
					<Command.Empty className="py-6 text-center text-muted-foreground text-sm">
						No results found.
					</Command.Empty>

					{/* Feature search results */}
					{filteredFeatures.length > 0 && (
						<>
							<Command.Group
								heading="Features"
								className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
							>
								{filteredFeatures.map(
									(feature: { id: string; title: string; status: string }) => (
										<Command.Item
											key={feature.id}
											value={`${feature.id} ${feature.title}`}
											onSelect={() =>
												handleSelect(
													`/features/${feature.id}`,
													feature.title,
												)
											}
											className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
										>
											<Search className="size-4 text-muted-foreground" />
											<div className="flex min-w-0 flex-1 items-center gap-2">
												<span className="font-mono text-muted-foreground text-xs">
													{feature.id}
												</span>
												<span className="truncate">
													{feature.title}
												</span>
											</div>
											<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
												{feature.status}
											</span>
										</Command.Item>
									),
								)}
							</Command.Group>
							<Command.Separator className="my-1 h-px bg-border" />
						</>
					)}

					{/* Recent actions — show when no search */}
					{search.length === 0 && recentActions.length > 0 && (
						<>
							<Command.Group
								heading="Recent"
								className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
							>
								{recentActions.map((action) => (
									<Command.Item
										key={action.to}
										value={`recent ${action.label}`}
										onSelect={() =>
											handleSelect(action.to, action.label)
										}
										className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
									>
										<Clock className="size-4 text-muted-foreground" />
										{action.label}
									</Command.Item>
								))}
							</Command.Group>
							<Command.Separator className="my-1 h-px bg-border" />
						</>
					)}

					{/* Context-aware actions */}
					{contextActions.length > 0 && (
						<>
							<Command.Group
								heading="Context Actions"
								className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
							>
								{contextActions.map((action) => (
									<Command.Item
										key={action.label}
										value={action.label}
										onSelect={() =>
											handleSelect(action.to, action.label)
										}
										className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
									>
										<div className="flex items-center gap-3">
											<action.icon className="size-4 text-muted-foreground" />
											{action.label}
										</div>
										{action.shortcut && (
											<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
												{action.shortcut}
											</kbd>
										)}
									</Command.Item>
								))}
							</Command.Group>
							<Command.Separator className="my-1 h-px bg-border" />
						</>
					)}

					<Command.Group
						heading="Navigation"
						className="text-muted-foreground text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
					>
						{navItems.map(({ label, icon: Icon, to, shortcut }) => (
							<Command.Item
								key={to}
								value={label}
								onSelect={() => handleSelect(to, label)}
								className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
							>
								<div className="flex items-center gap-3">
									<Icon className="size-4 text-muted-foreground" />
									{label}
								</div>
								{shortcut && (
									<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
										{shortcut}
									</kbd>
								)}
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
							onSelect={() => handleSelect("/kanban", "New Feature")}
							className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
						>
							<div className="flex items-center gap-3">
								<Plus className="size-4 text-muted-foreground" />
								New Feature
							</div>
							<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
								n
							</kbd>
						</Command.Item>
						<Command.Item
							value="Start Auto-Mode"
							onSelect={() =>
								handleSelect("/dashboard", "Start Auto-Mode")
							}
							className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
						>
							<div className="flex items-center gap-3">
								<Play className="size-4 text-muted-foreground" />
								Start Auto-Mode
							</div>
							<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
								s
							</kbd>
						</Command.Item>
					</Command.Group>
				</Command.List>

				<div className="border-t px-3 py-2">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>Navigate with arrow keys</span>
						<div className="flex gap-2">
							<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								?
							</kbd>
							<span>shortcuts</span>
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
