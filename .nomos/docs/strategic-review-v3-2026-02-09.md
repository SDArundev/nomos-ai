# Strategic Review v3 — Post-Batch 5 Assessment (2026-02-09)

> 5-agent swarm analysis of NOMOS AI after completing all Batch 5 work.
> Agents: backend-analyst, frontend-analyst, pipeline-analyst, infra-analyst, roadmap-analyst

---

## Scorecard

| Area | Grade | Key Strength | Key Weakness |
|------|-------|-------------|--------------|
| Backend (API, DB, Services) | **8/10** | Clean architecture, comprehensive Zod validation, zero TODOs | Single-user AutoModeService, session list fetches all |
| Frontend (Routes, Components, UX) | **6.5/10** | Consistent auth guards, shadcn integration, good loading states | CSRF header missing, no pagination wired, DnD claim false |
| Pipeline (Autonomous E2E) | **5/10** | Individual pieces 7-8/10, strong SDK integration | Integration gaps: monitor unwired, progress endpoint broken |
| Infrastructure (Tests, CI/CD, Docker) | **7/10** | Strong CI pipeline, Docker multi-stage, security audit | 30-40% validation theater tests, no coverage tracking |
| **Overall** | **6.6/10** | — | — |

---

## Accomplishments (Batches 1-5)

### Batch 1 (cb6aec6)
- PostgreSQL migration from SQLite
- Codebase cleanup, CI fixes

### Batch 2 (2ed32cf)
- Pipeline unification (6-phase v4)
- Claude Agent SDK modernization (query() API)

### Batch 3 (c201738)
- 77 validation tests
- Feature cleanup: 285 -> 139 features
- Hardening pass

### Batch 4 (cfa3e88)
- Learning system DB migration (4 tables: pattern, antipattern, feature_insight, feature_metric)
- 15+ API endpoints for learning CRUD + relevant + curate
- Seed script for JSON -> DB migration
- Dashboard learnings tab

