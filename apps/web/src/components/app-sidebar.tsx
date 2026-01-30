import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { NavLinks } from "./nav-links";
import { ProjectSelector } from "./project-selector";

export function AppSidebar() {
	const collapsed = useAppStore((s) => s.sidebarCollapsed);

	return (
		<>
			{/* Mobile backdrop */}
			{!collapsed && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 md:hidden"
					onClick={() => useAppStore.getState().toggleSidebar()}
					aria-label="Close sidebar"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					"flex h-full flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
					collapsed ? "w-16" : "w-64",
					// Mobile: absolute overlay when expanded, hidden when collapsed
					"md:relative",
					collapsed && "max-md:hidden",
					!collapsed &&
						"max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
				)}
			>
				{/* Top: Project Selector */}
				<div className="shrink-0">
					<ProjectSelector collapsed={collapsed} />
				</div>

				{/* Middle: Navigation Links */}
				<div className="flex-1 overflow-y-auto">
					<NavLinks collapsed={collapsed} />
				</div>

				{/* Bottom: User Info */}
				<div
					className={cn(
						"shrink-0 border-sidebar-border border-t p-4",
						collapsed && "flex justify-center",
					)}
				>
					<div
						className={cn(
							"flex items-center gap-3",
							collapsed && "justify-center",
						)}
					>
						<div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent">
							<User className="size-4 text-sidebar-accent-foreground" />
						</div>
						{!collapsed && (
							<div className="flex flex-col text-xs">
								<span className="font-medium">User</span>
								<span className="text-muted-foreground">user@example.com</span>
							</div>
						)}
					</div>
				</div>
			</aside>
		</>
	);
}
