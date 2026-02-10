# NOMOS Batch 5 — Execution Plan

> Synthesized from 4-agent analysis swarm (2026-02-09)
> Revised estimates: **~52.5h** (down from 119h original)
> Split into **3 independent sessions**: 5A, 5B, 5C

---

## 0. Pre-Execution Steps (BEFORE ANY CODING)

### 0.1 Merge Current Branch

The `feature/ecosystem-unification` branch has **13 commits, 250 files changed**, spanning Batches 1-4. This MUST be merged to `main` before starting Batch 5. Continuing on this branch creates:
- Massive merge conflict risk
- Impossible code review (38K+ insertions)
- No clean rollback points

**Action:**
```bash
git checkout main
git merge feature/ecosystem-unification
git push origin main
```

### 0.2 Create Fresh Branches

Each session gets its own branch from the merged `main`:
```
batch-5a/security-foundation    # Session 5A
batch-5b/self-building-mvp      # Session 5B
batch-5c/hardening              # Session 5C
```

### 0.3 Data Audit for Migration Safety

Before K3/K4 constraints can be applied, audit existing data for violations:

```sql
-- Check confidence values outside 0-1 range
SELECT id, confidence FROM pattern WHERE confidence < 0 OR confidence > 1;
SELECT id, success_rate FROM pattern WHERE success_rate < 0 OR success_rate > 1;

-- Check invalid severity values
SELECT id, severity FROM antipattern WHERE severity NOT IN ('critical', 'high', 'medium', 'low');

-- Check orphaned userId references
SELECT p.id, p.user_id FROM pattern p LEFT JOIN "user" u ON p.user_id = u.id WHERE u.id IS NULL;
SELECT a.id, a.user_id FROM antipattern a LEFT JOIN "user" u ON a.user_id = u.id WHERE u.id IS NULL;

-- Check orphaned projectId references in events
SELECT e.id, e.project_id FROM event e WHERE e.project_id IS NOT NULL AND e.project_id NOT IN (SELECT id FROM project);
```

**If violations found:** Fix data BEFORE applying constraints in K6.

### 0.4 Test Baseline

```bash
bun run test           # Confirm 1006 tests passing
bun run typecheck      # Confirm 0 type errors
```

---

## 1. Session 5A — Security + Database Foundation

**Estimated effort:** 18.5h agent time
**Branch:** `batch-5a/security-foundation`
**Agents:** 3 (security-agent, db-agent, migration-agent)

### Task List

| ID | Task | Files | Agent | Est. | Dependencies |
|----|------|-------|-------|------|-------------|
| J1 | Terminal RCE: strip env vars, validate CWD, add audit logging | `packages/api/src/services/terminal-service.ts` | security-agent | 2.5h | None |
| J2 | Path traversal: add realpath(), block symlinks | `packages/api/src/services/fs-service.ts` | security-agent | 2h | None |
| J3 | CSRF: add X-Requested-With header check on POST/PUT/DELETE | `apps/server/src/index.ts` (middleware only, lines 109-119) | security-agent | 1.5h | None |
| J4 | Terminal session ownership: verify userId on write() | `apps/server/src/lib/websocket.ts:64-75` | security-agent | 0.5h | J1 |
| K1 | DB connection pool + graceful shutdown | `packages/db/src/index.ts` | db-agent | 2.5h | None |
| K2 | Atomic ID generation (move into INSERT transaction) | `packages/db/src/lib/id-generation.ts`, 8 repositories | db-agent | 6h | None |
| K3 | CHECK constraints (confidence 0-1, severity enum) | `packages/db/src/schema/patterns.ts`, `antipatterns.ts` | migration-agent | 2h | K1 |
| K4 | Missing FK: userId → user table | `packages/db/src/schema/patterns.ts`, `antipatterns.ts`, `feature-insights.ts`, `feature-metrics.ts` | migration-agent | 1.5h | K3 |
| K5 | Missing indexes: event.type, compound indexes | `packages/db/src/schema/events.ts` | migration-agent | 1h | K4 |
| K6 | Generate + apply migration (after data audit) | `packages/db/drizzle/` | migration-agent | 3h | K3, K4, K5 |

