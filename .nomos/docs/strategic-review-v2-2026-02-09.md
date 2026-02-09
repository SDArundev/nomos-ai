# NOMOS AI Strategic Review v2 — 2026-02-09

> 6-agent swarm analysis (post-Batch 4). Deeper scope than v1: security audit, database audit, frontend/UX, integration features, backend architecture, data strategy.
> Branch: `feature/ecosystem-unification` | 1006 tests | 0 failures | 0 type errors

---

## 1. Quality Scorecard

| Dimension | Score | Key Finding |
|-----------|-------|-------------|
| **Type Safety** | 10/10 | Zero `any` in production. oRPC + Zod end-to-end |
| **Code Organization** | 9/10 | Excellent router/service/repository separation |
| **Observability** | 9/10 | Pino logging, Prometheus metrics, health/ready |
| **Testing** | 9/10 | 1006 tests, good integration coverage |
| **Backend Architecture** | 8.2/10 | Clean 3-layer arch, mature pipeline, minor bugs |
| **API Design** | 8/10 | oRPC + REST dual adapter (functional but dual burden) |
| **Agent Orchestration** | 8/10 | 6-phase pipeline with checkpoint context clearing |
| **Design Consistency** | 7/10 | Cohesive OKLch palette, Tailwind 4, Inter font |
| **Error Handling** | 7/10 | Centralized handler, gaps in agent crash recovery |
| **Performance** | 7/10 | Streaming + backpressure, but no caching/pagination |
| **Real-Time Features** | 7/10 | WebSocket events + terminal, solid foundation |
| **Frontend UX** | 5.9/10 | Functional MVP, sparse data density, missing components |
| **Responsiveness** | 6/10 | Dashboard OK, Kanban broken on mobile |
| **Database** | 5/10 | No pool config, ID race conditions, missing constraints |
| **Security** | 4/10 | 2 CRITICAL + 4 HIGH vulnerabilities. **FAIL verdict.** |
| **Accessibility** | 3/10 | No ARIA, no landmarks, no keyboard nav |
| **Learning System UI** | 2/10 | Dashboard queries WRONG table. 4 new tables invisible. |

**Weighted Overall: 6.8/10** — Strong backend, weak frontend polish, critical security gaps.

---

## 2. Top 10 Issues (Ranked by Impact)

### #1. CRITICAL — Terminal Gives Full RCE to Any Authenticated User
**Agent:** Security (D) | **File:** `packages/api/src/services/terminal-service.ts:25-31`

Spawns `/bin/zsh` with full `process.env` inherited (includes `BETTER_AUTH_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`). Any authenticated user gets unrestricted shell access to the server.

**Fix:** Strip sensitive env vars before spawning. Restrict CWD to project directory. Add audit logging for all terminal commands.

---

### #2. CRITICAL — Path Traversal Bypass via Symlinks in FS Service
**Agent:** Security (D) | **File:** `packages/api/src/services/fs-service.ts:7-19`

Uses `startsWith()` check which symlinks bypass. No `realpath()` canonicalization. Attacker creates symlink inside allowed dir pointing to `/etc/passwd`.

**Fix:** Use `fs.realpath()` before validation. Block symlinks entirely for MVP.

---

### #3. CRITICAL — No Connection Pool Configuration
**Agent:** Database (C) | **File:** `packages/db/src/index.ts:6`

`postgres(env.DATABASE_URL)` with zero configuration. Default max 10 connections. No idle timeout, connect timeout, or graceful shutdown.

**Fix:** Configure `{ max: 20, idle_timeout: 20, connect_timeout: 10, max_lifetime: 1800, ssl: "require" in prod }`. Add `closeDatabase()` on SIGTERM.

---

### #4. CRITICAL — Race Condition in Sequential ID Generation
**Agent:** Database (C) | **File:** `packages/db/src/lib/id-generation.ts:12-56`

`getNextId()` generates ID in a transaction but the actual INSERT happens later in a separate call. Concurrent requests get the same ID. 3-retry logic masks but doesn't fix.

