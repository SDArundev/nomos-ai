# Batch 10 — Production Polish + Test Quality + Multi-User

## Context

Batch 9 closed the critical pipeline gaps: quality gates auto-invoked, git verification, project setup flow, and test foundation for Batch 7 services. Strategic Review v4 identified remaining issues: multi-user isolation, ~35% test theater, broken shortcuts customization, and incomplete pagination.

**Branch:** Create `batch-10/production-polish` from `main` (after Batch 9 is merged)
**Baseline:** Post-Batch 9 (tests TBD, 0 type errors expected)
**Review:** `.nomos/docs/strategic-review-v4-2026-02-10.md`

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-10/production-polish
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## What Already Exists (Post-Batch 9)

### Multi-User — Partial
- AutoModeService is singleton with `startedByUserId` ownership
- `startFeature()` does NOT check isRunning — multiple users can run features concurrently
- BUT `runningFeatures` Map and `consecutiveFailures` counter are shared across all users
- Session ownership checks exist on all endpoints

### Test Quality — Mixed
- Real behavior tests: ~240 (40%)
- Validation theater: ~215 (35%) — tests inline constants, string equality, arithmetic
- Zero frontend component tests
- Zero E2E tests (server startup → HTTP request → response)
- Batch 9 added tests for quality-gate, git-commit, git-merge services
- Shared mock helper created for @nomos-ai/db consistency

### Frontend Issues
- FE-V4-001: AgentStore duplicates React Query data (sessions, messages)
- FE-V4-002: Learnings page uses client-side pagination (server endpoints exist)
- FE-V4-003: `s` shortcut documented but handler missing
- FE-V4-004: Shortcuts customization saves settings but hook ignores them
- FE-V4-006: Large monolithic route files (learnings 1093L, kanban 473L)
- FE-V4-007: message-bubble.tsx possibly orphaned

### Backend Issues
- BA-004: AutoModeService singleton shares concurrency pool across users
- BA-005: Some fire-and-forget catches now log (Batch 9) but audit needed
- BA-007: ALLOWED_ROOTS duplicated across services
- BA-009: Missing CHECK constraint on session status
- BA-012: API key middleware silently falls through on non-nms tokens

---

## Team: `batch-10-production-polish` (3 agents, bypassPermissions mode)

### Agent 1: `multi-user-agent` (code-writer)

**Owns:** Multi-user isolation, session scoping, API key hardening

#### MULTI-1 — Per-User Concurrency Isolation [4h]
- **File:** `packages/api/src/services/auto-mode-service.ts`
- Refactor from singleton with shared state to per-user scoping:
  ```typescript
  // BEFORE: One Map for all users
  private runningFeatures: Map<string, AbortController> = new Map();
  private consecutiveFailures = 0;

  // AFTER: Per-user state
  private userState: Map<string, {
    runningFeatures: Map<string, AbortController>;
    consecutiveFailures: number;
    isRunning: boolean;
  }> = new Map();
  ```
- Update `start()`, `stop()`, `startFeature()`, `getStatus()`, `executeFeature()` to use per-user state
- `getUserState(userId)` helper — lazy-creates state for new users
- Remove `startedByUserId` field — no longer needed when state is per-user
- **File:** `packages/api/src/routers/auto-mode.ts`
  - Remove ownership checks that compare startedByUserId (replaced by per-user state)
  - `start` handler uses `context.session.user.id` to scope operations
  - `stop` handler only stops the calling user's loop
  - `getStatus` returns only the calling user's status

#### MULTI-2 — Session Status CHECK Constraint [1h]
- **File:** Create migration `packages/db/src/migrations/XXXX_session_status_check.sql`
  ```sql
  ALTER TABLE agent_session
  ADD CONSTRAINT session_status_enum
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));
  ```
- **File:** `packages/db/src/schema/sessions.ts` — add comment documenting the constraint

#### MULTI-3 — Extract Shared ALLOWED_ROOTS [1h]
- **Create:** `packages/api/src/lib/allowed-roots.ts`
  ```typescript
  export const ALLOWED_ROOTS = ["/home", "/Users", "/tmp", "/var/projects"];
  export function isAllowedRoot(path: string): boolean { ... }
  ```
- **Update:** `auto-mode-service.ts` and `worktree-service.ts` to import from shared module
- Delete inline ALLOWED_ROOTS definitions

#### MULTI-4 — API Key Middleware Hardening [2h]
- **File:** `packages/api/src/middleware/api-key-auth.ts`
- If `Authorization: Bearer <token>` is present but token doesn't start with `nms_`:
  - Return 401 with `{ error: "Invalid API key format" }` instead of falling through
  - Only fall through if NO Authorization header is present
- Add test: verify invalid Bearer token returns 401
- Add test: verify missing Authorization header falls through to session auth

