# NOMOS CLI Reference

## Sub-commands

`/nomos` is the single entry point that routes to specialized pipelines:

| Command | Pipeline | Description |
|---------|----------|-------------|
| `/nomos F031` | 6-phase feature (v4) | Implement feature from backlog (default) |
| `/nomos verify F031` | 5-step analysis | Verification, analysis, reporting |
| `/nomos verify --audit` | 5-step analysis | Full codebase health audit (deep + all) |
| `/nomos refactor -t rename X Y` | 9-step refactor | Safe systematic refactoring |
| `/nomos improve` | 5-step meta | NOMOS system self-improvement |
| `/nomos swarm audit` | 4-phase swarm | Multi-agent collaborative feature audit |
| `/nomos swarm research F045` | 4-phase swarm | Deep research before implementing |
| `/nomos swarm discuss "topic"` | 4-phase swarm | Multi-perspective architecture debate |
| `/nomos swarm fix` | 2-phase swarm | Execute remediation for audit findings |
| `/nomos swarm learn` | 4-phase swarm | Learning system audit and improvement |
| `/nomos -s` | — | Session dashboard (status + recommendations) |

Sub-commands are routed in `phase-00-router.md` before flag parsing. The first positional argument (`verify`, `refactor`, `improve`, `swarm`) determines which sub-skill pipeline loads.

---

## Feature Flags

### Enable Flags (turn ON)

| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Autonomous mode: skip confirmations, auto-approve plans |
| `-t` | `--test` | Test mode: include test creation and runner steps |
| `-r` | `--resume` | Resume mode: continue from a previous feature |
| `-m` | `--merge` | Merge mode: merge to main after PR (v4, replaces -pr) |
| `-i` | `--interactive` | Interactive mode: configure flags via AskUserQuestion |
| `-p` | `--plan` | Plan only: stop after Phase 2 |
| `-v` | `--verify` | Verify only: run Phase 4 review only |
| `-l` | `--learn` | Learn only: run Phase 6 learning extraction |
| `-s` | `--status` | Status: show project status and exit |
| `-c` | `--cleanup` | Cleanup: remove worktree after ship |
| `-f N` | `--from-phase N` | Resume from phase N (0-6), loading state from checkpoints |

### Disable Flags (turn OFF)

| Short | Long | Description |
|-------|------|-------------|
| `-A` | `--no-auto` | Disable auto mode |
| `-T` | `--no-test` | Disable test mode |
| `-M` | `--no-merge` | Disable merge mode (PR only, no merge) |
| `-C` | `--no-cleanup` | Disable cleanup (keep worktree) |

## Examples

```bash
# Basic - start feature F016
/nomos F016

# Autonomous (skip confirmations)
/nomos -a F016

# Full workflow with tests
/nomos -a -t F016

# Full auto: implement + test + merge
/nomos -a -t -m F016

# With worktree cleanup
/nomos -a -c F016

# Resume previous feature
/nomos -r F016
/nomos -r         # Resume current feature

# Plan only (stop after planning)
/nomos -p F016

# Verify only (run review phase)
/nomos -v F016

# Learn from history
/nomos -l

# Check status
/nomos -s

# Resume from specific phase (e.g., re-run review)
/nomos -f 4 F016

# Resume from planning (skip understand)
/nomos -f 2 F016

# Interactive flag config
/nomos -i F016
```

## Script Commands (nomos.sh)

| Command | Purpose |
|---------|---------|
| `state <action> [id]` | Feature state management (start, claim, complete, verify, reset, fail, retry, preverify, get, next) |
| `ports <action> [id]` | Port allocation (allocate, release, cleanup) |
| `init <id> <args>` | Initialize output templates |
| `diff <id> [mode]` | Show feature changes (--names, --stat, --summary) |
| `metrics <id>` | Collect feature metrics as JSON |
| `metrics <id> --category-stats` | Category-level benchmarks |
| `health <id> [mode]` | Check server health (--wait, --check) |
| `insights <id>` | Top 3 relevant insights (scored) |
| `patterns <id> [mode]` | Filtered patterns (--for-plan, --for-code, --for-qa) |
| `cleanup [--stale]` | Clean up stale features and orphaned resources |
| `session` | Rich project context dashboard |
| `ingest [--dry-run]` | Ingest verification findings into features.json |

### `ingest` Command

Ingests findings from the latest verification run into features.json:

- **HIGH/CRITICAL issues** → new features with `status: "backlog"`, priority 1 (CRITICAL) or 5 (HIGH)
- **Enhancements** → new features with `status: "backlog"`, priority 100
- **Regressions** → affected features marked `status: "failed"` with `failureReason: "regression_detected"`

> Issues go to **backlog** (not pending) so humans decide what to fix next. Only true regressions create failed entries that demand immediate attention.

Deduplication via `tags` array (e.g., `["verify-ingested", "verify-ingested:SYS-001"]`).

```bash
# Preview what would be ingested
bash .claude/skills/nomos/scripts/nomos.sh ingest --dry-run

# Actually ingest
bash .claude/skills/nomos/scripts/nomos.sh ingest
```

---

## Sub-Skill Flags

### nomos-verify Flags

| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Autonomous mode: skip confirmations |
| `-q` | `--quick` | Quick depth (2 dimensions: bugs + requirements) |
| `-d` | `--deep` | Deep depth (5 dimensions: all) |
| `-f` | `--fix` | Fix mode: create worktree and fix issues found |
| `-s` | `--scope` | Scope: single, range, verified, failed, pending, all |
| `-r` | `--resume` | Resume previous verification session |
| `-o` | `--output` | Custom output directory |
| | `--audit` | Full codebase audit (deep + all + codebase mode) |
| | `--include-planned` | Include pending features in scope (normally excluded from `all`) |

> **Scope note:** `all` means **implemented features only** (verified + in_progress + failed). Pending features with no code are excluded by default. Use `--include-planned` to explicitly include them.

### nomos-swarm Flags

| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Auto-apply recommended actions without confirmation |
| `-f` | `--fix` | Create fix tasks in features.json for broken features |
| `-b N` | `--batch N` | Features per batch (audit mode, default: 5) |
| `-r N` | `--rounds N` | Discussion rounds (discuss mode, default: 2) |
| `-q` | `--quick` | Quick mode: fewer agents (skip tester in audit) |
| `-d` | `--dry-run` | Show fix plan without executing (fix mode) |
| | `--skip-verify` | Skip re-audit offer after fixes (fix mode) |
| | `--prune` | Remove stale entries (learn mode) |

### nomos-refactor Flags

| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Autonomous mode: no confirmations |
| `-t` | `--type` | Refactor type (dependency, move, rename, optimize, extract, inline, modernize, structure) |
| `-d` | `--dry-run` | Show plan without executing |
| `-f` | `--force` | Skip safety checks (dangerous) |
| `-k` | `--keep` | Keep worktree after completion |

---

## Resume Workflow

When using `-r {feature-id}`:

1. Locate the feature folder in `.nomos/output/`
2. Restore state from `00-context.md`
3. Find the last completed step
4. Continue from the next step

If no feature ID provided with `-r`, uses `currentFeature` from state.