**Fix:** Move ID generation INTO the insert transaction. Generate and insert atomically.

---

### #5. HIGH — Learning Dashboard Queries WRONG Table
**Agent:** Data Strategy (F) | **File:** `apps/web/src/routes/learnings.tsx:80-87`

Frontend calls `orpc.learnings.list()` which queries the OLD generic `learning` table. The 4 new tables (pattern, antipattern, feature_insight, feature_metric) with confidence scoring, status lifecycle, and evidence tracking are **never queried** from the dashboard. All patterns and antipatterns are invisible.

**Fix:** Update frontend to call `listPatterns()`, `listAntipatterns()`, `listInsights()`. Add confidence bars, status badges, curation controls.

---

### #6. HIGH — WebSocket Authentication Bypass
**Agent:** Backend (B) | **File:** `apps/server/src/index.ts:189-202`

No explicit auth check before `server.upgrade()`. If `context.session` is null, server crashes on property access. No auth failure logging.

**Fix:** Add `if (!context.session?.user) return c.json({ error: "Unauthorized" }, 401)` before upgrade.

---

### #7. HIGH — Missing CSRF Protection
**Agent:** Security (D) | **File:** `apps/server/src/index.ts:109-119`

Cookie-based auth accepts state-changing POST requests with no CSRF token. Attacker site can submit forms to localhost API with auto-sent session cookie.

**Fix:** Set `SameSite=Strict` on session cookies. Require `X-Requested-With` header on state-changing operations.

---

### #8. HIGH — Cost Accumulation Bug in AutoModeService
**Agent:** Backend (B) | **File:** `packages/api/src/services/auto-mode-service.ts:214-246`

Only the LAST `result` message's cost is saved. Multi-turn SDK sessions lose all intermediate cost data.

**Fix:** Accumulate costs in a running total across all result messages in the streaming loop.

---

### #9. HIGH — Missing CHECK Constraints + FKs in Database
**Agent:** Database (C) | **Location:** Multiple schema files

- `confidence` field accepts -999 or 5.7 (no 0.0-1.0 range constraint)
- `severity` field accepts "BANANA" (no enum constraint)
- `pattern.userId`, `antipattern.userId` have no FK to `user` table → orphans on user delete
- `event.projectId`, `event.sessionId`, `event.featureId` have no FK constraints at all

**Fix:** Add CHECK constraints for ranges/enums. Add FK references with appropriate CASCADE/SET NULL.

---

### #10. HIGH — No Pagination on Any List Endpoint
**Agent:** Database (C) | **Location:** Multiple repositories

`findAll()`, `findByUser()`, `findByProject()` return entire tables with no LIMIT clause. With 10K+ records, this causes OOM and slow responses.

**Fix:** Add `limit`/`offset` params with defaults (100). Return `{ rows, total }` for all list operations.

---

## 3. Design Proposal — Ideal Dashboard Layout

### Information Architecture (Grouped Navigation)

```
SIDEBAR (Collapsed → Icon-only):
  Development
    Dashboard (home)
    Kanban Board
    Features (list + detail)

  Agent Studio
    Pipeline Monitor (real-time)
    Terminal
    Code Browser (future)

  Intelligence
    Learnings (patterns, antipatterns, insights)
    Activity Feed
    Analytics (cost, velocity) (future)

  Configuration
    Projects
    Settings
    Spec Editor
```

### Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: [Project] [Auto-Mode: Running ●] [Session: $2.47] │
│          [Connection ●] [Notifications] [Theme] [User]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  INTENT BOX: "Describe what you want to build..."     │   │
│  │  [Generate Feature]  [Quick: verify | refactor]       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Features │ │ Verified │ │ Running  │ │ Cost     │       │
│  │   139    │ │    72    │ │    2     │ │  $2.47   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌─────────────────────────┐ ┌──────────────────────────┐   │
│  │  PIPELINE MONITOR       │ │  COST BREAKDOWN          │   │
│  │  F042: Phase 3/6 ██░░░  │ │  Phase 1: $0.02 (haiku) │   │
│  │  F043: Phase 1/6 █░░░░  │ │  Phase 2: $0.85 (opus)  │   │
│  │  [Start] [Stop] [Queue] │ │  Phase 3: $1.20 (sonnet) │   │
│  └─────────────────────────┘ │  Phase 4: $0.40 (sonnet) │   │
│                               └──────────────────────────┘   │
│  ┌─────────────────────────┐ ┌──────────────────────────┐   │
│  │  RECENT ACTIVITY        │ │  TOP PATTERNS            │   │
│  │  ● F041 verified (2m)   │ │  ✓ Error boundary (0.92) │   │
│  │  ● F042 executing...    │ │  ✓ Zod validation (0.88) │   │
│  │  ● F043 queued          │ │  ⚠ N+1 queries (0.71)   │   │
│  │  [View All]             │ │  [View All]              │   │
│  └─────────────────────────┘ └──────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Missing UI Components (Priority Order)

| Component | Priority | Use Case |
|-----------|----------|----------|
| Table (sortable, filterable) | P0 | Learnings, activity, feature lists |
| Tabs | P0 | Settings (5 tabs), learnings (3 tabs) |
| Tooltip | P1 | Icon hints, cost info, status explanations |
| Progress | P1 | Pipeline phase bars, confidence indicators |
| Pagination | P1 | All list views |
| Popover | P1 | Filter panels, help text |
| Breadcrumb | P2 | Feature detail, project navigation |
| Scroll Area | P2 | Long lists with custom scrollbars |
| Form (validation UI) | P2 | Settings, feature creation |

---

## 4. Batch 5 Plan — Prioritized

### Batch 5A: Security Hardening (3 days) — BLOCKS PRODUCTION

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Strip sensitive env vars from terminal PTY spawn | 2h | Closes RCE |
| 2 | Fix FS service: add realpath(), block symlinks | 2h | Closes path traversal |
| 3 | Add CSRF protection (SameSite=Strict + header check) | 3h | Closes CSRF |
| 4 | Fix WebSocket auth: explicit check before upgrade | 1h | Closes auth bypass |
| 5 | Configure DB connection pool (max:20, timeouts, TLS) | 2h | Production stability |
| 6 | Fix ID generation: atomic insert-in-transaction | 4h | Data integrity |
| 7 | Add CHECK constraints (confidence 0-1, severity enum) | 2h | Data integrity |
| 8 | Add missing FK references (user, project, session) | 2h | Referential integrity |
| 9 | Remove unsafe-inline from CSP, add nonces | 3h | XSS protection |

### Batch 5B: Self-Building MVP (3 days) — UNBLOCKS VISION

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 10 | Wire learnings UI to new tables (patterns, antipatterns, insights) | 6h | Learning visibility |
| 11 | Add "Start Build" button on feature detail → autoMode.startFeature() | 4h | Dashboard triggers pipeline |
| 12 | Stream AutoMode events to dedicated pipeline monitor component | 8h | Real-time observability |
| 13 | Fix cost accumulation bug (running total across result messages) | 2h | Accurate cost tracking |
| 14 | Add cost summary card to dashboard header | 4h | Cost visibility |

### Batch 5C: Database + Backend Hardening (5 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 15 | Add pagination to all list endpoints (limit/offset/total) | 8h | Prevents OOM |
| 16 | Add missing indexes (event.type, feature.userId+status, pattern.status) | 4h | Query performance |
| 17 | Add dependency failure propagation (auto-fail dependents) | 3h | Pipeline reliability |
| 18 | Fix PipelineService projectRoot race condition (pass as param) | 2h | Concurrency safety |
| 19 | Session crash recovery (mark stale RUNNING→FAILED on startup) | 4h | Operational reliability |
| 20 | Terminal session persistence to DB + TTL cleanup | 8h | Terminal stability |
| 21 | Add graceful DB shutdown on SIGTERM | 1h | Clean shutdown |

