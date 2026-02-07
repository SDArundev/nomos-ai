import { notificationRepository } from "@nomos-ai/db";
import type { NotificationType } from "@nomos-ai/types";
import type { EventService } from "./event-service";

interface CreateNotificationInput {
	type: NotificationType;
	title: string;
	message: string;
	projectId: string;
	featureId?: string;
}

export class NotificationService {
	constructor(private events: EventService) {}

	async create(input: CreateNotificationInput) {
		const notification = await notificationRepository.create({
			type: input.type,
			title: input.title,
			message: input.message,
			projectId: input.projectId,
			featureId: input.featureId ?? null,
			read: false,
			dismissed: false,
		});

		this.events.emit("notification:created", notification);
		return notification;
	}

	async getByProject(projectId: string, unreadOnly = false) {
		return notificationRepository.findByProjectId(projectId, unreadOnly);
	}

	async markRead(id: string): Promise<void> {
		await notificationRepository.markRead(id);
	}

	async markAllRead(projectId: string): Promise<void> {
		await notificationRepository.markAllRead(projectId);
	}

	async dismiss(id: string): Promise<void> {
		await notificationRepository.dismiss(id);
	}

	async countUnread(projectId: string): Promise<number> {
		return notificationRepository.countUnread(projectId);
	}
}