**Total: 22.5h across 3 agents = ~7.5h wall-clock**

### Task Details

#### J1 — Terminal RCE Fix
**File:** `packages/api/src/services/terminal-service.ts:25-28`

Current code spawns PTY with `env: process.env as Record<string, string>`, leaking `DATABASE_URL`, `ANTHROPIC_API_KEY`, `BETTER_AUTH_SECRET`.

**Changes:**
1. Create `sanitizeEnv()` function that strips sensitive vars (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `BETTER_AUTH_SECRET`, `AUTH_SECRET`, `GITHUB_TOKEN`, any key containing `SECRET`, `KEY`, `TOKEN`, `PASSWORD`)
2. Validate `cwd` is within project directory using `realpath()` before spawning
3. Add audit log: `serverLogger.info({ sessionId, userId, cwd }, "Terminal session created")`
4. Log all terminal writes exceeding 1000 chars: `serverLogger.warn({ sessionId, userId, size }, "Large terminal write")`

#### J2 — Path Traversal Fix
**File:** `packages/api/src/services/fs-service.ts:7-19`

Current code uses `resolve()` + `startsWith()` which symlinks bypass.

**Changes:**
1. Import `realpath` from `node:fs/promises`
2. After `resolve()`, call `await realpath(resolved)` and check the result against `allowedRoot`
3. Use `lstat()` to detect symlinks and reject them with explicit error
4. Make `validatePath()` async (cascading change to `readFile`, `writeFile`, `listDir`)

#### J3 — CSRF Protection
**File:** `apps/server/src/index.ts` (new middleware after CORS)

SameSite=Strict already exists on cookies. Only need:
1. Add middleware that checks `X-Requested-With: XMLHttpRequest` header on POST/PUT/PATCH/DELETE requests to `/api/*` and `/rpc/*`
2. Update CORS `allowHeaders` to include `X-Requested-With`
3. Frontend oRPC client already sends custom headers — verify it sends this one

#### J4 — Terminal Session Ownership on Write
**File:** `apps/server/src/lib/websocket.ts:64-75`

Current code: `terminalService.write(ws.data.sessionId, String(message))` — no ownership check.

**Changes:**
1. Before calling `terminalService.write()`, verify `terminalService.getSession(sessionId).userId === ws.data.userId`
2. If mismatch, log and close WebSocket

#### K1 — Connection Pool + Graceful Shutdown
**File:** `packages/db/src/index.ts:6`

Current code: `const client = postgres(env.DATABASE_URL)` with zero config.

**Changes:**
```typescript
const client = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 1800,
});

export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
```

Add to `apps/server/src/index.ts`:
```typescript
process.on("SIGTERM", async () => {
  serverLogger.info("SIGTERM received, shutting down...");
  terminalService.killAll();
  await closeDatabase();
  process.exit(0);
});
```

#### K2 — Atomic ID Generation
**File:** `packages/db/src/lib/id-generation.ts` + 8 repositories

The current `getNextId()` generates the ID in a transaction but the INSERT happens separately — concurrent calls get the same ID.

**Changes:**
1. Refactor `getNextId()` to accept a callback that performs the insert within the same transaction
2. Alternative: Switch to UUID-based IDs for new tables (pattern, antipattern, insight, metric) — simpler, no race condition
3. For legacy tables (feature, session, learning, project) — keep sequential but make atomic
4. Repositories affected: `feature.ts`, `session.ts`, `learning.ts`, `project.ts`, `pattern.ts`, `antipattern.ts`, `feature-insight.ts`, `feature-metric.ts`

