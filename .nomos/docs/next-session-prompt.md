# NOMOS Strategic Review & Design Session

Read `.nomos/docs/execution-plan-2026-02-09.md` for full context.

All 4 batches are complete (commits cb6aec6, 2ed32cf, c201738, cfa3e88). Branch: `feature/ecosystem-unification`. 1006 tests, 0 failures, 0 type errors.

This session is a **comprehensive strategic review and design discussion**. Spawn a multi-agent swarm (5-6 agents) to analyze the project from every angle simultaneously, then synthesize findings into a prioritized action plan.

---

## What Has Been Built (4 Batches)

### Batch 1 — Postgres Migration (cb6aec6)
- Migrated from SQLite to Docker Postgres
- 15 Drizzle schema tables, FK constraints, seed scripts
- 5 deprecated agents deleted, 607MB cleaned

### Batch 2 — Pipeline Unification (2ed32cf)
- DB as single source of truth (features.json is export-only)
- AutoModeService uses Claude SDK query() directly (not CLI subprocess)
- Intent Box to DB to SDK to dashboard fully wired
- Session resume, typed events, auth normalization

### Batch 3 — Production Hardening (c201738)
- 77 new tests (cost tracking, crash recovery, self-building loop validation)
- Redis EventService with pub/sub (fallback to in-memory)
- Pino structured logging, Prometheus metrics, health/ready endpoints
- E2E Playwright tests, CD pipeline to GHCR
- 285 to 139 features (72 verified, 67 active backlog)
- Learning feedback loop closed (Phase 1 reads patterns, Phase 2 gets antipatterns)

### Batch 4 — Learning DB Migration (cfa3e88)
- 4 new tables: pattern, antipattern, feature_insight, feature_metric
- Seed script: JSON to DB migration (idempotent)
- 15+ API handlers (CRUD + /relevant + /curate)
- CLI fallback: pending.json ingested on server startup
- Dashboard /learnings tab (3 sub-views: patterns, antipatterns, insights)
- Historian updated to POST to API

### Current Codebase Size
- 249 files changed across all batches (+38,325 / -18,272 lines)
- Backend: 64 API files, 44 DB files, 18 routers, 23 services
- Frontend: 128 files, 15 routes, 13 UI primitives
- 15 DB schema tables, 15 repositories
- 1006 tests across 57 test files

---

## Analysis Topics — Discuss Each Thoroughly

### 1. FRONTEND DESIGN & UX

**Current state:**
- 15 routes: home, dashboard, projects, kanban, agent, activity, terminal, spec, import, settings, learnings, login, features/:id, projects/:id
- 13 UI primitives only (badge, button, card, checkbox, dialog, dropdown-menu, input, label, select, sheet, skeleton, sonner, textarea)
- No table component, no tabs component, no tooltip, no popover, no command palette UI, no data grid
- Styling: Tailwind 4, no design system, no consistent spacing/typography scale
- No dark mode toggle (theme provider exists but no UI)

**Discussion points:**
- Compare with Automaker (the reference app in `.nomos/inspiration/autonomous/`): What design patterns does it use? How does its dashboard, feature tracking, and agent monitoring work? What should NOMOS adopt?
- UI component library strategy: shadcn/ui full adoption? What components are missing and needed?
- Information architecture: How should the dashboard be reorganized? Currently it's a flat nav with 10+ items — should it be grouped (Development, Monitoring, Settings)?
- Data density: The dashboard shows basic stats but lacks the depth needed for a development studio. What data visualizations matter? (Feature pipeline Gantt chart? Cost burn-down? Test coverage trend? Git activity?)
- Mobile responsiveness: Current state? Is it needed?
- Accessibility: ARIA labels, keyboard navigation, screen reader support
- Design tokens: Colors, spacing, typography — should there be a formal design system?

### 2. CODEBASE TREE & FILE BROWSER

**Feature proposal:** Add an in-app codebase tree view that lets users navigate and view files from within the NOMOS dashboard.

