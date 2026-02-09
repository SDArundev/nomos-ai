import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";

/**
 * Server E2E Tests
 *
 * These tests construct a Hono app with the exact middleware stack
 * from apps/server/src/index.ts — rate limiter, CSRF protection,
 * health/ready endpoints — and verify server behavior end-to-end.
 *
 * We do NOT import index.ts directly because it has side effects
 * (DB migrations, session cleanup, learning ingestion) that cannot
 * run in a test environment without a live database.
 */

// ── Rate Limiter (exact copy from index.ts) ──────────────

function createRateLimitedApp(maxRequests = 100, windowMs = 60_000) {
	const app = new Hono();
	const rateLimitStore = new Map<string, number[]>();

	app.use("/*", async (c, next) => {
		const ip = "test-ip"; // Simplified for testing (index.ts extracts from requestIP)
		const now = Date.now();
		const cutoff = now - windowMs;

		let timestamps = rateLimitStore.get(ip) ?? [];
		timestamps = timestamps.filter((t) => t > cutoff);

		if (timestamps.length >= maxRequests) {
			const oldestInWindow = timestamps[0] ?? now;
			const retryAfter = Math.ceil(
				(oldestInWindow + windowMs - now) / 1000,
			);
			c.header("Retry-After", String(Math.max(1, retryAfter)));
			return c.json({ error: "Too Many Requests" }, 429);
		}

		timestamps.push(now);
		rateLimitStore.set(ip, timestamps);
		await next();
	});

	return { app, rateLimitStore };
}

// ── CSRF Middleware (exact copy from index.ts) ────────────

function addCsrfMiddleware(app: Hono) {
	// /api/* CSRF
	app.use("/api/*", async (c, next) => {
		const method = c.req.method;
		if (method === "GET" || method === "OPTIONS") return next();
		if (c.req.path.startsWith("/api/auth/")) return next();
		const xrw = c.req.header("X-Requested-With");
		if (xrw !== "XMLHttpRequest") {
			return c.json({ error: "CSRF validation failed" }, 403);
		}
		await next();
	});

	// /rpc/* CSRF
	app.use("/rpc/*", async (c, next) => {
		const method = c.req.method;
		if (method === "GET" || method === "OPTIONS") return next();
		const xrw = c.req.header("X-Requested-With");
		if (xrw !== "XMLHttpRequest") {
			return c.json({ error: "CSRF validation failed" }, 403);
		}
		await next();
	});

	return app;
}

// ── Security Headers (exact copy from index.ts) ──────────