---

### Agent 2: `test-quality-agent` (code-writer)

**Owns:** Replace validation theater, add real tests, E2E test

#### TQUAL-1 — Delete Validation Theater Tests [2h]
Delete or rewrite these files that test inline constants rather than real behavior:
- `apps/web/src/components/kanban/__tests__/feature-card.test.ts` — tests `typeof === "string"` and array.includes
- `apps/web/src/components/__tests__/app-sidebar.test.ts` — tests `"w-64" === "w-64"`
- `apps/web/src/components/agent/__tests__/tool-call-display.test.tsx` — tests JSON.stringify and subtraction
- `apps/web/src/components/kanban/__tests__/start-execution-dialog.test.ts` — likely theater
- `apps/web/src/components/kanban/__tests__/stop-execution-dialog.test.ts` — likely theater
- `apps/web/src/components/kanban/__tests__/feature-detail-panel.test.ts` — likely theater
- **Approach:** Read each file. If it tests ONLY inline data structures with zero DOM/component rendering, delete it. If it has some useful assertions, keep those and remove the theater.

#### TQUAL-2 — Add Real Server E2E Test [4h]
- **New file:** `apps/server/src/__tests__/e2e.test.ts`
- Start a real Hono server (the actual app, not a fake):
  ```typescript
  import { app } from "../index";
  // Use Bun's test server support or supertest equivalent
  ```
- Test cases:
  1. `GET /health` returns 200 with status
  2. `GET /ready` returns 200
  3. `POST /rpc/*` without X-Requested-With returns 403 (CSRF)
  4. `POST /rpc/*` with X-Requested-With but no session returns 401
  5. `GET /api/features` without auth returns 401
  6. Rate limiter: 101 requests in <60s returns 429
- This replaces the fake Hono app in `index.test.ts`

#### TQUAL-3 — Add Frontend Component Test [3h]
- **Install:** `@testing-library/react` + `@testing-library/jest-dom` (or bun equivalent)
- **New file:** `apps/web/src/components/__tests__/pagination-controls.test.tsx`
  - Render PaginationControls with mock props
  - Verify "Showing 1-20 of 100" text
  - Click Next → onPageChange called with page 2
  - Click Previous on page 1 → button disabled
  - Change page size → onPageSizeChange called
- **New file:** `apps/web/src/components/__tests__/keyboard-shortcuts-help.test.tsx`
  - Render with open=true
  - Verify all shortcut groups displayed
  - Verify keyboard hints visible

#### TQUAL-4 — Add Coverage Tracking [1h]
- **File:** `package.json` (root)
  - Add script: `"test:coverage": "bun test --coverage"`
  - Verify output includes line/branch percentages
- **File:** `.github/workflows/ci.yml` (if exists)
  - Add coverage step to CI
  - Upload coverage artifact

---

### Agent 3: `frontend-fix-agent` (code-writer)

**Owns:** Fix broken DX features, learnings pagination, AgentStore cleanup, component splitting

#### FE-FIX-1 — Fix Shortcuts Customization (FE-V4-004) [3h]
- **File:** `apps/web/src/hooks/use-keyboard-shortcuts.ts`
  1. Import `useSettings` hook
  2. On mount, load saved shortcuts from settings: `settings["shortcuts.*"]`
  3. Merge with default SHORTCUTS: custom bindings override defaults
  4. Use merged bindings in the keyboard event handler
  5. Handle the `s` shortcut (FE-V4-003): navigate to dashboard + trigger auto-mode start
- **File:** `apps/web/src/components/settings/shortcuts-tab.tsx`
  1. Verify save format matches what the hook reads
  2. Add "Reset All" button that clears all custom shortcuts from settings

#### FE-FIX-2 — Server-Side Learnings Pagination (FE-V4-002) [3h]
- **File:** `apps/web/src/routes/learnings.tsx`
  1. Replace `orpc.learnings.listPatterns.queryOptions()` with paginated variant
  2. Replace `orpc.learnings.listAntipatterns.queryOptions()` with paginated variant
  3. Replace `orpc.learnings.listInsights.queryOptions()` with paginated variant
  4. Use URL search params for pagination state (shareable URLs)
  5. Remove client-side `.slice()` pagination
  6. Wire PaginationControls to each tab
- **Check:** Backend `listPaginated` endpoints exist on learning router — verify input schema matches

#### FE-FIX-3 — Clean Up AgentStore (FE-V4-001) [3h]
- **File:** `apps/web/src/store/agent-store.ts`
  1. Remove `sessions: AgentSession[]` and `setSessions` — let React Query own session data
  2. Remove `messages: AgentMessage[]` and `setMessages` — or keep as transient stream buffer
  3. Keep only: `currentSessionId`, `isPending`, `streamingContent`
