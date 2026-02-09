import { expect, test } from "@playwright/test";

test.describe("Smoke tests", () => {
	test("login page loads", async ({ page }) => {
		await page.goto("/login");
		// Should see a sign-up or sign-in form
		await expect(
			page.getByRole("heading").or(page.getByRole("button")),
		).toBeVisible();
	});

	test("unauthenticated user is redirected to login", async ({ page }) => {
		await page.goto("/dashboard");
		// Should redirect to login or show login form
		await page.waitForURL(/\/(login|$)/);
	});

	test("dashboard route exists", async ({ page }) => {
		// Navigate to root — should load the app shell
		const response = await page.goto("/");
		expect(response?.status()).toBeLessThan(500);
	});

	test("health endpoint returns ok", async ({ request }) => {
		const baseURL = process.env.E2E_API_URL ?? "http://localhost:3001";
		const response = await request.get(`${baseURL}/health`);
		expect(response.ok()).toBeTruthy();
		const body = await response.json();
		expect(body.status).toBe("ok");
	});

	test("ready endpoint returns check results", async ({ request }) => {
		const baseURL = process.env.E2E_API_URL ?? "http://localhost:3001";
		const response = await request.get(`${baseURL}/ready`);
		const body = await response.json();
		expect(body).toHaveProperty("ready");
		expect(body).toHaveProperty("checks");
	});
});
