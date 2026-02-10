# Batch 7 — Quality Gates + Git Operations + Test Quality

## Context

Batch 6 resolved 4 critical blockers and 11 P1-P2 security vulnerabilities. The system is now functionally operational and secure. Batch 7 makes the autonomous pipeline **end-to-end operational** by adding the missing quality gate services, git commit/merge operations, and replacing validation theater tests with real ones.

**Branch:** Create `batch-7/quality-gates-git` from `main` (after Batch 6 is merged)
**Baseline:** Post-Batch 6 (tests TBD, 0 type errors expected)
**Review:** `.nomos/docs/strategic-review-v3-2026-02-09.md` (Tier 4: Testing Debt)

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-7/quality-gates-git
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## What Already Exists

### Quality Gates
- Phase 4 (REVIEW) skill docs fully specify Gate A/B/C pipeline
- Gate A runs `bun run check-types`, `bun run check`, `bun run test:ci` via bash in skill
- CI pipeline: lint + typecheck + test + build + docker (parallel jobs)
- `quality-gates.md` reference doc with gate definitions
- **NO API-level quality gate service** — no structured result capture

### Git Operations
- `WorktreeService` (create, remove, find, listActive) — **F041/F042 DONE**
- `git-utils.ts` (execGit, getCurrentBranch, branchExists, createBranch, worktreeAdd/Remove/List)
- `worktree` router with ownership checks
- `worktree` DB schema (id, featureId, branchName, path, PR fields)
- `GitHubService` (listIssues, listPRs, createPR)
- Phase 5 (SHIP) docs fully specify commit/push/PR/merge flow — but as **bash commands**, not API services
- **MISSING:** GitCommitService, GitMergeService, GitDiffService, diff viewer component

### Test Quality
- 1030 tests, ~45 test files across packages/apps
- No vitest — uses `bun test` natively
- **Zero coverage configuration** (no c8, istanbul, @vitest/coverage)
- **Zero real DB integration tests** despite Postgres in CI
- ~30-40% tests are "validation theater" (test data shapes, not behavior)
- `packages/auth`, `packages/env`, `packages/config` have zero test files

---

## Team: `batch-7-quality` (3 agents, bypassPermissions mode)

### Agent 1: `quality-gates-agent` (code-writer)

**Owns:** Quality gate services (F047-F049), quality gate router, pipeline integration

#### QG-1 — QualityGateService: TypeScript Check [F047, 3h]
- **New file:** `packages/api/src/services/quality-gate-service.ts`
- **Implement:** A `QualityGateService` class with methods for each gate
- **`runTypeCheck(worktreePath: string)`:**
  1. Spawn `bun run check-types` in the worktree directory using `execFile`
  2. Parse tsc output: extract error count, file locations, error messages
  3. Return structured result:
     ```typescript
     interface QualityGateResult {
       gate: "typecheck" | "lint" | "test";
       status: "PASS" | "FAIL";
       duration: number; // ms
       summary: string;
       errors: Array<{
         file: string;
         line: number;
         column: number;
         message: string;
         code?: string;
       }>;
     }
     ```
- **Use `execFile` not `exec`** — follow the safe pattern in `packages/api/src/lib/git-utils.ts`
- **Timeout:** 120s default, configurable

#### QG-2 — QualityGateService: Lint Check [F048, 2h]
- **Same file:** `packages/api/src/services/quality-gate-service.ts`
- **`runLintCheck(worktreePath: string)`:**
  1. Spawn `bunx biome check .` in the worktree
  2. Parse biome output: extract error/warning counts, file locations
  3. Return `QualityGateResult` with `gate: "lint"`
- **Biome JSON reporter:** Use `biome check --reporter=json` for structured parsing

#### QG-3 — QualityGateService: Test Runner [F049, 4h]
- **Same file:** `packages/api/src/services/quality-gate-service.ts`
- **`runTests(worktreePath: string)`:**
  1. Spawn `bun test` in the worktree
  2. Parse test output: extract pass/fail counts, test names, stack traces
  3. Return extended result:
     ```typescript
     interface TestGateResult extends QualityGateResult {
       testsPassed: number;
       testsFailed: number;
       testsSkipped: number;
       failures: Array<{
         testName: string;
         file: string;
         stackTrace: string;
       }>;
     }
     ```
- **Challenge:** bun test output isn't JSON by default. Parse the text output with regex, or use `--reporter` flag if available.

#### QG-4 — Quality Gate Router [2h]
- **New file:** (or extend existing router)
- **Endpoints:**
  - `qualityGate.runAll(featureId)` — run all 3 gates, return aggregate
  - `qualityGate.runTypeCheck(featureId)` — run only typecheck
  - `qualityGate.runLint(featureId)` — run only lint
  - `qualityGate.runTests(featureId)` — run only tests
