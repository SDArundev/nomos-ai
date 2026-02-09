import { notificationRepository, projectRepository } from "@nomos-ai/db";
import type { NotificationType } from "@nomos-ai/types";
import type { IEventService } from "./event-service";

interface CreateNotificationInput {
	type: NotificationType;
	title: string;
	message: string;
	projectId: string;
	featureId?: string;
}

export class NotificationService {
	constructor(private events: IEventService) {}

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

		// Look up project to get userId
		const project = await projectRepository.findById(input.projectId);
		const userId = project?.userId ?? null;

		this.events.emit("notification:created", { ...notification, userId });
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
