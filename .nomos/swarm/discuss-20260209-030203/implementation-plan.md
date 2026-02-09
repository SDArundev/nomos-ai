# NOMOS Strategic Direction Shift — 9-Week Implementation Plan

## Context

A 3-agent swarm discussion (Advocate 8/10, Critic 4/10, Pragmatist synthesis 9/10, HIGH confidence) established the strategic direction: **CLI-first identity, web app as monitoring dashboard + intent input surface.** The codebase already IS CLI-first (35,700L skill system vs 16,400L web app). The app pipeline (124L) is 3% of the real skill pipeline (1,190L+). This plan aligns stated identity with demonstrated reality.

**Key convergence insight:** Keep `AutoModeService`'s orchestration body (circuit breaker, dependency resolution, abort, retry). Change what it orchestrates: invoke CLI skill pipeline instead of `PipelineService.executeFeature()`. `PipelineService` becomes a checkpoint reader + event emitter.

**Discussion output:** `.nomos/swarm/discuss-20260209-030203/` (report.md, findings.json, actions.json)

---

## Week 1: Foundation (6 items, all parallel, XS-S each)

### 1A. Fix FS Path Traversal — XS
- **Modify:** `packages/api/src/routers/fs.ts` (line 9)
- `getFSService()` defaults to `process.cwd()` — change to `env.ALLOWED_ROOT_DIRECTORY`
- `ALLOWED_ROOT_DIRECTORY` already exists in `packages/env/src/server.ts` (line 29), just unused
- **Verify:** Unit test that rejects paths outside allowed root

### 1B. Fix Rate Limiter IP Spoofing — S
- **Modify:** `apps/server/src/index.ts` (lines 38-40)
- Add `TRUST_PROXY` boolean to env schema (default false)
- When false: ignore `x-forwarded-for`. When true: take LAST IP (rightmost), not first
- **Verify:** Test that `x-forwarded-for` header has no effect when `TRUST_PROXY=false`

### 1C. Fix bypassPermissions Default — XS
- **Modify:** `packages/api/src/services/agent-service.ts` (line 163)
- Change `"bypassPermissions"` default to `"default"`
- AutoModeService can still explicitly set `"bypassPermissions"` when spawning
- **Verify:** Update test at `agent-service.test.ts:368` to expect `"default"`

### 1D. Validate projectRoot — XS
- **Modify:** `packages/api/src/services/auto-mode-service.ts` (top of `start()`)
- Validate `projectRoot` against `ALLOWED_ROOT_DIRECTORY` using `relative()` check
- Add `z.string().refine()` for absolute path in auto-mode router input schema
- **Verify:** Test that `../../../etc/passwd` as projectRoot is rejected

### 1E. Promote AutoModeDashboard to Homepage — S
- **Modify:** `apps/web/src/routes/dashboard.tsx` — import and render `AutoModeDashboard` below stat cards
- **Modify:** `apps/web/src/routes/settings.tsx` — remove Dashboard tab entry
- AutoModeDashboard (212L) + EventFeed (111L) + FeatureQueue (122L) already exist
- **Verify:** Navigate to `/dashboard`, see auto-mode controls. `/settings` has no Dashboard tab.

### 1F. Scope Labeling — XS
- **Modify:** `packages/types/src/feature.ts` — add `scope: z.enum(["v1","v2","future"]).optional()`
- **Modify:** `packages/db` schema — add `scope` column
- **Modify:** `packages/api/src/routers/feature.ts` — allow filtering by scope
- Tag ~30 features as v1-target, rest as v2. Zero code deletion.
- **Verify:** Query `?scope=v1` returns only tagged features

---

## Weeks 2-3: Pipeline Convergence (6 items, sequential core)

### 2A. Checkpoint Types — S
- **Create:** `packages/types/src/checkpoint.ts` (~60L)
- Zod schemas matching `.claude/skills/nomos/references/checkpoint-schema.md`
- Types: `CheckpointEnvelope`, `CheckpointStatus`, phase-specific data schemas
- Export from `packages/types/src/index.ts`

### 2B. Event Types Expansion — XS
- **Modify:** `packages/types/src/event.ts`
- Add: `checkpoint:detected`, `checkpoint:parsed`, `pipeline:cli-started`, `pipeline:cli-completed`, `pipeline:cli-error`, `pipeline:cli-output`

### 2C. Checkpoint Reader Service — M (depends on 2A, 2B)
- **Create:** `packages/api/src/services/checkpoint-reader.ts` (~150L)
- Polls `.nomos/output/{featureId}/cp-*.json` (use polling, NOT fs.watch — unreliable on macOS)
- Methods: `watchFeature()`, `unwatchFeature()`, `getLatestCheckpoint()`, `getCheckpoint(phase)`, `getAllCheckpoints()`
- Maps CLI phases (1-6) to app steps (context/plan/execute/verify/merge/finish)
- Emits events via EventService on new checkpoint detection

