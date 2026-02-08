/**
 * REST Adapter for oRPC
 *
 * Exposes existing oRPC endpoints as REST API endpoints for external integration.
 * This adapter provides backward compatibility and simplifies integration with
 * tools like n8n, Zapier, and custom scripts.
 *
 * Maps REST HTTP methods to oRPC RPC format internally:
 * - GET /api/features → POST /rpc/features.list
 * - GET /api/features/:id → POST /rpc/features.get
 * - POST /api/features → POST /rpc/features.create
 * - PATCH /api/features/:id → POST /rpc/features.update
 * - DELETE /api/features/:id → POST /rpc/features.delete
 * - POST /api/features/:id/status → POST /rpc/features.updateStatus
 * - POST /api/features/bulk-status → POST /rpc/features.bulkUpdateStatus
 */

import { Hono } from "hono";
import type { Context } from "hono";
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
	async function callRPC(
		c: Context,
		method: string,
		input: any
	) {
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
			Object.keys(input).length > 0 ? input : undefined
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

		return callRPC(c, "features.bulkUpdateStatus", { ids: body.ids, status: body.status });
	});

	// GET /api/features/dependencies/:projectId - Get dependency order
	app.get("/features/dependencies/:projectId", async (c: Context) => {
		const projectId = c.req.param("projectId");
		return callRPC(c, "features.getDependencyOrder", { projectId });
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
			status as any
		);
	}

	// Handle validation errors (Zod)
	if (error.name === "ZodError") {
		return c.json(
			{
				error: "Validation error",
				details: error.errors,
			},
			400
		);
	}

	// Generic error
	return c.json(
		{
			error: error.message || "Internal server error",
		},
		500
	);
}
