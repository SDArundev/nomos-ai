/**
 * REST Adapter for oRPC
 *
 * Exposes existing oRPC endpoints as REST API endpoints for external integration.
 * This adapter provides backward compatibility and simplifies integration with
 * tools like n8n, Zapier, and custom scripts.
 *
 * Maps REST HTTP methods to oRPC RPC format internally:
 *
 * Features:
 * - GET /api/features → POST /rpc/features.list
 * - GET /api/features/:id → POST /rpc/features.get
 * - POST /api/features → POST /rpc/features.create
 * - PATCH /api/features/:id → POST /rpc/features.update
 * - DELETE /api/features/:id → POST /rpc/features.delete
 * - POST /api/features/:id/status → POST /rpc/features.updateStatus
 * - POST /api/features/bulk-status → POST /rpc/features.bulkUpdateStatus
 *
 * Projects:
 * - GET /api/projects → POST /rpc/projects.list
 * - GET /api/projects/:id → POST /rpc/projects.get
 * - POST /api/projects → POST /rpc/projects.create
 * - PATCH /api/projects/:id → POST /rpc/projects.update
 * - DELETE /api/projects/:id → POST /rpc/projects.delete
 *
 * Sessions:
 * - GET /api/sessions → POST /rpc/sessions.list
 * - GET /api/sessions/:id → POST /rpc/sessions.get
 * - POST /api/sessions → POST /rpc/sessions.create
 * - POST /api/sessions/:id/message → POST /rpc/agent.sendMessage
 *
 * Learnings:
 * - GET /api/learnings → POST /rpc/learnings.list
 * - GET /api/learnings/:id → POST /rpc/learnings.get
 * - POST /api/learnings → POST /rpc/learnings.create
 * - PATCH /api/learnings/:id → POST /rpc/learnings.update
 * - DELETE /api/learnings/:id → POST /rpc/learnings.delete
 *
 * API Keys:
 * - GET /api/keys → POST /rpc/apiKeys.list
 * - POST /api/keys → POST /rpc/apiKeys.create
 * - DELETE /api/keys/:id → POST /rpc/apiKeys.revoke
 */

import type { Context } from "hono";
import { Hono } from "hono";
import type { Context as ORPCContext } from "./context";

/**
 * Create REST API routes that wrap oRPC RPC handler
 *
 * This creates a thin translation layer that converts REST calls to RPC format
 * and delegates to the existing RPCHandler for all business logic.
 */