**Recommended approach:** Use `createWithId()` pattern that wraps MAX + INSERT in single transaction:
```typescript
async function createWithId<T>(
  table: TableType,
  prefix: string,
  data: Omit<T, 'id'>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const id = await getNextIdInTx(tx, table, prefix);
    const [result] = await tx.insert(table).values({ ...data, id }).returning();
    return result;
  });
}
```

#### K3 — CHECK Constraints
**Files:** `packages/db/src/schema/patterns.ts`, `packages/db/src/schema/antipatterns.ts`

**Changes:**
1. Add to pattern table: `check("confidence_range", sql\`confidence >= 0 AND confidence <= 1\`)`
2. Add to pattern table: `check("success_rate_range", sql\`success_rate >= 0 AND success_rate <= 1\`)`
3. Add to pattern table: `check("status_enum", sql\`status IN ('active', 'proven', 'archived')\`)`
4. Add to antipattern table: `check("severity_enum", sql\`severity IN ('critical', 'high', 'medium', 'low')\`)`

#### K4 — Missing FK References
**Files:** Pattern/antipattern schemas

Both `pattern.userId` and `antipattern.userId` have no FK to user table. Feature insight and metric already have FKs to feature.

**Changes:**
1. Add `.references(() => user.id, { onDelete: "cascade" })` to `pattern.userId`
2. Add `.references(() => user.id, { onDelete: "cascade" })` to `antipattern.userId`
3. Add `.references(() => user.id, { onDelete: "cascade" })` to `featureInsight.userId`
4. Add `.references(() => user.id, { onDelete: "cascade" })` to `featureMetric.userId`
5. Add `.references(() => project.id, { onDelete: "set null" })` to `event.projectId` (missing)

#### K5 — Missing Indexes
**File:** `packages/db/src/schema/events.ts`

**Changes:**
1. Add `index("event_type_idx").on(table.type)` — event table has no indexes at all
2. Add `index("event_created_at_idx").on(table.createdAt)` — for time-range queries
3. Add compound index `index("event_project_type_idx").on(table.projectId, table.type)` — for filtered project queries

#### K6 — Migration Generation + Application
**Prerequisite:** Data audit from step 0.3 passed, K3+K4+K5 schema changes committed.

**Steps:**
1. Run `bun run drizzle-kit generate` to create migration SQL
2. Review generated SQL for correctness (especially ALTER TABLE ADD CONSTRAINT)
3. Create a pre-migration script to fix any data violations found in audit
4. Apply migration in a transaction with rollback on failure
5. Run full test suite after migration

### Execution Order (5A)

```
Parallel Track 1 (security-agent):  J1 → J2 → J3 → J4
Parallel Track 2 (db-agent):        K1 → K2
Parallel Track 3 (migration-agent): [wait for K1] → K3 → K4 → K5 → K6
```

J-tasks and K1/K2 run fully in parallel. K3-K6 wait for K1 (pool config) since they share the db index file.

### Verification Criteria (5A)

- [ ] All 1006+ tests pass
- [ ] 0 type errors
- [ ] Terminal session no longer leaks `DATABASE_URL` in env
- [ ] `fs-service.ts` rejects symlink traversal (manual test)
- [ ] POST without `X-Requested-With` header returns 403
- [ ] WebSocket upgrade without auth returns 401 (already works — verify)
- [ ] Terminal write to wrong user's session fails
- [ ] `postgres()` client created with pool config (inspect logs)
- [ ] ID generation works under concurrent inserts (write test)
- [ ] CHECK constraint blocks `confidence: 5.0` (write test)
- [ ] FK constraint blocks orphaned userId (write test)

### Commit Message (5A)

```
feat: Batch 5A — Security hardening + database foundation

- Fix terminal RCE: strip sensitive env vars, validate CWD, add audit logging
- Fix path traversal: realpath() + symlink blocking in FSService
- Add CSRF: X-Requested-With header check on state-changing requests
- Fix terminal session ownership: verify userId on write
- Configure DB connection pool (max:20, timeouts) + SIGTERM graceful shutdown
- Atomic ID generation: MAX + INSERT in single transaction
- Add CHECK constraints: confidence 0-1, severity enum, status enum
- Add missing FKs: userId → user, projectId → project
- Add missing indexes: event.type, event.createdAt, compound event indexes
```