- **Pattern:** Look up feature → worktree → worktree.path → run gate in that path
- **Ownership:** Verify user owns the feature before running gates
- **Add router to `packages/api/src/routers/index.ts`**

#### QG-5 — Pipeline Integration [2h]
- **File:** `packages/api/src/services/pipeline-service.ts`
- **Add:** `runGateA(featureId, projectRoot)` method that:
  1. Looks up the worktree path for the feature
  2. Calls `QualityGateService.runAll(worktreePath)`
  3. Returns the aggregate gate result
  4. Stores result in checkpoint data
- **This enables:** Phase 4 Gate A to call the pipeline service API instead of raw bash commands

---

### Agent 2: `git-operations-agent` (code-writer)

**Owns:** Git commit/merge/diff services, diff viewer component

#### GIT-1 — Extend git-utils.ts [1h]
- **File:** `packages/api/src/lib/git-utils.ts`
- **Add functions:**
  ```typescript
  // Commit
  async function gitAdd(files: string[], cwd: string): Promise<void>
  async function gitAddAll(cwd: string): Promise<void>
  async function gitCommit(message: string, cwd: string): Promise<string> // returns commit hash
  async function gitStatus(cwd: string): Promise<GitStatus>

  // Merge
  async function gitMerge(branch: string, cwd: string, noFf?: boolean): Promise<string>
  async function gitRebase(onto: string, cwd: string): Promise<void>
  async function gitFetch(remote: string, cwd: string): Promise<void>
  async function gitCheckout(branch: string, cwd: string): Promise<void>
  async function gitPush(remote: string, branch: string, cwd: string, force?: boolean): Promise<void>

  // Diff
  async function gitDiff(ref1: string, ref2: string, cwd: string): Promise<string>
  async function gitDiffStat(ref1: string, ref2: string, cwd: string): Promise<DiffStat>
  async function gitLog(count: number, cwd: string): Promise<GitLogEntry[]>
  ```
- **All use `execFile`** — no shell injection risk
- **Types:**
  ```typescript
  interface GitStatus { staged: string[]; unstaged: string[]; untracked: string[] }
  interface DiffStat { filesChanged: number; insertions: number; deletions: number; files: Array<{path: string; insertions: number; deletions: number}> }
  interface GitLogEntry { hash: string; author: string; date: string; message: string }
  ```

#### GIT-2 — GitCommitService [F043, 3h]
- **New file:** `packages/api/src/services/git-commit-service.ts`
- **Methods:**
  ```typescript
  class GitCommitService {
    async commitFeature(featureId: string, projectRoot: string): Promise<CommitResult>
    async getStatus(worktreePath: string): Promise<GitStatus>
  }
  ```
- `commitFeature`:
  1. Look up worktree path for feature
  2. `gitAddAll(worktreePath)` — stage all changes
  3. Reset `.nomos/features.json` and `.nomos/learning/` from staging (match Phase 5 pattern)
  4. `gitCommit("feat({featureId}): {title}", worktreePath)` — commit
  5. Emit `git:commit` event
  6. Return `{ hash, filesChanged, message }`

#### GIT-3 — GitMergeService [F044, 3h]
- **New file:** `packages/api/src/services/git-merge-service.ts`
- **Methods:**
  ```typescript
  class GitMergeService {
    async pushBranch(featureId: string, projectRoot: string): Promise<PushResult>
    async rebaseOnMain(worktreePath: string): Promise<RebaseResult>
    async mergeToMain(featureId: string, projectRoot: string): Promise<MergeResult>
    async createPR(featureId: string, projectRoot: string): Promise<PRResult>
  }
  ```
- `mergeToMain`:
  1. Fetch origin/main
  2. Rebase worktree on origin/main
  3. Run post-rebase validation (check-types + lint + test)
  4. Checkout main in project root
  5. Merge --no-ff the feature branch
  6. Push origin main
  7. Update feature state to `verified`
  8. Emit `git:merge` event
- **Follows Phase 5 documented flow exactly** — converts bash commands to service methods

#### GIT-4 — GitDiffService [2h]
- **New file:** `packages/api/src/services/git-diff-service.ts`
- **Methods:**
  ```typescript
  class GitDiffService {
    async getDiff(featureId: string, projectRoot: string): Promise<DiffResult>
    async getDiffStat(featureId: string, projectRoot: string): Promise<DiffStat>
  }
  ```
- Gets diff between feature branch and main

#### GIT-5 — Git Router Extensions [2h]
- **File:** Create `packages/api/src/routers/git.ts` (or extend worktree router)
- **Endpoints:**
  - `git.status(featureId)` — get git status for feature worktree
  - `git.commit(featureId)` — commit feature changes
  - `git.push(featureId)` — push feature branch
  - `git.diff(featureId)` — get diff for feature
  - `git.merge(featureId)` — merge feature to main (protected, admin-like)