### Batch 5A (PR #16, 2828f84)
- Terminal RCE fixed: sanitizeEnv() allowlist, validateCwd()
- Path traversal fixed: async validatePath() with realpath() + lstat() symlink blocking
- CSRF: X-Requested-With on POST/PUT/PATCH/DELETE to /api/* and /rpc/*
- Terminal session ownership: userId check in WS handler
- DB pool tuning: max:20, idle_timeout:20, connect_timeout:10, max_lifetime:1800
- Graceful shutdown: SIGTERM/SIGINT -> killAll() -> closeDatabase()
- Atomic IDs: createWithId() wraps MAX+INSERT in single tx (8 repos)
- CHECK constraints, FK references, event indexes
- Migration: 0002_peaceful_tinkerer.sql

### Batch 5B (PR #17)
- Learnings page rewritten: queries pattern/antipattern/feature_insight tables
- Confidence bars, severity badges, curation controls
- "Start Build" button on feature detail page (calls autoMode.startFeature)
- Pipeline monitor component with 3s polling
- Cost summary card on dashboard (total, last session, avg/feature, tokens)
- Cost accumulation documented: SDK total_cost_usd is cumulative

### Batch 5C (PR #18)
- Pagination: findPaginated() + listPaginated on feature/session/learning repos
- PipelineService race fix: removed mutable projectRoot, now passed as parameter
- Crash recovery: 10-min staleness check + session:orphaned event
- shadcn/ui: Table, Tabs, Tooltip, Progress installed
- Learnings page refactored with shadcn (sortable table, progress bars, tooltips)
- ARIA: semantic landmarks, skip link, aria-labels, aria-current on nav

**Current state: 1030 tests, 0 type errors, 0 failures.**

---

## Critical Findings

### TIER 1 — BLOCKERS (System doesn't work without these)

#### FE-001 [CRITICAL]: oRPC Client Missing X-Requested-With Header
- **File:** `apps/web/src/utils/orpc.ts:33-41`
- **Impact:** ALL frontend mutations (create feature, update status, start build, save settings) are rejected with 403 by the CSRF middleware at `apps/server/src/index.ts:160-176`
- **Fix:** Add `headers: { 'X-Requested-With': 'XMLHttpRequest' }` to RPCLink fetch options
- **Effort:** 15 minutes

#### SW-001 [HIGH]: Auto-Mode Dashboard Hardcodes "." as projectRoot
- **File:** `apps/web/src/components/auto-mode/auto-mode-dashboard.tsx:60`
- **Impact:** Bulk auto-mode start is broken. `start(projectId, ".")` passes "." which resolves to server CWD — works by coincidence in dev, breaks in production
- **Fix:** Remove projectRoot from frontend call; backend should resolve project.path from DB (like startFeature already does)
- **Effort:** 1 hour

#### SW-005 [HIGH]: pipeline.progress Never Passes projectRoot
- **File:** `packages/api/src/routers/pipeline.ts:21`
- **Impact:** `getProgress(featureId)` without projectRoot means `getLatestCheckpoint()` returns null. `completedPhase` is always null. Live checkpoint data never shown.
- **Fix:** Look up feature's project.path in the router and pass to getProgress()
- **Effort:** 30 minutes

#### SW-012 [HIGH]: PipelineMonitor Never Wired Into App
- **File:** `apps/web/src/components/auto-mode/pipeline-monitor.tsx` (created in 5B, never imported)
- **Impact:** Users click "Start Build" but see no visual progress. Feature detail page shows static pipelineStep from DB only.
- **Fix:** Import PipelineMonitor into `features.$featureId.tsx`, render when status is in_progress
- **Effort:** 30 minutes

### TIER 2 — SECURITY (11 P1-P2 features)

| Feature | Priority | Title | Est |
|---------|----------|-------|-----|
| F266 | P1 | Fix userId authorization in 7 remaining API routers | 6h |
| F267 | P1 | Fix WebSocket authentication (reject anonymous) | 3h |
| F276 | P1 | Fix SpecService path traversal | 2h |
| F277 | P1 | Fix terminal WS protocol mismatch | 2h |
| F278 | P1 | Fix terminal router user isolation | 2h |
| F279 | P1 | Fix learning router ownership checks | 2h |
| F268 | P2 | Fix ClaudeProvider bypassPermissions | 1h |
| F269 | P2 | Fix agent sendMessage ownership | 2h |
| F270 | P2 | Fix auto-mode userId fix | 2h |
| F280 | P2 | Fix auto-mode endpoint ownership | 2h |
| F281 | P2 | Fix notification ownership | 1h |

### TIER 3 — ARCHITECTURE ISSUES

| ID | Severity | Issue |
|----|----------|-------|
| BA-013 | MEDIUM | AutoModeService is single-user (currentUserId overwrite on concurrent starts) |
| FE-005 | MEDIUM | Zustand stores hold stale arrays duplicating React Query cache |
| FE-004 | MEDIUM | Frontend pagination not wired (backend listPaginated exists but unused) |
| FE-003 | MEDIUM | Kanban "drag and drop" text with no DnD implementation |
| BA-006 | MEDIUM | Session list endpoints fetch all records then filter in-app |
| BA-011 | MEDIUM | Curate endpoint has no dry-run mode, N+1 updates |
| BA-017 | MEDIUM | Rate limiter in-memory only, no X-Forwarded-For parsing |
| SW-002 | MEDIUM | State machine bypassed: backlog can jump to in_progress |
| SW-013 | MEDIUM | Session resume falls back to process.cwd() |

### TIER 4 — TESTING DEBT

- ~30-40% of 1030 tests are "validation theater" (test data shapes, not behavior)
- Zero real database integration tests despite CI Postgres container
- No code coverage tracking configured
- Only 5 Playwright smoke tests, not wired into CI
- `packages/auth`, `packages/env`, `packages/config` have zero test files
- MockProvider doesn't produce checkpoint files (pipeline untestable without real SDK)
- Bun mock.module leakage between test files (known gotcha, not enforced)

### TIER 5 — INFRASTRUCTURE

- Docker: `oven/bun:latest` not pinned, hardcoded DB URL, dev/prod SQLite vs Postgres mismatch
- CI: No CD migration step, no e2e in pipeline, stale bun.lockb cache key
- DX: No setup script, port mismatch in .env.example, no pre-commit hooks
- Build: No Turborepo remote cache, heavy Docker COPY of all packages

---

## Feature Backlog Status (139 total)

| Status | Count |
|--------|-------|
| verified | 72 (43 passes=true, 29 passes=false) |
| backlog | 66 |
| pending | 1 |

**29 "verified" features have passes=false** — stale data from pre-Batch 4/5 verification runs.

---

## Pipeline End-to-End Assessment

### Path A: "Start Build" Button (Feature Detail Page)
**Status: MOSTLY WORKS** — correct projectRoot from DB, but no progress UI (PipelineMonitor unwired)

### Path B: Auto-Mode Dashboard (Bulk Runner)
**Status: BROKEN** — hardcoded "." as projectRoot

### What's needed for working autonomy:
1. Fix FE-001 (CSRF header)
2. Fix SW-001 (dashboard projectRoot)
3. Fix SW-005 (pipeline.progress projectRoot)
4. Fix SW-012 (wire PipelineMonitor)
5. Add quality gates (F047-F049) so pipeline validates output
6. Add git operations (F291) so pipeline can ship

---

## Recommended Batch Plan

### Batch 6: Critical Fixes + Security (~25h, 3 days)
### Batch 7: Quality Gates + Git (~25h, 3-4 days)
### Batch 8: Auth + DX Polish (~30h, 3-4 days)

See `batch6-spawn-prompt.md` for detailed agent team plan.
