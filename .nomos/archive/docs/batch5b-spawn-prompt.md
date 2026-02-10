# Batch 5B — Self-Building MVP

## Context

Batch 5A (security hardening + database foundation) is complete and merged to main. This session implements the self-building MVP: the ability for a user to see learnings from correct DB tables, click "Start Build" on a feature, monitor pipeline progress, and see cost data.

**Branch:** Create `batch-5b/self-building-mvp` from `main`
**Baseline:** 1006 tests passing, 0 type errors

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-5b/self-building-mvp
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## Team: `batch-5b-mvp` (2 agents, bypassPermissions mode)

### Agent 1: `frontend-agent` (code-writer)

**Owns:** All `apps/web/src/` files

#### L1 — Rewrite Learnings UI (FULL REWRITE)
- **File:** `apps/web/src/routes/learnings.tsx`
- **Problem:** Page queries `orpc.learnings.list()` hitting OLD `learning` table. The new tables (`pattern`, `antipattern`, `feature_insight`) are never queried.
- **API endpoints already exist** in `packages/api/src/routers/learning.ts`:
  - `listPatterns` — returns patterns with confidence, status, evidenceCount
  - `listAntipatterns` — returns antipatterns with severity, prevention, whatWentWrong
  - `listInsights` — returns feature insights with discoveries, whatWorked, whatFailed
- **Changes:**
  1. Replace single `learnings.list` query with 3 separate queries: `listPatterns`, `listAntipatterns`, `listInsights`
  2. **Patterns tab:** Show name, description, confidence bar (0-1 scale), status badge (active/proven/archived), evidence count, category filter
  3. **Antipatterns tab:** Show name, description, severity badge (critical=red, high=orange, medium=yellow, low=blue), prevention text, category filter
  4. **Insights tab:** Show by featureId, discoveries list, whatWorked/whatFailed, patternsApplied
  5. Add curation controls: promote pattern (set status=proven), archive pattern (set status=archived), delete
  6. Remove old `LearningEntry` interface, add new typed interfaces matching API responses

#### L2 — Add "Start Build" Button
- **File:** `apps/web/src/routes/features.$featureId.tsx` (or `apps/web/src/components/kanban/feature-detail-panel.tsx`)
- **Backend API already exists:** `autoMode.startFeature` at `packages/api/src/routers/auto-mode.ts:113-158`
- **Changes:**
  1. Add mutation: `useMutation` calling `orpc.autoMode.startFeature`
  2. Add "Start Build" button in feature detail header
  3. Disable for features already `in_progress` or `verified`
  4. Toast feedback on success/error
  5. Invalidate feature query on success

#### L5 — Cost Summary Card on Dashboard
- **File:** `apps/web/src/routes/dashboard.tsx` (add new component)
- **Changes:**
  1. Create `CostCard` component showing:
     - Total cost across all sessions (sum `totalCostUsd`)
     - Cost of last session
     - Average cost per feature
     - Total input/output tokens
  2. Query session data: `orpc.sessions.list.queryOptions()`
  3. Add to dashboard grid alongside existing stat cards

---

### Agent 2: `backend-agent` (code-writer)

**Owns:** All `packages/api/src/` files

#### L3 — Pipeline Progress Endpoint + Monitor Component
- **File (backend):** `packages/api/src/routers/auto-mode.ts`
- **Problem:** `PipelineService.getProgress(featureId)` exists but has NO REST endpoint
- **Changes (backend):**
  1. Add `getProgress` procedure to auto-mode router:
     ```typescript
     getProgress: protectedProcedure
       .input(z.object({ featureId: z.string() }))
       .handler(async ({ input }) => {
         const pipeline = getPipelineService();
         return pipeline.getProgress(input.featureId);
       }),
     ```
  2. Also add to REST adapter if needed

- **File (frontend — coordinate with frontend-agent):** `apps/web/src/components/auto-mode/pipeline-monitor.tsx` (NEW)
- **Changes (frontend):**
  1. Create `PipelineMonitor` component
  2. Poll `autoMode.getProgress` every 3s when feature is `in_progress` (via `refetchInterval`)
  3. Show 6-phase progress bar with step names and status icons
  4. Display current phase name, elapsed time, checkpoint status
  5. Integrate into feature detail page

#### L4 — Cost Accumulation Investigation
- **File:** `packages/api/src/services/auto-mode-service.ts:242-245`
- **Action:**
  1. Read Claude Agent SDK docs to confirm `result.costData.totalCostUsd` is cumulative across turns
  2. If cumulative: add explanatory comment, no code change needed
  3. If NOT cumulative: accumulate in running total
  4. Document finding in code comment either way

---

## Execution Timeline

```
TIME    frontend-agent              backend-agent
----    ---------------             -------------
 0h     L1 (learnings rewrite)      L4 (cost investigation)
 3h     L1 (continued)              L3-backend (getProgress endpoint)
 5h     L2 (Start Build button)     L3-frontend (pipeline monitor)
 7h     L5 (cost card)              [done]
 8.5h   [done]
```

**File conflict avoidance:** frontend-agent owns `apps/web/src/`, backend-agent owns `packages/api/src/`. L3 requires coordination — backend-agent creates the endpoint first, then creates the frontend monitor component (or frontend-agent does it after backend is done).

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. Learnings page shows patterns from pattern table with confidence bars
# 2. Learnings page shows antipatterns with severity badges
# 3. Learnings page shows insights from feature_insight table
# 4. "Start Build" button appears on feature detail page
# 5. Pipeline monitor shows progress (if a feature is in_progress)
# 6. Cost card displays session cost data on dashboard
```

## Commit

```
feat: Batch 5B — Self-building MVP (learnings UI, Start Build, pipeline monitor)

- Rewrite learnings page: query pattern/antipattern/insight tables (not legacy learning)
- Add confidence bars, severity badges, curation controls to learnings
- Add "Start Build" button on feature detail page (calls autoMode.startFeature)
- Add getProgress API endpoint for pipeline status
- Add pipeline monitor component with polling-based progress tracking
- Add cost summary card to dashboard with session cost aggregation
- Document cost accumulation behavior (SDK total_cost_usd is cumulative)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