### 2D. CLI Pipeline Spawner — M (depends on 2C, **MOST CRITICAL**)
- **Modify:** `packages/api/src/services/auto-mode-service.ts`
- Add `CheckpointReaderService` dependency to constructor
- In `executeFeature()` (lines 132-269): replace `pipelineService.executeFeature()` call with `spawnCLIPipeline()`
- New `spawnCLIPipeline()` method: `spawn(["claude", "-p", prompt])` with stdout streaming, abort signal, exit code handling
- Add `NOMOS_USE_CLI_PIPELINE` env toggle for rollback (default: true, set false for legacy path)
- Start checkpoint watcher before spawn, stop in finally block
- **Modify:** `packages/api/src/routers/auto-mode.ts` — pass `CheckpointReaderService` to factory

### 2E. PipelineService Rewrite — S (depends on 2C)
- **Modify:** `packages/api/src/services/pipeline-service.ts`
- Deprecate `executeFeature()` with `@deprecated` JSDoc (keep for rollback)
- Add `getProgressFromCheckpoints()` — reads checkpoint files, maps phases to step status
- **Modify:** `packages/api/src/routers/pipeline.ts` — try checkpoint-based progress first, fall back to DB

### 2F. Session Consolidation — S (parallel with 2A-2E)
- **Modify:** `packages/api/src/routers/session.ts` — `create` delegates to `createAgentSession()` when `featureId` provided
- **Modify:** `packages/api/src/services/auto-mode-service.ts` (lines 151-159) — use `createAgentSession()` instead of direct `sessionRepository.create()`
- Three paths to two: feature-bound via `createAgentSession()`, interactive via `AgentService.createSession()`

---

## Weeks 4-6: Intent-First UX (8 items)

### 4A. Expansion Agent Definition — S
- **Create:** `.claude/agents/expansion-agent.md` (~50L)
- Claude agent prompt: natural language → structured features (title, description, ACs, category, size, dependencies)

### 4B. Intent Expansion API — M (depends on 4A)
- **Create:** `packages/api/src/routers/intent.ts` (~120L)
- `intent.expand`: takes intent string, calls Claude with expansion agent, returns preview
- `intent.confirm`: takes edited features, creates in DB

### 4C. Intent Box Component — S (depends on 4B)
- **Create:** `apps/web/src/components/intent/intent-box.tsx` (~100L)
- Textarea + "Generate Features" button + loading state

### 4D. Decomposition Preview — M (depends on 4C)
- **Create:** `apps/web/src/components/intent/decomposition-preview.tsx` (~250L)
- Editable feature cards from AI expansion, confirm/cancel

### 4E. Checkpoint Progress Component — M (depends on 2C, 2B)
- **Create:** `apps/web/src/components/pipeline/checkpoint-progress.tsx` (~150L)
- Real-time phase progress per feature with expand/collapse

### 4F. NOMOS Score Display — XS
- **Create:** `apps/web/src/components/metrics/nomos-score.tsx` (~50L)

### 4G. Dashboard Integration — S (depends on 4C, 4D, 4E, 4F, 1E)
- **Modify:** `apps/web/src/routes/dashboard.tsx`
- Layout: IntentBox (top) → Stats + NomosScore → AutoModeDashboard with CheckpointProgress

### 4H. WebSocket & Store Updates — S (depends on 2B)
- **Modify:** hooks, stores, event feed for new checkpoint event types

---

## Weeks 7-9: Ecosystem APIs + QA Hardening (7 items)

### 7A. REST Adapter Expansion — M
- **Modify:** `packages/api/src/rest-adapter.ts` — add projects (5), sessions (3), learnings (3), checkpoints (3) endpoints

### 7B. API Key Auth Middleware — M
- **Create:** `packages/api/src/middleware/api-key-auth.ts` (~100L) + DB migration

### 7C. Checkpoint Query Router — S (depends on 2C)
- **Create:** `packages/api/src/routers/checkpoint.ts` (~80L)

### 7D. Increase Fix Cycles — XS
- **Modify:** `.claude/skills/nomos/steps/phase-04-review.md` — 2 → 5

### 7E-7G. Tests — M each
- AutoModeService tests (~200L), Checkpoint Reader tests (~150L), Integration test (~200L)

---

## What NOT to Do

1. DO NOT delete Kanban board — freeze, keep as-is
2. DO NOT build multi-provider — Claude-native for v1
3. DO NOT build Tauri desktop — no code exists
4. DO NOT build ServiceRegistry before pipeline convergence
5. DO NOT build webhooks/n8n — deferred post-v1
6. DO NOT delete PipelineService.executeFeature() — deprecate, keep for rollback
7. DO NOT remove terminal/agent/activity routes — keep as read-only

---

## Rollback Plans

| Risk | Rollback | Effort |
|------|----------|--------|
| Intent-first doesn't work | Remove IntentBox from dashboard, restore spec/import nav | XS |
| CLI spawning issues | Set `NOMOS_USE_CLI_PIPELINE=false` env var | Zero |
| Checkpoint reading unreliable | Fall back to DB-based `pipelineService.getProgress()` | XS |

---

## Summary

| Phase | Weeks | Items | New Files | Modified Files | Lines Est |
|-------|-------|-------|-----------|----------------|-----------|
| Foundation | 1 | 6 | 0 | 8 | ~92 |
| Pipeline Convergence | 2-3 | 6 | 2 | 6 | ~450 |
| Intent-First UX | 4-6 | 8 | 6 | 4 | ~780 |
| Ecosystem + QA | 7-9 | 7 | 5 | 3 | ~975 |
| **Total** | **9** | **27** | **13** | **21** | **~2,297** |
