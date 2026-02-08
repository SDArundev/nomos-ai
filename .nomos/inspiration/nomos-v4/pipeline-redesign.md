# Plan: NOMOS v4 — Lean Pipeline Redesign

## Context

The current NOMOS v3 pipeline (7 steps, 1967 lines of step files, 12 agents, ~700 lines markdown output per feature) works but is slow and verbose. The user wants the same quality, security, and reliability with:
- Faster execution (~40% less time)
- Explicit context clearing between phases (no context pollution)
- Modular phases that can run standalone
- Fewer agents (consolidate overlapping ones)
- Conditional learning (skip when nothing to learn)
- Clean PR flow (PR is default, merge is opt-in)

## Architecture: 6-Phase Pipeline with JSON Checkpoints

```
Phase 0: ROUTE → sub-command dispatch (verify/refactor/improve/implement)
Phase 1: UNDERSTAND → init + explore + learnings (1 scout agent)
  → cp-01.json → CLEAR
Phase 2: PLAN → file-by-file plan + critique (1 architect agent)
  → cp-02.json → CLEAR
Phase 3: EXECUTE → code-writer + qa-reviewer loop (max 3 iterations)
  → cp-03.json → CLEAR
Phase 4: REVIEW → static gates + parallel code/security review + runtime
  → cp-04.json → CLEAR
Phase 5: SHIP → push + PR (default) or merge (-m flag) + cleanup
  → cp-05.json → CLEAR
Phase 6: LEARN → conditional metrics/patterns extraction
  → cp-06.json → DONE
```

**Context management:** Each phase reads ONLY the previous checkpoint JSON. Agents get fresh context windows with compact JSON input — no accumulated markdown. Checkpoints are the sole communication channel.

**Resume:** Scan `cp-*.json`, find highest completed, start next phase.

## What Changes

### Agent Roster: 12 → 9

| Action | Agent | Reason |
|--------|-------|--------|
| **NEW** | `scout` (haiku) | Replaces load-learnings + explore-codebase + explore-docs |
| **NEW** | `architect` (opus) | Dedicated planning agent with critique loop |
| **NEW** | `historian` (haiku) | Conditional learning extraction |
| **EXPAND** | `code-reviewer` (sonnet) | Absorbs code-quality-reviewer + test-coverage-analyzer |
| **KEEP** | `code-writer`, `qa-reviewer`, `security-reviewer`, `qa-functional-tester`, `qa-smoke-tester` |
| **DEPRECATE** | `load-learnings`, `explore-codebase`, `explore-docs`, `code-quality-reviewer`, `test-coverage-analyzer` |

### Step Files: 7 → 7 (but 40% shorter)

| v3 (1967 lines total) | v4 (~760 lines total) |
|---|---|
| step-00-init.md (567) | phase-00-router.md (~40) + phase-01-understand.md (~150) |
| step-01-context.md (211) | (absorbed into phase-01) |
| step-02-plan.md (314) | phase-02-plan.md (~120) |
| step-03-execute.md (234) | phase-03-execute.md (~130) |
| step-04-verify.md (220) | phase-04-review.md (~140) |
| step-05-merge.md (264) | phase-05-ship.md (~100) |
| step-06-finish.md (157) | phase-06-learn.md (~80) |

### Output: Markdown → JSON Checkpoints

v3: ~700 lines of markdown (7 files) → v4: ~170 lines of JSON (6 files) + optional 1-page summary

### References: Simplify

| Action | File |
|--------|------|
| **NEW** | `checkpoint-schema.md` — all 6 JSON schemas |
| **NEW** | `agent-contracts.md` — input/output for all agents |
| **UPDATE** | `cli-reference.md` — v4 phases + flags |
| **UPDATE** | `state-machine.md` — phase-to-state mapping |
| **UPDATE** | `quality-gates.md` — map to v4 phases |
| **DEPRECATE** | `agent-prompts.md` → replaced by agent-contracts.md |
| **DEPRECATE** | `output-formats.md` → replaced by checkpoint-schema.md |
| **KEEP** | git-operations, merge-strategies, failure-classification, code-knowledge, patterns |

### Templates: Remove

All 7 markdown templates removed (replaced by JSON checkpoint writes in phase code).

### Scripts: No Changes

`nomos.sh` and all `lib/*.sh` modules unchanged. Same state machine, same commands.

## Phase Details

### Phase 0: ROUTE (~40 lines)

Sub-command dispatch. Identical to current step-00-init routing logic.
- `verify` → nomos-verify skill
- `refactor` → nomos-refactor skill
- `improve` → nomos-improve skill
- `-s` → session dashboard
- Otherwise → phase-01-understand

### Phase 1: UNDERSTAND (~150 lines)

Merges current step-00 (init) + step-01 (context) into one phase.