### Batch 5D: Frontend Polish (5 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 22 | Install shadcn/ui: Table, Tabs, Tooltip, Progress, Pagination | 4h | UI foundation |
| 23 | Refactor learnings page: confidence bars, status badges, curation UI | 8h | Learning UX |
| 24 | Add cost tracking dashboard (per-phase breakdown) | 8h | Cost visibility |
| 25 | Mobile-responsive Kanban (list view toggle for small screens) | 8h | Mobile users |
| 26 | WCAG 2.1 AA: ARIA labels, landmarks, skip links, keyboard nav | 16h | Accessibility |

### Timeline

```
Week 1: Batch 5A (Security) + Batch 5B (Self-Building MVP)
Week 2: Batch 5C (Database + Backend)
Week 3: Batch 5D (Frontend Polish)
```

**Total: ~3 weeks to production-ready self-building loop.**

---

## 5. Architecture Decisions

### AD-1: Drop the OLD `learning` Table
**Decision:** RECOMMENDED — Migrate data, then drop.
**Rationale:** The 4 new tables (pattern, antipattern, feature_insight, feature_metric) are strictly superior. The old generic table has no confidence scoring, no status lifecycle, no evidence tracking. Frontend already queries the wrong table creating confusion.
**Action:** Migrate existing records → update frontend queries → drop table in next migration.

### AD-2: DB Primary for Features, Phase Out features.json
**Decision:** RECOMMENDED — DB is already primary since Batch 2.
**Rationale:** features.json is stale immediately after any DB change. 69 file references exist but most are in seeds/docs. CLI offline mode can fall back to checkpoint JSONs.
**Action:** Add `GET /api/features/export` for one-time generation. Remove features.json from git tracking.

### AD-3: Keep project.json as File
**Decision:** RECOMMENDED — No change needed.
**Rationale:** Project config is immutable during a session, git-tracked, and version-controlled. Only move to DB when multi-project support is needed.

### AD-4: Terminal Security Model
**Decision:** Option A (Sandbox) for MVP, evolve to Option C (Container) for production.
**Options considered:**
- A) Sandbox: Strip env vars, restrict CWD to project dir, add audit logging
- B) Remove terminal entirely: Highest security but removes core feature
- C) Container sandbox: Run PTY in Docker with no network, read-only mounts

### AD-5: oRPC-Only Migration
**Decision:** DEFERRED — Keep dual adapter for now.
**Rationale:** REST adapter needed for external integrations (n8n, webhooks). Not urgent. Evaluate in 3 months.

---

## 6. Detailed Agent Findings

### Agent A: Frontend/UX + Automaker Comparison
- **Score:** 5.9/10 overall
- **Components:** 83 .tsx files, 13 UI primitives (missing ~30% of critical patterns)
- **Layout:** Sidebar nav (11 items), command palette (Cmd+K), no breadcrumbs
- **Data fetching:** TanStack Query + oRPC (clean), WebSocket events (solid)
- **State:** Zustand (minimal, only UI state)
- **Accessibility:** 3/10 — zero ARIA attributes found, no landmarks, no skip links
- **Automaker advantages:** 50+ themes, cost dashboard, extended thinking visualization
- **Top need:** Cost tracking UI (backend `extractCostData()` exists, just needs display)

### Agent B: Backend Architecture
- **Score:** 8.2/10 overall
- **Architecture:** 18 routers, 11 services, 15 repositories. Clean 3-layer separation.
- **Type safety:** 10/10 — perfect oRPC + Zod chain
- **Critical bug:** WebSocket auth bypass (server crash on unauthenticated upgrade)
- **Critical bug:** Cost accumulation only saves last result message's cost
- **Critical bug:** PipelineService mutable `projectRoot` creates race condition
- **Missing:** Dependency failure propagation (failed deps leave dependents stuck forever)
- **Agent system:** 11 active agents with clear roles, proper tool restrictions, model selection per agent

