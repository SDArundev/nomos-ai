import { z } from "zod";

export const notificationTypeSchema = z.enum([
	"feature_waiting_approval",
	"feature_verified",
	"feature_failed",
	"agent_complete",
	"auto_mode_complete",
	"auto_mode_error",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
	id: z.string(),
	type: notificationTypeSchema,
	title: z.string(),
	message: z.string(),
	createdAt: z.date(),
	read: z.boolean().default(false),
	dismissed: z.boolean().default(false),
	featureId: z.string().optional(),
	projectId: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;
