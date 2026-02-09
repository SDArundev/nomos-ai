/**
 * Shared mock-db helpers for service tests.
 *
 * Usage:
 *   import { createMockFeatureRepository, ... } from "./helpers/mock-db";
 *
 *   const mockFeatureRepo = createMockFeatureRepository();
 *   const mockSessionRepo = createMockSessionRepository();
 *
 *   mock.module("@nomos-ai/db", () => ({
 *     featureRepository: mockFeatureRepo,
 *     sessionRepository: mockSessionRepo,
 *   }));
 *
 * Each factory returns a fresh set of mocks. Call `.mockReset()` on individual
 * methods in `beforeEach` to reset between tests.
 */
import { mock } from "bun:test";

// ── Feature Repository ───────────────────────────────────

export function createMockFeatureRepository() {
	return {
		findById: mock(async () => null) as ReturnType<typeof mock>,
		findByProject: mock(async () => []) as ReturnType<typeof mock>,
		findByUser: mock(async () => []) as ReturnType<typeof mock>,
		findByUserAndProject: mock(async () => []) as ReturnType<typeof mock>,
		create: mock(async (data: Record<string, unknown>) => ({
			id: `F${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		})) as ReturnType<typeof mock>,
		update: mock(async () => ({})) as ReturnType<typeof mock>,
		incrementRetryCount: mock(async () => {}) as ReturnType<typeof mock>,
		getRetryInfo: mock(
			async () => ({ retryCount: 0 }),
		) as ReturnType<typeof mock>,
	};
}

// ── Session Repository ───────────────────────────────────

export function createMockSessionRepository() {
	return {
		findById: mock(async () => null) as ReturnType<typeof mock>,
		findActive: mock(async () => []) as ReturnType<typeof mock>,
		findResumable: mock(async () => []) as ReturnType<typeof mock>,
		findByStatus: mock(async () => []) as ReturnType<typeof mock>,
		create: mock(async (data: Record<string, unknown>) => ({
			id: data.id ?? "sess_new",
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		})) as ReturnType<typeof mock>,
		update: mock(
			async (id: string, data: Record<string, unknown>) => ({
				id,
				...data,
				createdAt: new Date(),
				updatedAt: new Date(),
				startedAt: new Date(),
				userId: "user1",
			}),
		) as ReturnType<typeof mock>,
	};
}

// ── Project Repository ───────────────────────────────────

export function createMockProjectRepository() {
	return {
		findById: mock(
			async () => ({
				id: "proj1",
				path: "/Users/test/project",
				userId: "user1",
			}),
		) as ReturnType<typeof mock>,
		findByUser: mock(async () => []) as ReturnType<typeof mock>,
		create: mock(async (data: Record<string, unknown>) => ({
			id: "proj_new",
			...data,
			createdAt: new Date(),
			updatedAt: new Date(),
		})) as ReturnType<typeof mock>,
		update: mock(async () => ({})) as ReturnType<typeof mock>,
	};
}

// ── Worktree Repository ──────────────────────────────────

export function createMockWorktreeRepository() {
	return {
		findByFeatureId: mock(async () => null) as ReturnType<typeof mock>,
		updatePR: mock(async () => {}) as ReturnType<typeof mock>,
		create: mock(async (data: Record<string, unknown>) => ({
			id: "wt_new",
			...data,
			createdAt: new Date(),
		})) as ReturnType<typeof mock>,
		findActive: mock(async () => []) as ReturnType<typeof mock>,
		remove: mock(async () => {}) as ReturnType<typeof mock>,
	};
}

// ── Event Service ────────────────────────────────────────

export function createMockEventService() {
	return {
		emit: mock(() => {}) as ReturnType<typeof mock>,
		subscribe: mock(() => () => {}) as ReturnType<typeof mock>,
		subscriberCount: 0,
	};
}

// ── Utility: Reset all mocks in a repository ─────────────

export function resetAllMocks(repo: Record<string, unknown>) {
	for (const val of Object.values(repo)) {
		if (typeof val === "function" && "mockReset" in val) {
			(val as ReturnType<typeof mock>).mockReset();
		}
	}
}
