# NOMOS Execution Plan — 2026-02-09

**Decision:** Docker Postgres (with Redis caching planned for later)
**Goal:** Close the self-building loop — NOMOS builds itself from the dashboard
**Source:** strategic-review-2026-02-09.md (4-agent analysis)
**Last updated:** 2026-02-09T07:25Z

---

## Progress Tracker

| Batch | Stream | Status | Agent | Notes |
|-------|--------|--------|-------|-------|
| 1 | A: Cleanup & Hygiene | DONE | cleanup-agent | 607MB freed, 5 agents deleted, skills updated, features.json cleaned |
| 1 | B: Postgres Migration | DONE | postgres-agent | 30+ files, 11 schema files converted, FKs added, seed script, 665 tests pass |
| 1 | E: CI/Testing | DONE | ci-agent | CI fixed, postgres in CI, deps moved, test skeleton created |
| 2 | C: Pipeline Unification | READY | — | DB as single source of truth — unblocked by B |
| 2 | D: SDK Modernization | READY | — | D2/D3 done early by cleanup-agent — unblocked by B |
| 3 | F: Self-Building Validation | BLOCKED (on C+D) | — | End-to-end loop test |
| 3 | G: Production Hardening | BLOCKED (on C+D) | — | Redis, logging, monitoring |

**Batch 1 COMPLETE.** All 3 streams done. Changes uncommitted — need user `.env` update + `docker compose up -d postgres` + commit.

**Not yet committed.** All changes are staged file edits. Commit after Stream B completes and tests pass.

---

## Batch 1 — Parallel (No Dependencies)

### Stream A: Cleanup & Hygiene — DONE
**Completed by:** cleanup-agent
**Changes made:**
- [x] A1: Deleted stale worktree F040 — freed 607 MB
- [x] A2: CI `build:packages` → `build` (already fixed by ci-agent)
- [x] A3: Deleted 5 deprecated agents (load-learnings, explore-codebase, explore-docs, code-quality-reviewer, test-coverage-analyzer)
- [x] A4: Updated nomos-verify SKILL.md + 4 sub-files, nomos-refactor SKILL.md + 3 sub-files (replaced deprecated agent refs with v4 equivalents)
- [x] A5: Deleted dead code: `packages/api/src/services/sdk-options.ts`
- [x] A6: Removed 15 `.DS_Store` files (.gitignore already had entry)
- [x] A7: Deleted stale locks (`.nomos/locks/default-ports.owner`, `F034.ports`)
- [x] A8: Removed `ralph-loop` skill directory (6 files)
- [x] A9: Normalized 10 features F276-F285 category "fix" → "CAT-FIX" (now 45 total CAT-FIX)
- [x] A10: Removed stale summary block from features.json (was showing 265, actual 285)

### Stream B: Database Migration to Postgres — DONE
**Completed by:** postgres-agent
**Test results:** 665 tests pass, 0 failures, 0 type errors
**Changes made (30+ files):**
- [x] B1: Added postgres:17 service to docker-compose.yml with healthcheck + nomos-pgdata volume
- [x] B2: Added commented-out redis stub in docker-compose.yml
- [x] B3: Swapped @libsql/client + libsql → postgres (postgres.js driver)
- [x] B4: Migrated all 11 schema files (sqliteTable→pgTable, integer→boolean, timestamp_ms→timestamp, text→jsonb, totalCostUsd→numeric)
- [x] B5: Updated drizzle.config.ts for postgres dialect
- [x] B6: Updated packages/db/src/index.ts (postgres driver + drizzle-orm/postgres-js)
- [x] B7: Deleted resolve-url.ts (no longer needed)
- [x] B8: Added all missing FK constraints (event, notification, worktree, message, project.userId)
- [x] B9: Added release, failureReason, restoredAt columns to feature
- [x] B10: Added userId index to agent_session
- [x] B11: Archived SQLite migrations, generated fresh Postgres migration 0000_tiny_skin.sql
- [x] B12: Updated Dockerfile + docker-compose.yml for postgresql:// DATABASE_URL
- [x] B13: Updated packages/env server.ts to validate postgresql:// or postgres:// URLs
- [x] B14: Created seed script: packages/db/src/scripts/seed.ts
- [x] B15: Added session cleanup on startup in apps/server/src/index.ts
- [x] B16: Updated session-repository.test.ts, migrate.test.ts for Postgres
- [x] B17: 665 tests pass (some test count difference from mock refactoring)
- [x] BONUS: Fixed better-auth adapter: "sqlite" → "pg" in packages/auth/src/index.ts
- [x] BONUS: Fixed db.run() → db.execute() for Postgres in health endpoints
- [x] BONUS: Fixed char(10) → chr(10) in session repository appendOutput
- [x] BONUS: Created .env.example files with postgresql:// connection strings

**User actions required before running:**
1. Update `.env`: `DATABASE_URL=postgresql://nomos:nomos@localhost:5432/nomos`
2. `docker compose up -d postgres`
3. `bun run db:migrate`
4. (Optional) `bun run packages/db/src/scripts/seed.ts`

### Stream E: Testing & CI Fixes — DONE
**Completed by:** ci-agent
**Changes made:**
- [x] E1: Fixed `.github/actions/setup-project/action.yml` — `build:packages` → `build`
- [x] E2: Fixed `actions/checkout@v6` → `actions/checkout@v4` (9 occurrences across 2 workflows)
- [x] E3: Added Postgres service container to CI test jobs with healthcheck
- [x] E4: *(deferred — coverage reporting not added yet)*
- [x] E5: Removed `continue-on-error: true` from `bun pm audit` in security-audit.yml
- [x] E6: Created integration test skeleton: `packages/api/src/services/__tests__/auto-mode-service.integration.test.ts` (4 describe blocks, 12 test.todo stubs)
- [x] E7: Moved `react-markdown` from root to `apps/web/package.json` (others already there)

