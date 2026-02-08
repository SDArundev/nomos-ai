import { notificationRepository, projectRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { NotificationService } from "../services/notification-service";
import { getEventService } from "./agent";

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
	if (!notificationServiceInstance) {
		notificationServiceInstance = new NotificationService(getEventService());
	}
	return notificationServiceInstance;
}

async function verifyProjectOwnership(projectId: string, userId: string) {
	const project = await projectRepository.findById(projectId);
	if (!project || project.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}
	return project;
}

async function verifyNotificationOwnership(notificationId: string, userId: string) {
	const notification = await notificationRepository.findById(notificationId);
	if (!notification) {
		throw new ORPCError("NOT_FOUND", {
			message: `Notification not found: ${notificationId}`,
		});
	}
	await verifyProjectOwnership(notification.projectId, userId);
	return notification;
}

export const notificationsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				unreadOnly: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			await verifyProjectOwnership(input.projectId, context.session.user.id);
			const service = getNotificationService();
			return service.getByProject(input.projectId, input.unreadOnly);
		}),

	countUnread: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input, context }) => {
			await verifyProjectOwnership(input.projectId, context.session.user.id);
			const service = getNotificationService();
			const count = await service.countUnread(input.projectId);
			return { count };
		}),

	markRead: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input, context }) => {
			await verifyNotificationOwnership(input.id, context.session.user.id);
			const service = getNotificationService();
			await service.markRead(input.id);
			return { success: true };
		}),

	markAllRead: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input, context }) => {
			await verifyProjectOwnership(input.projectId, context.session.user.id);
			const service = getNotificationService();
			await service.markAllRead(input.projectId);
			return { success: true };
		}),

	dismiss: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input, context }) => {
			await verifyNotificationOwnership(input.id, context.session.user.id);
			const service = getNotificationService();
			await service.dismiss(input.id);
			return { success: true };
		}),
};
