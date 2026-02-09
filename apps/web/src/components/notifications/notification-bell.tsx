import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useAppStore } from "@/store";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
	const projectId = useAppStore((s) => s.selectedProjectId);
	const { notifications, unreadCount, markRead, markAllRead, dismiss } =
		useNotifications(projectId);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications" />}
			>
				<Bell className="size-4" />
				{unreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive font-bold text-[10px] text-destructive-foreground">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 p-0">
				<NotificationList
					notifications={notifications as never[]}
					onMarkRead={markRead}
					onMarkAllRead={markAllRead}
					onDismiss={dismiss}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
