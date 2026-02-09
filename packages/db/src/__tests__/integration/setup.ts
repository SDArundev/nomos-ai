/**
 * Integration test setup for DB package.
 *
 * These tests require a live Postgres database AND the full server env.
 * In CI, these are available via the postgres service container.
 * Locally, tests are skipped if the DB module can't load.
 */

import { sql } from "drizzle-orm";

/**
 * Check if integration tests can run.
 * Requires DATABASE_URL and the ability to resolve the full DB module chain
 * (@nomos-ai/env/server and its transitive dependency @t3-oss/env-core).
 */
export const HAS_DB =
	Boolean(process.env.DATABASE_URL) &&
	(() => {
		try {
			Bun.resolveSync("@nomos-ai/env/server", import.meta.dir);
			Bun.resolveSync("@t3-oss/env-core", import.meta.dir);
			return true;
		} catch {
			return false;
		}
	})();

const TEST_USER_ID = "test-user-integration";
const TEST_USER_EMAIL = "integration-test@nomos.test";
const TEST_PROJECT_ID = "proj_integration_test";

/**
 * Seed a test user and project.
 * Caller must pass the db instance (obtained via dynamic import).
 */
export async function seedTestData(db: {
	execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}): Promise<void> {
	await db.execute(sql`
		INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
		VALUES (${TEST_USER_ID}, 'Integration Test User', ${TEST_USER_EMAIL}, true, now(), now())
		ON CONFLICT (id) DO NOTHING
	`);

	await db.execute(sql`
		INSERT INTO project (id, user_id, name, path, settings, status, created_at, updated_at)
		VALUES (${TEST_PROJECT_ID}, ${TEST_USER_ID}, 'Test Project', '/tmp/integration-test', '{}', 'active', now(), now())
		ON CONFLICT (id) DO NOTHING
	`);
}

/**
 * Clean up test data.
 * Caller must pass the db instance.
 */
export async function cleanupTestData(db: {
	execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}): Promise<void> {
	await db.execute(
		sql`DELETE FROM agent_session WHERE user_id = ${TEST_USER_ID}`,
	);
	await db.execute(sql`DELETE FROM pattern WHERE user_id = ${TEST_USER_ID}`);
	await db.execute(
		sql`DELETE FROM feature WHERE project_id = ${TEST_PROJECT_ID}`,
	);
	await db.execute(sql`DELETE FROM project WHERE id = ${TEST_PROJECT_ID}`);
	await db.execute(sql`DELETE FROM "user" WHERE id = ${TEST_USER_ID}`);
}

export { TEST_USER_ID, TEST_PROJECT_ID };