---

## 2. Session 5B — Self-Building MVP

**Estimated effort:** 17h agent time
**Branch:** `batch-5b/self-building-mvp` (from main after 5A merged)
**Agents:** 2 (frontend-agent, backend-agent)

**NOTE:** L1 and L5 have NO dependency on 5A security changes. If desired, L1/L5 can start in parallel with 5A on a separate branch, then rebase onto 5A.

### Task List

| ID | Task | Files | Agent | Est. | Dependencies |
|----|------|-------|-------|------|-------------|
| L1 | Rewrite learnings UI to query new 4-table system | `apps/web/src/routes/learnings.tsx` (full rewrite) | frontend-agent | 7h | None |
| L2 | Add "Start Build" button to feature detail page | `apps/web/src/routes/features.$featureId.tsx` | frontend-agent | 2h | None |
| L3 | Pipeline monitor (MVP: polling, not WebSocket) | `apps/web/src/components/auto-mode/pipeline-monitor.tsx` (NEW), `packages/api/src/routers/auto-mode.ts` (add getProgress endpoint) | backend-agent + frontend-agent | 4h | L2 |
| L4 | Investigate cost accumulation — verify SDK total_cost_usd is cumulative | `packages/api/src/services/auto-mode-service.ts:242-245` | backend-agent | 1h | None |
| L5 | Cost summary card on dashboard | `apps/web/src/routes/dashboard.tsx`, `apps/web/src/components/dashboard/cost-card.tsx` (NEW) | frontend-agent | 3h | L4 |

**Total: 17h across 2 agents = ~8.5h wall-clock**

### Task Details

#### L1 — Learnings UI Rewrite
**File:** `apps/web/src/routes/learnings.tsx` (FULL REWRITE)

**Problem:** The entire page queries `orpc.learnings.list()` which hits the OLD `learning` table. The page then filters by `l.pattern` and `l.antiPattern` fields that don't exist in the new tables. The new tables (`pattern`, `antipattern`, `feature_insight`, `feature_metric`) have completely different schemas and are never queried.

**API endpoints already exist** (confirmed in `packages/api/src/routers/learning.ts`):
- `listPatterns` — returns patterns with confidence, status, evidenceCount
- `listAntipatterns` — returns antipatterns with severity, prevention, whatWentWrong
- `listInsights` — returns feature insights with discoveries, whatWorked, whatFailed

**Changes:**
1. Replace single `learnings.list` query with 3 separate queries: `listPatterns`, `listAntipatterns`, `listInsights`
2. **Patterns tab:** Show name, description, confidence bar (0-1 scale), status badge (active/proven/archived), evidence count, category filter
3. **Antipatterns tab:** Show name, description, severity badge (critical=red, high=orange, medium=yellow, low=blue), prevention text, category filter
4. **Insights tab:** Show by featureId, discoveries list, whatWorked/whatFailed, patternsApplied
5. Add curation controls: promote pattern (set status=proven), archive pattern (set status=archived), delete

**Interface changes:**
- Remove `LearningEntry` interface (old shape)
- Add `PatternEntry`, `AntipatternEntry`, `InsightEntry` interfaces matching API response
- Each tab component makes its own query

#### L2 — Start Build Button
**File:** `apps/web/src/routes/features.$featureId.tsx`

**The backend API `autoMode.startFeature` already exists** at `packages/api/src/routers/auto-mode.ts:113-158`. It handles:
- Feature ownership verification
- Project lookup for projectRoot
- Status transition from backlog→pending
- Pipeline kickoff

