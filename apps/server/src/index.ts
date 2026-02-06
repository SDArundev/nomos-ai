import { resolve } from "node:path";
import { createContext } from "@nomos-ai/api/context";
import { appRouter } from "@nomos-ai/api/routers/index";
import {
	buildSystemPrompt,
	configureTools,
} from "@nomos-ai/api/services/agent-service";
import { auth } from "@nomos-ai/auth";
import {
	db,
	featureRepository,
	runMigrations,
	sessionRepository,
	sql,
} from "@nomos-ai/db";
import { env } from "@nomos-ai/env/server";
import { MODEL_MAP } from "@nomos-ai/types";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { executeAgent } from "./lib/agent-execution";

// Run database migrations on startup
try {
	await runMigrations();
} catch (error) {
	console.error("Failed to run database migrations:", error);
	process.exit(1);
}

const app = new Hono();

app.use(logger());

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

app.use("/*", async (c, next) => {
	const ip =
		c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
	const now = Date.now();
	const entry = rateLimitStore.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
	} else {
		entry.count++;
		if (entry.count > RATE_LIMIT_MAX) {
			c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
			return c.json({ error: "Too Many Requests" }, 429);
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
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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

app.get("/api/sessions/:id/execute", async (c) => {
	// Authenticate
	const authSession = await auth.api.getSession({
		headers: c.req.raw.headers,
	});
	if (!authSession?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sessionId = c.req.param("id");

	// Load session
	const agentSession = await sessionRepository.findById(sessionId);
	if (!agentSession) {
		return c.json({ error: "Session not found" }, 404);
	}

	// Verify ownership
	if (agentSession.userId !== authSession.user.id) {
		return c.json({ error: "Forbidden" }, 403);
	}

	// Verify session is pending
	if (agentSession.status !== "pending") {
		return c.json(
			{ error: `Session is ${agentSession.status}, expected pending` },
			400,
		);
	}

	// Validate cwd is within project workspace
	if (agentSession.cwd) {
		const normalizedCwd = resolve(agentSession.cwd);
		// cwd must be an absolute path (resolve makes it absolute)
		// and must exist within a reasonable workspace boundary
		// The process.cwd() is the project root; allow any subdirectory
		const projectRoot = process.cwd();
		if (!normalizedCwd.startsWith(projectRoot)) {
			return c.json({ error: "cwd must be within project workspace" }, 403);
		}
	}

	// Build agent config from session data (load feature for system prompt)
	const feature = await featureRepository.findById(agentSession.featureId);
	if (!feature) {
		return c.json({ error: "Feature not found" }, 404);
	}

	const systemPrompt = buildSystemPrompt(feature);
	const tools = configureTools();
	const validModels = ["opus", "sonnet", "haiku"] as const;
	const featureModel =
		feature.model && validModels.includes(feature.model as never)
			? feature.model
			: "sonnet";
	const model = MODEL_MAP[featureModel as keyof typeof MODEL_MAP];

	const agentConfig = {
		model,
		tools,
		systemPrompt,
		cwd: agentSession.cwd ?? undefined,
		permissionMode: "bypassPermissions",
	};

	return streamSSE(c, async (stream) => {
		for await (const event of executeAgent(sessionId, agentConfig)) {
			await stream.writeSSE({
				data: JSON.stringify(event),
				event: event.type,
			});
		}
	});
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

app.get("/", (c) => {
	return c.text("OK");
});

app.get("/health", async (c) => {
	let database = "connected";
	try {
		await db.run(sql`SELECT 1`);
	} catch {
		database = "disconnected";
		return c.json(
			{
				status: "unhealthy",
				version: "1.0.0",
				database,
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
			},
			503,
		);
	}
	return c.json({
		status: "healthy",
		version: "1.0.0",
		database,
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	});
});

app.notFound((c) => {
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

console.log(`Server running on port ${env.PORT}`);

export default {
	port: env.PORT,
	fetch: app.fetch,
};
