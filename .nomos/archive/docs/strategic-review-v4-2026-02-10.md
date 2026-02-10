# Strategic Review v4 — NOMOS Post-Batch 8

**Date:** 2026-02-10
**Branch:** `batch-8/auth-dx-polish`
**Method:** 5-agent swarm analysis (backend, frontend, pipeline, testing, progress)
**Baseline:** 605 tests, 0 failures, 0 type errors

---

## Scorecard

| Dimension | v3 Score | v4 Score | Delta | Analyst |
|-----------|----------|----------|-------|---------|
| Backend | 8/10 | 8/10 | -- | backend-analyst |
| Frontend | 6.5/10 | 7.5/10 | +1.0 | frontend-analyst |
| Pipeline | 5/10 | 6.5/10 | +1.5 | pipeline-analyst |
| Testing | ~3/10 | 4/10 | +1.0 | test-analyst |
| **Overall Readiness** | 6.6/10 | **6.5/10** | -0.1 | progress-analyst |

**Composite: ~6.5/10** (structural gains offset by testing debt and data setup gaps)

---

## Strategic Review v3 Findings — ALL 7 RESOLVED

| Finding | Severity | Resolution | Batch |
|---------|----------|------------|-------|
| FE-001: oRPC CSRF header missing | CRITICAL | `X-Requested-With` header on all requests | 6 |
| SW-001: projectRoot "." | HIGH | Resolves from `project.path` in DB | 6 |
| SW-005: pipeline.progress no projectRoot | HIGH | Resolves from DB | 6 |
| SW-012: PipelineMonitor not wired | HIGH | Rendered on feature detail page | 6 |
| BA-013: single-user AutoModeService | MEDIUM | `startedByUserId` ownership checks | 6 |
| FE-005: Zustand store duplication | MEDIUM | Data arrays removed from all 3 slices | 8 |
| SW-002: state machine bypasses | MEDIUM | Centralized `transitionFeatureStatus()` | 8 |

---

## Batch 8 Deliverables (12 tasks, 3 agents)

### auth-state-agent (4 tasks)
- AUTH-1: Login redirect with returnTo URL preservation
- AUTH-2: `requireAuth` guard on 12 protected routes via TanStack Router beforeLoad
- AUTH-3: Centralized `transitionFeatureStatus()` replacing all direct status updates
- AUTH-4: Zustand data arrays removed; React Query is sole data cache

### dx-polish-agent (4 tasks)
- DX-1: Keyboard shortcuts cheat sheet modal (`?` key), SHORTCUTS constant extracted
- DX-2: Command palette with feature search, recent actions, context-aware actions
- DX-3: Extended thinking display (ThinkingBlock with collapsible markdown)
- DX-4: Shortcuts customization settings tab

### pagination-polish-agent (4 tasks)
- PAG-1: Reusable `PaginationControls` component with page size selector
- PAG-2: Kanban features — server-side paginated with URL search params
- PAG-3: Dashboard sessions — server-side paginated
- PAG-4: Learnings — client-side paginated (3 tabs)

---

## New Findings

### HIGH Priority

| ID | Source | Description |
|----|--------|-------------|
| SW-PIPE-002 | pipeline | Quality gates exist but NOT auto-invoked in pipeline execution |
| SW-PIPE-003 | pipeline | GitCommitService exists but NOT auto-invoked — Phase 5 is agent-only |
| TA-003 | testing | 3 Batch 7 services (quality-gate, git-commit, git-merge) have ZERO tests |
| TA-001 | testing | kanban-board.test.ts uses WRONG `VALID_TRANSITIONS` (missing `failed:["pending"]`) |
| TA-002 | testing | security-ownership.test.ts tests inline strings, not actual middleware |
| GAP-2 | progress | No "create project" wizard — project record must exist for Start Build |
| GAP-3 | progress | Features must have projectId — unclear how seeded features get associated |

### MEDIUM Priority

