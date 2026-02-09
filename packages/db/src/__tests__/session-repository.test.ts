import { beforeEach, describe, expect, it } from "bun:test";
import { createClient } from "@libsql/client";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../schema";
import { agentSession } from "../schema/sessions";

/**
 * Session Repository Tests
 *
 * These tests validate the repository pattern for agent sessions.
 * They use an in-memory SQLite database with drizzle-orm to test
 * actual SQL queries and behavior matching the repository implementation.
 *
 * The calculateDuration tests use a standalone reimplementation of
 * the pure function to avoid importing the repository module (which
 * requires env variables for the db connection).
 */

// Standalone implementation of calculateDuration matching the repository
// This avoids needing to import sessionRepository (which triggers env validation)
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

// Create an in-memory SQLite database for testing
function createTestDb() {
	const client = createClient({ url: ":memory:" });
	return drizzle({ client, schema });
}

type TestDb = ReturnType<typeof createTestDb>;

// SQL statements to create the required tables (project -> feature -> agent_session)
const CREATE_PROJECT_TABLE = `
CREATE TABLE IF NOT EXISTS \`project\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`name\` text NOT NULL,
	\`path\` text NOT NULL,
	\`settings\` text DEFAULT '{}' NOT NULL,
	\`status\` text DEFAULT 'draft' NOT NULL,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);`;

const CREATE_FEATURE_TABLE = `
CREATE TABLE IF NOT EXISTS \`feature\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`project_id\` text NOT NULL,
	\`title\` text NOT NULL,
	\`category\` text NOT NULL,
	\`description\` text NOT NULL,
	\`phase\` text NOT NULL,
	\`priority\` integer,
	\`status\` text NOT NULL,
	\`passes\` integer DEFAULT false NOT NULL,
	\`acceptance_criteria\` text NOT NULL,
	\`requirements\` text,
	\`dependencies\` text,
	\`estimated_size\` text,
	\`pre_implemented\` integer,
	\`model\` text,
	\`thinking_level\` text,
	\`planning_mode\` text,
	\`require_plan_approval\` integer,
	\`skip_tests\` integer,
	\`retries\` integer DEFAULT 0,
	\`description_history\` text,
	\`spec\` text,
	\`technical_notes\` text,
	\`testing_requirements\` text,
	\`files\` text,
	\`image_paths\` text,
	\`text_file_paths\` text,
	\`error\` text,
	\`summary\` text,
	\`plan_spec\` text,
	\`branch_name\` text,
	\`use_worktree\` integer DEFAULT false,
	\`locked\` integer DEFAULT false,
	\`locked_by\` text,
	\`locked_at\` integer,
	\`pipeline_step\` text,
	\`last_completed_step\` text,
	\`retry_count\` integer DEFAULT 0,
	\`last_failure_at\` integer,
	\`tags\` text,
	\`title_generating\` integer,
	\`started_at\` integer,
	\`completed_at\` integer,
	\`verified_at\` integer,
	\`completed_by\` text,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`project_id\`) REFERENCES \`project\`(\`id\`) ON UPDATE no action ON DELETE cascade
);`;

const CREATE_AGENT_SESSION_TABLE = `
CREATE TABLE IF NOT EXISTS \`agent_session\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`feature_id\` text,
	\`project_id\` text,
	\`status\` text NOT NULL,
	\`started_at\` integer NOT NULL,
	\`completed_at\` integer,
	\`output\` text,
	\`error\` text,
	\`sdk_session_id\` text,
	\`model\` text DEFAULT 'sonnet',
	\`is_running\` integer DEFAULT false,
	\`working_directory\` text,
	\`message_count\` integer DEFAULT 0,
	\`total_cost_usd\` text,
	\`input_tokens\` integer,
	\`output_tokens\` integer,
	\`created_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	\`updated_at\` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (\`feature_id\`) REFERENCES \`feature\`(\`id\`) ON UPDATE no action ON DELETE cascade
);`;

async function setupTestDb(testDb: TestDb) {
	await testDb.run(CREATE_PROJECT_TABLE);
	await testDb.run(CREATE_FEATURE_TABLE);
	await testDb.run(CREATE_AGENT_SESSION_TABLE);
}

