import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Context, Next } from "hono";

const mockFindActiveByKeyHash = mock(() => Promise.resolve(null));
const mockUpdateLastUsed = mock(() => Promise.resolve());

mock.module("@nomos-ai/db", () => ({
	apiKeyRepository: {
		findActiveByKeyHash: mockFindActiveByKeyHash,
		updateLastUsed: mockUpdateLastUsed,
	},
}));

const { apiKeyAuthMiddleware } = await import("./api-key-auth");

function createMockContext(authHeader?: string) {
	const contextValues = new Map<string, unknown>();

	const c = {
		req: {
			header: (name: string) =>
				name === "Authorization" ? authHeader : undefined,
		},
		json: mock((body: unknown, status: number) => {
			return { body, status };
		}),
		set: mock((key: string, value: unknown) => {
			contextValues.set(key, value);
		}),
		_contextValues: contextValues,
	};

	return c;
}

describe("apiKeyAuthMiddleware", () => {
	const nextFn = mock(() => Promise.resolve());

	beforeEach(() => {
		nextFn.mockReset();
		nextFn.mockResolvedValue(undefined);
		mockFindActiveByKeyHash.mockReset();
		mockFindActiveByKeyHash.mockResolvedValue(null);
		mockUpdateLastUsed.mockReset();
		mockUpdateLastUsed.mockResolvedValue(undefined);
	});

	test("falls through to next when no Authorization header present", async () => {
		const c = createMockContext(undefined);
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).toHaveBeenCalledTimes(1);
		expect(c.json).not.toHaveBeenCalled();
	});

	test("falls through to next when Authorization header is not Bearer", async () => {
		const c = createMockContext("Basic dXNlcjpwYXNz");
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).toHaveBeenCalledTimes(1);
		expect(c.json).not.toHaveBeenCalled();
	});

	test("returns 401 when Bearer token does not start with nms_", async () => {
		const c = createMockContext("Bearer sk_invalid_key_format");
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).not.toHaveBeenCalled();
		expect(c.json).toHaveBeenCalledWith(
			{ error: "Invalid API key format" },
			401,
		);
	});

	test("returns 401 when nms_ key is not found in database", async () => {
		mockFindActiveByKeyHash.mockResolvedValue(null);
		const c = createMockContext("Bearer nms_abc123def456");
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).not.toHaveBeenCalled();
		expect(c.json).toHaveBeenCalledWith(
			{ error: "Invalid or revoked API key" },
			401,
		);
	});

	test("returns 401 when API key has expired", async () => {
		mockFindActiveByKeyHash.mockResolvedValue({
			id: "key_1",
			userId: "user_1",
			expiresAt: new Date(Date.now() - 1000),
		});
		const c = createMockContext("Bearer nms_abc123def456");
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).not.toHaveBeenCalled();
		expect(c.json).toHaveBeenCalledWith({ error: "API key has expired" }, 401);
	});

	test("sets context and calls next for valid API key", async () => {
		mockFindActiveByKeyHash.mockResolvedValue({
			id: "key_1",
			userId: "user_1",
			expiresAt: null,
		});
		const c = createMockContext("Bearer nms_abc123def456");
		await apiKeyAuthMiddleware(c as unknown as Context, nextFn as Next);
		expect(nextFn).toHaveBeenCalledTimes(1);
		expect(c.set).toHaveBeenCalledWith("apiKeyUserId", "user_1");
		expect(c.set).toHaveBeenCalledWith("apiKeyId", "key_1");
	});
});
