import { describe, expect, it } from "bun:test";
import { FEATURE_STATUS, PROJECT_STATUS, SESSION_STATUS } from "../status";

describe("Status Enum Schemas", () => {
	describe("NOMOS state machine values", () => {
		it("has exactly 6 feature statuses", () => {
			const statuses = Object.values(FEATURE_STATUS);
			expect(statuses).toEqual([
				"backlog",
				"pending",
				"in_progress",
				"waiting_approval",
				"verified",
				"failed",
			]);
		});

		it("has exactly 3 project statuses", () => {
			const statuses = Object.values(PROJECT_STATUS);
			expect(statuses).toEqual(["draft", "active", "archived"]);
		});

		it("has exactly 4 session statuses", () => {
			const statuses = Object.values(SESSION_STATUS);
			expect(statuses).toEqual(["pending", "running", "completed", "failed"]);
		});
	});
});
