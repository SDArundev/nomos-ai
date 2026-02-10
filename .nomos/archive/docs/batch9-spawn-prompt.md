# Batch 9 — Make It Actually Work (Pipeline E2E + Test Foundation)

## Context

Batch 8 completed auth, DX polish, state machine centralization, and Zustand cleanup. Strategic Review v4 (score 6.5/10) identified that the pipeline machinery is architecturally complete but untested end-to-end. Key gaps: project setup flow, quality gates not auto-invoked, zero tests for Batch 7 services, and ~35% validation theater in tests.

**Branch:** Create `batch-9/pipeline-e2e` from `main` (after Batch 8 is merged)
**Baseline:** Post-Batch 8 (605 tests, 0 failures, 0 type errors)
**Review:** `.nomos/docs/strategic-review-v4-2026-02-10.md`

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-9/pipeline-e2e
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## What Already Exists

### Pipeline Engine — Complete
- `AutoModeService.startFeature()` -> `executeFeature()` -> Claude SDK `query()` -> checkpoint polling -> DB
- State machine: `transitionFeatureStatus()` used by all services
- Retry with exponential backoff (30s/60s/120s), circuit breaker (3 consecutive failures)
- Start Build button wired on feature detail page
- PipelineMonitor component wired (shows during `in_progress`)

### Quality Gates — Implemented But NOT Auto-Invoked
- `QualityGateService`: typecheck, lint (biome), test runner via `execFile`
- `PipelineService.runGateA()` wraps QualityGateService — defined but never called from pipeline
- Quality gate router: `runTypeCheck`, `runLint`, `runTests`, `runAll` endpoints
- **Gap:** `executeFeature()` in AutoModeService never calls quality gates

### Git Operations — Implemented But NOT Auto-Invoked
- `GitCommitService`: commitFeature, amendCommit, createBranch
- `GitDiffService`: getFeatureDiff, getDiffStat
- `GitMergeService`: mergeFeature, checkMergeConflicts
- Git router: status, commit, push, diff, merge endpoints
- **Gap:** Phase 5 (Ship) relies entirely on Claude agent

### Project Setup — Incomplete
- Project schema exists: `packages/db/src/schema/projects.ts`
- Project repository: findById, findByUser, create, update, delete
- Project router: create, list, get, update endpoints
- UI: ProjectSelector component, projects.index route, projects.$projectId route
- **Gap:** No "new project" wizard that sets `path` properly. Features seeded from features.json may lack projectId.

### Tests — Mixed Quality
- 605 tests, ~240 meaningful (40%), ~215 theater (35%)
- 3 DB integration tests (gated behind DATABASE_URL)
- Zero tests for: quality-gate-service, git-commit-service, git-merge-service, claude-provider
- kanban-board.test.ts has wrong VALID_TRANSITIONS (missing `failed:["pending"]`)
- security-ownership.test.ts tests inline strings, not actual middleware

---

## Team: `batch-9-pipeline-e2e` (3 agents, bypassPermissions mode)

### Agent 1: `pipeline-wiring-agent` (code-writer)

**Owns:** Quality gate integration, git ops integration, project setup, feature-project sync

#### PIPE-1 — Wire Quality Gates Into Pipeline [3h]
- **File:** `packages/api/src/services/auto-mode-service.ts`
- After `executeFeature()` gets SDK completion (line ~254), BEFORE transitioning to `waiting_approval`:
  1. Run `pipelineService.runGateA(projectRoot)`
  2. If gate fails: transition to `failed` with gate errors, emit `feature:gate-failed` event
  3. If gate passes: proceed to `waiting_approval` as before
- **File:** `packages/api/src/services/pipeline-service.ts`
  - Ensure `runGateA()` accepts projectRoot parameter (it should already from Batch 7)
  - Return structured result: `{ pass: boolean, typecheck: Result, lint: Result, tests: Result }`
- **Key:** This makes quality gates server-enforced rather than agent-dependent

#### PIPE-2 — Wire Git Operations Into Pipeline [3h]
- **File:** `packages/api/src/services/auto-mode-service.ts`
- After quality gates pass (from PIPE-1), before transitioning to `waiting_approval`:
  1. Check if feature has `branchName` set (from checkpoint Phase 5 data)
  2. If yes: call `gitCommitService.commitFeature(featureId, projectRoot)` to ensure clean commit
  3. Emit `feature:committed` event
- **Alternative:** If the agent already committed (which it should from SKILL.md Phase 5), just verify git status is clean. Don't double-commit.
- **File:** `packages/api/src/services/git-commit-service.ts`
  - Add `verifyCleanState(projectRoot)` method — runs `git status --porcelain` and returns `{ clean: boolean, uncommittedFiles: string[] }`
- **Key:** This is a safety net, not a replacement for agent git ops

#### PIPE-3 — Project Setup Flow [3h]
- **File:** `apps/web/src/routes/projects.index.tsx`
  1. Add "New Project" button that opens a dialog/form
  2. Form fields: name (required), path (required — file picker or manual input), description (optional)
  3. On submit: call `orpc.projects.create.mutate({ name, path, description })`
  4. Validate path exists on server side (add to project router if not present)
