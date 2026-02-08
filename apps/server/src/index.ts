import { createContext } from "@nomos-ai/api/context";
import { appRouter } from "@nomos-ai/api/routers/index";
import { getEventService } from "@nomos-ai/api/routers/agent";
import { getTerminalService } from "@nomos-ai/api/routers/terminal";
import { EventBroadcaster } from "@nomos-ai/api/services/event-broadcaster";
import { auth } from "@nomos-ai/auth";
import { db, runMigrations, sql } from "@nomos-ai/db";
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
	console.error("Failed to run database migrations:", error);
	process.exit(1);
}

const app = new Hono();

app.use(logger());

// Sliding window rate limiter
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

app.use("/*", async (c, next) => {
	const ip =
		c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
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
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

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
		c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	}
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// WebSocket event service + broadcaster + terminal
const eventService = getEventService();
const broadcaster = new EventBroadcaster(eventService);
const terminalService = getTerminalService();
const wsHandlers = createWebSocketHandlers(broadcaster, terminalService, eventService);

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
			console.error(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

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

app.get("/health", async (c) => {
	let database: "connected" | "disconnected" = "connected";
	try {
		await db.run(sql`SELECT 1`);
	} catch {
		database = "disconnected";
		return c.json(
			{
				status: "unhealthy",
				version: "0.1.0",
				database,
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			},
			503,
		);
	}
	return c.json({
		status: "ok",
		version: "0.1.0",
		database,
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
		await db.run(sql`SELECT 1`);
		checks.db = true;
	} catch {
		// DB not ready
	}

	// Check WebSocket broadcaster initialized (clientCount getter exists)
	checks.websocket = broadcaster.clientCount !== undefined;

	const ready = Object.values(checks).every(Boolean);
	return c.json({ ready, checks }, ready ? 200 : 503);
});

app.notFound(async (c) => {
	// SPA fallback: serve index.html for non-API routes in production
	if (process.env.NODE_ENV === "production" && !c.req.path.startsWith("/rpc") && !c.req.path.startsWith("/api")) {
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
	console.error("Unhandled error:", err);
	const message =
		process.env.NODE_ENV === "production"
			? "Internal Server Error"
			: err.message || "Internal Server Error";
	return c.json({ error: message }, 500);
});

console.log(`Server ready on port ${env.PORT}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
	websocket: wsHandlers,
};