---

## Batch 2 — After Stream B Completes

### Stream C: Pipeline Unification (DB as Single Source of Truth)
**Agent type:** general-purpose (needs write access)
**Estimated effort:** 1-2 days
**Depends on:** Stream B (postgres must be working)
**Tasks:**
- [ ] C1: Modify CLI pipeline Phase 1 to read features from REST API when server is running (fallback to features.json for standalone)
- [ ] C2: Wire Intent Box → AutoModeService end-to-end (feature created in web → pipeline starts → results in dashboard)
- [ ] C3: Fix API key auth context shape (handlers shouldn't break with API key auth)
- [ ] C4: Add integration tests for Intent Box → Pipeline → Dashboard flow
- [ ] C5: Make features.json a read-only export/cache (generated from DB)
- [ ] C6: Test the self-building loop: create feature from dashboard, auto-implement, verify

### Stream D: SDK Modernization
**Agent type:** general-purpose (needs write access)
**Estimated effort:** 1-2 weeks
**Depends on:** Stream B (postgres must be working)
**Partially done:** D2/D3 (deprecated agent refs) completed early by cleanup-agent in Stream A
**Tasks:**
- [ ] D1: Fix cost data extraction fragility in ClaudeProvider (use official SDK types)
- [x] D2: Update nomos-verify skill to use v4 agents — DONE (Stream A)
- [x] D3: Update nomos-refactor skill to use v4 agents — DONE (Stream A)
- [ ] D4: Evaluate V2 Session API (`unstable_v2_createSession`) for crash recovery
- [ ] D5: Replace CLI subprocess with SDK `query()` in AutoModeService (major refactor)
- [ ] D6: Stream structured output to dashboard (not raw stdout)
- [ ] D7: Add session resume capability on crash/restart

---

## Batch 3 — After Streams C & D Complete

### Stream F: Self-Building Validation
- [ ] F1: Run NOMOS from dashboard to implement a real feature on its own codebase
- [ ] F2: Validate cost tracking end-to-end
- [ ] F3: Test crash recovery (kill server mid-pipeline, restart, verify session cleanup)
- [ ] F4: Test Intent Box → expansion → auto-mode → merge flow

### Stream G: Production Hardening
- [ ] G1: Add Redis for EventService (replace in-memory pub/sub)
- [ ] G2: Add structured logging (Pino)
- [ ] G3: Add health check with dependency status (DB, Redis)
- [ ] G4: Add Prometheus metrics endpoint
- [ ] G5: Add E2E tests with Playwright
- [ ] G6: Add CD pipeline (GitHub Actions → Docker registry → deploy)

---

## Database Decision Record

**Choice:** PostgreSQL in Docker (docker-compose)
**Rationale:**
1. Concurrent access needed (AutoModeService + dashboard + CLI simultaneously)
2. Real types: boolean, timestamp, jsonb, numeric (no more TEXT hacks)
3. FK constraints properly enforced
4. Easy migration to Neon cloud when NOMOS serves external projects (Stage 2)
5. Redis can be added to same docker-compose for caching/events later
6. Drizzle ORM abstracts dialect — schema migration is mechanical

**Migration Strategy:**
- Fresh Postgres migrations (not converted from SQLite)
- `nomos db seed` imports features.json as one-time migration
- SQLite migrations archived but not deleted (reference)
- Tests updated to use Postgres (testcontainers or docker-compose)

**Connection Config:**
```
DATABASE_URL=postgresql://nomos:nomos@localhost:5432/nomos
REDIS_URL=redis://localhost:6379 (future)
```

---

## Resume Instructions

If resuming in a new session:
1. Read this file: `.nomos/docs/execution-plan-2026-02-09.md`
2. Read the strategic review: `.nomos/docs/strategic-review-2026-02-09.md`
3. Check git status to see what streams completed
4. Look at the Progress Tracker table above for current state
5. If Stream B is still incomplete, review postgres-agent's partial work and continue
6. Once Stream B is done, commit all Batch 1 changes, then spawn Batch 2 agents (Stream C + D)

**Key decisions already made:**
- Docker Postgres (not SQLite, not Neon)
- DB as single source of truth (not features.json)
- Redis stub in docker-compose (for later)
- Fresh pg migrations (not converted from sqlite)
- V2 Session API evaluation (not mandatory adoption)
- D2/D3 (deprecated agent refs in skills) already done by Stream A cleanup

**Files changed (uncommitted — ALL Batch 1):**
- Stream A: features.json, 5 deleted agents, 7 updated skill files, sdk-options.ts deleted, 15 .DS_Store removed, 2 locks deleted, ralph-loop/ removed
- Stream E: 2 CI workflows, 1 composite action, root + web package.json, 1 new test file
- Stream B: 30+ files — all schema/*.ts, index.ts, drizzle.config.ts, migrate.ts, docker-compose.yml, Dockerfile, env validation, auth adapter, server startup, repositories, seed script, test files, .env.example files, resolve-url.ts deleted, SQLite migrations archived

**Next steps:**
1. User: update .env, start postgres, run migrations
2. Commit all Batch 1 changes
3. Spawn Batch 2 agents (Stream C: Pipeline Unification + Stream D: SDK Modernization)