- **File:** `packages/api/src/routers/project.ts`
  1. Ensure `create` handler validates that `path` is under ALLOWED_ROOTS
  2. Ensure `path` is a real directory (existsSync check)
- **Key:** Without a project record with valid `path`, Start Build fails

#### PIPE-4 — Feature-Project Association [2h]
- **File:** `packages/api/src/routers/feature.ts`
  1. Add `associateProject` endpoint: takes `featureId` + `projectId`, sets `feature.projectId`
  2. Add bulk variant: `bulkAssociateProject` for multiple features
- **File:** `apps/web/src/routes/projects.$projectId.tsx`
  1. Add "Import Features" action — shows unassociated features, lets user select and associate
  2. Or: automatically associate features when importing from features.json
- **File:** `packages/api/src/services/learning-ingestion.ts` (or equivalent)
  1. On startup, if features exist without projectId and only one project exists, auto-associate
- **Key:** Features need projectId for the auto-mode router to resolve projectRoot

---

### Agent 2: `test-foundation-agent` (code-writer)

**Owns:** Batch 7 service tests, fix stale test data, test infrastructure improvements

#### TEST-1 — Test QualityGateService [3h]
- **New file:** `packages/api/src/services/__tests__/quality-gate-service.test.ts`
- Mock `execFile` via `mock.module("node:child_process")`
- Test cases:
  1. `runTypeCheck()`: success path (exit 0, no errors) → returns pass
  2. `runTypeCheck()`: failure path (exit 1, TS errors) → returns fail with parsed errors
  3. `runLint()`: success path → returns pass
  4. `runLint()`: failure path with Biome JSON output → returns fail with diagnostics
  5. `runTests()`: success path → returns pass with test count
  6. `runTests()`: failure path → returns fail with failing test names
  7. `runAll()`: aggregates all three results
  8. Timeout handling: command exceeds timeout → returns fail
  9. ProjectRoot validation: rejects paths outside ALLOWED_ROOTS

#### TEST-2 — Test GitCommitService [3h]
- **New file:** `packages/api/src/services/__tests__/git-commit-service.test.ts`
- Mock `execFile` for git commands
- Test cases:
  1. `commitFeature()`: stages files, creates commit with feature ID in message
  2. `commitFeature()`: handles no changes (nothing to commit)
  3. `createBranch()`: creates and checks out branch
  4. `createBranch()`: rejects invalid branch names
  5. Error handling: git command fails → throws with meaningful message

#### TEST-3 — Test GitMergeService [2h]
- **New file:** `packages/api/src/services/__tests__/git-merge-service.test.ts`
- Mock `execFile`
- Test cases:
  1. `mergeFeature()`: fast-forward merge succeeds
  2. `mergeFeature()`: merge with conflicts → returns conflict info
  3. `checkMergeConflicts()`: detects conflicts before merge
  4. Error handling: merge fails → throws

#### TEST-4 — Fix Stale Test Data [2h]
- **File:** `apps/web/src/components/kanban/__tests__/kanban-board.test.ts`
  1. Replace local VALID_TRANSITIONS with import from `@nomos-ai/types`
  2. Or: delete the test file entirely if it's pure validation theater
- **File:** `packages/api/src/routers/__tests__/security-ownership.test.ts`
  1. Assess: can this be converted to test actual middleware?
  2. If theater: mark with `// TODO: Convert to real middleware test` or delete
- **Grep for:** Other test files with stale VALID_TRANSITIONS or inline constants that diverge from source

#### TEST-5 — Shared Mock Helper [2h]
- **New file:** `packages/api/src/services/__tests__/helpers/mock-db.ts`
  ```typescript
  export function createMockFeatureRepository() {
    return {
      findById: mock(() => Promise.resolve(null)),
      findByProject: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({})),
      incrementRetryCount: mock(() => Promise.resolve()),
      getRetryInfo: mock(() => Promise.resolve({ retryCount: 0 })),
    };
  }
  ```
- Consolidate the 4+ different `mock.module("@nomos-ai/db")` patterns into one shared helper
- Update existing test files to use the shared helper

---

### Agent 3: `feature-status-agent` (code-writer)

**Owns:** Feature status reconciliation, feature DB metadata, pipeline monitor improvements

#### STATUS-1 — Reconcile Feature Status [2h]
- **Task:** Update implemented security features from `backlog` to `verified` in DB
- **Create:** `packages/db/src/scripts/reconcile-feature-status.ts`
  ```typescript
  // Features confirmed implemented in Batches 5A-7:
  const IMPLEMENTED_FEATURES = [
    "F266", // userId auth in routers (Batch 6)
    "F268", // bypassPermissions gating (Batch 6)
    "F270", // auto-mode userId context (Batch 6)
    "F276", // SpecService path traversal (Batch 5A)
    "F279", // Learning router ownership (Batch 6)
    "F280", // Auto-mode endpoint ownership (Batch 6)
    "F281", // Notification ownership (Batch 6)
  ];
  // Transition each from backlog → pending → verified via state machine
  ```