**Discussion points:**
- Should this be a sidebar tree (VS Code style) or a dedicated route?
- How does the existing `fs` router (`packages/api/src/routers/fs.ts`) expose file system access?
- Security implications of exposing file system through the web app
- Integration with git: show modified files, staged changes, diff viewer
- Integration with features: highlight files changed by a specific feature
- Monaco editor integration for in-app code viewing/editing?
- Performance: lazy loading tree nodes, file content caching

### 3. GIT INTEGRATION & OPERATIONS

**Current state:**
- `packages/api/src/routers/github.ts` — GitHub router exists
- `packages/api/src/services/github-service.ts` — GitHub service exists
- Worktree management: schema + service + router exist
- Pipeline Phase 5 (SHIP) handles git ops, PR creation

**Discussion points:**
- Git operations UI: branch management, commit history, diff viewer, PR creation from dashboard
- Worktree visualization: show active worktrees, which features are in which worktrees
- Merge conflict resolution: can this be done from the dashboard?
- Git hooks integration: pre-commit, pre-push validation
- Branch strategy: how does NOMOS manage feature branches? Auto-create? Auto-cleanup?
- GitHub integration depth: PR reviews, issue tracking, CI status display

### 4. TERMINAL INTEGRATION & USABILITY

**Current state — exists but NOT functional/usable:**
- Route: `apps/web/src/routes/terminal.tsx` — renders `<TerminalSplit />`
- Components: `terminal-split.tsx`, `terminal-tabs.tsx`, `terminal-view.tsx` (3 files)
- Backend: `TerminalService` uses `node-pty` to spawn shell processes (xterm-256color, 80x24)
- Frontend: `use-terminal` hook initializes xterm.js, connects to backend via WebSocket/polling
- Store: Zustand `terminal-store` manages tabs (id, cwd, title)
- Router: `terminal.create`, `terminal.list`, `terminal.write`, `terminal.resize`, `terminal.kill`
- Scrollback: 50KB max, 4KB batch size, 4ms batch interval

