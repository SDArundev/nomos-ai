# Batch 6 — Critical Fixes + Security Hardening

## Context

Strategic Review v3 (5-agent swarm, 2026-02-09) identified 4 critical blockers and 11 P1-P2 security features. This batch resolves all of them, making the system functionally operational and safe for multi-user use.

**Branch:** Create `batch-6/critical-security` from `main`
**Baseline:** 1030 tests passing, 0 type errors
**Review:** `.nomos/docs/strategic-review-v3-2026-02-09.md`

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-6/critical-security
3. bun test (verify 1030 baseline)
4. bun run check-types (verify 0 type errors)
```

---

## Team: `batch-6-security` (3 agents, bypassPermissions mode)

### Agent 1: `critical-fixes-agent` (code-writer)

**Owns:** The 4 BLOCKER fixes. Do these FIRST before anything else.

#### FIX-1 — Add X-Requested-With Header to oRPC Client [CRITICAL, 15min]
- **File:** `apps/web/src/utils/orpc.ts:33-41`
- **Problem:** The RPCLink sends `credentials: "include"` but does NOT include `X-Requested-With: XMLHttpRequest`. The server CSRF middleware at `apps/server/src/index.ts:160-176` requires this header on POST/PUT/PATCH/DELETE to `/api/*` and `/rpc/*`. ALL frontend mutations are 403'd.
- **Fix:** Add the header to the RPCLink fetch options:
  ```typescript
  const rpcLink = createORPCLink({
    url: `${import.meta.env.VITE_SERVER_URL}/rpc`,
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        credentials: "include",
        headers: {
          ...init?.headers,
          "X-Requested-With": "XMLHttpRequest",
        },
      }),
  });
  ```
- **Verify:** Check that the CSRF middleware still passes — read `apps/server/src/index.ts:160-176` to understand the exact check.

#### FIX-2 — Fix Auto-Mode Dashboard projectRoot [HIGH, 1h]
- **File:** `apps/web/src/components/auto-mode/auto-mode-dashboard.tsx:60`
- **Problem:** `start(projectId, ".")` hardcodes "." as projectRoot. This should resolve from the project's DB record.
- **Fix options:**
  1. Remove projectRoot from the `start()` RPC call entirely — have the backend look up `project.path` from DB (like `startFeature` already does at `auto-mode.ts:134`)
  2. OR pass the project.path from the frontend (requires the dashboard to have project data)
- **Preferred:** Option 1. Update `packages/api/src/routers/auto-mode.ts` `start` handler to look up project.path from the projectId, similar to how startFeature does it. Remove projectRoot from the frontend call and the Zod input schema.
- **Also fix:** The `useAutoMode` hook at `apps/web/src/hooks/use-auto-mode.ts` and `auto-mode-dashboard.tsx` to stop passing projectRoot.

#### FIX-3 — Fix pipeline.progress Endpoint Missing projectRoot [HIGH, 30min]
- **File:** `packages/api/src/routers/pipeline.ts:21`
- **Problem:** `service.getProgress(input.featureId)` called without projectRoot. `getLatestCheckpoint()` returns null, so `completedPhase` is always null.
- **Fix:** In the progress handler:
  1. Look up the feature by featureId
  2. Look up the feature's project to get project.path
  3. Pass project.path to `service.getProgress(featureId, projectRoot)`
- **Read:** `packages/api/src/services/pipeline-service.ts` getProgress() method to understand the signature.

#### FIX-4 — Wire PipelineMonitor Into Feature Detail Page [HIGH, 30min]
- **File:** `apps/web/src/routes/features.$featureId.tsx`
- **Component:** `apps/web/src/components/auto-mode/pipeline-monitor.tsx` (already exists, just needs importing)
- **Fix:**
  1. Import `PipelineMonitor` from `@/components/auto-mode/pipeline-monitor`
  2. Render it below the feature header when `feat.status === "in_progress"`:
     ```tsx
     {feat.status === "in_progress" && (
       <PipelineMonitor featureId={featureId} status={feat.status} />
     )}
     ```
  3. Place it in the grid before the Description card

---

### Agent 2: `security-backend-agent` (code-writer)

**Owns:** `packages/api/src/routers/`, `packages/api/src/services/`, `apps/server/src/`

#### SEC-1 — Fix userId Authorization in API Routers [P1, 6h]
- **Problem:** 7 of 9 routers lack ownership enforcement. Any authenticated user can access any other user's data (IDOR vulnerability).
- **Routers to audit and fix:**
  1. `packages/api/src/routers/feature.ts` — verify all CRUD operations check `userId`
  2. `packages/api/src/routers/session.ts` — verify session operations check `userId`
  3. `packages/api/src/routers/agent.ts` — verify agent sessions check `userId`
  4. `packages/api/src/routers/notification.ts` — verify notifications are user-scoped
  5. `packages/api/src/routers/settings.ts` — verify settings are user-scoped
  6. `packages/api/src/routers/spec.ts` — verify spec access is project/user-scoped
  7. `packages/api/src/routers/github.ts` — verify GitHub operations are user-scoped
- **Pattern:** For each router, find all query/mutation handlers. Add `userId` from session context to all DB queries. Reject if resource doesn't belong to user.
- **Read first:** `packages/api/src/routers/auto-mode.ts:113-158` for how startFeature correctly does userId/project ownership checks — use this as the reference pattern.

#### SEC-2 — Fix WebSocket Authentication [P1, 3h]
- **File:** `apps/server/src/lib/websocket.ts` or `apps/server/src/index.ts` (WS upgrade handler)
- **Problem:** WS accepts unauthenticated connections and broadcasts all events to all clients.
- **Fix:**
  1. Reject WS upgrade if no valid session cookie
  2. Associate each WS connection with a userId
  3. Filter events in EventBroadcaster to only send to the owning user
- **Read first:** `apps/server/src/index.ts:194-195` — auth check exists but may not reject properly.

#### SEC-3 — Fix SpecService Path Traversal [P1, 2h]
- **File:** `packages/api/src/services/spec-service.ts` (or wherever spec file reads happen)
- **Problem:** SpecService reads project spec files but may not validate paths against traversal.
- **Fix:** Apply the same `validatePath()` pattern used in FSService (`packages/api/src/services/fs-service.ts`) — realpath() + lstat() + containment check.

#### SEC-4 — Fix Terminal Router User Isolation [P1, 2h]
- **File:** `packages/api/src/routers/terminal.ts`
- **Problem:** Any user can access any terminal session via the REST API.
- **Fix:** Add userId ownership check to all terminal router handlers (create, resize, input, close).

#### SEC-5 — Fix Learning Router Ownership [P1, 2h]
- **Files:** `packages/api/src/routers/learning.ts`
- **Problem:** `getInsight` and `getMetric` have no ownership check. `curate` has no user-scoping.
- **Fix:** Add userId checks. For shared data (patterns/antipatterns), ensure curate operations are admin-only or user-scoped.

---

### Agent 3: `security-misc-agent` (code-writer)

**Owns:** Remaining P2 security fixes + tests

#### SEC-6 — Fix ClaudeProvider bypassPermissions [P2, 1h]
- **File:** `packages/api/src/services/auto-mode-service.ts:219`
- **Problem:** `allowDangerouslySkipPermissions: true` is hardcoded.
- **Fix:** Make configurable via env var `CLAUDE_BYPASS_PERMISSIONS=true`. Default to false. Add comment documenting the security implication.

#### SEC-7 — Fix Agent sendMessage Ownership [P2, 2h]
- **File:** `packages/api/src/routers/agent.ts` (message sending endpoints)
- **Problem:** Any user can send messages to any agent session.
- **Fix:** Verify session ownership before allowing message send.

#### SEC-8 — Fix Auto-Mode userId [P2, 2h]
- **File:** `packages/api/src/routers/auto-mode.ts`
- **Problem:** Auto-mode endpoints may not properly scope to the requesting user.
- **Fix:** Ensure all auto-mode operations are user-scoped. Fix the single-user `currentUserId` issue in AutoModeService (BA-013) — either make per-user instances or pass userId through all method calls.

#### SEC-9 — Fix Auto-Mode Endpoint Ownership [P2, 2h]
- **File:** `packages/api/src/routers/auto-mode.ts`
- **Problem:** Start/stop/status endpoints don't verify project ownership.
- **Fix:** Check that the requesting user owns the project before allowing auto-mode operations.

#### SEC-10 — Fix Notification Ownership [P2, 1h]
- **File:** `packages/api/src/routers/notification.ts`
- **Problem:** Notifications may not be user-scoped.
- **Fix:** Add userId filter to all notification queries.

#### SEC-11 — Write Security Tests [3h]
- **New file:** `packages/api/src/routers/__tests__/security-ownership.test.ts`
- **Tests:**
  1. Verify each router rejects access to resources owned by other users
  2. Verify WS upgrade rejects unauthenticated connections
  3. Verify path traversal is blocked in SpecService
  4. Verify terminal sessions are user-isolated
  5. Verify learning curation is properly scoped

---

## Execution Timeline

```
TIME    critical-fixes-agent    security-backend-agent    security-misc-agent
----    --------------------    ----------------------    -------------------
 0h     FIX-1 (CSRF header)    SEC-1 (userId in 7 routers)  SEC-6 (bypassPermissions)
 0.5h   FIX-2 (dashboard root) SEC-1 (continued)            SEC-7 (agent ownership)
 1.5h   FIX-3 (progress root)  SEC-1 (continued)            SEC-8 (auto-mode userId)
 2h     FIX-4 (wire monitor)   SEC-2 (WS auth)              SEC-9 (auto-mode ownership)
 3h     [DONE]                 SEC-3 (spec traversal)       SEC-10 (notification)
 4h                            SEC-4 (terminal isolation)   SEC-11 (security tests)
 5h                            SEC-5 (learning ownership)   SEC-11 (continued)
 6h                            [DONE]                       [DONE]
```

**File conflict avoidance:**
- critical-fixes-agent: owns `apps/web/src/utils/orpc.ts`, `apps/web/src/components/auto-mode/auto-mode-dashboard.tsx`, `apps/web/src/routes/features.$featureId.tsx`, `packages/api/src/routers/pipeline.ts`, `packages/api/src/routers/auto-mode.ts` (start handler only)
- security-backend-agent: owns `packages/api/src/routers/` (except pipeline.ts and auto-mode.ts start handler), `apps/server/src/`
- security-misc-agent: owns `packages/api/src/services/auto-mode-service.ts`, notification router, agent router message handlers, test files

**Potential conflicts on `auto-mode.ts`:** critical-fixes-agent modifies the `start` handler (removing projectRoot param). security-backend-agent adds ownership checks. security-misc-agent fixes userId scoping. **Resolution:** critical-fixes-agent does its work first. security-backend-agent and security-misc-agent work on non-overlapping handlers. If conflicts arise, security-backend-agent takes priority on router-level changes.

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. Frontend mutation (e.g., create feature) succeeds (no 403)
# 2. Auto-mode dashboard start resolves projectRoot from DB
# 3. Pipeline progress shows live checkpoint data (completedPhase not null)
# 4. PipelineMonitor renders on feature detail page when in_progress
# 5. User A cannot access User B's features/sessions/terminals
# 6. WS connection rejected without valid session
# 7. Path traversal blocked in SpecService
# 8. Security tests all pass
```

## Commit

```
feat: Batch 6 — Critical fixes + security hardening

- Fix CSRF: add X-Requested-With header to oRPC client
- Fix auto-mode dashboard: resolve projectRoot from DB (not ".")
- Fix pipeline.progress: pass projectRoot for live checkpoint data
- Wire PipelineMonitor into feature detail page
- Add userId authorization to 7 API routers (IDOR fix)
- Fix WebSocket authentication (reject anonymous connections)
- Fix SpecService path traversal
- Fix terminal router user isolation
- Fix learning router ownership checks
- Fix ClaudeProvider bypassPermissions (configurable)
- Fix agent/auto-mode/notification ownership
- Add security ownership tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Post-Batch 6: What Comes Next

### Batch 7: Quality Gates + Git (~25h)
- Quality gates: TypeScript check, lint, test runner (F047-F049)
- Git operations: worktree, commit, merge (F291 partial)
- Replace validation theater tests with real integration tests
- Add code coverage tracking

### Batch 8: Auth + DX Polish (~30h)
- Login page + route protection (F061-F063)
- Keyboard shortcuts + command palette (F101-F102)
- Settings persistence (F069-F070)
- Wire frontend pagination to backend endpoints
- Extended thinking display (F038)
