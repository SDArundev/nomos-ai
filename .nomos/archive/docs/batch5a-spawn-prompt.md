# Batch 5A — Security + Database Foundation — Spawn Prompt

> **Read this file, then execute.** This is a self-contained prompt for a new Claude Code session.

---

## Pre-Execution Checklist

Before spawning agents, run these checks:

```bash
# 1. Verify branch state
git log --oneline -5
git status

# 2. Merge to main if not already done
git checkout main && git merge feature/ecosystem-unification && git push origin main

# 3. Create fresh branch
git checkout -b batch-5a/security-foundation

# 4. Verify test baseline
bun test 2>&1 | tail -5
bun run check-types 2>&1 | tail -5

# 5. Data audit (run against running Postgres)
# Check for violations that would break new CHECK/FK constraints:
# - pattern.confidence outside 0-1
# - antipattern.severity not in enum
# - orphaned userId references
```

---

## Context

Read these for full context:
- `.nomos/docs/batch5-execution-plan.md` — the full 3-session plan
- `.nomos/docs/strategic-review-v2-2026-02-09.md` — the 6-agent review findings

**Session 5A goal:** Fix all CRITICAL/HIGH security issues + database foundation.
**Estimated:** 22.5h agent time, ~7.5h wall-clock across 3 parallel agents.

---

## Spawn Instructions

Create a team with 3 agents. Use `bypassPermissions` mode for all.

### Team: `batch-5a-security`

### Agent 1: `security-agent` (code-writer)

**Files owned (NO other agent touches these):**
- `packages/api/src/services/terminal-service.ts`
- `packages/api/src/services/fs-service.ts`
- `apps/server/src/lib/websocket.ts` (lines 64-75 only)
- `apps/server/src/index.ts` (middleware section only: CSRF + SIGTERM handler)

**Tasks in order:**

**J1 — Terminal RCE Fix (2.5h)**
- File: `packages/api/src/services/terminal-service.ts:25-28`
- Create `sanitizeEnv()` — allowlist: PATH, HOME, SHELL, USER, TERM, LANG, EDITOR, LC_ALL, COLORTERM
- Strip any key containing SECRET, KEY, TOKEN, PASSWORD, DATABASE, REDIS, ANTHROPIC
- Validate `cwd` param: `realpath(cwd)` must start with project root
- Add audit logging: `logger.info({ sessionId, userId, cwd }, "Terminal session created")`

**J2 — Path Traversal Fix (2h)**
- File: `packages/api/src/services/fs-service.ts:7-19`
- Make `validatePath()` async
- After `path.resolve()`, call `await fs.realpath(resolved)`
- Use `lstat()` to detect symlinks — reject with explicit error
- Cascade async change to `readFile`, `writeFile`, `listDir`

**J3 — CSRF Protection (1.5h)**
- File: `apps/server/src/index.ts` (new middleware after CORS block)
- Note: `SameSite=Strict` already set in `packages/auth/src/index.ts:19` for production
- Add middleware: check `X-Requested-With: XMLHttpRequest` on POST/PUT/PATCH/DELETE to `/api/*` and `/rpc/*`
- Exempt: `/api/auth/*` routes (better-auth handles own CSRF)
- Update CORS `allowHeaders` to include `X-Requested-With`

**J4 — Terminal Session Ownership (0.5h)**
- File: `apps/server/src/lib/websocket.ts:64-75`
- Before `terminalService.write(sessionId, data)`, verify `terminalService.getSession(sessionId)?.userId === ws.data.userId`
- If mismatch: log warning, close WebSocket connection

---

### Agent 2: `db-agent` (code-writer)

**Files owned (NO other agent touches these):**
- `packages/db/src/index.ts`
- `packages/db/src/lib/id-generation.ts`
- `packages/db/src/repositories/*.ts` (all 8 repository files that use generateXxxId)

**Tasks in order:**

**K1 — Connection Pool + Graceful Shutdown (2.5h)**
- File: `packages/db/src/index.ts:6`
- Change `postgres(env.DATABASE_URL)` to:
  ```typescript
  postgres(env.DATABASE_URL, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 1800,
  })
  ```
- Export `async function closeDatabase()` that calls `client.end({ timeout: 5 })`
- Add SIGTERM/SIGINT handlers to `apps/server/src/index.ts`:
  ```typescript
  const shutdown = async () => {
    serverLogger.info("Shutting down...");
    terminalService.killAll();
    await closeDatabase();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  ```

**K2 — Atomic ID Generation (6h)**
- File: `packages/db/src/lib/id-generation.ts`
- Refactor to `createWithId()` pattern: MAX(id) + INSERT in single transaction
- Example:
  ```typescript
  export async function createWithId<T extends Record<string, unknown>>(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    table: PgTable,
    prefix: string,
    padWidth: number,
    data: Omit<T, 'id'>,
  ): Promise<T> {
    const maxResult = await tx.select({ maxId: sql`MAX(id)` }).from(table);
    const nextId = computeNextId(maxResult[0]?.maxId, prefix, padWidth);
    const [result] = await tx.insert(table).values({ ...data, id: nextId } as any).returning();
    return result as T;
  }
  ```
