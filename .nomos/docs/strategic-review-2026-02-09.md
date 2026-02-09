# NOMOS Strategic Review — Full Report

**Date:** 2026-02-09
**Branch:** feature/ecosystem-unification (merged to main)
**Team:** 4 specialized agents (SDK Expert, Architecture Analyst, DevOps Analyst, Product Strategist)
**Scope:** Complete project analysis — SDK patterns, architecture/bloat, CI/CD/DB/data, product strategy

---

## Table of Contents

1. [Unified Synthesis](#1-unified-synthesis)
2. [SDK & Agent Analysis](#2-sdk--agent-analysis)
3. [Architecture, Bloat & Portability](#3-architecture-bloat--portability)
4. [DevOps, Database & Data Conformity](#4-devops-database--data-conformity)
5. [Product Strategy & Roadmap](#5-product-strategy--roadmap)
6. [Cross-Cutting Findings](#6-cross-cutting-findings)
7. [Actionable Recommendations](#7-actionable-recommendations)

---

# 1. Unified Synthesis

## Where We Are

### What Works
- 935 tests passing, 0 lint/type errors — codebase is healthy at the surface level
- Clean monorepo structure — no circular dependencies, proper package boundaries
- Working CLI pipeline (v4, 6-phase with JSON checkpoints) — proven on 61 verified features
- Working web dashboard with auth, feature management, pipeline monitoring
- 12 active agents with clear roles, well-structured prompts
- Intent-first expansion (natural language to feature spec) works end-to-end
- 131 files changed in ecosystem unification PR, +15,942/-7,714 lines, 7 commits

### What's Broken or Fragile

| # | Issue | Found By | Severity |
|---|-------|----------|----------|
| 1 | **Dual source of truth** — features.json (285) vs DB features table never sync | All 4 agents | CRITICAL |
| 2 | **CLI subprocess instead of SDK** — AutoModeService spawns `claude` CLI, losing structured output, cost data, session management | SDK Expert | HIGH |
| 3 | **Session orphan risk** — no crash recovery, no TTL, crashed sessions stay RUNNING forever | DevOps | HIGH |
| 4 | **5 deprecated agents still dispatched** — nomos-verify and nomos-refactor reference deprecated v3 agents | SDK + Architecture | HIGH |
| 5 | **CI is broken** — `build:packages` script referenced but doesn't exist | DevOps | HIGH |
| 6 | **607 MB stale worktree** — F040 worktree with full node_modules in `.nomos/` | Architecture | HIGH |
| 7 | **Missing FK constraints** — 5 tables (project, event, notification, worktree, message) lack foreign keys | DevOps | MEDIUM |
| 8 | **Zero integration tests** for the most critical path (CLI subprocess pipeline) | DevOps | MEDIUM |
| 9 | **features.json summary stale** (says 265, actual 285), category naming inconsistent (CAT-FIX vs fix) | All 4 agents | MEDIUM |
| 10 | **V2 Session API unused** — no session resume, no graceful interrupts | SDK Expert | MEDIUM |
| 11 | **Cost extraction fragile** — unsafe type assertion against undocumented SDK internals | SDK Expert | MEDIUM |
| 12 | **Dead code** — `sdk-options.ts` never imported, `ralph-loop` skill unrelated | SDK + Architecture | LOW |

### The Core Tension

The project has two identities that aren't unified:

1. **NOMOS the CLI tool** — reads features.json, writes checkpoints, runs in `.claude/skills/`
2. **NOMOS the web app** — reads/writes SQLite DB, renders dashboard, manages sessions

These operate on completely different data planes. A feature created via the web Intent Box doesn't exist in features.json. A feature updated by the CLI pipeline only partially syncs back to DB. The self-building vision — NOMOS building itself from the dashboard — can't work until these are unified.

## The Critical Path (in order)

**Phase 0: Cleanup (1 day)**
1. Delete the 607 MB stale worktree
2. Fix CI `build:packages` script
3. Fix category naming (10 features: `fix` to `CAT-FIX`)
4. Remove/archive 5 deprecated agents
5. Delete dead code (`sdk-options.ts`, `.DS_Store` files, stale locks)
6. Remove or auto-compute features.json summary block

**Phase 1: Data Unification (2-3 days)**
7. Make DB the single source of truth (all 4 agents agreed)
8. Add `nomos db seed` command to import features.json into DB (one-time migration)
9. Add missing DB columns (`release`, `failureReason`, `restoredAt`)
10. Add FK constraints to orphan-prone tables
11. Add session cleanup on startup (mark stale RUNNING sessions as FAILED)
12. Add userId index to agent_session table

**Phase 2: Pipeline Connection (3-5 days)**
13. Modify pipeline Phase 1 to read features from API when server is running (fallback to features.json for standalone)
14. Wire Intent Box to AutoModeService end-to-end (feature created in web to pipeline starts to results show in dashboard)
15. Add integration tests for the pipeline flow
16. Fix API key auth context shape (handlers shouldn't break with API key auth)

**Phase 3: SDK Modernization (1-2 weeks)**
17. Replace CLI subprocess with SDK `query()` in AutoModeService (significant refactor)
18. Evaluate V2 Session API adoption for crash recovery and session resume
19. Stream structured output to dashboard (not raw stdout)
20. Update nomos-verify and nomos-refactor to use v4 agents

## What To Strip

| Strip | Why | Savings |
|-------|-----|---------|
| Stale worktree F040 | 607 MB of node_modules | 607 MB disk |
| 5 deprecated agents | Confusion, still being dispatched by mistake | 26 KB, clarity |
| `ralph-loop` skill | Unrelated project | 56 KB, clarity |
| v3 pipeline output (F001-F033) | Superseded by v4 format | ~500 KB |
| features.json summary block | Always stale, never computed | Anti-pattern removal |
| Unused schema fields (`titleGenerating`, `descriptionHistory`, `imagePaths`, `textFilePaths`) | Automaker patterns never used | Schema clarity |
| Phase 3/4 backlog features (74) | Aspirational, far future (Tauri desktop, terminal splits) | Move to `backlog-future.json` |
| `inspiration/nomos-v3/` | Superseded by v4 | 200 KB |

## Cost Per Feature

Current: ~$0.47 - $1.80 per feature. The architect phase (opus) is the bottleneck. Dropping architect to sonnet for XS/S features would save 50-80% on the most expensive phase.

## NOMOS Portability Verdict

The architecture analyst was blunt: "NOMOS is a project-specific build system, not a portable framework." The hybrid approach is recommended: keep CLI for agent execution, add a TypeScript library for orchestration.

## Self-Building Vision (4 stages)

1. **Now to 3 months:** DB-first migration, single source of truth
2. **3 to 6 months:** NOMOS builds non-NOMOS projects (portable)
3. **6 to 12 months:** NOMOS builds itself (self-modifying with safety rails)
4. **12 to 18 months:** Autonomous studio (multi-agent parallel, self-prioritizing backlog)

**Key metric:** The moment NOMOS can implement, test, and merge a feature on its own codebase — triggered from the web dashboard Intent Box with no CLI interaction — the self-building loop is closed.

---

# 2. SDK & Agent Analysis

*Agent: SDK Expert (explore-docs, opus model)*

## 2.1 Current SDK Usage Assessment

### ClaudeProvider (`packages/api/src/services/claude-provider.ts`, 203 lines)

**Architecture:** Single-point SDK integration via the `AgentProvider` interface. Clean abstraction with mock support.

**Strengths:**
- Clean provider pattern with `AgentProvider` interface (line 90-92)
- Factory method with mock support via `NOMOS_MOCK_AGENT` env var (line 192-202)
- Exponential backoff with jitter on retryable errors (line 84-88)
- Error classification into 7 categories (line 27-82)
- Connection timeout at 5 minutes (line 16)
- Model alias mapping: haiku/sonnet/opus to full model IDs (line 5-9)

**Issues Found:**

1. **FRAGILE COST EXTRACTION (line 143-155):** Cost data is extracted via unsafe type assertion against undocumented SDK properties:
   ```typescript
   const sdkResult = message as {
     total_cost_usd?: number;
     usage?: { input_tokens?: number; output_tokens?: number };
   };
   ```
   This will break silently on SDK upgrades. The SDK does not officially export these fields in its TypeScript types.

2. **INCOMPLETE MESSAGE FILTERING (line 139-140):** Only `assistant`, `result`, and `error` message types are yielded. The SDK also emits `tool_use`, `tool_result`, and potentially `system` messages in newer versions — these are silently dropped, losing observability.

3. **NO V2 SESSION API USAGE:** The codebase uses only `query()` (V1), not the V2 `unstable_v2_createSession()` / `unstable_v2_resumeSession()`. The V2 API provides:
   - True multi-turn conversations (no context window waste)
   - Session resumption across restarts
   - Dynamic permission mode changes mid-session
   - `interrupt()` method for graceful cancellation

4. **`settingSources: ["project"]` HARDCODED (line 113):** This locks all SDK queries to project-level settings only. User-level or system-level settings are ignored.

5. **STALE `allowDangerouslySkipPermissions` (line 111-112):** The code sets this flag when `permissionMode === "bypassPermissions"`, but the default was changed to `"default"` as a security fix.

### AutoModeService (`packages/api/src/services/auto-mode-service.ts`, 403 lines)

**Architecture:** Spawns `claude` CLI as a subprocess, bypassing the SDK entirely.

**Issues Found:**

1. **CLI SUBPROCESS INSTEAD OF SDK (line 191-199):** The most impactful finding. AutoModeService spawns `claude --dangerously-skip-permissions -p` as a child process instead of using the SDK's `query()` function. This means:
   - No programmatic access to tool calls, thinking, or intermediate results
   - stdout arrives in chunks, not structured messages
   - No ability to interrupt gracefully (only SIGTERM via `proc.kill()`)
   - No cost tracking from the SDK (only from checkpoint files)
   - No session resumption on failure

2. **COST DATA EXTRACTION IS UNRELIABLE (line 256-274):** Cost data path relies on reading it from the final checkpoint file. If the CLI crashes before writing cp-06.json, cost data is lost.

3. **NO STRUCTURED OUTPUT PARSING (line 228-229):** `streamChildOutput()` emits raw stdout/stderr text chunks. No parsing of the CLI's JSON output format.

4. **SINGLE USER ASSUMPTION (line 45):** `currentUserId` is a single value, meaning only one user can run auto-mode at a time.

### ExpansionService (`packages/api/src/services/expansion-service.ts`, 132 lines)

**Issues Found:**

1. **RELATIVE PATH FOR AGENT PROMPT (line 92-95):** Uses `import.meta.dirname` with 4 levels of `..` to reach `.claude/agents/expansion.md`. Fragile.

2. **RESULT EXTRACTION LOGIC (line 70-83):** Accumulates text from both `result` and `assistant` messages. If the SDK emits both, text could be duplicated.

3. **NO STREAMING TO CLIENT:** Service awaits the full response before returning.

### Supporting Services

- **PipelineService (423 lines):** Well-structured checkpoint reader with Zod validation. Polling approach (2s interval) wastes resources when features take 10-30 minutes.
- **SessionService (125 lines):** Clean lifecycle management. Cost data conversion uses `String(costData.totalCostUsd)` which loses precision.
- **EventService (24 lines):** Minimal pub/sub. No typed events — `payload: unknown` means no compile-time safety.
- **sdk-options.ts (24 lines):** DEAD CODE — `createAutoModeOptions()` and `createAgentOptions()` are never imported anywhere.
- **MockProvider (91 lines):** Missing cost data simulation, error simulation, and timeout simulation.

## 2.2 Agent Definitions Review

### All Agents (18 files in `.claude/agents/`)

| Agent | Model | Status | Phase/Skill | Purpose |
|-------|-------|--------|-------------|---------|
| scout | haiku | Active v4 | Phase 1 | Context gathering (replaces 3 v3 agents) |
| architect | opus | Active v4 | Phase 2 | Implementation planning with self-critique |
| code-writer | sonnet | Active v4 | Phase 3, 4 | Implementation + fix cycles |
| qa-reviewer | sonnet | Active v4 | Phase 3 | Code review per iteration |
| code-reviewer | sonnet | Active v4 | Phase 4 | Comprehensive review (bugs + quality + coverage) |
| security-reviewer | sonnet | Active v4 | Phase 4 | OWASP security analysis |
| qa-functional-tester | sonnet | Active v4 | Phase 4 | Functional QA with Playwright |
| qa-smoke-tester | sonnet | Active v4 | Phase 4 | Smoke testing |
| historian | haiku | Active v4 | Phase 6 | Learning extraction |
| expansion | sonnet | Active v4 | ExpansionService | Intent to feature spec |
| swarm-analyst | sonnet | Active v4 | Swarm | Multi-role analyst (6 roles) |
| swarm-tester | sonnet | Active v4 | Swarm | Runtime tester with Playwright |
| code-architect | sonnet | Active | nomos-refactor | Architecture analysis |
| load-learnings | haiku | DEPRECATED | Was Phase 1 | 9.3KB |
| explore-codebase | haiku | DEPRECATED | Was Phase 1 | 2.5KB |
| explore-docs | haiku | DEPRECATED | Was Phase 1 | 3.5KB |
| code-quality-reviewer | haiku | DEPRECATED | Was Phase 4 | 4.2KB |
| test-coverage-analyzer | haiku | DEPRECATED | Was Phase 4 | 4.1KB |

**Key Issues:**
- 5 deprecated agents still present (23.6KB), still referenced in 10+ skill files
- `nomos-verify` SKILL.md (line 56-62) and `nomos-refactor` SKILL.md (line 173-188) still dispatch deprecated agents
- `code-reviewer` vs `qa-reviewer` have significant overlap in code quality and bug finding
- `swarm-analyst` and `swarm-tester` are referenced in 0 skill files (orphan agents)
- `architect` (opus) vs `code-architect` (sonnet) — similar names, distinct roles, confusing

## 2.3 Cost Analysis

| Agent | Model | Cost/1M input | Cost/1M output | Invocations/Feature |
|-------|-------|---------------|-----------------|---------------------|
| scout | haiku | $0.80 | $4.00 | 1 |
| architect | opus | $15.00 | $75.00 | 1 |
| code-writer | sonnet | $3.00 | $15.00 | 1-3 (loop) |
| qa-reviewer | sonnet | $3.00 | $15.00 | 1-3 (loop) |
| code-reviewer | sonnet | $3.00 | $15.00 | 1 |
| security-reviewer | sonnet | $3.00 | $15.00 | 1 |
| qa-functional-tester | sonnet | $3.00 | $15.00 | 0-1 (conditional) |
| qa-smoke-tester | sonnet | $3.00 | $15.00 | 0-1 (conditional) |
| historian | haiku | $0.80 | $4.00 | 0-1 (conditional) |

**Estimated cost per feature: ~$0.47 - $1.80**

**Optimization opportunities:**
- Architect could use sonnet instead of opus for XS/S features (50-80% savings on Phase 2)
- QA-reviewer could use haiku for initial pass (60% savings on Phase 3 iterations)
- Reduce `maxTurns` default from 10 to 5 to prevent runaway costs

## 2.4 SDK Best Practices Comparison

| Practice | SDK Recommendation | NOMOS Current | Gap |
|----------|-------------------|---------------|-----|
| Session Management | V2 Session API for multi-turn | V1 `query()` only | HIGH |
| Conversation Continuity | `unstable_v2_resumeSession()` | CLI subprocess (no session) | HIGH |
| Cost Tracking | Official SDK cost fields | Unsafe type assertion | MEDIUM |
| Custom Tools | Register tools via SDK | No custom tools | MEDIUM |
| Streaming | Process all message types | Only assistant/result/error | MEDIUM |
| Interrupts | `query.interrupt()` | `proc.kill()` or AbortController | MEDIUM |

## 2.5 Portability Analysis

**Portable components:**
- `ClaudeProvider` class — generic SDK wrapper
- `AgentProvider` interface — clean abstraction
- `MockProvider` — generic mock
- Error classification logic — universal

**NOMOS-specific coupling:**
- `MODEL_ALIASES` map — references specific model versions
- Agent prompt loading from `.claude/agents/` — file path convention
- Checkpoint-based progress tracking — NOMOS-specific protocol
- Feature-centric session tracking — tied to NOMOS feature model
- CLI subprocess approach — specific to NOMOS's workflow

**Effort to make portable:**
- Low (1-2 days): Extract providers into `packages/sdk`
- Medium (1 week): Replace CLI subprocess with SDK-native calls
- High (2+ weeks): Programmatic agent registry, generic skill framework

## 2.6 SDK Expert Recommendations (Prioritized)

**P0:**
1. Fix deprecated agent references in nomos-verify and nomos-refactor skills
2. Fix cost data extraction fragility (`claude-provider.ts:143-155`)

**P1:**
3. Evaluate V2 Session API adoption
4. Replace CLI subprocess with SDK `query()` in AutoModeService
5. Delete or archive 5 deprecated agents

**P2:**
6. Delete dead code: `sdk-options.ts`
7. Add cost simulation to MockProvider
8. Consider haiku for architect on XS/S features
9. Type the EventService (replace `payload: unknown`)

**P3:**
10. Stream expansion results to UI
11. Extract SDK layer to `packages/sdk`
12. Add agent prompt versioning

---

# 3. Architecture, Bloat & Portability

*Agent: Architecture Analyst (code-architect, opus model)*

## 3.1 Directory Audit

### `.claude/` — 195 files, 1.4 MB

| Category | Files | Size | Notes |
|----------|-------|------|-------|
| Agents (active) | 13 | ~55 KB | scout, architect, code-reviewer, etc. |
| Agents (deprecated v3) | 5 | ~26 KB | code-quality-reviewer, explore-codebase, explore-docs, load-learnings, test-coverage-analyzer |
| NOMOS skills | 6 dirs, ~114 files | ~816 KB | nomos, nomos-verify, nomos-refactor, nomos-improve, nomos-swarm, nomos-runner |
| Generic skills | 13 dirs, ~73 files | ~580 KB | meta-*, git-*, utils-*, ralph-loop, orchestrating-swarms |
| Config | 3 | ~3 KB | settings.json, settings.local.json, .DS_Store |

**Dead files:** 5 deprecated agents, `.DS_Store`, `ralph-loop/` skill (unrelated project, 56 KB), `meta-skill-creator/LICENSE.txt`

### `.nomos/` — 33,792 files total, 614 MB

| Subdirectory | Files | Size | Notes |
|--------------|-------|------|-------|
| **worktrees/F040/** | **33,249** | **607 MB** | Stale worktree with full node_modules — MASSIVE bloat |
| output/ | ~310 | 1.7 MB | Pipeline output for 39 features, mixed v3/v4 formats |
| swarm/ | ~50 | 2.0 MB | 3 swarm sessions with screenshots |
| verify/ | ~44 | 1.3 MB | 5 verification runs + screenshots |
| learning/ | ~45 | 540 KB | 34 feature insights, patterns, antipatterns, code maps |
| inspiration/ | ~57 | 840 KB | 4 reference projects |
| qa-evidence/ | 3 | 240 KB | Screenshots from F030 |
| runner-logs/ | 5 | varies | Logs from 5 container runs |
| schemas/ | 3 | small | JSON schemas |
| docs/ | 3 | 34 KB | Architecture, git workflow, validation |
| locks/ | 2 | tiny | Stale lock for F034 |
| misc root files | 10 | ~384 KB | features.json (236KB), nomos.db (264KB), etc. |

**Critical: worktrees/F040/ = 98.9% of `.nomos/` disk usage**

**Stale content:** locks/F034.ports, output/stabilize/, feature-graph.html, DEEP-ANALYSIS, RESUME-PLAN, brick-by-brick.md, 6 .DS_Store files

## 3.2 Feature Backlog Analysis

### Status Distribution

| Status | Count | % |
|--------|-------|---|
| backlog | 212 | 74.4% |
| verified | 61 | 21.4% |
| waiting_approval | 11 | 3.9% |
| pending | 1 | 0.4% |

### Category Distribution (Full)

| Category | Total | Backlog | Verified | Notes |
|----------|-------|---------|----------|-------|
| CAT-FIX | 35 | 9 | 26 | Bug fixes |
| CAT-KAN | 32 | 20 | 12 | Kanban board |
| CAT-AGT | 28 | 17 | 11 | Agent system |
| CAT-GIT | 14 | 14 | 0 | Git integration — all backlog |
| CAT-TST | 14 | 14 | 0 | Testing — all backlog |
| CAT-DXP | 14 | 14 | 0 | Developer experience — all backlog |
| CAT-DBS | 13 | 4 | 9 | Database |
| CAT-OBS | 12 | 12 | 0 | Observability — all backlog |
| CAT-ENH | 12 | 12 | 0 | Enhancements — all backlog |
| CAT-SEC | 11 | 11 | 0 | Security — all backlog |
| CAT-TRM | 11 | 10 | 1 | Terminal |
| CAT-API | 10 | 4 | 6 | API |
| CAT-AUT | 10 | 9 | 1 | Auth/auto-mode |
| **fix** | **10** | **10** | **0** | **Naming inconsistency** |
| CAT-PRJ | 9 | 4 | 5 | Project management |
| CAT-CFG | 9 | 7 | 2 | Configuration |
| Others | 56 | 41 | 15 | MEM, DSK, THM, SPC, NTF, GHB, DEP |

### Issues

- **Category naming inconsistency**: 10 features use `fix` (F276-F285) while 35 use `CAT-FIX`
- **Bulk-added features**: 133 backlog features have priority >= 100 (generated/bulk-imported)
- **No labels populated**: `labels` field is empty on all features (despite MEMORY.md claiming "31 labeled v1")
- **Phase distribution**: 65 phase-1, 63 phase-2, 38 phase-3, 36 phase-4 in backlog — nearly half is aspirational
- **11 features stuck**: waiting_approval with failureReason from swarm audit
- **Output format inconsistency**: F001-F030 (v3 md), F031-F033 (run-001 subdirs), F034-F040 (v4 checkpoints) — three different formats

### Size Distribution

| Size | Count | % | Target % |
|------|-------|---|----------|
| XS | 30 | 10.5% | 30% |
| S | 107 | 37.5% | 35% |
| M | 118 | 41.4% | 25% |
| L | 13 | 4.6% | 8% |
| XL | 7 | 2.5% | 2% |
| Unset | 10 | 3.5% | 0% |

Too many M-sized features (41% vs target 25%).

### Dependency Graph
- 225 features declare dependencies (79%)
- 311 total dependency links, average 1.38 per feature
- Only F001-F060 have meaningful dependency chains
- F224+ generally have no dependencies

### Redundancies Identified
1. Security fixes: F224, F266, F279, F280 overlap significantly
2. Terminal fixes: F261, F277, F278 — three features for one subsystem
3. Auto-mode fixes: F260, F270, F280 — overlapping scope
4. Some CAT-FIX features (F224-F245) were fixed but their fix-children (F266-F285) still in backlog

## 3.3 Monorepo Structure

### Package Dependency Graph

```
@nomos-ai/config (leaf — no deps)
  ^-- @nomos-ai/env
      ^-- @nomos-ai/db
      |     ^-- @nomos-ai/auth
      |     |     ^-- @nomos-ai/api
      |     |           ^-- apps/web
      |     |           ^-- apps/server
      |     ^-- @nomos-ai/api
      ^-- @nomos-ai/types
      |     ^-- @nomos-ai/api
      ^-- apps/web (direct)
      ^-- apps/server (direct)
```

**No circular dependencies.** Dependency graph is clean and hierarchical.

**Concern:** `@nomos-ai/api` depends on 5 internal packages — it's the "fat" package. Acceptable for current size.

**Root package.json issue:** Has `@radix-ui/react-dialog`, `react-markdown`, `rehype-sanitize` as root-level dependencies. These are frontend concerns — should be in `apps/web/package.json`.

## 3.4 NOMOS Portability Assessment

### Project-Specific vs Generic

| Component | Portability | Coupling Points |
|-----------|-------------|-----------------|
| Skills (nomos, verify, refactor, improve, swarm) | Low | Hardcoded `.nomos/` paths, features.json schema, DB structure |
| Skills (git-*, utils-*, meta-*) | High | No project coupling |
| Agents (architect, code-reviewer, etc.) | Medium | Output format tied to checkpoint schema |
| nomos.sh + helper scripts | Low | Hardcoded paths, jq queries, state machine assumptions |
| nomos-runner.sh + container.sh | Low | Docker entrypoint expects NOMOS repo structure |

### To Port NOMOS to Another Project — Changes Required:
1. `.nomos/features.json` schema and 20+ jq queries
2. State machine transitions in `lib/state.sh` and `lib/lifecycle.sh`
3. Output directory structure
4. Worktree management paths
5. Learning system paths
6. Database schema and connection
7. Port allocation system
8. Docker container entrypoint and mount structure

**Verdict: NOMOS is fundamentally a project-specific build system, not a portable framework.**

## 3.5 nomos-runner Evaluation

- `nomos-runner.sh` (14.5 KB, ~400 lines) runs on host, spawns Docker containers
- `nomos-container.sh` (14.8 KB, ~400 lines) runs inside containers as entrypoint
- Uses bind-mount mode for faster local development
- Each container creates a `feature/{FEATURE_ID}` branch and pushes to GitHub

**Issues:**
- No Dockerfile.runner found — runner has never been fully operational or Dockerfile was deleted
- Only 5 runner logs exist — very limited usage
- Stale worktree F040 (607 MB) suggests cleanup isn't automated
- No integration tests for the container flow
- Duplicates what AutoModeService already does

**Recommendation:** Keep the runner concept but simplify — either integrate into AutoModeService with optional Docker isolation, or make it a standalone CLI tool.

## 3.6 Skill Organization

| Skill | Files | Size | Purpose | Portable? |
|-------|-------|------|---------|-----------|
| nomos | 48 | 392 KB | Core pipeline | No |
| nomos-verify | 18 | 112 KB | Verification | No |
| nomos-refactor | 22 | 108 KB | Refactoring | No |
| nomos-improve | 14 | 108 KB | Self-improvement | No |
| nomos-swarm | 11 | 92 KB | Multi-agent sessions | No |
| nomos-runner | 1 | 4 KB | Docker runner | No |
| meta-subagent-creator | 8 | 136 KB | Create subagents | Yes |
| meta-skill-creator | 14 | 132 KB | Create skills | Yes |
| meta-claude-memory | 6 | 64 KB | Memory management | Yes |
| meta-prompt-creator | 11 | 56 KB | Prompt engineering | Yes |
| orchestrating-swarms | 8 | 52 KB | Swarm patterns | Yes |
| ralph-loop | 6 | 56 KB | Unrelated project | N/A (remove) |
| git-* (4 skills) | 4 | 16 KB | Git operations | Yes |
| utils-* (3 skills) | 3 | 12 KB | Utility operations | Yes |

## 3.7 Proposed New Directory Structure

```
.claude/
  agents/             # 13 active agents only (deprecated ones removed)
  skills/
    nomos/            # Core pipeline (unchanged)
    nomos-verify/     # Verification (unchanged)
    nomos-refactor/   # Refactoring (unchanged)
    nomos-improve/    # Self-improvement (unchanged)
    nomos-swarm/      # Multi-agent (unchanged)
    nomos-runner/     # Docker runner (unchanged)
    # Generic skills unchanged
  settings.json
  settings.local.json

.nomos/
  features.json       # Cleaned: consistent categories, pruned backlog
  app_spec.json
  schemas/
  stack.json

  # Runtime state (gitignored)
  nomos.db
  worktrees/          # Auto-cleaned after feature completion
  locks/              # Auto-cleaned after feature completion
  runner-logs/        # Auto-cleaned periodically

  # Pipeline output (gitignored except latest)
  output/             # Only v4 checkpoint format going forward

  # Learning system
  learning/
    patterns.json
    antipatterns.json
    insights/
    code/

  # Reference (read-only, narrowed)
  inspiration/
    autonomous/       # Keep primary reference only

  # Auto-cleaned
  swarm/
  qa-evidence/
```

---

# 4. DevOps, Database & Data Conformity

*Agent: DevOps Analyst (swarm-analyst, opus model)*

## 4.1 CI/CD Pipeline Assessment

### Workflow 1: `ci.yml`
**Triggers:** push to main, all PRs
**Jobs:** check-scaffold -> lint, typecheck, test (parallel) -> build -> docker -> ci-complete

**Strengths:**
- Concurrency group with cancel-in-progress
- Proper job dependencies
- Docker build step validates containerization
- ci-complete aggregator handles partial failures

**Gaps:**
- NO deployment step (no CD, no staging, no production push)
- NO test coverage reporting
- NO E2E/integration tests
- NO database migration validation in CI
- NO artifact upload
- NO matrix testing (single Bun version)
- `build:packages` referenced in setup-project action but NOT in root package.json — **WILL FAIL**
- Uses `actions/checkout@v6` which may not exist yet (latest stable is v4)

### Workflow 2: `security-audit.yml`
**Triggers:** push to main, all PRs, weekly Monday 9AM UTC

**Strengths:**
- Gitleaks for secret scanning with full history
- Weekly scheduled scans
- dependency-review-action for PR diff-based audit

**Gaps:**
- `bun pm audit` has `continue-on-error: true` — vulnerabilities won't fail build
- No SAST (Semgrep, CodeQL)
- No container image scanning
- No license compliance checking

### Composite Action: `setup-project`
- BROKEN: `bun run build:packages` does not exist. Actual script is `bun run build`.

## 4.2 Database Schema Analysis

### Table Relationship Diagram

```
user (PK: id)
  |--< session (FK: userId, CASCADE)
  |--< account (FK: userId, CASCADE)
  |--< api_key (FK: userId, CASCADE)

project (PK: id)
  |   userId (text, NOT NULL, NO FK TO USER!)
  |--< feature (FK: projectId, CASCADE)
         |--< agent_session (FK: featureId, CASCADE)
         |--< learning (FK: featureId, SET NULL)

verification (standalone, no FKs)
setting (standalone, no FKs)
event (standalone — featureId, projectId, sessionId are PLAIN TEXT, no FKs)
notification (standalone — featureId, projectId are PLAIN TEXT, no FKs)
worktree (standalone — featureId is PLAIN TEXT, no FK)
message (standalone — sessionId is PLAIN TEXT, no FK)
```

### Schema Issues

| Issue | Severity | Table | Detail |
|-------|----------|-------|--------|
| project.userId has no FK to user | HIGH | project | Orphan projects possible |
| Missing FK: event.featureId/projectId/sessionId | MEDIUM | event | No referential integrity |
| Missing FK: notification.featureId/projectId | MEDIUM | notification | No referential integrity |
| Missing FK: worktree.featureId | MEDIUM | worktree | No referential integrity |
| Missing FK: message.sessionId | MEDIUM | message | No referential integrity |
| No userId index on agent_session | MEDIUM | agent_session | Full table scan for user queries |
| totalCostUsd stored as TEXT | LOW | agent_session | Costs should be numeric |
| Inconsistent createdAt defaults | LOW | multiple | Some SQL-based, some JS-based |
| updatedAt inconsistency | LOW | auth, setting | Missing default values |

### Migration History (0000-0008)

| Migration | Changes |
|-----------|---------|
| 0000 | Auth tables (user, session, account, verification) |
| 0001 | Core tables (feature, learning, project, agent_session) |
| 0002 | Added userId to project, feature, learning, agent_session — **DEFAULT '' problematic** |
| 0003 | Added event, message, notification, setting, worktree; extended feature and session |
| 0004 | Added retry tracking to feature |
| 0005 | Recreated agent_session to make featureId nullable, add projectId |
| 0006 | Changed project unique index from path-only to (userId, path) |
| 0007 | Added cost tracking to agent_session |
| 0008 | Created api_key table |

**Migration risk:** Migration 0002 added `user_id text NOT NULL DEFAULT ''` to existing tables. Pre-existing records have empty string userIds — invisible to filtered queries but still in database.

## 4.3 Session Management Review

### Session Lifecycle
Three creation paths:
1. **Pipeline sessions** (AutoMode): status=RUNNING, isRunning=true
2. **Interactive sessions**: status=PENDING, isRunning=false
3. **Agent sessions**: status=PENDING, minimal creation

### Critical Session Issues

1. **No crash recovery**: Server crash leaves sessions in RUNNING state forever. No stale session detection on startup.
2. **No session timeout/TTL**: `isRunning` boolean has no associated timeout. Sessions could theoretically run for days.
3. **AutoModeService is in-memory singleton**: `runningFeatures` Map and `retryTimers` Set lost on restart. No persistence.
4. **Race condition in auto-mode**: `executeFeature()` called without awaiting in while loop, creating race window for concurrent starts.
5. **Fire-and-forget DB update**: `pipeline-service.ts:338` uses `.catch(() => {})` to swallow DB errors during checkpoint mapping.

## 4.4 Data Conformity Issues

### Dual Source of Truth (CRITICAL)

| Aspect | `.nomos/features.json` | `feature` DB table |
|--------|----------------------|-------------------|
| Writer | CLI pipeline, manual editing | Web UI, REST API, auto-mode |
| Reader | CLI skill (Phase 1) | Web dashboard, API queries |
| ID format | F001-F285 | Generated UUID-like IDs |
| Categories | CAT-FIX (35), CAT-KAN (32), etc. | Whatever user types |
| Status | backlog/pending/verified/waiting_approval | Full state machine |
| Sync | NEVER synced to DB | NEVER synced to JSON |

### Type Mismatches

1. **Session list filter**: `routers/session.ts:82-94` fetches ALL sessions then post-filters by userId. Missing userId index. Compare with feature router which correctly uses `findByUser()`.

2. **API context shape difference**: API key auth creates minimal context `{ session: { user: { id: apiKeyUserId } } }` while session auth returns full better-auth session. Handlers accessing `user.name` or `user.email` get undefined with API key auth.

3. **REST adapter double-response**: `rest-adapter.ts:134-139` DELETE handler checks status and creates new response, but `callRPC` already returns a Response.

## 4.5 Testing Infrastructure

### Test Distribution (18 test files)

| Package | Test Files | Coverage Area |
|---------|-----------|---------------|
| packages/types | 5 | Schemas, IDs, status, feature, session, project |
| packages/db | 5 | DB index, features, learnings, projects, sessions, migrations |
| packages/api | 5 | Feature/project/session routers, event broadcaster, event filtering |
| apps/web | 8 | Components, store, hooks, lib |
| apps/server | 2 | WebSocket handlers, WebSocket auth |

### Test Gaps

1. **ZERO integration tests for CLI subprocess pipeline** — most critical path completely untested
2. **No tests for:** auto-mode-service, pipeline-service, session-service, expansion-service, worktree-service
3. **No tests for:** REST adapter, API key auth middleware
4. **No E2E tests** — no Playwright, no browser automation
5. **No test configuration file** — uses `bun test` directly (not Vitest despite docs claiming Vitest)
6. **No coverage reporting configured**
7. **Known issue:** `Bun mock.module leaks between test files`

## 4.6 Build System

### Turborepo
- Clean, standard configuration
- Tasks: build, lint, check-types, test, dev, db:*
- Build outputs cached, test/dev not cached

### Biome
- Recommended + strict rules
- Tab indentation, double quotes
- Tailwind class sorting enabled

### Docker
- 3-stage build: deps -> builder -> runner
- Non-root user (nomos, UID 1001)
- Healthcheck configured
- **Issue:** Builds ALL packages, not just server and web
- **Issue:** No `.dockerignore` check

### Package Scripts Issue
Root `package.json` has `"test": "bun test"` but turbo.json has test task with `dependsOn: ["^build"]`. Running `bun test` directly bypasses turbo.

## 4.7 DevOps Recommendations (Prioritized)

**P0:**
1. Decide on single source of truth (DB recommended)
2. Add session cleanup on startup (mark stale RUNNING as FAILED)
3. Fix CI `build:packages` -> `build`
4. Add FK from project.userId to user.id

**P1:**
5. Add userId index to agent_session
6. Fix session list to use DB-level filtering
7. Add FKs to event, notification, worktree, message tables
8. Add integration tests for auto-mode pipeline
9. Normalize API key auth context

**P2:**
10. Add CD pipeline (deployment)
11. Add test coverage reporting
12. Add E2E tests (Playwright)
13. Change totalCostUsd to numeric type
14. Standardize timestamp defaults

---

# 5. Product Strategy & Roadmap

*Agent: Product Strategist (swarm-analyst, opus model)*

## 5.1 Feature Backlog Deep Dive

### Tag System Analysis
- `verify-ingested` + `from-verify:TIMESTAMP` (37 features) — auto-generated
- `swarm-audit` (20 features) — from multi-agent audits
- `fix:FXXX` (20 unique values) — links to remediated features
- `security` (9), `enhancement` (12), `automaker-mirror` (8) — manual tags
- `group-N` (8) — batch grouping for parallel implementation

### Redundancies Identified
1. **Security:** F224, F266, F279, F280 — overlapping userId/ownership fixes
2. **Terminal:** F261, F277, F278 — three features for one subsystem
3. **Auto-mode:** F260, F270, F280 — overlapping scope
4. **Already fixed but children still in backlog:** Some CAT-FIX features fixed during unification

### Proposed features.json v2 Schema Changes
- **REMOVE:** `titleGenerating`, `descriptionHistory`, `imagePaths`, `textFilePaths`, `planSpec.taskCount/completedTasks` (unused Automaker patterns)
- **REMOVE:** `summary` block (always stale, never computed)
- **ADD:** `archivedAt: date-time` (soft-archiving)
- **ADD:** `source: "manual" | "verify-ingest" | "swarm-audit" | "expansion"` (provenance)
- **ADD:** `parentFeature: FXXX` (replace ad-hoc `fix:FXXX` tag)
- **ADD:** `releaseLabel: string` (formalize `release: "v1"`)
- **CHANGE:** Enforce category pattern `^CAT-[A-Z]{3}$`
- **CHANGE:** Allow ID pattern `^F[0-9]{3,4}$` (future-proof beyond F999)

### Proposed File Split
```
.nomos/features/
  core.json          # F001-F060 (original core)
  fixes.json         # CAT-FIX features
  enhancements.json  # CAT-ENH features
  backlog.json       # phase-3/phase-4 aspirational
features-index.json  # Summary/index
```

## 5.2 App Spec Integration Strategy

### Current State
`app_spec.json` is a rich 608-line specification with vision, constitution, architecture, requirements, phases, quality gates, workflow config, and feature generation targets. But it's barely integrated:
- SpecService exists but is barely used
- Pipeline Phase 1 reads it for context but doesn't validate against it
- ExpansionService doesn't reference app_spec constraints
- Frontend shows a placeholder "Create an app_spec.json" message

### Integration Phases
**Phase 1 — Spec-Driven Config:** Read quality gates from app_spec, validate state transitions, display vision/constitution in dashboard
**Phase 2 — Spec as Code:** Validate package.json deps against stack, configure agent boundaries from constraints
**Phase 3 — Spec Mutation Loop:** Expansion agent proposes app_spec changes, track version history

## 5.3 Self-Building Architecture Analysis

### Current Flow
```
[User: Dashboard/CLI]
  -> [Intent Box] -> [ExpansionService] -> [DecompositionPreview] -> [DB: features table]
                                                                       |  (DISCONNECT)
  -> [Auto-Mode Dashboard] -> [AutoModeService] -> [CLI subprocess: `claude -p`]
                                |                        -> [SKILL.md pipeline]
                                |                        -> [features.json] (reads/writes)
                                |                        -> [cp-01..cp-06.json] (checkpoints)
                                v
                        [PipelineService] -> polls checkpoints -> [DB: features table]
                                                                       -> [WebSocket -> Dashboard]
```

### 4 Critical Gaps

**GAP 1: Dual Source of Truth** — CLI reads/writes features.json; web reads/writes DB. Features created in web don't exist in features.json.

**GAP 2: Feature ID Mismatch** — features.json uses F001-F285 pattern; DB generates UUIDs for new features.

**GAP 3: No Bidirectional Sync** — Web creates feature in DB with no write to features.json. CLI updates features.json with only partial sync back to DB.

**GAP 4: Worktree Isolation vs Self-Building** — NOMOS works in worktrees but can't safely modify its own pipeline code while running.

### Resolution: DB-First Migration (RECOMMENDED)
1. Migrate all features.json data into DB on startup
2. Modify CLI pipeline to read from DB API instead of features.json
3. features.json becomes read-only export/cache
4. Intent Box -> DB -> CLI pipeline -> DB -> Dashboard (clean loop)

**Pros:** Single source of truth, no sync issues, web app already works with DB
**Cons:** Requires modifying 50+ jq commands in SKILL.md steps, CLI needs API access

### Self-Building Safety Requirements
1. Snapshot before self-modification (git stash/tag)
2. Canary mode (test modified pipeline on test feature first)
3. Constitution immutability enforced in code, not just convention
4. Rollback trigger if pipeline failure rate > 20%

## 5.4 Library vs CLI Decision

### Hybrid Approach (RECOMMENDED)
Keep CLI for agent execution, add library for orchestration:
1. `packages/nomos-core/` — TypeScript library for pipeline orchestration ONLY (phase sequencing, checkpoints, state machine)
2. CLI subprocess for actual agent work (unchanged)
3. Library calls CLI for each phase
4. Library handles checkpoint -> DB sync directly (no polling)

**Benefit:** Type-safe orchestration + CLI's tool access and permission model

## 5.5 Prioritized Roadmap (TOP 10)

| # | Priority | Action | Effort |
|---|----------|--------|--------|
| 1 | P0 | Fix category naming (F276-F285: fix -> CAT-FIX) | 30 min |
| 2 | P0 | Triage 11 waiting_approval features | 2-3 hours |
| 3 | P0 | Unify feature source of truth — DB-first migration | 1 day |
| 4 | P1 | Replace jq feature reads with API calls in Phase 1 | 4 hours |
| 5 | P1 | Intent Box -> Pipeline end-to-end integration | 1 day |
| 6 | P1 | Fix security issues (F266-F270) | 2-3 days |
| 7 | P2 | features.json cleanup and archival | 2 hours |
| 8 | P2 | Add pipeline integration tests | 1 day |
| 9 | P3 | Create `packages/nomos-core` orchestration library | 2-3 days |
| 10 | P3 | app_spec.json integration | 1-2 days |

## 5.6 Things to Strip First
1. Remove features.json summary block (always stale)
2. Remove unused schema fields (Automaker patterns)
3. Consolidate overlapping fix features
4. Archive Tauri/Desktop features (F135-F145) to separate file
5. Archive Terminal polish features (F082-F092) beyond basic
6. Remove v3 step files (10+ files of cognitive overhead)
7. Drop `phases` array in features.json (duplicates app_spec)
8. Consolidate 35+ learning insight JSONs

## 5.7 Long-term Self-Building Vision

**Stage 1 (Now to 3 months):** DB-first migration, single source of truth, Intent Box -> Pipeline works
**Stage 2 (3 to 6 months):** Any project can add `.nomos/app_spec.json`, `nomos init` generates features, pipeline works on external codebases
**Stage 3 (6 to 12 months):** NOMOS proposes its own improvements from learning system, implements features in worktrees, human approves merges
**Stage 4 (12 to 18 months):** Multiple AI agents in parallel, auto-prioritizing backlog, cost optimization per feature, dashboard as primary development interface

---

# 6. Cross-Cutting Findings

These findings were identified independently by multiple agents:

| Finding | Agents | Consensus |
|---------|--------|-----------|
| Dual source of truth (features.json vs DB) | All 4 | CRITICAL — resolve with DB-first migration |
| features.json summary block stale (265 vs 285) | All 4 | Remove or auto-compute |
| Category naming inconsistency (CAT-FIX vs fix) | 3 of 4 | Normalize to CAT-FIX |
| 5 deprecated agents still active in skills | 2 of 4 | Remove agents, update skill references |
| Session orphan risk | 2 of 4 | Add startup cleanup + TTL |
| Pipeline is project-specific, not portable | 2 of 4 | Accept for now, work toward hybrid library |
| Zero integration tests for critical path | 2 of 4 | Add as P2 priority |

---

# 7. Actionable Recommendations

## Immediate Actions (Day 1)

- [ ] Delete stale worktree F040 (`git worktree remove .nomos/worktrees/F040`) — saves 607 MB
- [ ] Fix CI: change `build:packages` to `build` in `.github/actions/setup-project/action.yml`
- [ ] Fix category naming: normalize 10 `fix` entries (F276-F285) to `CAT-FIX`
- [ ] Remove features.json summary block (or auto-compute)
- [ ] Delete dead code: `packages/api/src/services/sdk-options.ts`
- [ ] Delete `.DS_Store` files, add to `.gitignore`
- [ ] Delete stale locks (`.nomos/locks/`)
- [ ] Archive or delete 5 deprecated agents
- [ ] Remove `ralph-loop` skill (unrelated project)

## Short-Term (Week 1-2)

- [ ] DB-first migration: add `nomos db seed` to import features.json
- [ ] Add missing DB columns (release, failureReason, restoredAt)
- [ ] Add FK constraints to orphan-prone tables (project.userId, event, notification, worktree, message)
- [ ] Add session cleanup on server startup
- [ ] Add userId index to agent_session table
- [ ] Update nomos-verify and nomos-refactor skills to use v4 agents
- [ ] Triage 11 waiting_approval features
- [ ] Move root-level frontend deps to apps/web/package.json

## Medium-Term (Week 2-4)

- [ ] Wire Intent Box -> AutoModeService end-to-end
- [ ] Modify pipeline Phase 1 to read from API (fallback to features.json)
- [ ] Add integration tests for pipeline flow
- [ ] Fix API key auth context shape
- [ ] Fix security issues (F266-F270)
- [ ] features.json cleanup: archive phase-3/4, consolidate overlapping fixes
- [ ] Archive v3 pipeline output (F001-F033)

## Long-Term (Month 2+)

- [ ] Replace CLI subprocess with SDK `query()` in AutoModeService
- [ ] Evaluate V2 Session API adoption
- [ ] Create `packages/nomos-core` orchestration library
- [ ] Integrate app_spec.json into pipeline and dashboard
- [ ] Stream structured output to dashboard
- [ ] Add E2E tests (Playwright)
- [ ] Add CD pipeline (deployment)

---

*Report generated by 4-agent strategic review team on 2026-02-09*
*Agents: SDK Expert (explore-docs/opus), Architecture Analyst (code-architect/opus), DevOps Analyst (swarm-analyst/opus), Product Strategist (swarm-analyst/opus)*
