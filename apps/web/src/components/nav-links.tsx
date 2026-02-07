import { Link } from "@tanstack/react-router";
import {
	Bot,
	Columns3,
	FolderKanban,
	Home,
	LayoutDashboard,
	Settings,
	Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinksProps {
	collapsed: boolean;
}

const navItems = [
	{ to: "/", label: "Home", icon: Home },
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/projects", label: "Projects", icon: FolderKanban },
	{ to: "/kanban", label: "Kanban", icon: Columns3 },
	{ to: "/agent", label: "Agent", icon: Bot },
	{ to: "/terminal", label: "Terminal", icon: Terminal },
	{ to: "/settings", label: "Settings", icon: Settings },
] as const;

export function NavLinks({ collapsed }: NavLinksProps) {
	return (
		<nav className="flex flex-col gap-1 p-2">
			{navItems.map(({ to, label, icon: Icon }) => (
				<Link
					key={to}
					to={to}
					className={cn(
						"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50",
						collapsed && "justify-center",
					)}
					activeProps={{
						className: "bg-sidebar-accent text-sidebar-accent-foreground",
					}}
				>
					<Icon className="size-5 shrink-0" />
					{!collapsed && <span>{label}</span>}
				</Link>
			))}
		</nav>
	);
}