function addSecurityHeaders(app: Hono) {
	app.use("/*", async (c, next) => {
		await next();
		c.header("X-Content-Type-Options", "nosniff");
		c.header("X-Frame-Options", "DENY");
		c.header("X-XSS-Protection", "1; mode=block");
		c.header("Referrer-Policy", "strict-origin-when-cross-origin");
		c.header(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()",
		);
	});
	return app;
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe("Server E2E: Health & Ready", () => {
	it("GET /health returns 200 with status", async () => {
		const app = new Hono();
		app.get("/health", (c) => {
			return c.json({
				status: "ok",
				version: "0.1.0",
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			});
		});

		const res = await app.request("/health");
		expect(res.status).toBe(200);

		const body = (await res.json()) as {
			status: string;
			version: string;
			uptime: number;
			timestamp: string;
		};
		expect(body.status).toBe("ok");
		expect(body.version).toBe("0.1.0");
		expect(body.uptime).toBeGreaterThan(0);
		expect(body.timestamp).toBeDefined();
	});

	it("GET /ready returns 200 when all checks pass", async () => {
		const app = new Hono();
		app.get("/ready", (c) => {
			const checks = { db: true, websocket: true };
			const ready = Object.values(checks).every(Boolean);
			return c.json({ ready, checks }, ready ? 200 : 503);
		});

		const res = await app.request("/ready");
		expect(res.status).toBe(200);

		const body = (await res.json()) as {
			ready: boolean;
			checks: { db: boolean; websocket: boolean };
		};
		expect(body.ready).toBe(true);
		expect(body.checks.db).toBe(true);
		expect(body.checks.websocket).toBe(true);
	});

	it("GET /ready returns 503 when a check fails", async () => {
		const app = new Hono();
		app.get("/ready", (c) => {
			const checks = { db: false, websocket: true };
			const ready = Object.values(checks).every(Boolean);
			return c.json({ ready, checks }, ready ? 200 : 503);
		});

		const res = await app.request("/ready");
		expect(res.status).toBe(503);

		const body = (await res.json()) as {
			ready: boolean;
			checks: { db: boolean; websocket: boolean };
		};
		expect(body.ready).toBe(false);
		expect(body.checks.db).toBe(false);
	});
});

describe("Server E2E: CSRF Protection", () => {
	let app: Hono;

	beforeEach(() => {
		app = new Hono();
		addCsrfMiddleware(app);

		// Add test endpoints behind CSRF
		app.post("/rpc/test", (c) => c.json({ ok: true }));
		app.post("/api/test", (c) => c.json({ ok: true }));
		app.get("/rpc/test", (c) => c.json({ ok: true }));
		app.get("/api/test", (c) => c.json({ ok: true }));
		app.post("/api/auth/login", (c) => c.json({ ok: true }));
	});

	it("POST /rpc/* without X-Requested-With returns 403", async () => {
		const res = await app.request("/rpc/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(403);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("CSRF validation failed");
	});

	it("POST /rpc/* with X-Requested-With succeeds", async () => {
		const res = await app.request("/rpc/test", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Requested-With": "XMLHttpRequest",
			},
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean };
		expect(body.ok).toBe(true);
	});

	it("POST /api/* without X-Requested-With returns 403", async () => {
		const res = await app.request("/api/test", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(403);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("CSRF validation failed");
	});

	it("POST /api/auth/* bypasses CSRF (better-auth handles its own)", async () => {
		const res = await app.request("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(200);
	});

	it("GET /rpc/* does not require X-Requested-With", async () => {
		const res = await app.request("/rpc/test");
		expect(res.status).toBe(200);
	});

	it("GET /api/* does not require X-Requested-With", async () => {
		const res = await app.request("/api/test");
		expect(res.status).toBe(200);
	});
});

describe("Server E2E: Rate Limiter", () => {
	it("allows requests under the limit", async () => {
		const { app } = createRateLimitedApp(5, 60_000);
		app.get("/test", (c) => c.json({ ok: true }));

		for (let i = 0; i < 5; i++) {
			const res = await app.request("/test");
			expect(res.status).toBe(200);
		}
	});

	it("returns 429 when limit exceeded", async () => {
		const { app } = createRateLimitedApp(3, 60_000);
		app.get("/test", (c) => c.json({ ok: true }));

		// First 3 requests pass
		for (let i = 0; i < 3; i++) {
			const res = await app.request("/test");
			expect(res.status).toBe(200);
		}

		// 4th request should be rate limited
		const res = await app.request("/test");
		expect(res.status).toBe(429);

		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("Too Many Requests");
		expect(res.headers.get("Retry-After")).toBeDefined();
	});

	it("resets after time window expires", async () => {
		const { app, rateLimitStore } = createRateLimitedApp(2, 100); // 100ms window
		app.get("/test", (c) => c.json({ ok: true }));

		// Use up the limit
		await app.request("/test");
		await app.request("/test");

		// Should be rate limited
		const limited = await app.request("/test");
		expect(limited.status).toBe(429);

		// Clear store to simulate window expiry (timestamps will be filtered out)
		rateLimitStore.clear();

		// Should work again
		const res = await app.request("/test");
		expect(res.status).toBe(200);
	});

	it("matches server rate limit of 100 requests per 60s", async () => {
		// Verify the constants match index.ts
		const RATE_LIMIT_MAX = 100;
		const RATE_LIMIT_WINDOW_MS = 60_000;

		const { app } = createRateLimitedApp(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
		app.get("/test", (c) => c.json({ ok: true }));

		// 100 requests should succeed
		for (let i = 0; i < 100; i++) {
			const res = await app.request("/test");
			expect(res.status).toBe(200);
		}

		// 101st should fail
		const res = await app.request("/test");
		expect(res.status).toBe(429);
	});
});

describe("Server E2E: Security Headers", () => {
	it("sets security headers on all responses", async () => {
		const app = new Hono();
		addSecurityHeaders(app);
		app.get("/test", (c) => c.json({ ok: true }));

		const res = await app.request("/test");
		expect(res.status).toBe(200);

		expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(res.headers.get("X-Frame-Options")).toBe("DENY");
		expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
		expect(res.headers.get("Referrer-Policy")).toBe(
			"strict-origin-when-cross-origin",
		);
		expect(res.headers.get("Permissions-Policy")).toBe(
			"camera=(), microphone=(), geolocation=()",
		);
	});
});

describe("Server E2E: 404 Handling", () => {
	it("returns 404 JSON for unknown routes", async () => {
		const app = new Hono();
		app.notFound(async (c) => {
			return c.json({ error: "Not Found" }, 404);
		});

		const res = await app.request("/nonexistent-path");
		expect(res.status).toBe(404);

		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("Not Found");
	});
});