**Frontend changes (trivial):**
1. Add import: `import { useMutation } from "@tanstack/react-query"`
2. Add mutation: `const startBuild = useMutation(orpc.autoMode.startFeature.mutationOptions(...))`
3. Add button in the feature detail header (next to edit button):
   ```tsx
   <Button onClick={() => startBuild.mutate({ featureId })}
     disabled={feature.status === 'in_progress' || startBuild.isPending}>
     {startBuild.isPending ? "Starting..." : "Start Build"}
   </Button>
   ```
4. Add toast feedback on success/error
5. Disable button for features already in_progress or verified

#### L3 — Pipeline Monitor (MVP)
**Files:** NEW `apps/web/src/components/auto-mode/pipeline-monitor.tsx`, `packages/api/src/routers/auto-mode.ts`

**Hidden blocker:** `PipelineService.getProgress(featureId)` exists but has NO REST endpoint.

**Backend changes (backend-agent):**
1. Add `getProgress` endpoint to `auto-mode.ts`:
   ```typescript
   getProgress: protectedProcedure
     .input(z.object({ featureId: z.string() }))
     .handler(async ({ input }) => {
       const pipeline = getPipelineService();
       return pipeline.getProgress(input.featureId);
     }),
   ```

**Frontend changes (frontend-agent):**
1. Create `pipeline-monitor.tsx` component
2. Poll `autoMode.getProgress` every 3s when a feature is in_progress (via `refetchInterval`)
3. Show 6-phase progress bar with step names and status icons
4. Display current phase name, elapsed time, checkpoint status
5. Integrate into feature detail page and optionally dashboard

**MVP scope:** Polling only. WebSocket streaming deferred to Batch 6.

#### L4 — Cost Accumulation Investigation
**File:** `packages/api/src/services/auto-mode-service.ts:242-245`

The MVP analyst flagged that SDK `total_cost_usd` may already be cumulative, making this a non-bug.

**Action:**
1. Read Claude Agent SDK docs to confirm `result.costData.totalCostUsd` is cumulative across turns
2. If cumulative: no fix needed, just add a comment explaining this
3. If NOT cumulative: accumulate in a running total:
   ```typescript
   let totalCost = 0;
   for await (const msg of stream) {
     if (msg.type === "result" && msg.costData) {
       totalCost += msg.costData.totalCostUsd;
       costData = { ...msg.costData, totalCostUsd: totalCost };
     }
   }
   ```

**Estimated:** 0-1h depending on finding.

#### L5 — Cost Summary Card
**Files:** NEW `apps/web/src/components/dashboard/cost-card.tsx`, `apps/web/src/routes/dashboard.tsx`

**Changes:**
1. Create `CostCard` component showing:
   - Total cost across all sessions
   - Cost of current/last session
   - Average cost per feature
2. Query session data: `orpc.sessions.list.queryOptions()` — sessions already store `totalCostUsd`, `inputTokens`, `outputTokens`
3. Add to dashboard grid alongside existing stat cards

### Execution Order (5B)

```
Parallel Track 1 (frontend-agent):  L1 → L2 → L3 (frontend part)
Parallel Track 2 (backend-agent):   L4 → L3 (backend part) → L5
```

L1 is the largest task and should start immediately. L2 is trivial. L3 requires both agents coordinating on the API endpoint.

### Verification Criteria (5B)

- [ ] Learnings page shows patterns from `pattern` table with confidence bars
- [ ] Learnings page shows antipatterns from `antipattern` table with severity badges
- [ ] Learnings page shows insights from `feature_insight` table
- [ ] "Start Build" button appears on feature detail page
- [ ] Clicking "Start Build" triggers pipeline (check server logs for startFeature call)
- [ ] Pipeline monitor shows progress for in_progress features
- [ ] Cost card displays session cost data on dashboard
- [ ] All tests pass, 0 type errors

### Commit Message (5B)

```
feat: Batch 5B — Self-building MVP (learnings UI, Start Build, pipeline monitor)

- Rewrite learnings page: query pattern/antipattern/insight tables (not legacy learning)
- Add confidence bars, severity badges, curation controls to learnings
- Add "Start Build" button on feature detail page (calls autoMode.startFeature)
- Add pipeline monitor component with polling-based progress tracking
- Add getProgress API endpoint for pipeline status
- Add cost summary card to dashboard with session cost aggregation
- Investigate and document cost accumulation behavior
```

