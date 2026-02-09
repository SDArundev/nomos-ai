import { createContext } from "@nomos-ai/api/context";
import { serverLogger } from "@nomos-ai/api/lib/logger";
import { registry, requestDuration } from "@nomos-ai/api/lib/metrics";
import { apiKeyAuthMiddleware } from "@nomos-ai/api/middleware/api-key-auth";
import { createRestAdapter } from "@nomos-ai/api/rest-adapter";
import { getEventService } from "@nomos-ai/api/routers/agent";
import { appRouter } from "@nomos-ai/api/routers/index";
import { getTerminalService } from "@nomos-ai/api/routers/terminal";
import { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import { ingestPendingLearnings } from "@nomos-ai/api/services/learning-ingestion";
import { RedisEventService } from "@nomos-ai/api/services/redis-event-service";
import { auth } from "@nomos-ai/auth";
import {
	closeDatabase,
	db,
	runMigrations,
	sessionRepository,
	sql,
} from "@nomos-ai/db";
import { env } from "@nomos-ai/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { createWebSocketHandlers, type WSData } from "./lib/websocket";

// Run database migrations on startup
try {
	await runMigrations();
} catch (error) {
	serverLogger.fatal({ err: error }, "Failed to run database migrations");
	process.exit(1);
}

// Clean up orphaned sessions from previous server instances
try {
	const activeSessions = await sessionRepository.findActive();
	if (activeSessions.length > 0) {
		const now = Date.now();
		const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
		const events = getEventService();
		let orphanedCount = 0;

		for (const session of activeSessions) {
			const updatedAt =
				session.updatedAt instanceof Date
					? session.updatedAt.getTime()
					: Number(session.updatedAt);
			const isStale = now - updatedAt > STALE_THRESHOLD_MS;

			if (isStale) {
				await sessionRepository.update(session.id, {
					status: "failed",
					isRunning: false,
					error: "Server restarted, session orphaned (stale)",
					completedAt: new Date(),
				});
				events.emit("session:orphaned", {
					sessionId: session.id,
					reason: "stale_on_restart",
				});
				orphanedCount++;
			}
		}

		if (orphanedCount > 0) {
			serverLogger.info(
				{ count: orphanedCount, total: activeSessions.length },
				"Cleaned up orphaned sessions",
			);
		}
		if (activeSessions.length > orphanedCount) {
			serverLogger.info(
				{ count: activeSessions.length - orphanedCount },
				"Preserved recent active sessions (updated < 10 min ago)",
			);
		}
	}
} catch (error) {
	serverLogger.warn({ err: error }, "Session cleanup failed (non-fatal)");
}

// Ingest pending learnings from CLI fallback
try {
	const result = await ingestPendingLearnings();
	if (result.ingested > 0) {
		serverLogger.info(result, "Ingested pending learnings");
	}
} catch (error) {
	serverLogger.warn(
		{ err: error },
		"Pending learnings ingestion failed (non-fatal)",
	);
}

const app = new Hono<{ Variables: { orpcContext: any } }>();

app.use(logger());

// Sliding window rate limiter
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

app.use("/*", async (c, next) => {
	const server = c.env as unknown as
		| { requestIP?: (req: Request) => { address: string } | null }
		| undefined;
	const ip = server?.requestIP?.(c.req.raw)?.address ?? "unknown";
	const now = Date.now();
	const cutoff = now - RATE_LIMIT_WINDOW_MS;

	let timestamps = rateLimitStore.get(ip) ?? [];
	timestamps = timestamps.filter((t) => t > cutoff);

	if (timestamps.length >= RATE_LIMIT_MAX) {
		const oldestInWindow = timestamps[0] ?? now;
		const retryAfter = Math.ceil(
			(oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000,
		);
		c.header("Retry-After", String(Math.max(1, retryAfter)));
		return c.json({ error: "Too Many Requests" }, 429);
	}

	timestamps.push(now);
	rateLimitStore.set(ip, timestamps);

	// Periodic cleanup: remove IPs with no recent activity
	if (Math.random() < 0.01) {
		for (const [key, ts] of rateLimitStore) {
			const filtered = ts.filter((t) => t > cutoff);
			if (filtered.length === 0) {
				rateLimitStore.delete(key);
			} else {
				rateLimitStore.set(key, filtered);
			}
		}
	}

	await next();
});

app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN.includes(",")
			? env.CORS_ORIGIN.split(",").map((o) => o.trim())
			: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		credentials: true,
	}),
);

// CSRF protection: require X-Requested-With header on state-changing requests
app.use("/api/*", async (c, next) => {
	const method = c.req.method;
	if (method === "GET" || method === "OPTIONS") return next();
	// better-auth handles its own CSRF protection
	if (c.req.path.startsWith("/api/auth/")) return next();
	const xrw = c.req.header("X-Requested-With");
	if (xrw !== "XMLHttpRequest") {
		return c.json({ error: "CSRF validation failed" }, 403);
	}
	await next();
});

app.use("/rpc/*", async (c, next) => {
	const method = c.req.method;
	if (method === "GET" || method === "OPTIONS") return next();
	const xrw = c.req.header("X-Requested-With");
	if (xrw !== "XMLHttpRequest") {
		return c.json({ error: "CSRF validation failed" }, 403);
	}
	await next();
});