- Add to package.json scripts: `"reconcile-status": "bun run packages/db/src/scripts/reconcile-feature-status.ts"`

#### STATUS-2 — Add Error Logging to Fire-and-Forget [2h]
- **Grep for:** `.catch(() => {})` and `.catch(() =>` across `packages/api/src/services/`
- **Replace each with:** `.catch((err) => { logger.warn({ err, context: "..." }, "fire-and-forget failed"); })`
- **Key files:**
  - `auto-mode-service.ts` — session ID update, start handler
  - `pipeline-service.ts` — feature update, state machine transition
- **Import:** `import { logger } from "../../utils/logger";` (or create service-specific child logger)

#### STATUS-3 — Improve PipelineMonitor Visibility [2h]
- **File:** `apps/web/src/routes/features.$featureId.tsx`
- Change from:
  ```tsx
  {feat.status === "in_progress" && <PipelineMonitor .../>}
  ```
- To: Show PipelineMonitor for any feature that has pipeline history:
  ```tsx
  {["in_progress", "waiting_approval", "verified", "failed"].includes(feat.status) && (
    <PipelineMonitor featureId={featureId} status={feat.status} />
  )}
  ```
- **File:** `apps/web/src/components/auto-mode/pipeline-monitor.tsx`
  - Handle non-active statuses: show completed steps as green, don't poll when status is terminal
  - Add "Pipeline completed" or "Pipeline failed" summary when status is terminal

#### STATUS-4 — Session List N+1 Fix [2h]
- **File:** `packages/db/src/repositories/session.ts`
  1. Add `userId` parameter to `findByStatus()`, `findByFeature()`, `findActive()`
  2. Use `WHERE user_id = ?` in SQL instead of post-filtering in JS
- **File:** `packages/api/src/routers/session.ts`
  1. Pass `context.session.user.id` to repository methods
  2. Remove `.filter(s => s.userId === userId)` in-memory filtering

---

## Execution Timeline

```
TIME    pipeline-wiring-agent     test-foundation-agent     feature-status-agent
----    ---------------------     ---------------------     --------------------
 0h     PIPE-1 (Quality gates)    TEST-1 (QualityGate)      STATUS-1 (Reconcile)
 3h     PIPE-2 (Git ops)          TEST-2 (GitCommit)        STATUS-2 (Error logging)
 5h     PIPE-3 (Project setup)    TEST-3 (GitMerge)         STATUS-3 (Monitor visibility)
 7h     PIPE-4 (Feature assoc)    TEST-4 (Fix stale tests)  STATUS-4 (Session N+1)
 9h                               TEST-5 (Shared mocks)
10h     [DONE]                    [DONE]                    [DONE]
```

**File conflict avoidance:**
- pipeline-wiring-agent: owns `auto-mode-service.ts` (gate/git wiring), `pipeline-service.ts` (gate return type), `projects.index.tsx` (new project form), `project.ts` router (path validation), `feature.ts` router (associateProject)
- test-foundation-agent: owns all `__tests__/` files, new test files only
- feature-status-agent: owns `features.$featureId.tsx` (monitor visibility), `pipeline-monitor.tsx` (terminal state), `session.ts` repo + router (N+1 fix), reconcile script

**Potential conflict on `auto-mode-service.ts`:** Only pipeline-wiring-agent modifies it. feature-status-agent handles error logging in OTHER service files (pipeline-service.ts).

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. Quality gates auto-run after SDK completion (check logs)
# 2. Gate failure -> feature marked failed with gate errors
# 3. Gate pass -> feature transitions to waiting_approval
# 4. Git status verified clean after pipeline (no uncommitted files)
# 5. "New Project" button works, creates project with valid path
# 6. Features can be associated with project
# 7. Start Build works end-to-end (if Claude SDK available)
# 8. QualityGateService has 9+ tests passing
# 9. GitCommitService has 5+ tests passing
# 10. GitMergeService has 3+ tests passing
# 11. kanban-board test uses correct VALID_TRANSITIONS
# 12. Security features F266/F268/F270/F276/F279-F281 marked verified
# 13. PipelineMonitor shows completed pipeline history
# 14. Session list queries use user_id WHERE clause (no N+1)
# 15. Fire-and-forget catches now log warnings
```

## Commit

```
feat: Batch 9 — Pipeline E2E wiring + test foundation

- Wire quality gates (runGateA) into pipeline after SDK completion
- Add git status verification as post-pipeline safety net
- Create project setup flow with path validation
- Add feature-project association endpoints
- Test QualityGateService (9 tests), GitCommitService (5), GitMergeService (3)
- Fix stale kanban-board.test.ts VALID_TRANSITIONS
- Create shared mock-db helper for test consistency
- Reconcile 7 security feature statuses (backlog -> verified)
- Add error logging to all fire-and-forget catches
- Improve PipelineMonitor to show completed pipeline history
- Fix session list N+1 query with user_id WHERE clause

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```