---

## 3. Session 5C — Hardening + Polish

**Estimated effort:** 17h agent time
**Branch:** `batch-5c/hardening` (from main after 5B merged)
**Agents:** 2 (backend-agent, frontend-agent)
**Condition:** Only proceed if 5A and 5B are merged and passing.

### Task List

| ID | Task | Files | Agent | Est. | Dependencies |
|----|------|-------|-------|------|-------------|
| M1 | Pagination on 3 critical repos (feature, session, learning) | 3 repos + 3 routers | backend-agent | 4h | None |
| M3 | Fix PipelineService projectRoot race condition | `packages/api/src/services/pipeline-service.ts` | backend-agent | 2h | None |
| M4 | Session crash recovery (mark stale RUNNING→FAILED on startup) | `apps/server/src/index.ts` (already partially done), `packages/api/src/services/session-service.ts` | backend-agent | 1h | None |
| M6 | Graceful shutdown — kill terminals, close DB, drain connections | `apps/server/src/index.ts` | backend-agent | 0.5h | Included in K1 from 5A |
| N1 | Install shadcn/ui: Table, Tabs, Tooltip, Progress | `apps/web/` (UI component installs) | frontend-agent | 2h | None |
| O1 | Refactor learnings page with shadcn components (confidence bars via Progress, sortable Table) | `apps/web/src/routes/learnings.tsx` | frontend-agent | 5h | N1, L1 |
| A1 | Basic ARIA: landmarks, skip links, focus management | `apps/web/src/routes/__root.tsx`, layout components | frontend-agent | 2.5h | None |

**Total: 17h across 2 agents = ~8.5h wall-clock**

### Task Details

#### M1 — Pagination (Scoped)
**Files:** `packages/db/src/repositories/feature.ts`, `session.ts`, `learning.ts` + corresponding routers

Scope to 3 repos only (not all 13). These are the highest-cardinality tables.

**Changes:**
1. Add `limit`/`offset` params to `findAll()`, `findByUser()` in each repo
2. Return `{ rows: T[], total: number }` shape
3. Default limit: 50, max: 200
4. Update router handlers to accept/pass pagination params
5. Frontend can adopt pagination incrementally (not in this session)

#### M3 — PipelineService Race Condition
**File:** `packages/api/src/services/pipeline-service.ts`

The service stores `projectRoot` as mutable instance state. Concurrent pipelines overwrite each other.

**Fix:** Pass `projectRoot` as parameter to all methods that need it, rather than storing as instance variable.

#### M4 — Session Crash Recovery
**File:** `apps/server/src/index.ts:35-50`

This is **already partially implemented** (lines 35-50 clean up orphaned sessions on startup). Verify completeness:
1. Check that `findActive()` correctly finds all sessions with `isRunning: true` or `status: 'in_progress'`
2. Add timestamp check: only mark sessions orphaned if `updatedAt` is more than 10 minutes stale
3. Emit event for monitoring

#### N1 — shadcn/ui Components
Install via shadcn CLI. Only install components needed for O1:
```bash
npx shadcn@latest add table tabs tooltip progress
```

#### O1 — Learnings Refactor with shadcn
After L1 rewrites the learnings page to query correct tables, O1 enhances it with proper UI components:
1. Replace custom tab implementation with shadcn `Tabs`
2. Replace pattern list with sortable shadcn `Table` (columns: name, category, confidence, status, actions)
3. Add `Progress` component for confidence visualization
4. Add `Tooltip` on truncated descriptions

#### A1 — Basic ARIA
Minimal accessibility improvements:
1. Add `role="main"`, `role="navigation"`, `role="banner"` landmarks
2. Add skip link: "Skip to main content"
3. Add `aria-label` to icon-only buttons
4. Ensure focus visible styles on all interactive elements

