import { describe, expect, it } from "bun:test";

// Schema tests don't require database connection
describe("Database Package - Schema", () => {
	describe("Auth Schema Exports", () => {
		it("exports user table", async () => {
			const { user } = await import("../schema");
			expect(user).toBeDefined();
		});

		it("exports session table", async () => {
			const { session } = await import("../schema");
			expect(session).toBeDefined();
		});

		it("exports account table", async () => {
			const { account } = await import("../schema");
			expect(account).toBeDefined();
		});

		it("exports verification table", async () => {
			const { verification } = await import("../schema");
			expect(verification).toBeDefined();
		});
	});

	describe("User Table Schema", () => {
		it("has required columns", async () => {
			const { user } = await import("../schema");
			// Drizzle tables have column definitions as properties
			expect(user.id).toBeDefined();
			expect(user.email).toBeDefined();
			expect(user.name).toBeDefined();
			expect(user.createdAt).toBeDefined();
			expect(user.updatedAt).toBeDefined();
		});
	});

	describe("Session Table Schema", () => {
		it("has required columns", async () => {
			const { session } = await import("../schema");
			expect(session.id).toBeDefined();
			expect(session.userId).toBeDefined();
			expect(session.expiresAt).toBeDefined();
			expect(session.token).toBeDefined();
		});
	});

	describe("Account Table Schema", () => {
		it("has required columns", async () => {
			const { account } = await import("../schema");
			expect(account.id).toBeDefined();
			expect(account.userId).toBeDefined();
			expect(account.providerId).toBeDefined();
			expect(account.accountId).toBeDefined();
		});
	});

	describe("Verification Table Schema", () => {
		it("has required columns", async () => {
			const { verification } = await import("../schema");
			expect(verification.id).toBeDefined();
			expect(verification.identifier).toBeDefined();
			expect(verification.value).toBeDefined();
			expect(verification.expiresAt).toBeDefined();
		});
	});
});