// Security headers
app.use("/*", async (c, next) => {
	await next();
	c.header("X-Content-Type-Options", "nosniff");
	c.header("X-Frame-Options", "DENY");
	c.header("X-XSS-Protection", "1; mode=block");
	c.header("Referrer-Policy", "strict-origin-when-cross-origin");
	c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	c.header(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' ws: wss:; img-src 'self' data: blob:; font-src 'self' data: https://cdn.jsdelivr.net",
	);
	if (process.env.NODE_ENV === "production") {
		c.header(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains",
		);
	}
});

// Request duration tracking for Prometheus
app.use("/*", async (c, next) => {
	const start = performance.now();
	await next();
	const duration = (performance.now() - start) / 1000;
	// Normalize path to avoid high-cardinality labels
	const path = c.req.path
		.replace(/\/[a-f0-9-]{36}/g, "/:id")
		.replace(/\/[A-Z]+-?\d+/g, "/:id");
	requestDuration.observe(
		{ method: c.req.method, path, status: String(c.res.status) },
		duration,
	);
});

// Prometheus metrics endpoint (no auth required)
app.get("/metrics", async (c) => {
	const metrics = await registry.metrics();
	return c.text(metrics, 200, {
		"Content-Type": registry.contentType,
	});
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// API key Bearer token authentication (before route handlers, after auth)
app.use("/rpc/*", apiKeyAuthMiddleware);
app.use("/api/*", apiKeyAuthMiddleware);

// WebSocket event service + broadcaster + terminal
const eventService = getEventService();
const broadcaster = new EventBroadcaster(eventService);
const terminalService = getTerminalService();
const wsHandlers = createWebSocketHandlers(
	broadcaster,
	terminalService,
	eventService,
);

// Helper to extract userId from session cookie on WebSocket upgrade
async function extractWsUserId(req: Request): Promise<string | null> {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

// WebSocket upgrade endpoints
app.get("/ws/events", async (c) => {
	const server = c.env as unknown as
		| { upgrade: (req: Request, opts: { data: WSData }) => boolean }
		| undefined;
	if (!server?.upgrade) return c.text("WebSocket not supported", 400);
	const userId = await extractWsUserId(c.req.raw);
	if (!userId) return c.text("Unauthorized", 401);
	const upgraded = server.upgrade(c.req.raw, {
		data: { channel: "events" as const, userId },
	});
	if (upgraded) return new Response(null);
	return c.text("WebSocket upgrade failed", 400);
});

app.get("/ws/terminal", async (c) => {
	const sessionId = c.req.query("sessionId");
	const server = c.env as unknown as
		| { upgrade: (req: Request, opts: { data: WSData }) => boolean }
		| undefined;
	if (!server?.upgrade) return c.text("WebSocket not supported", 400);
	const userId = await extractWsUserId(c.req.raw);
	if (!userId) return c.text("Unauthorized", 401);
	const upgraded = server.upgrade(c.req.raw, {
		data: { channel: "terminal" as const, sessionId, userId },
	});
	if (upgraded) return new Response(null);
	return c.text("WebSocket upgrade failed", 400);
});

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			serverLogger.error({ err: error }, "OpenAPI handler error");
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			serverLogger.error({ err: error }, "RPC handler error");
		}),
	],
});

// Create REST adapter for /api/* routes
const restAdapter = createRestAdapter(rpcHandler);

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	// Handle REST API routes first
	if (c.req.path.startsWith("/api/")) {
		// Pass oRPC context to REST adapter
		c.set("orpcContext", context);
		return restAdapter.fetch(c.req.raw, c.env);
	}

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context: context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

// Serve static web assets in production
if (process.env.NODE_ENV === "production") {
	const { serveStatic } = await import("hono/bun");
	app.use("/*", serveStatic({ root: "./public" }));
}

app.get("/", (c) => {
	return c.text("OK");
});

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		version: "0.1.0",
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	});
});

app.get("/ready", async (c) => {
	const checks: Record<string, boolean> = {
		db: false,
		websocket: false,
	};

	// Check DB connectivity
	try {
		await db.execute(sql`SELECT 1`);
		checks.db = true;
	} catch {
		// DB not ready
	}

	// Check Redis connectivity (only if configured)
	if (eventService instanceof RedisEventService) {
		checks.redis = await eventService.ping();
	}

	// Check WebSocket broadcaster initialized (clientCount getter exists)
	checks.websocket = broadcaster.clientCount !== undefined;

	const ready = Object.values(checks).every(Boolean);
	return c.json({ ready, checks }, ready ? 200 : 503);
});

app.notFound(async (c) => {
	// SPA fallback: serve index.html for non-API routes in production
	if (
		process.env.NODE_ENV === "production" &&
		!c.req.path.startsWith("/rpc") &&
		!c.req.path.startsWith("/api")
	) {
		const file = Bun.file("./public/index.html");
		if (await file.exists()) {
			return c.html(await file.text());
		}
	}
	return c.json({ error: "Not Found" }, 404);
});

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	serverLogger.error({ err }, "Unhandled error");
	const message =
		process.env.NODE_ENV === "production"
			? "Internal Server Error"
			: err.message || "Internal Server Error";
	return c.json({ error: message }, 500);
});

serverLogger.info({ port: env.PORT }, "Server ready");

// Graceful shutdown
const shutdown = async () => {
	serverLogger.info("Shutting down...");
	terminalService.killAll();
	await closeDatabase();
	process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default {
	port: env.PORT,
	fetch: app.fetch,
	websocket: wsHandlers,
};
