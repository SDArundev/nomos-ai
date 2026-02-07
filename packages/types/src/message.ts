import { z } from "zod";
import { contentBlockSchema } from "./provider";

export const conversationMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.union([z.string(), z.array(contentBlockSchema)]),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const messageSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	toolCalls: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				input: z.unknown(),
				result: z.string().optional(),
			}),
		)
		.optional(),
	thinkingContent: z.string().optional(),
	createdAt: z.date(),
});
export type Message = z.infer<typeof messageSchema>;