export function createRestAdapter(rpcHandler: any) {
	const app = new Hono<{ Variables: { orpcContext: ORPCContext } }>();

	// Helper to call RPC handler with translated request
	async function callRPC(c: Context, method: string, input: any) {
		try {
			const orpcContext = c.get("orpcContext");

			// Create RPC request format
			const rpcRequest = new Request("http://internal/rpc/" + method, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			// Call RPC handler
			const result = await rpcHandler.handle(rpcRequest, {
				prefix: "/rpc",
				context: orpcContext,
			});

			if (!result.matched) {
				return c.json({ error: "RPC method not found" }, 404);
			}

			// Parse and return response
			const responseBody = await result.response.text();
			const data = responseBody ? JSON.parse(responseBody) : null;

			return c.json(data, result.response.status as any);
		} catch (error: any) {
			return handleError(c, error);
		}
	}

	// GET /api/features - List features with optional filtering
	app.get("/features", async (c: Context) => {
		const status = c.req.query("status");
		const phase = c.req.query("phase");

		const input = {
			...(status && { status }),
			...(phase && { phase }),
		};

		return callRPC(
			c,
			"features.list",
			Object.keys(input).length > 0 ? input : undefined,
		);
	});

	// GET /api/features/:id - Get single feature by ID
	app.get("/features/:id", async (c: Context) => {
		const id = c.req.param("id");
		return callRPC(c, "features.get", { id });
	});

	// POST /api/features - Create new feature
	app.post("/features", async (c: Context) => {
		const body = await c.req.json();
		return callRPC(c, "features.create", body);
	});

	// PATCH /api/features/:id - Update feature
	app.patch("/features/:id", async (c: Context) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		return callRPC(c, "features.update", { id, data: body });
	});

	// DELETE /api/features/:id - Delete feature
	app.delete("/features/:id", async (c: Context) => {
		const id = c.req.param("id");
		const result = await callRPC(c, "features.delete", { id });

		// If successful, return 200 with success message
		if (result.status === 200) {
			return c.json({ success: true }, 200);
		}

		return result;
	});

	// POST /api/features/:id/status - Update feature status
	app.post("/features/:id/status", async (c: Context) => {
		const id = c.req.param("id");
		const body = await c.req.json();

		if (!body.status) {
			return c.json({ error: "Status is required" }, 400);
		}

		return callRPC(c, "features.updateStatus", { id, status: body.status });
	});

	// POST /api/features/bulk-status - Bulk update feature statuses
	app.post("/features/bulk-status", async (c: Context) => {
		const body = await c.req.json();

		if (!body.ids || !Array.isArray(body.ids)) {
			return c.json({ error: "ids array is required" }, 400);
		}
		if (!body.status) {
			return c.json({ error: "status is required" }, 400);
		}

		return callRPC(c, "features.bulkUpdateStatus", {
			ids: body.ids,
			status: body.status,
		});
	});

	// GET /api/features/dependencies/:projectId - Get dependency order
	app.get("/features/dependencies/:projectId", async (c: Context) => {
		const projectId = c.req.param("projectId");
		return callRPC(c, "features.getDependencyOrder", { projectId });
	});

	// ── Projects ──────────────────────────────────────────────

	// GET /api/projects - List projects
	app.get("/projects", async (c: Context) => {
		return callRPC(c, "projects.list", undefined);
	});

	// GET /api/projects/:id - Get single project
	app.get("/projects/:id", async (c: Context) => {
		const id = c.req.param("id");
		return callRPC(c, "projects.get", { id });
	});

	// POST /api/projects - Create project
	app.post("/projects", async (c: Context) => {
		const body = await c.req.json();
		return callRPC(c, "projects.create", body);
	});

	// PATCH /api/projects/:id - Update project
	app.patch("/projects/:id", async (c: Context) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		return callRPC(c, "projects.update", { id, data: body });
	});

	// DELETE /api/projects/:id - Delete project
	app.delete("/projects/:id", async (c: Context) => {
		const id = c.req.param("id");
		const result = await callRPC(c, "projects.delete", { id });
		if (result.status === 200) {
			return c.json({ success: true }, 200);
		}
		return result;
	});

	// ── Sessions ──────────────────────────────────────────────

	// GET /api/sessions - List sessions with optional filtering
	app.get("/sessions", async (c: Context) => {
		const status = c.req.query("status");
		const featureId = c.req.query("featureId");

		const input = {
			...(status && { status }),
			...(featureId && { featureId }),
		};

		return callRPC(
			c,
			"sessions.list",
			Object.keys(input).length > 0 ? input : undefined,
		);
	});

	// GET /api/sessions/:id - Get single session
	app.get("/sessions/:id", async (c: Context) => {
		const id = c.req.param("id");
		return callRPC(c, "sessions.get", { id });
	});

	// POST /api/sessions - Create session
	app.post("/sessions", async (c: Context) => {
		const body = await c.req.json();
		return callRPC(c, "sessions.create", body);
	});

	// POST /api/sessions/:id/message - Send message to agent session
	app.post("/sessions/:id/message", async (c: Context) => {
		const sessionId = c.req.param("id");
		const body = await c.req.json();

		if (!body.content) {
			return c.json({ error: "content is required" }, 400);
		}

		return callRPC(c, "agent.sendMessage", {
			sessionId,
			content: body.content,
		});
	});

	// ── Learnings ─────────────────────────────────────────────

	// GET /api/learnings - List learnings with optional filtering
	app.get("/learnings", async (c: Context) => {
		const category = c.req.query("category");
		const featureId = c.req.query("featureId");

		const input = {
			...(category && { category }),
			...(featureId && { featureId }),
		};

		return callRPC(
			c,
			"learnings.list",
			Object.keys(input).length > 0 ? input : undefined,
		);
	});

	// GET /api/learnings/:id - Get single learning
	app.get("/learnings/:id", async (c: Context) => {
		const id = c.req.param("id");
		return callRPC(c, "learnings.get", { id });
	});

	// POST /api/learnings - Create learning
	app.post("/learnings", async (c: Context) => {
		const body = await c.req.json();
		return callRPC(c, "learnings.create", body);
	});

	// PATCH /api/learnings/:id - Update learning
	app.patch("/learnings/:id", async (c: Context) => {
		const id = c.req.param("id");
		const body = await c.req.json();
		return callRPC(c, "learnings.update", { id, data: body });
	});

	// DELETE /api/learnings/:id - Delete learning
	app.delete("/learnings/:id", async (c: Context) => {
		const id = c.req.param("id");
		const result = await callRPC(c, "learnings.delete", { id });
		if (result.status === 200) {
			return c.json({ success: true }, 200);
		}
		return result;
	});

	// ── API Keys ──────────────────────────────────────────────

	// GET /api/keys - List API keys
	app.get("/keys", async (c: Context) => {
		return callRPC(c, "apiKeys.list", undefined);
	});

	// POST /api/keys - Create API key
	app.post("/keys", async (c: Context) => {
		const body = await c.req.json();
		return callRPC(c, "apiKeys.create", body);
	});

	// DELETE /api/keys/:id - Revoke API key
	app.delete("/keys/:id", async (c: Context) => {
		const id = c.req.param("id");
		return callRPC(c, "apiKeys.revoke", { id });
	});

	return app;
}

/**
 * Handle errors and convert to HTTP responses
 */
function handleError(c: Context, error: any) {
	console.error("REST API Error:", error);

	// Handle oRPC errors
	if (error.code) {
		const statusMap: Record<string, number> = {
			NOT_FOUND: 404,
			UNAUTHORIZED: 401,
			FORBIDDEN: 403,
			BAD_REQUEST: 400,
			INTERNAL_SERVER_ERROR: 500,
		};

		const status = statusMap[error.code] || 500;
		return c.json(
			{
				error: error.message || "An error occurred",
				code: error.code,
			},
			status as any,
		);
	}

	// Handle validation errors (Zod)
	if (error.name === "ZodError") {
		return c.json(
			{
				error: "Validation error",
				details: error.errors,
			},
			400,
		);
	}

	// Generic error
	return c.json(
		{
			error: error.message || "Internal server error",
		},
		500,
	);
}
