# Batch 5C — Hardening + Polish

## Context

Batches 5A (security) and 5B (self-building MVP) are complete and merged to main. This session adds production hardening: pagination on high-cardinality endpoints, PipelineService race condition fix, shadcn/ui component upgrades, and basic ARIA accessibility.

**Branch:** Create `batch-5c/hardening` from `main` (after 5B merged)
**Baseline:** All tests passing, 0 type errors

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-5c/hardening
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## Team: `batch-5c-hardening` (2 agents, bypassPermissions mode)

### Agent 1: `backend-agent` (code-writer)

**Owns:** `packages/db/src/repositories/`, `packages/api/src/`, `apps/server/src/`

#### M1 — Pagination on 3 Critical Repositories
- **Files:**
  - `packages/db/src/repositories/feature.ts`
  - `packages/db/src/repositories/session.ts`
  - `packages/db/src/repositories/learning.ts`
  - Corresponding routers in `packages/api/src/routers/`
- **Changes:**
  1. Add `findPaginated(params: { limit?: number; offset?: number; userId?: string })` to each repo
  2. Return shape: `{ rows: T[], total: number }`
  3. Default `limit: 50`, max `200`, default `offset: 0`
  4. Use `count()` for total (single query with window function or separate count query)
  5. Update router list handlers to accept optional `limit`/`offset` params via Zod schema
  6. Keep existing `findAll()` unchanged for backward compatibility
  7. Write tests for pagination (limit, offset, total count)

#### M3 — Fix PipelineService projectRoot Race Condition
- **File:** `packages/api/src/services/pipeline-service.ts`
- **Problem:** The service stores `projectRoot` as mutable instance state. Concurrent pipelines overwrite each other's `projectRoot`.
- **Changes:**
  1. Remove `projectRoot` instance variable
  2. Pass `projectRoot` as parameter to all methods that need it: `startPipeline(featureId, projectRoot)`, `getProgress(featureId)`, etc.
  3. Each pipeline execution gets its own `projectRoot` from the caller (auto-mode-service)
  4. Update callers in `auto-mode-service.ts` and `auto-mode.ts` router
  5. Update tests

#### M4 — Session Crash Recovery Enhancement
- **File:** `apps/server/src/index.ts:35-50` (already partially done)
- **Problem:** Current implementation marks all active sessions as failed, but doesn't check staleness
- **Changes:**
  1. Verify `findActive()` finds sessions with status `pending` or `running` (already does this with `inArray`)
  2. Add staleness check: only mark sessions orphaned if `updatedAt` is more than 10 minutes old
  3. Add event emission for monitoring: `events.emit("session:orphaned", { sessionId, reason })`
  4. Keep existing behavior as fallback

---

### Agent 2: `frontend-agent` (code-writer)

**Owns:** `apps/web/src/`

#### N1 — Install shadcn/ui Components
- **Directory:** `apps/web/`
- **Changes:**
  1. Install shadcn/ui components needed: `table`, `tabs`, `tooltip`, `progress`
  2. Run: `bunx --bun shadcn@latest add table tabs tooltip progress` (from `apps/web/` directory)
  3. Verify components are installed in `apps/web/src/components/ui/`
  4. Verify imports work and no type errors

#### O1 — Refactor Learnings Page with shadcn Components
- **File:** `apps/web/src/routes/learnings.tsx`
- **Depends on:** N1 (shadcn install) and L1 from 5B (learnings rewrite)
- **Changes:**
  1. Replace custom tab implementation with shadcn `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent`
  2. Replace pattern list with sortable shadcn `Table` (columns: name, category, confidence, status, actions)
  3. Add shadcn `Progress` component for confidence visualization (0-100% bar)
  4. Add shadcn `Tooltip` on truncated descriptions
  5. Ensure consistent styling with rest of app

#### A1 — Basic ARIA Accessibility
- **Files:**
  - `apps/web/src/routes/__root.tsx` (layout)
  - `apps/web/src/components/app-sidebar.tsx`
  - `apps/web/src/components/header.tsx`
- **Changes:**
  1. Add semantic landmarks: `<main>`, `<nav>`, `<header>` (replace divs where appropriate)
  2. Add skip link: "Skip to main content" at top of page, visually hidden until focused
  3. Add `aria-label` to all icon-only buttons (sidebar toggle, notification bell, settings gear, etc.)
  4. Ensure focus-visible styles on all interactive elements (`:focus-visible` ring)
  5. Add `aria-current="page"` to active nav links

---

## Execution Timeline

```
TIME    backend-agent               frontend-agent
----    ---------------             ---------------
 0h     M1 (pagination)             N1 (shadcn install)
 2h     M1 (continued)              A1 (ARIA basics)
 4h     M3 (pipeline race fix)      O1 (learnings shadcn refactor)
 6h     M4 (crash recovery)         O1 (continued)
 7h     [done]                      [done]
```

**File conflict avoidance:** backend-agent owns `packages/` and `apps/server/`, frontend-agent owns `apps/web/`. No overlap.

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. Feature list with limit=1 returns 1 row and correct total
# 2. Two concurrent pipeline starts don't interfere (check server logs)
# 3. Restart server — orphaned sessions marked failed (check logs)
# 4. Learnings page uses shadcn Table with sortable columns
# 5. Confidence bars render as shadcn Progress components
# 6. Skip link visible on focus, landmarks set correctly
# 7. All icon-only buttons have aria-label
```

## Commit

```
feat: Batch 5C — Hardening (pagination, race fix, shadcn, ARIA basics)

- Add pagination to feature, session, learning repositories (limit/offset/total)
- Fix PipelineService projectRoot race condition (pass as parameter)
- Enhance session crash recovery with staleness check
- Install shadcn/ui: Table, Tabs, Tooltip, Progress
- Refactor learnings page with shadcn components
- Add basic ARIA landmarks, skip links, focus management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
