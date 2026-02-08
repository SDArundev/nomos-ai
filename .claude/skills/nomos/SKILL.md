---
name: nomos
description: >
  NOMOS autonomous development ecosystem - single entry point for feature implementation,
  verification, refactoring, and system improvement. Routes to sub-skills automatically.
  Triggers: "/nomos", "/nomos F0XX", "implement feature", "nomos F0XX", "autonomous feature",
  "feature pipeline", "nomos session", "nomos status".
---

# NOMOS v4

Autonomous development ecosystem with JSON checkpoints, native agent swarm, and tmux multi-session.

## Quick Start

```bash
/nomos -s                       # Session dashboard
/nomos F031                     # Implement feature
/nomos -a -t -m F031            # Full auto: implement + test + merge
/nomos verify F031              # Verify single feature
/nomos verify --audit           # Full codebase audit
/nomos refactor -t rename X Y   # Safe refactoring
/nomos improve                  # Improve NOMOS system
```

**Feature flags:** `-a` (auto), `-t` (test), `-m` (merge), `-r` (resume), `-i` (interactive), `-p` (plan-only), `-v` (verify-only), `-l` (learn-only), `-c` (cleanup), `-f N` (from-phase N)

See `references/cli-reference.md` for all flags and examples.

## Pipeline (6 phases)

```
Phase 0: ROUTE       → sub-command dispatch
Phase 1: UNDERSTAND  → init + scout (Task, haiku)           → cp-01.json → CLEAR
Phase 2: PLAN        → architect (Task, opus)                → cp-02.json → CLEAR
Phase 3: EXECUTE     → code-writer + qa-reviewer loop        → cp-03.json → CLEAR
Phase 4: REVIEW      → Gate A (bash) + Gate B (2 Tasks) + Gate C (Task)
                                                             → cp-04.json → CLEAR
Phase 5: SHIP        → git ops, PR, no agents               → cp-05.json → CLEAR
Phase 6: LEARN       → historian (Task, haiku, conditional)  → cp-06.json → DONE
```

**FIRST ACTION:** Load `steps/phase-00-router.md`

## Output Structure

```
.nomos/output/{feature_id}/
├── cp-01.json   # Understand: context + scout results
├── cp-02.json   # Plan: architect output
├── cp-03.json   # Execute: code-writer + qa loop results
├── cp-04.json   # Review: gate A/B/C results
├── cp-05.json   # Ship: git ops + PR
└── cp-06.json   # Learn: patterns + metrics (conditional)
```

**Worktree:** `.nomos/worktrees/{feature_id}/`

## Phase Files

| Phase | File | Dispatch |
|-------|------|----------|
| 0 | `steps/phase-00-router.md` | sub-command routing |
| 1 | `steps/phase-01-understand.md` | scout (Task, haiku) |
| 2 | `steps/phase-02-plan.md` | architect (Task, opus) |
| 3 | `steps/phase-03-execute.md` | code-writer + qa-reviewer loop (Task, sonnet) |
| 4 | `steps/phase-04-review.md` | Gate A (bash) + Gate B (2x Task) + Gate C (Task) |
| 5 | `steps/phase-05-ship.md` | orchestrator (no agents) |
| 6 | `steps/phase-06-learn.md` | historian (Task, haiku, conditional) |

## Agents (9 total)

| Agent | Model | Phase | Role |
|-------|-------|-------|------|
| scout | haiku | 1 | Context gathering (replaces load-learnings + explore-codebase + explore-docs) |
| architect | opus | 2 | Implementation planning with self-critique |
| code-writer | sonnet | 3, 4 | Implementation + fix cycles (resume-capable) |
| qa-reviewer | sonnet | 3 | Code review per iteration (stateless) |
| code-reviewer | sonnet | 4 | Comprehensive review: bugs + quality + coverage |
| security-reviewer | sonnet | 4 | Security analysis |
| qa-functional-tester | sonnet | 4 | Functional QA (conditional) |
| qa-smoke-tester | sonnet | 4 | Smoke testing |
| historian | haiku | 6 | Learning extraction (conditional) |

## Critical Rules

**FILE WRITING:**
- ALWAYS use **Write tool** for creating files
- NEVER use `cat >`, `cat >>`, or heredocs for file creation

**OUTPUT PATH:**
- `{output_dir}` is ALWAYS **ABSOLUTE** (project root, not worktree)
- Code changes -> `{worktree_path}`
- Checkpoint JSON -> `{output_dir}`

**CONTEXT CLEARING:**
- Each phase reads ONLY the previous checkpoint JSON
- Agents get FRESH context windows via Task tool
- Checkpoints are the sole inter-phase channel

**AGENT DISPATCH:**
- ALL agents dispatched via native Task tool (not inline prompts)
- code-writer uses `resume` parameter for iteration 2+
- Gate B agents use `run_in_background` for parallelism

**MERGE VERIFICATION:**
- All merges MUST be verified per `references/git-operations.md#merge-verification`

## References

| File | When |
|------|------|
| `references/cli-reference.md` | Flags, examples, resume workflow |
| `references/checkpoint-schema.md` | Checkpoint JSON schema |
| `references/agent-contracts.md` | Agent dispatch contracts |
| `references/scripts-reference.md` | nomos.sh commands |
| `references/parallel-execution.md` | v4 dispatch model |
| `references/quality-gates.md` | Verification gates |
| `references/git-operations.md` | Merge verification, worktrees |
| `references/state-machine.md` | Feature state transitions |

## Rollback

v3 files preserved with deprecation headers. Instant rollback:
Change line above from `steps/phase-00-router.md` to `steps/step-00-init.md`.