**Known issues (not close to usable):**
- xterm.js may not be rendering properly (no confirmation it works end-to-end)
- WebSocket connection for real-time I/O may not be wired correctly
- No resize handling (terminal stays 80x24 regardless of container size)
- No copy/paste support
- No search within terminal output
- No split pane (horizontal/vertical terminal splitting)
- Tab management is basic — no rename, no reorder, no color coding
- No integration with agent sessions (can't watch agent output in terminal)
- No command history or autocompletion
- CWD detection and display not working
- No terminal themes (hardcoded Tokyo Night background #1a1b26)

**Discussion points:**
- What's the minimum to make the terminal actually functional? (xterm.js rendering, WebSocket I/O, resize)
- Should terminal be integrated into other views? (e.g., bottom panel on agent page, inline in feature detail)
- xterm.js addon strategy: fit addon (auto-resize), web-links addon, search addon, unicode11 addon
- Should terminal support multiple panes (split view) like iTerm2/tmux?
- Agent session streaming: Can we pipe agent SDK output into an xterm instance in real-time?
- Performance: Is node-pty + WebSocket the right approach? Alternatives?
- Terminal profiles: Save/restore terminal configurations (shell, env vars, working directory)
- Security: Shell access through the web — how to sandbox properly? Restrict to project directory?
- Integration with pipeline: Show build/test output in a terminal pane during feature execution

### 5. SKILLS & AGENT GENERATION

**Current NOMOS skills:**
- `/nomos` — main pipeline (6 phases)
- `/nomos verify` — 5-step verification
- `/nomos refactor` — 9-step safe refactoring
- `/nomos improve` — system self-improvement
- `/nomos swarm` — multi-agent collaboration

**Discussion points:**
- Skill generation: Can NOMOS generate new skills from templates? Should there be a skill builder UI?
- Agent configuration: 11 active agents in `.claude/agents/` — should users be able to create/configure agents from the dashboard?
- Pipeline customization: Can users modify the 6-phase pipeline per project? Add/remove phases?
- Prompt engineering UI: Should there be a prompt editor/tester in the dashboard?
- Agent monitoring: Real-time view of what agents are doing, token usage, cost per agent
- Skill marketplace: Shareable skills between NOMOS instances?

### 6. BACKEND QUALITY & ARCHITECTURE

**Current stack:** Hono + oRPC + Drizzle + PostgreSQL

**Discussion points:**
- Code organization: Is the router/service/repository split clean? Any coupling issues?
- Error handling: How consistent is error handling across routers? Are there gaps?
- API design: REST adapter wraps oRPC — is this the right pattern long-term? Should we go pure REST or pure RPC?
- Type safety: End-to-end type safety from DB schema to API to frontend — how complete is it?
- Performance: N+1 queries? Missing indexes? Query optimization needed?
- Connection pooling: Postgres connection management — is it configured properly?
- Rate limiting: Does it exist? Should it?
- Caching: Redis is available but only used for events — should API responses be cached?
- WebSocket: Current state of real-time communication? Is it robust enough for agent streaming?
- Testing gaps: 1006 tests but where are the gaps? Integration tests? E2E coverage?

### 7. SECURITY REVIEW

**Discussion points:**
- Authentication: better-auth — is it properly configured? Session management?
- Authorization: Ownership checks on all resources? RBAC/ABAC needed?
- API key security: How are API keys stored? Hashed? Rate limited?
- Input validation: Zod schemas on all endpoints? Any gaps?
- File system access: The `fs` router exposes file operations — is it properly sandboxed?
- Terminal access: The `terminal` router gives shell access — security implications?
- CORS configuration: Current state?
- CSP headers: Configured?
- Dependency audit: Any known vulnerabilities in dependencies?
- Secrets management: How are secrets handled in different environments?
- SQL injection: Drizzle prevents most, but any raw SQL?
- XSS: React prevents most, but any unsafe HTML rendering?
- CSRF: Protection in place?

### 8. AUTOMAKER COMPARISON

Read the reference documentation in `.nomos/inspiration/autonomous/` and compare:
- Feature tracking and lifecycle management
- Agent monitoring and cost tracking
- Dashboard layout and information density
- Design language and visual style
- What NOMOS does better, what Automaker does better
- Specific patterns to adopt

### 9. LEARNING SYSTEM & DATA MANAGEMENT

**Current state — hybrid JSON + DB, needs consolidation:**

**Learning system (Batch 4 — partially migrated):**
- 4 new DB tables: pattern, antipattern, feature_insight, feature_metric
- Seed script reads `.nomos/learning/*.json` and inserts into DB
- API endpoints: `/api/learnings/relevant`, `/api/learnings/curate`, CRUD for all 4 tables
- CLI fallback: pending.json ingested on server startup
- BUT: the old generic `learning` table still exists alongside the 4 new tables
- BUT: the frontend `/learnings` page currently queries the OLD generic `learning` table via `orpc.learnings.list`, NOT the new specialized tables
- BUT: no data actually exists in the new tables yet (seed script hasn't been run against a live DB)
- BUT: Phase 1/2 pipeline hasn't been tested reading from `/api/learnings/relevant` with real DB data

**project.json (Batch 3 — file-based):**
- `.nomos/project.json` contains project metadata, stack info, settings, constitution
- `SpecService` reads from file system (project.json with app_spec.json fallback)
- This data is NOT in the DB — it's a JSON file that the CLI pipeline reads
- Should project configuration live in the DB? Or stay as a file? Or both (file as source, DB as cache)?
- Multi-project support: currently single-project — project.json is per-repo

**features.json (Batch 2 — DB is source of truth, but...):**
- DB is the single source of truth for features (139 features in DB)
- `GET /api/features/export` generates features.json from DB
- `.nomos/features.json` is a read-only export file
- BUT: the CLI pipeline Phase 1 (scout) still reads features.json as fallback when server is down
- Should features.json be eliminated entirely? What about offline/disconnected mode?

**Discussion points:**
- **Old learning table cleanup**: Should the generic `learning` table be dropped? It overlaps with the 4 new tables. What migration path for any data in it?
- **Frontend data wiring**: The `/learnings` page needs to be updated to fetch from the new specialized endpoints (`/api/learnings/patterns`, `/api/learnings/antipatterns`, `/api/learnings/insights`, `/api/learnings/metrics`) instead of the generic `learnings.list`
- **Seed validation**: Has the seed script been tested? Does it handle all edge cases in the JSON files?
- **Learning dashboard quality**: The current learnings page is functional but basic — it doesn't show confidence bars, pattern status (active/proven/archived), or curation controls
- **project.json strategy**: File vs DB vs hybrid. Pros/cons of each for multi-project, offline mode, and git-tracked configuration
- **Offline mode**: When the server is down, the CLI pipeline needs project config + features + learning data. What's the offline strategy? Local SQLite cache? JSON file fallback?
- **Data consistency**: With data split between files (.nomos/) and DB, how do we ensure consistency? Single source of truth for each data type?
- **Learning system effectiveness**: Is the pattern/antipattern data actually useful to the AI agents? How do we measure learning system ROI?
- **Curation workflow**: The `/api/learnings/curate` endpoint exists but there's no UI for manual curation (review flagged duplicates, manually promote/archive patterns)
- **Feature lifecycle in DB**: Feature state machine (backlog -> pending -> in_progress -> waiting_approval -> verified) — is it properly enforced at the DB/API level?

### 10. DATABASE QUALITY, SECURITY & PERFORMANCE (SQL/DB Expert)

**This track requires a dedicated database expert agent.** Read ALL schema files, ALL repositories, ALL migration SQL, and the DB connection setup. Perform a thorough audit.

**Current setup:**
- Drizzle ORM with `postgres` (postgres.js) driver
- Single connection: `postgres(env.DATABASE_URL)` — no pool configuration
- 15 tables across 2 migrations (0000_tiny_skin.sql, 0001_stiff_tenebrous.sql)
- All PKs are `text` type (not UUID, not serial) — manually generated sequential IDs (F001, P001, S001, PAT-001, etc.)
- JSONB used extensively for flexible data (patterns.applies_to, feature_insight.discoveries, etc.)

**Tables (15 total):**
- Auth: user, account, session, verification (managed by better-auth)
- Core: project, feature, agent_session, worktree, event, message, notification
- Settings: setting, api_key
- Learning: pattern, antipattern, feature_insight, feature_metric
- Legacy: learning (old generic table, overlaps with new 4 tables)

**Schema files to audit:** `packages/db/src/schema/*.ts` (16 files)
**Repository files to audit:** `packages/db/src/repositories/*.ts` (15 files)
**Migration SQL to audit:** `packages/db/src/migrations/0000_tiny_skin.sql`, `0001_stiff_tenebrous.sql`
**Connection setup:** `packages/db/src/index.ts`
**ID generation:** `packages/db/src/lib/id-generation.ts`

**Audit checklist:**

**1. Connection & Pooling:**
- No connection pool configured — `postgres(url)` uses defaults. What are the defaults? Is this safe for production?
- No connection timeout, idle timeout, or max connections specified
- No graceful shutdown / connection cleanup on server stop
- Should we use `postgres(url, { max: N, idle_timeout: N })` explicitly?

**2. Schema Design:**
- Text PKs with sequential IDs (F001, F002...) — race condition risk in `getNextId()` despite retry logic
- No composite unique constraints where needed (e.g., pattern name + userId should be unique together)
- Missing FK from pattern/antipattern to user table (userId is text, not a FK reference)
- Missing FK from learning.userId to user table
- `event` table has no FK constraints at all (feature_id, project_id, session_id are loose text columns)
- JSONB columns have no check constraints — any JSON can be stored
- No enums for constrained fields (status, severity, category, phase) — all plain text
- `updatedAt` uses `$onUpdate(() => new Date())` — is this reliable? Does it work with batch updates?

**3. Indexing:**
- Are all query patterns covered by indexes?
- Compound indexes: should (userId, category) be a compound index for the common filtered query?
- JSONB indexing: should `features_applied` or `applies_to` arrays have GIN indexes for containment queries?
- Missing indexes: event table has NO indexes at all — queries by feature_id, session_id will table-scan
- Are text PK indexes adequate? Or should there be additional btree indexes?

**4. Query Patterns:**
- Repositories do individual SELECT-per-item in loops (e.g., seed script checks `featureExists()` per feature) — should use bulk queries
- `findRelevant()` on patterns: does `and(gte(confidence), eq(status))` use the confidence index efficiently?
- N+1 risk: routers fetch lists then individually check ownership — should use WHERE clauses
- No pagination on any list endpoint — `findAll()` returns entire tables
- No sorting specified in queries — order is undefined
- Curation endpoint loops through ALL patterns and does individual UPDATEs — should use bulk UPDATE with CASE/WHEN

**5. Transaction Usage:**
- `withTransaction` exists on every repository but is barely used
- Seed script does individual INSERTs without wrapping in a transaction — should batch
- ID generation uses transactions for MAX(id) + increment — but concurrent inserts could still collide
- No optimistic locking (no version column) — concurrent updates silently overwrite

**6. Data Integrity:**
- No CHECK constraints on confidence (should be 0.0-1.0), success_rate (0.0-1.0)
- No CHECK constraints on severity (should be LOW/MEDIUM/HIGH/CRITICAL)
- No CHECK constraints on feature status (should match state machine)
- Cascading deletes: feature_insight and feature_metric cascade on feature delete — is this desired?
- Pattern/antipattern have no cascade — deleting a user leaves orphaned patterns

**7. Security:**
- Connection string in env var — is it rotated? TLS required?
- No row-level security (RLS) — all access control is application-level
- API keys stored with `key_hash` (good) — but what hash algorithm?
- No audit trail / soft delete — records are hard-deleted
- SQL injection: Drizzle parameterizes, but check for any `sql` template literal usage with raw values

**8. Performance Concerns:**
- No EXPLAIN ANALYZE has been run on any query
- Text PKs are less efficient than UUID/serial for joins and index scans
- JSONB columns stored inline — large code_example fields bloat row size
- No table partitioning for events table (will grow unbounded)
- No archival strategy for old events, sessions, messages
- No VACUUM/ANALYZE scheduling mentioned

**9. Migration Safety:**
- Two migration files — are they idempotent?
- No down migrations — how to rollback?
- `drizzle-kit generate` auto-generates — is the output reviewed before applying?
- Schema drift: what if someone applies manual SQL changes?

**Expected output from DB expert:**
- Severity-ranked list of issues (critical/high/medium/low)
- Specific SQL or Drizzle code fixes for each issue
- Recommended connection pool configuration
- Index optimization recommendations with expected impact
- Schema changes needed (FKs, constraints, enums)
- Query optimization suggestions with EXPLAIN ANALYZE predictions

### 11. STRATEGIC DIRECTION

- What's the MVP for "NOMOS builds itself from the dashboard"? (F1 manual test)
- What's the path to open-source release?
- What's the path to multi-project support?
- What's the next batch of work? Priority ordering?
- Technical debt inventory: what needs cleanup before moving forward?

---

## Expected Output

After the swarm analysis, produce:
1. **Quality scorecard** — rate each dimension (frontend, backend, security, UX, testing) on a scale
2. **Top 10 issues** — most impactful problems to fix, ranked
3. **Design proposal** — mockup/wireframe descriptions for the ideal dashboard layout
4. **Batch 5 plan** — next batch of work with prioritized tasks
5. **Architecture decisions** — any fundamental changes recommended