### Verification Criteria (5C)

- [ ] Feature list with limit=1 returns 1 row and correct total
- [ ] Pipeline service handles 2 concurrent features without race condition
- [ ] Orphaned sessions cleaned up on server restart (check logs)
- [ ] SIGTERM kills terminals, closes DB cleanly
- [ ] shadcn Table renders on learnings page
- [ ] Confidence bars render as Progress components
- [ ] Skip link present, landmarks set
- [ ] All tests pass, 0 type errors

### Commit Message (5C)

```
feat: Batch 5C — Hardening (pagination, race fix, shadcn, ARIA basics)

- Add pagination to feature, session, learning repositories (limit/offset/total)
- Fix PipelineService projectRoot race condition (pass as parameter)
- Verify session crash recovery on startup
- Install shadcn/ui: Table, Tabs, Tooltip, Progress
- Refactor learnings page with shadcn components
- Add basic ARIA landmarks, skip links, focus management
```

---

## 4. Swarm Execution Details

### Session 5A — Security + Foundation

| Agent | subagent_type | Files Owned | Estimated Turns |
|-------|--------------|-------------|-----------------|
| `security-agent` | code-writer | `terminal-service.ts`, `fs-service.ts`, `websocket.ts`, middleware in `index.ts` | ~40 |
| `db-agent` | code-writer | `packages/db/src/index.ts`, `packages/db/src/lib/id-generation.ts`, all 8 repositories | ~50 |
| `migration-agent` | code-writer | `packages/db/src/schema/*.ts`, `packages/db/drizzle/` | ~30 |

**Mode:** bypassPermissions
**Estimated wall-clock:** ~2.5h (agents run in parallel)

### Session 5B — Self-Building MVP

| Agent | subagent_type | Files Owned | Estimated Turns |
|-------|--------------|-------------|-----------------|
| `frontend-agent` | code-writer | `apps/web/src/routes/learnings.tsx`, `features.$featureId.tsx`, `dashboard.tsx`, `pipeline-monitor.tsx`, `cost-card.tsx` | ~50 |
| `backend-agent` | code-writer | `packages/api/src/services/auto-mode-service.ts`, `packages/api/src/routers/auto-mode.ts` | ~25 |

**Mode:** bypassPermissions
**Estimated wall-clock:** ~2h

### Session 5C — Hardening + Polish

| Agent | subagent_type | Files Owned | Estimated Turns |
|-------|--------------|-------------|-----------------|
| `backend-agent` | code-writer | Repository files, `pipeline-service.ts`, `session-service.ts`, routers | ~35 |
| `frontend-agent` | code-writer | `apps/web/` (all frontend files), shadcn installs | ~40 |

**Mode:** bypassPermissions
**Estimated wall-clock:** ~2h

---

## 5. Risk Mitigation

### Migration Rollback Plan (K6)

1. **Before migration:** Run data audit queries (section 0.3)
2. **During migration:** Wrap in transaction — if any ALTER fails, full rollback
3. **After migration:** Run test suite immediately
4. **If tests fail:** `drizzle-kit drop` to revert last migration, investigate
5. **Nuclear option:** Restore from DB backup (ensure `pg_dump` exists before starting)

### Data Audit Queries

See section 0.3. Run these BEFORE K3/K4 and AFTER K6.

### Test Strategy Between Sessions

| Checkpoint | What to verify |
|-----------|---------------|
| After 5A merge | 1006+ tests pass, 0 type errors, manual security checks |
| After 5B merge | All above + learnings page renders, Start Build triggers pipeline |
| After 5C merge | All above + pagination works, shadcn components render |

Between each session:
```bash
bun run test
bun run typecheck
bun run build
```

---

## 6. Explicitly CUT / DEFERRED Items

### CUT (Not Doing)

