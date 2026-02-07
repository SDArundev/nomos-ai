import { Menu, Play } from "lucide-react";
import { useAppStore } from "@/store";
import { useAutoModeStatus } from "@/hooks/use-auto-mode-status";
import { ConnectionStatus } from "./connection-status";
import { ModeToggle } from "./mode-toggle";
import { NotificationBell } from "./notifications/notification-bell";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
	const toggleSidebar = useAppStore((s) => s.toggleSidebar);
	const autoMode = useAutoModeStatus();

	return (
		<div className="shrink-0 border-b">
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
					<Menu />
				</Button>
				<div className="flex items-center gap-2">
					{autoMode.isRunning && (
						<div className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-600 dark:text-green-400">
							<Play className="size-3" />
							Auto-mode ({autoMode.activeFeatureCount})
						</div>
					)}
					<ConnectionStatus />
					<NotificationBell />
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</div>
	);
}