**Orchestrator does:** Parse flags → validate feature → create worktree → allocate ports → pre-filter learnings via `nomos.sh insights/patterns` → dispatch scout → check pre-implementation → write cp-01.json → state: `pending → in_progress`

**Scout agent (1, haiku):** Loads learning files + explores codebase + queries Context7 for unfamiliar libs. Returns structured JSON: risk level, key files, patterns, antipatterns, thresholds.

**Why 1 agent not 3:** Three agents had synthesis overhead (merge 3 reports into 1). One agent doing sequential read-explore-research finishes in ~2 min with no merge step.

**Checkpoint cp-01.json:**
```json
{
  "v": 4, "phase": 1, "feature_id": "F031", "ts": "...", "status": "completed",
  "data": {
    "feature": { "id", "title", "description", "ac", "category", "phase", "priority", "deps" },
    "env": { "worktree_path", "output_dir", "server_port", "web_port" },
    "flags": { "auto", "test", "merge", "cleanup", "plan_only", "verify_only" },
    "context": {
      "risk_level": "LOW|MEDIUM|HIGH",
      "key_files": [...],
      "patterns_to_apply": [...],
      "antipatterns_to_avoid": [...],
      "thresholds": { "duration_target": 24, "files_target": 4 }
    }
  }
}
```

### Phase 2: PLAN (~120 lines)

**Orchestrator does:** Read cp-01.json → dispatch architect → if not auto: present for approval → write cp-02.json

**Architect agent (1, opus):** Full plan with file-by-file changes, AC mapping, 5 critique checks (AC coverage, file existence, scope boundary, complexity match, stack compliance), calibration from `nomos.sh metrics --category-stats`.

**Checkpoint cp-02.json:**
```json
{
  "v": 4, "phase": 2, "feature_id": "F031", "ts": "...", "status": "completed",
  "data": {
    "plan": { "overview", "file_changes", "test_strategy", "critique", "calibration" },
    "env": { ... },
    "flags": { ... },
    "context_summary": { "risk_level", "patterns_to_apply", "antipatterns_to_avoid" }
  }
}
```

### Phase 3: EXECUTE (~130 lines)

**Orchestrator does:** Read cp-02.json → loop (max 3): code-writer → qa-reviewer → verdict → write cp-03.json

**Agents per iteration:** code-writer (sonnet) + qa-reviewer (sonnet). Context optimization: iteration 2+ gets ONLY QA issues + plan overview.

**Checkpoint cp-03.json:**
```json
{
  "v": 4, "phase": 3, "feature_id": "F031", "ts": "...", "status": "completed",
  "data": {
    "verdict": "PASS",
    "iterations_used": 1,
    "files_changed": [...],
    "lines": { "added": 150, "removed": 0 },
    "candidate_antipatterns": [],
    "env": { ... }, "flags": { ... }
  }
}
```

### Phase 4: REVIEW (~140 lines)

**Three gates, sequential-then-parallel:**

```
Gate A (bash, no agent): check-types + lint + tests
  ↓ PASS (fail → 1 fix cycle → fail → ESCALATE)
Gate B (2 agents ‖): code-reviewer + security-reviewer
Gate C (1 agent, conditional): qa-functional-tester
  ↓ ALL PASS (fail → 1 fix cycle → fail → ESCALATE)
State → waiting_approval
```

**Max 2 fix cycles** (not 5 like v3). Phase 3 already had QA loop — if Phase 4 still finds structural issues, escalate.

**Checkpoint cp-04.json:**
```json
{
  "v": 4, "phase": 4, "feature_id": "F031", "ts": "...", "status": "completed",
  "data": {
    "gate": "PASS",
    "gate_a": { "typecheck": true, "lint": true, "tests": "15/15" },
    "gate_b": { "code_review": {...}, "security": {...} },
    "gate_c": { "runtime": true, "ac_results": { "met": 4, "total": 4 } },
    "fix_cycles": 0,
    "env": { ... }, "flags": { ... }
  }
}
```

### Phase 5: SHIP (~100 lines)

**No agents — pure git/state:**
- Commit → rebase → post-rebase validate → push + PR → release ports → optional cleanup
- **Default: PR mode** — push branch, create PR via `gh`, state stays `waiting_approval`, pipeline stops for human review
- Merge mode (explicit `-m` flag): merge locally to main, state → `verified`
- After PR merge (manual or CI): run `/nomos -l F0XX` to trigger Phase 6 learning

**Checkpoint cp-05.json:**
```json
{
  "v": 4, "phase": 5, "feature_id": "F031", "ts": "...", "status": "completed",
  "data": {
    "action": "pr",
    "pr_url": "https://github.com/.../pull/42",
    "ports_released": true,
    "worktree_cleaned": false,
    "final_state": "waiting_approval"
  }
}
```

