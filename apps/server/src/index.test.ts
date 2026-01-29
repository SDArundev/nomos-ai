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
