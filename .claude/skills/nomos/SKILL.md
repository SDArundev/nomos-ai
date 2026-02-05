---
name: nomos
description: >
  NOMOS autonomous feature development - systematic implementation from backlog to production
  using worktrees, learnings, and quality gates. Use when implementing features tracked in features.json.
  Triggers: "/nomos", "implement feature", "nomos F0XX", "autonomous feature", "feature pipeline".
---

# NOMOS

Autonomous feature development with worktree isolation, parallel verification, and self-learning.

## Quick Start

```bash
/nomos F016           # Basic
/nomos -a F016        # Autonomous (skip confirmations)
/nomos -a -t -pr F016 # Full: auto + tests + PR
/nomos -r F016        # Resume previous
/nomos -s             # Status
```

**Flags:** `-a` (auto), `-t` (test), `-pr` (pull-request), `-r` (resume), `-i` (interactive), `-p` (plan-only), `-v` (verify-only), `-c` (cleanup)

See `references/cli-reference.md` for all flags and examples.

## Pipeline

```
00-init → 01-context → 02-plan → 03-execute → 04-verify → 05-merge → 06-finish
          (3 agents)             (loop x3)    (3 tracks)             (2 tracks)
```

**FIRST ACTION:** Load `steps/step-00-init.md`

## Output Structure

```
.nomos/output/{feature_id}/
├── 00-context.md   # Config, feature spec, progress
├── 01-context.md   # Learnings + codebase + research
├── 02-plan.md      # Implementation plan
├── 03-execute.md   # Execution log
├── 04-verify.md    # Static + runtime + review
├── 05-merge.md     # Merge log
└── 06-finish.md    # Learning + ship
```

**Worktree:** `.nomos/worktrees/{feature_id}/`

## Step Files

| Step | File | Mode |
|------|------|------|
| 00 | `steps/step-00-init.md` | sequential |
| 01 | `steps/step-01-context.md` | 3 parallel agents |
| 02 | `steps/step-02-plan.md` | sequential |
| 03 | `steps/step-03-execute.md` | loop (max 3) |
| 04 | `steps/step-04-verify.md` | 3 parallel tracks |
| 05 | `steps/step-05-merge.md` | sequential |
| 06 | `steps/step-06-finish.md` | 2 parallel tracks |

## Critical Rules

**FILE WRITING:**
- ALWAYS use **Write tool** for creating files
- NEVER use `cat >`, `cat >>`, or heredocs for file creation

**OUTPUT PATH:**
- `{output_dir}` is ALWAYS **ABSOLUTE** (project root, not worktree)
- Code changes → `{worktree_path}`
- Pipeline logs → `{output_dir}`

**DOCUMENTATION RESEARCH:**
- Library/framework docs → **Context7 MCP** via `explore-docs`
- General patterns → WebSearch acceptable
- NEVER use WebSearch for specific API syntax

**MERGE VERIFICATION:**
- All merges MUST be verified per `references/git-operations.md#merge-verification`

## References

| File | When |
|------|------|
| `references/cli-reference.md` | Flags, examples, resume workflow |
| `references/scripts-reference.md` | nomos.sh commands, agents |
| `references/parallel-execution.md` | Parallel agent architecture |
| `references/quality-gates.md` | Verification gates |
| `references/git-operations.md` | Merge verification, worktrees |
| `references/state-machine.md` | Feature state transitions |
| `references/output-formats.md` | Learning system format |

## NOMOS Features

1. **Feature-Driven** — `features.json` with state machine (pending → in_progress → waiting_approval → verified)
2. **Worktree Isolation** — Each feature in `.nomos/worktrees/{feature_id}` with branch `nomos/{feature_id}`
3. **Self-Learning** — Patterns extracted per feature, injected into future planning
4. **Quality Gates** — Spec-first, test coverage, security scanning, browser validation
5. **Memory Persistence** — Session insights, checkpoints, cross-feature recommendations