### Phase 6: LEARN (~80 lines)

**Conditional gate:** Skip if S-size + 1 iteration + 0 issues + 0 candidate antipatterns.

**Historian agent (0 or 1, haiku):** Updates metrics.json, patterns.json, antipatterns.json, insights/. Runs freshness check. Compares actual vs expected metrics.

## Files to Create

```
.claude/skills/nomos/steps/phase-00-router.md        (~40 lines)
.claude/skills/nomos/steps/phase-01-understand.md     (~150 lines)
.claude/skills/nomos/steps/phase-02-plan.md           (~120 lines)
.claude/skills/nomos/steps/phase-03-execute.md        (~130 lines)
.claude/skills/nomos/steps/phase-04-review.md         (~140 lines)
.claude/skills/nomos/steps/phase-05-ship.md           (~100 lines)
.claude/skills/nomos/steps/phase-06-learn.md          (~80 lines)
.claude/skills/nomos/references/checkpoint-schema.md  (~120 lines)
.claude/skills/nomos/references/agent-contracts.md    (~200 lines)
.claude/agents/scout.md                               (~80 lines)
.claude/agents/architect.md                           (~80 lines)
.claude/agents/historian.md                           (~60 lines)
```

## Files to Modify

```
.claude/skills/nomos/SKILL.md                         # Rewrite: 6-phase pipeline
.claude/agents/code-reviewer.md                       # Expand: absorb quality + coverage
.claude/skills/nomos/references/cli-reference.md      # Update: v4 phases, -m flag replaces -pr
.claude/skills/nomos/references/state-machine.md      # Update: phase-to-state mapping
.claude/skills/nomos/references/quality-gates.md      # Update: map to v4 gates
.claude/skills/nomos/references/scripts-reference.md  # Update: note v4 support
.claude/skills/nomos/references/parallel-execution.md # Rewrite: v4 dispatch model
```

## Files to Deprecate (add header comment, keep for rollback)

```
.claude/skills/nomos/steps/step-00-init.md through step-06-finish.md  (7 files)
.claude/skills/nomos/templates/00-context.md through 06-finish.md     (7 files)
.claude/skills/nomos/references/agent-prompts.md
.claude/skills/nomos/references/output-formats.md
.claude/agents/load-learnings.md
.claude/agents/explore-codebase.md
.claude/agents/explore-docs.md
.claude/agents/code-quality-reviewer.md
.claude/agents/test-coverage-analyzer.md
```

**Migration strategy:** Keep all deprecated files with `> DEPRECATED: v3` header. v4 phase files coexist alongside v3 step files. SKILL.md points to v4. If v4 fails, revert SKILL.md's FIRST ACTION to `step-00-init.md` for instant rollback.

## Execution Order

1. Create 3 new agent definitions (scout, architect, historian)
2. Expand code-reviewer agent
3. Create checkpoint-schema.md and agent-contracts.md references
4. Create all 7 phase files (phase-00 through phase-06)
5. Rewrite SKILL.md (point FIRST ACTION to phase-00-router.md)
6. Update remaining reference files
7. Add deprecation headers to old files
8. Test: run `/nomos F0XX` on a small feature
9. Verify: all 6 checkpoints written, feature reaches waiting_approval, PR created

## Verification

1. `/nomos -s` still works (session dashboard — unchanged)
2. `/nomos F0XX` routes to phase-00-router → phase-01-understand
3. `/nomos verify F0XX` routes to nomos-verify (unchanged)
4. `/nomos refactor ...` routes to nomos-refactor (unchanged)
5. `/nomos improve` routes to nomos-improve (unchanged)
6. All flags work: `-a`, `-t`, `-m` (merge, skip PR), `-r`, `-p`, `-v`, `-l`, `-i`, `-c`, `-f N`
   - `-pr` flag removed (PR is now default). `-m` flag added for local merge mode.
7. Resume works: checkpoint scan finds highest completed phase
8. Output: 6 JSON checkpoints in `.nomos/output/{feature_id}/`
9. State machine: same transitions, same `nomos.sh` commands

## Comparison

| Metric | v3 | v4 |
|--------|----|----|
| Steps | 7 | 6 phases |
| Step file lines | 1967 | ~760 |
| Agent calls (typical M feature) | 12-15 | 6-9 |
| Output per feature | ~700 lines markdown | ~170 lines JSON |
| Context pollution between steps | Yes (accumulated) | None (JSON handoff) |
| Review fix cycles | 5 max | 2 max |
| Learning | Always runs | Conditional |
| Total agents | 12 | 9 |
| PR mode | Opt-in (-pr flag) | Default |
| Estimated time (M feature) | 20-40 min | 12-25 min |