### Agent C: Database Expert
- **Issues found:** 19 total (4 CRITICAL, 6 HIGH, 6 MEDIUM, 3 LOW)
- **CRITICAL:** No connection pool, ID race condition, missing CHECK constraints, missing FKs
- **HIGH:** No indexes on event table, no pagination, no JSONB validation, no TLS enforcement
- **MEDIUM:** Text PKs inefficient, no soft delete, no updatedAt trigger, N+1 in findDependencies
- **LOW:** No table partitioning, no archival strategy, no query observability
- **Verdict:** Functional but NOT production-ready

### Agent D: Security Review
- **Verdict:** FAIL (6 blocking issues)
- **CRITICAL:** Terminal RCE (full shell + env vars), Path traversal (symlink bypass)
- **HIGH:** No CSRF, Weak API key hash (SHA-256 unsalted), No rate limit on API keys, Missing auto-mode authorization
- **MEDIUM:** Unsafe CSP (inline scripts), WebSocket silent auth failure, Terminal CWD not validated
- **OWASP Coverage:** FAIL on A01 (Access Control), A02 (Crypto), A03 (Injection), A04 (Design), A05 (Misconfig)

### Agent E: Integration Features
- **Terminal:** 80% functional. xterm.js + node-pty + WebSocket wired. Missing: session persistence, crash recovery, TTL, search addon, clipboard addon
- **Git:** Basic worktree + PR creation works. Missing: commit log, diff viewer, status checking, merge safety, branch management UI
- **File Browser:** 3 basic endpoints (read, write, listDir). Missing: metadata, recursive listing, search, tree UI component
- **Effort to MVP:** Terminal 5-7 days, Git 2.5-3 weeks, File Browser 5-10 days

### Agent F: Data Strategy + Direction
- **Learning system:** Dashboard queries OLD table, 4 new tables orphaned. APIs exist but unused by frontend.
- **Self-building MVP:** Missing 3 pieces: (1) "Start Build" button, (2) AutoMode event streaming, (3) build results display
- **Technical debt:** 12 items ranked. Top: dual source of truth, learning UI disconnect, session orphan risk
- **Test distribution:** 59% in packages/api, 17% in packages/types, 6% in apps/web, 1% in apps/server
- **Multi-project:** Heavily coupled to single project. Learning data not project-scoped. 1-2 week effort to decouple.

---

## 7. Self-Building Roadmap

| Stage | Timeline | Milestone | Metric |
|-------|----------|-----------|--------|
| **1. Dashboard Trigger** | Now → 2 weeks | Feature implementation triggered from Intent Box with real-time progress | "NOMOS implements a feature from the web UI" |
| **2. Full Observability** | 2-6 weeks | Cost tracking, pipeline monitor, learning visibility, terminal stability | "Users see exactly what the AI is doing and what it costs" |
| **3. Self-Modifying** | 2-4 months | NOMOS detects bugs via verification, proposes fixes, implements in worktree | "NOMOS fixes a bug in its own codebase" |
| **4. Autonomous Studio** | 6-12 months | 10+ features in parallel, self-prioritizing backlog, multi-project | "NOMOS builds features without human intervention" |

---

## 8. Agent Execution Summary

| Agent | Track | Duration | Tools Used | Tokens | Key Score |
|-------|-------|----------|------------|--------|-----------|
| **A** | Frontend/UX + Automaker | 127s | 33 | 92K | 5.9/10 |
| **B** | Backend Architecture | 291s | 39 | 91K | 8.2/10 |
| **C** | Database Expert | 206s | 45 | 67K | 19 issues (4 CRITICAL) |
| **D** | Security Review | 162s | 45 | 62K | FAIL (2 CRITICAL + 4 HIGH) |
| **E** | Integration Features | 113s | 57 | 79K | 80% terminal ready |
| **F** | Data Strategy | 147s | 46 | 87K | Learning UI broken |

**Total analysis:** ~1046s wall clock, 253 tool invocations, 478K tokens consumed.

---

*Generated by 6-agent strategic review swarm on 2026-02-09*
*Agents: Frontend/UX (Explore), Backend (code-explorer), Database (code-explorer), Security (security-reviewer), Integration (Explore), Data Strategy (Explore)*
