import type {
	EventCallback,
	EventPayloadMap,
	EventType,
} from "@nomos-ai/types";
import Redis from "ioredis";
import type { IEventService } from "./event-service";

const CHANNEL = "nomos:events";

/**
 * Redis-backed event service for cross-process event delivery.
 * Uses Redis PUBLISH/SUBSCRIBE so multiple server instances can
 * share events (e.g. behind a load balancer).
 *
 * Local subscribers still receive events synchronously — Redis
 * is used to fan out to other processes.
 */
export class RedisEventService implements IEventService {
	private pub: Redis;
	private sub: Redis;
	private subscribers = new Set<EventCallback>();
	private ready = false;

	constructor(redisUrl: string) {
		this.pub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
		this.sub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });

		this.sub.subscribe(CHANNEL).then(() => {
			this.ready = true;
		});

		this.sub.on("message", (_channel: string, message: string) => {
			try {
				const { type, payload } = JSON.parse(message) as {
					type: EventType;
					payload: unknown;
				};
				for (const cb of this.subscribers) {
					try {
						cb(type, payload);
					} catch {
						// Isolate subscriber errors
					}
				}
			} catch {
				// Ignore malformed messages
			}
		});
	}

	emit<T extends keyof EventPayloadMap>(
		type: T,
		payload: EventPayloadMap[T],
	): void;
	emit(type: EventType, payload: unknown): void;
	emit(type: EventType, payload: unknown): void {
		const message = JSON.stringify({ type, payload });
		this.pub.publish(CHANNEL, message).catch(() => {
			// Fire-and-forget — if Redis is down, events are lost
			// (same behavior as in-memory when process crashes)
		});
	}

	subscribe(callback: EventCallback): () => void {
		this.subscribers.add(callback);
		return () => this.subscribers.delete(callback);
	}

	get subscriberCount(): number {
		return this.subscribers.size;
	}

	get isReady(): boolean {
		return this.ready;
	}

	async disconnect(): Promise<void> {
		await this.sub.unsubscribe(CHANNEL);
		this.sub.disconnect();
		this.pub.disconnect();
		this.ready = false;
	}

	/** Check if Redis is reachable */
	async ping(): Promise<boolean> {
		try {
			const result = await this.pub.ping();
			return result === "PONG";
		} catch {
			return false;
		}
	}
}
