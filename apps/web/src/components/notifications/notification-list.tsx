import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Eye,
	Trash2,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
	id: string;
	type: string;
	title: string;
	message: string;
	createdAt: string | Date;
	read: boolean;
	dismissed: boolean;
	featureId?: string | null;
}

interface NotificationListProps {
	notifications: Notification[];
	onMarkRead: (id: string) => void;
	onMarkAllRead: () => void;
	onDismiss: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
	feature_waiting_approval: Clock,
	feature_verified: CheckCircle2,
	feature_failed: AlertCircle,
	agent_complete: CheckCircle2,
	auto_mode_complete: CheckCircle2,
	auto_mode_error: AlertCircle,
};

const typeColors: Record<string, string> = {
	feature_waiting_approval: "text-purple-500",
	feature_verified: "text-green-500",
	feature_failed: "text-red-500",
	agent_complete: "text-blue-500",
	auto_mode_complete: "text-green-500",
	auto_mode_error: "text-red-500",
};

export function NotificationList({
	notifications,
	onMarkRead,
	onMarkAllRead,
	onDismiss,
}: NotificationListProps) {
	const unread = notifications.filter((n) => !n.read && !n.dismissed);
	const read = notifications.filter((n) => n.read && !n.dismissed);

	return (
		<div className="flex max-h-96 flex-col">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<h4 className="font-semibold text-sm">Notifications</h4>
				{unread.length > 0 && (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto py-1 text-xs"
						onClick={onMarkAllRead}
					>
						<Eye className="mr-1 size-3" />
						Mark all read
					</Button>
				)}
			</div>

			<div className="flex-1 overflow-y-auto">
				{notifications.filter((n) => !n.dismissed).length === 0 ? (
					<div className="p-4 text-center text-muted-foreground text-sm">
						No notifications
					</div>
				) : (
					<>
						{unread.map((n) => (
							<NotificationItem
								key={n.id}
								notification={n}
								onMarkRead={onMarkRead}
								onDismiss={onDismiss}
							/>
						))}
						{read.map((n) => (
							<NotificationItem
								key={n.id}
								notification={n}
								onMarkRead={onMarkRead}
								onDismiss={onDismiss}
							/>
						))}
					</>
				)}
			</div>
		</div>
	);
}

function NotificationItem({
	notification,
	onMarkRead,
	onDismiss,
}: {
	notification: Notification;
	onMarkRead: (id: string) => void;
	onDismiss: (id: string) => void;
}) {
	const Icon = typeIcons[notification.type] ?? AlertCircle;
	const color = typeColors[notification.type] ?? "text-muted-foreground";

	return (
		<div
			className={cn(
				"group flex items-start gap-3 border-b px-3 py-2 transition-colors",
				!notification.read && "bg-accent/20",
			)}
		>
			<Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{notification.title}</p>
				<p className="text-muted-foreground text-xs line-clamp-2">
					{notification.message}
				</p>
				<span className="text-muted-foreground text-xs">
					{new Date(notification.createdAt).toLocaleTimeString()}
				</span>
			</div>
			<div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{!notification.read && (
					<button
						type="button"
						onClick={() => onMarkRead(notification.id)}
						className="rounded p-1 hover:bg-muted"
					>
						<Eye className="size-3" />
					</button>
				)}
				<button
					type="button"
					onClick={() => onDismiss(notification.id)}
					className="rounded p-1 hover:bg-muted"
				>
					<X className="size-3" />
				</button>
			</div>
		</div>
	);
}