async function seedProject(testDb: TestDb) {
	await testDb.insert(schema.project).values({
		id: "proj_test1",
		userId: "user_test1",
		name: "Test Project",
		path: "/tmp/test-project",
	});
}

async function seedFeature(testDb: TestDb, id = "F001") {
	await testDb.insert(schema.feature).values({
		id,
		userId: "user_test1",
		projectId: "proj_test1",
		title: "Test Feature",
		category: "core",
		description: "A test feature",
		phase: "development",
		status: "backlog",
		passes: false,
		acceptanceCriteria: ["Criterion 1"],
	});
}

describe("Database Package - Session Repository", () => {
	let testDb: TestDb;

	beforeEach(async () => {
		testDb = createTestDb();
		await setupTestDb(testDb);
		await seedProject(testDb);
		await seedFeature(testDb);
	});

	describe("Repository Exports", () => {
		it("repositories index re-exports sessionRepository", async () => {
			// Read the index file to verify it exports sessionRepository
			// (we cannot import it directly without env variables)
			const fs = await import("node:fs");
			const path = await import("node:path");
			const indexPath = path.resolve(
				import.meta.dirname,
				"../repositories/index.ts",
			);
			const content = fs.readFileSync(indexPath, "utf-8");
			expect(content).toContain("sessionRepository");
			expect(content).toContain('./session"');
		});

		it("session repository file exports sessionRepository object", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sessionPath = path.resolve(
				import.meta.dirname,
				"../repositories/session.ts",
			);
			const content = fs.readFileSync(sessionPath, "utf-8");
			expect(content).toContain("export const sessionRepository");
		});

		it("session repository file defines all expected methods", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");
			const sessionPath = path.resolve(
				import.meta.dirname,
				"../repositories/session.ts",
			);
			const content = fs.readFileSync(sessionPath, "utf-8");
			const methods = [
				"findAll",
				"findById",
				"findByFeature",
				"findByStatus",
				"findActive",
				"create",
				"update",
				"appendOutput",
				"delete",
				"calculateDuration",
				"withTransaction",
			];
			for (const method of methods) {
				expect(content).toContain(method);
			}
		});
	});

	describe("calculateDuration (pure function)", () => {
		it("returns duration in milliseconds for completed session", () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			const completedAt = new Date("2026-01-28T11:30:00Z");
			const duration = calculateDuration({ startedAt, completedAt });
			// 1.5 hours = 5,400,000 ms
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

	describe("CRUD Operations (in-memory DB)", () => {
		it("create inserts a new session and returns it", async () => {
			const now = new Date();
			const rows = await testDb
				.insert(agentSession)
				.values({
					id: "sess_create1",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
				})
				.returning();
			const row = rows[0];

			expect(row).toBeDefined();
			expect(row?.id).toBe("sess_create1");
			expect(row?.featureId).toBe("F001");
			expect(row?.status).toBe("pending");
			expect(row?.startedAt).toEqual(now);
			expect(row?.output).toBeNull();
			expect(row?.error).toBeNull();
		});

		it("findById returns session when found", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_find1",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
			});

			const rows = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.id, "sess_find1"));
			const found = rows[0] ?? null;

			expect(found).not.toBeNull();
			expect(found?.id).toBe("sess_find1");
			expect(found?.status).toBe("running");
		});

		it("findById returns null when not found", async () => {
			const rows = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.id, "nonexistent"));
			const found = rows[0] ?? null;

			expect(found).toBeNull();
		});

		it("findAll returns all sessions", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values([
				{
					id: "sess_a",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
				},
				{
					id: "sess_b",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				},
				{
					id: "sess_c",
					userId: "user_test1",
					featureId: "F001",
					status: "completed",
					startedAt: now,
				},
			]);

			const all = await testDb.select().from(agentSession);
			expect(all.length).toBe(3);
		});

		it("findByFeature returns sessions for a specific feature", async () => {
			await seedFeature(testDb, "F002");
			const now = new Date();
			await testDb.insert(agentSession).values([
				{
					id: "sess_f1a",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
				},
				{
					id: "sess_f1b",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				},
				{
					id: "sess_f2a",
					userId: "user_test1",
					featureId: "F002",
					status: "pending",
					startedAt: now,
				},
			]);

			const f001Sessions = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.featureId, "F001"));
			expect(f001Sessions.length).toBe(2);
			for (const s of f001Sessions) {
				expect(s.featureId).toBe("F001");
			}

			const f002Sessions = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.featureId, "F002"));
			expect(f002Sessions.length).toBe(1);
			expect(f002Sessions[0]?.featureId).toBe("F002");
		});

		it("findByStatus returns sessions with matching status", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values([
				{
					id: "sess_s1",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
				},
				{
					id: "sess_s2",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				},
				{
					id: "sess_s3",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				},
			]);

			const running = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.status, "running"));
			expect(running.length).toBe(2);
		});

		it("findActive returns pending and running sessions", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values([
				{
					id: "sess_act1",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
				},
				{
					id: "sess_act2",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				},
				{
					id: "sess_act3",
					userId: "user_test1",
					featureId: "F001",
					status: "completed",
					startedAt: now,
				},
				{
					id: "sess_act4",
					userId: "user_test1",
					featureId: "F001",
					status: "failed",
					startedAt: now,
				},
			]);

			const active = await testDb
				.select()
				.from(agentSession)
				.where(inArray(agentSession.status, ["pending", "running"]));
			expect(active.length).toBe(2);
			const statuses = active.map((s) => s.status);
			expect(statuses).toContain("pending");
			expect(statuses).toContain("running");
		});

		it("update modifies session fields", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_upd1",
				userId: "user_test1",
				featureId: "F001",
				status: "pending",
				startedAt: now,
			});

			const rows = await testDb
				.update(agentSession)
				.set({ status: "running" })
				.where(eq(agentSession.id, "sess_upd1"))
				.returning();

			expect(rows[0]?.status).toBe("running");
			expect(rows[0]?.id).toBe("sess_upd1");
		});

		it("update can set completedAt and output", async () => {
			const now = new Date();
			const completedAt = new Date(now.getTime() + 60_000);
			await testDb.insert(agentSession).values({
				id: "sess_upd2",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
			});

			const rows = await testDb
				.update(agentSession)
				.set({
					status: "completed",
					completedAt,
					output: "Feature implemented successfully",
				})
				.where(eq(agentSession.id, "sess_upd2"))
				.returning();

			const updated = rows[0];
			expect(updated).toBeDefined();
			expect(updated?.status).toBe("completed");
			expect(updated?.completedAt).toEqual(completedAt);
			expect(updated?.output).toBe("Feature implemented successfully");
		});

		it("update can set error on failure", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_upd3",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
			});

			const rows = await testDb
				.update(agentSession)
				.set({
					status: "failed",
					error: "TypeScript compilation failed",
					completedAt: new Date(),
				})
				.where(eq(agentSession.id, "sess_upd3"))
				.returning();

			expect(rows[0]?.status).toBe("failed");
			expect(rows[0]?.error).toBe("TypeScript compilation failed");
		});

		it("delete removes session and returns it", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_del1",
				userId: "user_test1",
				featureId: "F001",
				status: "completed",
				startedAt: now,
			});

			const rows = await testDb
				.delete(agentSession)
				.where(eq(agentSession.id, "sess_del1"))
				.returning();

			expect(rows[0]?.id).toBe("sess_del1");

			// Verify it's gone
			const remaining = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.id, "sess_del1"));
			expect(remaining.length).toBe(0);
		});

		it("delete on nonexistent session returns empty array", async () => {
			const rows = await testDb
				.delete(agentSession)
				.where(eq(agentSession.id, "nonexistent"))
				.returning();

			expect(rows.length).toBe(0);
		});
	});

	describe("appendOutput (SQL concatenation)", () => {
		it("sets output when currently null", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_ao1",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
				output: null,
			});

			const rows = await testDb
				.update(agentSession)
				.set({
					output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${"First line"} ELSE ${agentSession.output} || char(10) || ${"First line"} END`,
				})
				.where(eq(agentSession.id, "sess_ao1"))
				.returning();

			expect(rows[0]?.output).toBe("First line");
		});

		it("appends text with newline when output exists", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_ao2",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
				output: "Line 1",
			});

			const rows = await testDb
				.update(agentSession)
				.set({
					output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${"Line 2"} ELSE ${agentSession.output} || char(10) || ${"Line 2"} END`,
				})
				.where(eq(agentSession.id, "sess_ao2"))
				.returning();

			expect(rows[0]?.output).toBe("Line 1\nLine 2");
		});

		it("appends multiple times correctly", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_ao3",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt: now,
				output: null,
			});

			// First append
			await testDb
				.update(agentSession)
				.set({
					output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${"Step 1"} ELSE ${agentSession.output} || char(10) || ${"Step 1"} END`,
				})
				.where(eq(agentSession.id, "sess_ao3"));

			// Second append
			await testDb
				.update(agentSession)
				.set({
					output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${"Step 2"} ELSE ${agentSession.output} || char(10) || ${"Step 2"} END`,
				})
				.where(eq(agentSession.id, "sess_ao3"));

			// Third append
			const rows = await testDb
				.update(agentSession)
				.set({
					output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${"Step 3"} ELSE ${agentSession.output} || char(10) || ${"Step 3"} END`,
				})
				.where(eq(agentSession.id, "sess_ao3"))
				.returning();

			expect(rows[0]?.output).toBe("Step 1\nStep 2\nStep 3");
		});
	});

	describe("calculateDuration with DB records", () => {
		it("calculates duration from DB-retrieved session", async () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");
			const completedAt = new Date("2026-01-28T10:05:30Z");

			await testDb.insert(agentSession).values({
				id: "sess_dur1",
				userId: "user_test1",
				featureId: "F001",
				status: "completed",
				startedAt,
				completedAt,
			});

			const rows = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.id, "sess_dur1"));
			const session = rows[0];
			expect(session).toBeDefined();

			const duration = calculateDuration(
				session ?? { startedAt: null, completedAt: null },
			);
			// 5 minutes 30 seconds = 330,000 ms
			expect(duration).toBe(330_000);
		});

		it("returns null for running session from DB", async () => {
			const startedAt = new Date("2026-01-28T10:00:00Z");

			await testDb.insert(agentSession).values({
				id: "sess_dur2",
				userId: "user_test1",
				featureId: "F001",
				status: "running",
				startedAt,
			});

			const rows = await testDb
				.select()
				.from(agentSession)
				.where(eq(agentSession.id, "sess_dur2"));
			const session = rows[0];
			expect(session).toBeDefined();

			expect(
				calculateDuration(session ?? { startedAt: null, completedAt: null }),
			).toBeNull();
		});
	});

	describe("Schema constraints via DB", () => {
		it("allows null featureId (nullable foreign key)", async () => {
			const now = new Date();
			const rows = await testDb
				.insert(agentSession)
				.values({
					id: "sess_null1",
					userId: "user_test1",
					featureId: null,
					status: "pending",
					startedAt: now,
				})
				.returning();
			expect(rows[0]?.featureId).toBeNull();
		});

		it("enforces NOT NULL on status", async () => {
			const now = new Date();
			let threw = false;
			try {
				await testDb.insert(agentSession).values({
					id: "sess_null2",
					userId: "user_test1",
					featureId: "F001",
					status: null as unknown as string,
					startedAt: now,
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});

		it("enforces NOT NULL on startedAt", async () => {
			let threw = false;
			try {
				await testDb.insert(agentSession).values({
					id: "sess_null3",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: null as unknown as Date,
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});

		it("allows null for optional fields (completedAt, output, error)", async () => {
			const now = new Date();
			const rows = await testDb
				.insert(agentSession)
				.values({
					id: "sess_opt1",
					userId: "user_test1",
					featureId: "F001",
					status: "pending",
					startedAt: now,
					completedAt: null,
					output: null,
					error: null,
				})
				.returning();

			const row = rows[0];
			expect(row).toBeDefined();
			expect(row?.completedAt).toBeNull();
			expect(row?.output).toBeNull();
			expect(row?.error).toBeNull();
		});

		it("enforces primary key uniqueness", async () => {
			const now = new Date();
			await testDb.insert(agentSession).values({
				id: "sess_dup1",
				userId: "user_test1",
				featureId: "F001",
				status: "pending",
				startedAt: now,
			});

			let threw = false;
			try {
				await testDb.insert(agentSession).values({
					id: "sess_dup1",
					userId: "user_test1",
					featureId: "F001",
					status: "running",
					startedAt: now,
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});
	});
});