| Item | Original Est. | Rationale |
|------|--------------|-----------|
| J5 CSP nonces | 3h | NOMOS runs on localhost as desktop app. No XSS attacker model for localhost. Premature. |
| M2 dependency failure propagation | 3h | Complex, no user has reported it. Not blocking MVP. |
| M5 terminal session persistence | 8h | Gold-plating. PTY processes cannot survive server restart. Persisting metadata to DB adds complexity with no benefit. |
| O2 cost tracking dashboard (full) | 8h | L5 cost card covers 80% of the need. Full dashboard is Batch 6 polish. |
| O3 mobile-responsive Kanban | 8h | NOMOS is a desktop dev tool. Zero mobile users. Zero mobile use cases. |
| O4 WCAG 2.1 AA (full) | 16h | Pre-release, single developer. 16h is an underestimate. Do A1 (2.5h basic ARIA) instead. |

**Total saved: ~46.5h**

### DEFERRED to Batch 6

| Item | Rationale |
|------|-----------|
| CSP nonces (J5) | Address when deploying beyond localhost |
| Dependency failure propagation (M2) | Implement when multi-feature parallel execution is common |
| Pipeline monitor WebSocket streaming (L3 full) | MVP polling is sufficient; upgrade when UX demands it |
| Full cost tracking dashboard (O2) | After cost card proves useful |
| Mobile Kanban (O3) | If mobile demand emerges |
| WCAG AA beyond basics (O4) | When accessibility audit is scheduled |
| oRPC-only migration (AD-5) | Keep dual adapter until external integrations are needed |
| Drop legacy `learning` table (AD-1) | After L1 confirms new tables work end-to-end |
| Multi-project support | Requires significant decoupling (1-2 weeks) |

---

## 7. Success Criteria

### Session 5A — "Secure Enough"

- Terminal no longer leaks secrets via env vars
- File system service blocks symlink traversal
- CSRF protection on all state-changing endpoints
- DB has connection pool, graceful shutdown, CHECK constraints, FK integrity
- ID generation is race-condition-free
- All tests pass, 0 type errors

### Session 5B — "Self-Building Works"

- User can see patterns/antipatterns/insights on the learnings page (from correct tables)
- User can click "Start Build" on a feature and the pipeline starts
- User can see pipeline progress (which phase, what status)
- User can see cost summary on the dashboard
- The "NOMOS builds a feature from the UI" milestone is achieved

### Session 5C — "Production Hardened"

- List endpoints return paginated results (no OOM risk)
- Concurrent pipelines don't interfere with each other
- Server restarts cleanly without orphaned state
- UI uses proper shadcn components (not ad-hoc HTML)
- Basic accessibility landmarks and skip links exist

### Overall Batch 5 — "6.8 → 8.0"

The strategic review scored NOMOS at 6.8/10. After Batch 5:
- Security: 4/10 → 8/10 (2 CRITICALs fixed, CSRF added, auth verified)
- Database: 5/10 → 8/10 (pool, constraints, FKs, atomic IDs)
- Learning UI: 2/10 → 7/10 (correct data, shadcn components)
- Frontend UX: 5.9/10 → 7/10 (Start Build, pipeline monitor, cost card)
- **Expected overall: ~8.0/10**

---

## 8. Effort Summary

| Session | Tasks | Agent Hours | Wall-Clock (parallel) | Agents |
|---------|-------|------------|----------------------|--------|
| 5A Security | J1-J4, K1-K6 | 22.5h | ~7.5h | 3 |
| 5B MVP | L1-L5 | 17h | ~8.5h | 2 |
| 5C Hardening | M1,M3,M4,M6,N1,O1,A1 | 17h | ~8.5h | 2 |
| **Total** | **22 tasks** | **56.5h** | **~24.5h** | **3 sessions** |

Compare to original plan: **119h → 56.5h** (52% reduction from analyst-driven scope cuts).

---

*Generated by strategy synthesis agent on 2026-02-09*
*Input: 4 analyst findings (security, MVP, hardening, skeptic)*
*Branch management: merge → fresh branches → session-per-batch*
