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

export const notificationsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				projectId: z.string(),
				unreadOnly: z.boolean().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getNotificationService();
			return service.getByProject(input.projectId, input.unreadOnly);
		}),

	countUnread: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input }) => {
			const service = getNotificationService();
			const count = await service.countUnread(input.projectId);
			return { count };
		}),

	markRead: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const service = getNotificationService();
			await service.markRead(input.id);
			return { success: true };
		}),

	markAllRead: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.handler(async ({ input }) => {
			const service = getNotificationService();
			await service.markAllRead(input.projectId);
			return { success: true };
		}),

	dismiss: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const service = getNotificationService();
			await service.dismiss(input.id);
			return { success: true };
		}),
};