- Update 8 repositories to use `createWithId()` inside `db.transaction()`:
  - `feature.ts`, `session.ts`, `pattern.ts`, `antipattern.ts`
  - `feature-insight.ts`, `feature-metric.ts`, `learning.ts`, `project.ts`
- Keep the old `getNextId()` for backward compatibility but mark as `@deprecated`
- Write tests: concurrent insert stress test (10 parallel inserts should get unique IDs)

---

### Agent 3: `migration-agent` (code-writer)

**Files owned (NO other agent touches these):**
- `packages/db/src/schema/patterns.ts`
- `packages/db/src/schema/antipatterns.ts`
- `packages/db/src/schema/events.ts`
- `packages/db/src/schema/features.ts`
- `packages/db/src/schema/feature-insights.ts`
- `packages/db/src/schema/feature-metrics.ts`
- `packages/db/src/migrations/` (new migration file)

**Wait for K1 to complete (db-agent signals done), then proceed:**

**K3 — CHECK Constraints (2h)**
- `patterns.ts`: Add `check("confidence_range", sql\`confidence >= 0 AND confidence <= 1\`)`
- `patterns.ts`: Add `check("success_rate_range", sql\`success_rate >= 0 AND success_rate <= 1\`)`
- `patterns.ts`: Add `check("status_enum", sql\`status IN ('active', 'proven', 'archived')\`)`
- `antipatterns.ts`: Add `check("severity_enum", sql\`severity IN ('critical', 'high', 'medium', 'low')\`)`
- `features.ts`: Add `check("feature_status_enum", sql\`status IN ('backlog', 'pending', 'in_progress', 'waiting_approval', 'verified', 'failed')\`)`

**K4 — Missing FK References (1.5h)**
- `patterns.ts`: `userId` → `.references(() => user.id, { onDelete: "set null" })`
- `antipatterns.ts`: `userId` → `.references(() => user.id, { onDelete: "set null" })`
- `feature-insights.ts`: `userId` → `.references(() => user.id, { onDelete: "set null" })`
- `feature-metrics.ts`: `userId` → `.references(() => user.id, { onDelete: "set null" })`
- Note: Use `set null` not `cascade` — don't delete patterns when user is deleted

**K5 — Missing Indexes (1h)**
- `events.ts`: Add `index("event_type_idx").on(table.type)`
- `events.ts`: Add `index("event_created_at_idx").on(table.createdAt)`
- `events.ts`: Add `index("event_project_type_idx").on(table.projectId, table.type)`

**K6 — Generate + Apply Migration (3h)**
1. Run data audit queries from section 0.3 — fix any violations
2. Run `bun drizzle-kit generate` to create migration SQL
3. Review generated SQL — verify ALTER TABLE ADD CONSTRAINT statements
4. Apply migration: `bun drizzle-kit push` (or `migrate` depending on setup)
5. Run full test suite: `bun test`
6. If tests fail: investigate, DO NOT proceed

---

## Execution Order

```
TIME    security-agent          db-agent              migration-agent
────    ──────────────          ────────              ───────────────
 0h     J1 (terminal RCE)      K1 (pool+shutdown)    [waiting for K1]
 2.5h   J2 (path traversal)    K2 (atomic IDs)       K3 (CHECK constraints)
 4.5h   J3 (CSRF)              K2 (continued)        K4 (FK references)
 6h     J4 (session ownership) [done]                K5 (indexes)
 6.5h   [done]                                       K6 (migration)
 7.5h                                                [done]
```

## Verification Before Commit

```bash
# All tests pass
bun test

# Zero type errors
bun run check-types

# Manual checks
# 1. Terminal env: start terminal, run `env | grep DATABASE` — should be empty
# 2. FS traversal: create symlink, attempt to read via API — should fail
# 3. CSRF: curl POST without X-Requested-With — should get 403
# 4. Terminal write: attempt write to another user's session — should fail
# 5. DB pool: check logs for pool config on startup
# 6. ID generation: run concurrent insert test
# 7. CHECK constraint: attempt insert with confidence=5.0 — should fail
```

## Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Batch 5A — Security hardening + database foundation

- Fix terminal RCE: strip sensitive env vars, validate CWD, add audit logging
- Fix path traversal: realpath() + symlink blocking in FSService
- Add CSRF: X-Requested-With header check on state-changing requests
- Fix terminal session ownership: verify userId on write
- Configure DB connection pool (max:20, timeouts) + SIGTERM graceful shutdown
- Atomic ID generation: MAX + INSERT in single transaction (8 repos)
- Add CHECK constraints: confidence 0-1, severity enum, status enum
- Add missing FKs: userId → user on pattern/antipattern/insight/metric
- Add missing indexes: event.type, event.createdAt, compound event indexes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Then merge to main and proceed to Session 5B.
