import { z } from "zod";
import { eventTypeSchema } from "./event";

// Client -> Server messages
export const wsClientSubscribeSchema = z.object({
	action: z.literal("subscribe"),
	eventTypes: z.array(eventTypeSchema),
});

export const wsClientUnsubscribeSchema = z.object({
	action: z.literal("unsubscribe"),
	eventTypes: z.array(eventTypeSchema),
});

export const wsClientPingSchema = z.object({
	action: z.literal("ping"),
});

export const wsClientMessageSchema = z.discriminatedUnion("action", [
	wsClientSubscribeSchema,
	wsClientUnsubscribeSchema,
	wsClientPingSchema,
]);

export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;

// Server -> Client messages
export const wsServerEventSchema = z.object({
	type: z.literal("event"),
	eventType: eventTypeSchema,
	/**
	 * Payload is intentionally z.unknown() as different event types carry different payload structures.
	 * Per-event-type validation should be performed at the handler level where the event type is known.
	 * Example: terminal:output handlers should validate { sessionId: string, data: string }
	 */
	payload: z.unknown(),
});

export const wsServerSubscribedSchema = z.object({
	type: z.literal("subscribed"),
	eventTypes: z.array(eventTypeSchema),
});

export const wsServerErrorSchema = z.object({
	type: z.literal("error"),
	message: z.string(),
});

export const wsServerPongSchema = z.object({
	type: z.literal("pong"),
});

export const wsServerWelcomeSchema = z.object({
	type: z.literal("welcome"),
	userId: z.string(),
});

export const wsServerMessageSchema = z.discriminatedUnion("type", [
	wsServerEventSchema,
	wsServerSubscribedSchema,
	wsServerErrorSchema,
	wsServerPongSchema,
	wsServerWelcomeSchema,
]);

export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;

// Subscription filter type
export interface SubscriptionFilter {
	userId: string;
	eventTypes: Set<string>;
}
