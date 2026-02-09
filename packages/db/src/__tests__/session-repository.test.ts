import { describe, expect, it } from "bun:test";

/**
 * Session Repository Tests — Pure function tests.
 * DB-dependent tests are in integration/ directory.
 */

type SessionLike = {
	startedAt: Date | null;
	completedAt: Date | null;
};
function calculateDuration(session: SessionLike): number | null {
	if (!session.completedAt || !session.startedAt) {
		return null;
	}
	return session.completedAt.getTime() - session.startedAt.getTime();
}

describe("Database Package - Session Repository", () => {
	describe("calculateDuration (pure function)", () => {
		it("returns duration in milliseconds for completed session", () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			const completedAt = new Date("2026-01-28T11:30:00Z");
			const duration = calculateDuration({ startedAt, completedAt });
			expect(duration).toBe(5_400_000);
		});

		it("returns null when completedAt is missing", () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			expect(calculateDuration({ startedAt, completedAt: null })).toBeNull();
		});

		it("returns null when startedAt is missing", () => {
			const completedAt = new Date("2026-01-28T11:00:00Z");
			expect(calculateDuration({ startedAt: null, completedAt })).toBeNull();
		});

		it("returns null when both are missing", () => {
			expect(
				calculateDuration({ startedAt: null, completedAt: null }),
			).toBeNull();
		});

		it("returns 0 when startedAt equals completedAt", () => {
			const timestamp = new Date("2026-01-28T10:00:00Z");
			expect(
				calculateDuration({
					startedAt: timestamp,
					completedAt: timestamp,
				}),
			).toBe(0);
		});

		it("returns positive duration for sub-second intervals", () => {
			const startedAt = new Date("2026-01-28T10:00:00.000Z");
			const completedAt = new Date("2026-01-28T10:00:00.500Z");
			expect(calculateDuration({ startedAt, completedAt })).toBe(500);
		});
	});
});
