import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { RedisEventService } from "../redis-event-service";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

// Test Redis connectivity — skip tests if Redis is not available
let redisAvailable = false;
try {
	const Redis = (await import("ioredis")).default;
	const client = new Redis(REDIS_URL, { connectTimeout: 1000 });
	const pong = await client.ping();
	redisAvailable = pong === "PONG";
	client.disconnect();
} catch {
	// Redis not available
}

const describeRedis = redisAvailable ? describe : describe.skip;

describeRedis("RedisEventService", () => {
	let service: RedisEventService;

	beforeEach(async () => {
		service = new RedisEventService(REDIS_URL);
		// Wait for subscription to be ready
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	afterEach(async () => {
		await service.disconnect();
	});

	it("emits and receives events via Redis pub/sub", async () => {
		const received: { type: string; payload: unknown }[] = [];
		service.subscribe((type, payload) => {
			received.push({ type, payload });
		});

		service.emit("feature:created", {
			featureId: "test-123",
			userId: "user-1",
		});

		// Wait for Redis round-trip
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(received.length).toBe(1);
		expect(received[0]!.type).toBe("feature:created");
		expect(received[0]!.payload).toEqual({
			featureId: "test-123",
			userId: "user-1",
		});
	});

	it("supports multiple subscribers", async () => {
		let count1 = 0;
		let count2 = 0;
		service.subscribe(() => {
			count1++;
		});
		service.subscribe(() => {
			count2++;
		});

		service.emit("feature:started", {
			featureId: "f1",
			userId: "u1",
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(count1).toBe(1);
		expect(count2).toBe(1);
		expect(service.subscriberCount).toBe(2);
	});

	it("unsubscribe removes callback", async () => {
		let count = 0;
		const unsub = service.subscribe(() => {
			count++;
		});

		service.emit("feature:created", {
			featureId: "f1",
			userId: "u1",
		});

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(count).toBe(1);

		unsub();
		expect(service.subscriberCount).toBe(0);

		service.emit("feature:created", {
			featureId: "f2",
			userId: "u1",
		});

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(count).toBe(1); // Should not have increased
	});

	it("ping returns true when connected", async () => {
		const result = await service.ping();
		expect(result).toBe(true);
	});

	it("cross-process event delivery between two instances", async () => {
		const service2 = new RedisEventService(REDIS_URL);
		await new Promise((resolve) => setTimeout(resolve, 100));

		const received: { type: string; payload: unknown }[] = [];
		service2.subscribe((type, payload) => {
			received.push({ type, payload });
		});

		// Emit from service1, receive on service2
		service.emit("feature:completed", {
			featureId: "cross-test",
			userId: "user-x",
		});

		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(received.length).toBe(1);
		expect(received[0]!.type).toBe("feature:completed");

		await service2.disconnect();
	});

	it("isolates subscriber errors", async () => {
		service.subscribe(() => {
			throw new Error("bad subscriber");
		});

		let received = false;
		service.subscribe(() => {
			received = true;
		});

		service.emit("feature:created", {
			featureId: "f1",
			userId: "u1",
		});

		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(received).toBe(true);
	});
});
