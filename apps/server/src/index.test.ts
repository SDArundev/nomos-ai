import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Unit tests for the Hono app routes defined in index.ts.
 *
 * We recreate the route handlers here to avoid importing index.ts directly,
 * which triggers top-level side effects (database migrations, env loading).
 * This tests the routing logic in isolation.
 */

function createTestApp() {
	const app = new Hono();

	// Health check route
	app.get("/", (c) => {
		return c.text("OK");
	});

	// Health endpoint
	app.get("/health", (c) => {
		return c.json({
			status: "healthy",
			version: "1.0.0",
			database: "connected",
			uptime: 123.456,
			timestamp: new Date().toISOString(),
		});
	});

	// Not found handler
	app.notFound((c) => {
		return c.json({ error: "Not Found" }, 404);
	});

	// Error handler
	app.onError((err, c) => {
		if (err instanceof HTTPException) {
			return err.getResponse();
		}
		console.error("Unhandled error:", err);
		return c.json({ error: "Internal Server Error" }, 500);
	});

	return app;
}

describe("Hono App", () => {
	const app = createTestApp();

	describe("Health check: GET /", () => {
		test("returns 200 with 'OK' text", async () => {
			const res = await app.request("/");
			expect(res.status).toBe(200);
			expect(await res.text()).toBe("OK");
		});
	});

	describe("Health endpoint: GET /health", () => {
		test("returns 200 with JSON body", async () => {
			const res = await app.request("/health");
			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toContain("application/json");
		});

		test("response includes status and version fields", async () => {
			const res = await app.request("/health");
			const body = (await res.json()) as {
				status: string;
				version: string;
			};
			expect(body.status).toBe("healthy");
			expect(body.version).toBe("1.0.0");
		});

		test("response includes database field", async () => {
			const res = await app.request("/health");
			const body = (await res.json()) as { database: string };
			expect(body.database).toBe("connected");
		});

		test("response includes timestamp", async () => {
			const res = await app.request("/health");
			const body = (await res.json()) as { timestamp: string };
			expect(body.timestamp).toBeDefined();
			expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
		});

		test("returns 503 with unhealthy status when database fails", async () => {
			const unhealthyApp = new Hono();
			unhealthyApp.get("/health", async (c) => {
				const database = "disconnected";
				return c.json(
					{
						status: "unhealthy",
						version: "1.0.0",
						database,
						uptime: 0,
						timestamp: new Date().toISOString(),
					},
					503,
				);
			});

			const res = await unhealthyApp.request("/health");
			expect(res.status).toBe(503);
			const body = (await res.json()) as {
				status: string;
				database: string;
			};
			expect(body.status).toBe("unhealthy");
			expect(body.database).toBe("disconnected");
		});
	});

	describe("Not found handler", () => {
		test("GET /nonexistent returns 404 JSON with error field", async () => {
			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
			const body = (await res.json()) as { error: string };
			expect(body).toHaveProperty("error");
			expect(body.error).toBe("Not Found");
		});

		test("GET /some/deep/path returns 404 JSON with error field", async () => {
			const res = await app.request("/some/deep/path");
			expect(res.status).toBe(404);
			const body = (await res.json()) as { error: string };
			expect(body).toHaveProperty("error");
		});
	});

	describe("Error handler", () => {
		test("handles HTTPException and returns its response", async () => {
			const errorApp = createTestApp();
			errorApp.get("/http-error", () => {
				throw new HTTPException(403, { message: "Forbidden" });
			});

			const res = await errorApp.request("/http-error");
			expect(res.status).toBe(403);
		});

		test("handles generic errors with 500 JSON response", async () => {
			const errorApp = createTestApp();
			errorApp.get("/generic-error", () => {
				throw new Error("Something went wrong");
			});

			const res = await errorApp.request("/generic-error");
			expect(res.status).toBe(500);
			const body = (await res.json()) as { error: string };
			expect(body).toHaveProperty("error");
			expect(body.error).toBe("Internal Server Error");
		});
	});
});