- **File:** `apps/web/src/components/agent/agent-chat.tsx`
  1. Remove `useEffect` that syncs `sessionsQuery.data` into store
  2. Read sessions directly from React Query: `const { data: sessions } = useQuery(orpc.agent.listSessions...)`
  3. Read messages directly from React Query or keep as streaming state

#### FE-FIX-4 — Split Large Route Files [2h]
- **File:** `apps/web/src/routes/learnings.tsx` (1093 lines)
  1. Extract `PatternTable` component to `components/learnings/pattern-table.tsx`
  2. Extract `AntipatternTable` to `components/learnings/antipattern-table.tsx`
  3. Extract `InsightTimeline` to `components/learnings/insight-timeline.tsx`
  4. Extract `CurationControls` to `components/learnings/curation-controls.tsx`
  5. Main route file should be <200 lines
- **File:** `apps/web/src/routes/kanban.tsx` (473 lines)
  1. Extract `NewFeatureDialog` to `components/kanban/new-feature-dialog.tsx`
  2. Extract filter/select bar to `components/kanban/kanban-toolbar.tsx`
  3. Main route file should be <200 lines

---

## Execution Timeline

```
TIME    multi-user-agent          test-quality-agent        frontend-fix-agent
----    ----------------          ------------------        ------------------
 0h     MULTI-1 (Per-user state)  TQUAL-1 (Delete theater)  FE-FIX-1 (Shortcuts fix)
 4h     MULTI-2 (Session CHECK)   TQUAL-2 (E2E test)        FE-FIX-2 (Learnings pagination)
 5h     MULTI-3 (Shared roots)    TQUAL-3 (Component tests)  FE-FIX-3 (AgentStore cleanup)
 6h     MULTI-4 (API key)                                    FE-FIX-4 (Split large files)
 8h     [DONE]                    TQUAL-4 (Coverage)        [DONE]
 9h                               [DONE]
```

**File conflict avoidance:**
- multi-user-agent: owns `auto-mode-service.ts` (per-user refactor), `auto-mode.ts` router, `api-key-auth.ts`, session migration, `allowed-roots.ts` (new)
- test-quality-agent: owns all test files, `apps/server/src/__tests__/e2e.test.ts` (new), component test files (new)
- frontend-fix-agent: owns `use-keyboard-shortcuts.ts`, `shortcuts-tab.tsx`, `learnings.tsx`, `agent-store.ts`, `agent-chat.tsx`, extracted component files (new)

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. User A starts auto-mode — User B's auto-mode is independent
# 2. User A's failure doesn't trigger User B's circuit breaker
# 3. Invalid Bearer token returns 401 (not fallthrough)
# 4. Session status CHECK constraint is enforced in DB
# 5. ALLOWED_ROOTS defined in one place only
# 6. Validation theater tests deleted (count should drop but quality improves)
# 7. E2E test passes: health, CSRF rejection, auth requirement
# 8. PaginationControls component test renders and clicks work
# 9. Keyboard shortcuts customization actually works (save → reload → custom binding active)
# 10. `s` shortcut starts auto-mode from any page
# 11. Learnings page uses server-side pagination (check network tab)
# 12. AgentStore no longer duplicates React Query data
# 13. learnings.tsx is <200 lines, kanban.tsx is <200 lines
# 14. Coverage report generates with `bun test --coverage`
```

## Commit

```
feat: Batch 10 — Production polish + test quality + multi-user

- Refactor AutoModeService to per-user concurrency isolation
- Add session status CHECK constraint
- Extract shared ALLOWED_ROOTS module
- Harden API key middleware (reject invalid Bearer tokens)
- Delete ~200 validation theater tests
- Add real E2E server test (health, CSRF, auth)
- Add first frontend component tests (PaginationControls, KeyboardShortcutsHelp)
- Add coverage tracking with bun test --coverage
- Fix keyboard shortcuts customization (hook now reads saved bindings)
- Implement `s` shortcut for auto-mode start
- Wire server-side learnings pagination
- Clean up AgentStore (remove React Query data duplication)
- Split learnings.tsx (1093L) and kanban.tsx (473L) into components

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Post-Batch 10: What Comes Next

### Batch 11: "Demo Day" (~15h)
- Full walkthrough test: sign up → create project → import features → Start Build → verify
- Error recovery UX (retry buttons, progress indicators)
- Loading skeletons and optimistic updates
- Performance profiling (React.memo, lazy routes)

### Batch 12: "Deployment" (~15h)
- Production Docker image optimization
- GitHub Actions CD pipeline hardening
- WebSocket reconnection handling
- CSP nonces (if deploying beyond localhost)
- Multi-environment config (dev/staging/prod)