- **All endpoints verify feature ownership** via userId
- **Add router to `packages/api/src/routers/index.ts`**

#### GIT-6 — Diff Viewer Component [F045, 3h]
- **New file:** `apps/web/src/components/git/diff-viewer.tsx`
- **Dependencies:** `react-diff-viewer-continued` (already in bun.lock)
- **Component:**
  ```tsx
  <DiffViewer featureId={string} />
  ```
  1. Calls `git.diff(featureId)` to get diff data
  2. Renders using `react-diff-viewer-continued` library
  3. Split view by default, toggle to unified
  4. Shows diff stats header (files changed, insertions, deletions)
- **Wire into:** Feature detail page (`apps/web/src/routes/features.$featureId.tsx`) — show when feature has a worktree

---

### Agent 3: `test-quality-agent` (code-writer)

**Owns:** Coverage config, replacing validation theater, real DB integration tests

#### TEST-1 — Add Coverage Configuration [2h]
- **File:** Root `package.json` — update test script
- **Bun coverage:** Use `bun test --coverage` flag (built-in since bun 1.0)
- **Add `test:coverage` script** to root package.json:
  ```json
  "test:coverage": "bun test --coverage --coverage-reporter=lcov --coverage-dir=coverage"
  ```
- **Add `.gitignore` entry** for `coverage/` directory
- **Configure coverage thresholds** (start at current baseline, will raise later):
  - Lines: 50% (start low, raise over time)
  - Functions: 50%
  - Branches: 40%

#### TEST-2 — Add Coverage to CI [1h]
- **File:** `.github/workflows/ci.yml`
- **Modify test step:** Change `bun run test` to `bun run test:coverage`
- **Add coverage upload:** Upload lcov report as artifact
- **Add coverage badge** (optional — can use codecov or similar)

#### TEST-3 — Identify and Replace Validation Theater Tests [6h]
- **Audit criteria for "validation theater":**
  1. Tests that only check Zod schema parsing (`.parse()` / `.safeParse()`) with no business logic
  2. Tests that mock every dependency and test nothing real
  3. Tests that verify data shapes that TypeScript already guarantees
  4. Tests that check trivial getter/setter behavior
- **Target files (audit each):**
  - `packages/types/src/__tests__/*.test.ts` (5 files) — likely pure schema validation
  - `packages/db/src/__tests__/*.test.ts` (6 files) — check if they mock DB or use real DB
  - `packages/api/src/routers/__tests__/*.test.ts` (4 files) — check if they mock everything
- **For each theater test:**
  1. Check what it actually tests
  2. If pure schema validation with no logic → DELETE or REPLACE with meaningful test
  3. If testing real business logic → KEEP
- **Replace with:** Tests that exercise actual service methods, DB queries, or API endpoint behavior
- **Goal:** No decrease in meaningful coverage, but remove noise that inflates count

#### TEST-4 — Real DB Integration Tests [6h]
- **New file:** `packages/db/src/__tests__/integration/` directory
- **Tests using real Postgres** (connect to test DB like CI does):
  ```typescript
  // Test setup: create test database, run migrations, seed
  // Test teardown: drop tables or truncate

  describe("Feature Repository (integration)", () => {
    it("creates and retrieves a feature with all fields", async () => { ... })
    it("findPaginated returns correct page with total count", async () => { ... })
    it("createWithId is atomic (no duplicate IDs)", async () => { ... })
    it("cascades on project delete", async () => { ... })
  })

  describe("Session Repository (integration)", () => {
    it("findActive returns only non-ended sessions", async () => { ... })
    it("orphan detection with staleness check", async () => { ... })
  })

  describe("Learning Repositories (integration)", () => {
    it("pattern upsert is idempotent", async () => { ... })
    it("findRelevant filters by category and confidence", async () => { ... })
    it("curate promotes high-confidence patterns", async () => { ... })
  })
  ```
- **Test DB setup:**
  - Use `DATABASE_URL` env var (same as CI)
  - Run migrations before tests
  - Truncate tables between tests (not between individual tests — too slow)
  - Use test transactions that roll back (preferred for speed)
- **New file:** `packages/db/src/__tests__/integration/setup.ts` — test DB helpers

#### TEST-5 — API Integration Tests [4h]
- **New file:** `packages/api/src/__tests__/integration/` directory
- **Tests that call actual API routes** (not mocked):
  ```typescript
  describe("Feature Router (integration)", () => {
    it("rejects unauthenticated requests", async () => { ... })
    it("rejects access to another user's features (IDOR)", async () => { ... })
    it("creates feature with valid input", async () => { ... })
    it("paginates features correctly", async () => { ... })
  })

  describe("Quality Gate Router (integration)", () => {
    it("runs typecheck in worktree", async () => { ... })
    it("returns structured errors on failure", async () => { ... })
  })
  ```