| ID | Source | Description |
|----|--------|-------------|
| FE-V4-001 | frontend | AgentStore still duplicates React Query data (sessions, messages) |
| FE-V4-002 | frontend | Learnings page uses client-side pagination despite server endpoints existing |
| FE-V4-003 | frontend | `s` shortcut documented but not implemented in handler |
| FE-V4-004 | frontend | Shortcuts customization saves to settings but hook never reads them back |
| BA-001 | backend | Session list N+1 — fetches all, filters in JS |
| BA-004 | backend | AutoModeService singleton shares concurrency pool across users |
| BA-005 | backend | Fire-and-forget `.catch(() => {})` swallows errors silently |
| SW-PIPE-004 | pipeline | Shared concurrency pool across users |
| SW-PIPE-005 | pipeline | Checkpoint polling has no staleness timeout |
| TA-005 | testing | `mock.module("@nomos-ai/db")` leaks between test files |

### LOW Priority

| ID | Source | Description |
|----|--------|-------------|
| BA-007 | backend | ALLOWED_ROOTS duplicated across services |
| BA-009 | backend | Missing CHECK constraint on session status |
| BA-012 | backend | API key middleware silently falls through on non-nms tokens |
| BA-017 | backend | REST adapter leaks error messages in dev |
| FE-V4-006 | frontend | Large monolithic route files (learnings 1093L, kanban 473L) |
| FE-V4-007 | frontend | message-bubble.tsx appears orphaned |
| SW-PIPE-001 | pipeline | PipelineMonitor only shows when status === in_progress |

---

## Test Quality Assessment

| Tier | Tests | % | Description |
|------|-------|---|-------------|
| A: Real behavior | ~240 | 40% | Service tests with proper mocks, state transition verification |
| B: Moderate value | ~150 | 25% | Schema validation, utility testing |
| C: Validation theater | ~215 | 35% | Inline constants, string equality, arithmetic |

**Test health score: 4/10**

Key gaps: Zero frontend component tests, zero E2E tests, zero middleware tests. Three Batch 7 services completely untested. DB integration tests exist but gated behind DATABASE_URL.

**Test count clarification:** Drop from ~855 to 605 is NOT test loss. Stale `packages/api/dist/` contained compiled copies of test files — Bun was running both source and dist, doubling the count. Deleting dist corrected to real count.

---

## Feature Completion

| Status | Count | % |
|--------|-------|---|
| verified | 72 | 51.8% |
| backlog | 66 | 47.5% |
| pending | 1 | 0.7% |

**Note:** ~10 security features (F266, F268, F270, F276, F279-F281) are implemented but still marked `backlog` in DB. True verified count is likely ~82.

---

## Self-Building Path Assessment

The "click Start Build, feature gets implemented" pipeline is architecturally COMPLETE:
1. UI button -> API endpoint -> AutoModeService -> Claude SDK -> checkpoint polling -> DB updates -> UI progress

**Remaining gaps:**
- Project record must exist in DB with valid `path` (no creation wizard)
- Features must have projectId (seeding unclear)
- Quality gates and git ops are agent-dependent (services exist but not auto-invoked)
- `bypassPermissions` env var needed for headless execution

---

## Recommended Next Steps

### Batch 9: "Make It Actually Work" (~20h)
Focus: Close the critical path gaps, prove pipeline end-to-end.

1. Project setup flow + feature-project association
2. Wire quality gates into pipeline (auto-invoke runGateA)
3. End-to-end pipeline test
4. Test Batch 7 services (quality-gate, git-commit, git-merge)
5. Fix stale test data (kanban-board VALID_TRANSITIONS)
6. Update feature status for implemented security features

### Batch 10: "Polish for Production" (~20h)
Focus: Multi-user, test quality, DX fixes.

1. Multi-user session isolation
2. Replace validation theater with real tests
3. Add error logging to fire-and-forget catches
4. Server-side learnings pagination
5. Fix non-functional shortcuts customization
6. Performance optimization

---

*Generated by 5-agent strategic review swarm, 2026-02-10*