- **Test harness:** Create a test Hono app with the actual router mounted, use supertest-like approach with bun fetch

---

## Execution Timeline

```
TIME    quality-gates-agent      git-operations-agent      test-quality-agent
----    -------------------      --------------------      ------------------
 0h     QG-1 (TypeScript gate)   GIT-1 (git-utils extend)  TEST-1 (coverage config)
 2h     QG-2 (Lint gate)         GIT-2 (commit service)    TEST-2 (CI coverage)
 3h     QG-3 (Test gate)         GIT-3 (merge service)     TEST-3 (audit theater tests)
 5h     QG-4 (Router)            GIT-4 (diff service)      TEST-3 (continued)
 6h     QG-5 (Pipeline integ.)   GIT-5 (Git router)        TEST-4 (DB integration tests)
 7h                              GIT-6 (Diff viewer)       TEST-4 (continued)
 8h     [DONE]                   [DONE]                    TEST-5 (API integration tests)
 9h                                                        [DONE]
```

**File conflict avoidance:**
- quality-gates-agent: owns `packages/api/src/services/quality-gate-service.ts` (new), quality gate router (new), `packages/api/src/services/pipeline-service.ts` (add runGateA method only)
- git-operations-agent: owns `packages/api/src/lib/git-utils.ts`, `packages/api/src/services/git-commit-service.ts` (new), `packages/api/src/services/git-merge-service.ts` (new), `packages/api/src/services/git-diff-service.ts` (new), `packages/api/src/routers/git.ts` (new), `apps/web/src/components/git/diff-viewer.tsx` (new), `apps/web/src/routes/features.$featureId.tsx` (diff viewer wire-in only)
- test-quality-agent: owns `packages/db/src/__tests__/integration/` (new), `packages/api/src/__tests__/integration/` (new), existing test files (audit/replace), `package.json` (test scripts), `.github/workflows/ci.yml` (coverage step), `packages/types/src/__tests__/` (audit)

**Potential conflict on `packages/api/src/routers/index.ts`:** Both quality-gates-agent (QG-4) and git-operations-agent (GIT-5) add new routers. **Resolution:** quality-gates-agent adds its router first. git-operations-agent adds second, reading the file fresh before editing.

---

## Verification

```bash
bun test
bun run check-types
bun run test:coverage  # new — should produce lcov output

# Manual checks:
# 1. QualityGateService runs typecheck in a worktree and returns structured errors
# 2. QualityGateService runs biome check and returns structured lint results
# 3. QualityGateService runs bun test and returns pass/fail with traces
# 4. Quality gate router endpoints work with feature ownership
# 5. git-utils new functions work (status, commit, merge, diff)
# 6. GitCommitService commits feature changes in worktree
# 7. GitMergeService merges feature branch to main
# 8. Diff viewer component renders on feature detail page
# 9. Coverage report generates lcov output
# 10. Validation theater tests replaced with meaningful tests
# 11. DB integration tests pass against real Postgres
# 12. API integration tests verify IDOR protection
```

## Commit

```
feat: Batch 7 — Quality gates + git operations + test quality

- Add QualityGateService (typecheck, lint, test runner) with structured results
- Add quality gate router with feature ownership checks
- Integrate quality gates into pipeline service (Gate A)
- Extend git-utils with commit, merge, diff, status functions
- Add GitCommitService, GitMergeService, GitDiffService
- Add git router with commit/push/diff/merge endpoints
- Add diff viewer component using react-diff-viewer-continued
- Add coverage configuration (bun test --coverage)
- Add coverage reporting to CI pipeline
- Replace validation theater tests with meaningful tests
- Add real DB integration tests (feature, session, learning repos)
- Add API integration tests (IDOR verification, pagination)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Post-Batch 7: What Comes Next

### Batch 8: Auth + DX Polish (~30h)
- Login page + route protection (F061-F063)
- Keyboard shortcuts + command palette (F101-F102)
- Settings persistence (F069-F070)
- Wire frontend pagination to backend endpoints
- Extended thinking display (F038)
- Fix Zustand store duplication (FE-005)
- Fix state machine bypasses (SW-002)

### Batch 9: Pipeline End-to-End (~20h)
- Wire QualityGateService into Phase 4 Gate A (replace bash commands)
- Wire GitCommitService/GitMergeService into Phase 5 SHIP
- End-to-end test: implement a simple feature through full pipeline
- Fix MockProvider to produce checkpoint files for testing
