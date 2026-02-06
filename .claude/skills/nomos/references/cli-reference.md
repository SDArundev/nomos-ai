# NOMOS CLI Reference

## Sub-commands

`/nomos` is the single entry point that routes to specialized pipelines:

| Command | Pipeline | Description |
|---------|----------|-------------|
| `/nomos F031` | 7-step feature | Implement feature from backlog (default) |
| `/nomos verify F031` | 5-step analysis | Verification, analysis, reporting |
| `/nomos verify --audit` | 5-step analysis | Full codebase health audit (deep + all) |
| `/nomos refactor -t rename X Y` | 9-step refactor | Safe systematic refactoring |
| `/nomos improve` | 5-step meta | NOMOS system self-improvement |
| `/nomos -s` | — | Session dashboard (status + recommendations) |

Sub-commands are routed in `step-00-init.md` before flag parsing. The first positional argument (`verify`, `refactor`, `improve`) determines which sub-skill pipeline loads.

---

## Feature Flags

### Enable Flags (turn ON)

| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Autonomous mode: skip confirmations, auto-approve plans |
| `-t` | `--test` | Test mode: include test creation and runner steps |
| `-r` | `--resume` | Resume mode: continue from a previous feature |
| `-pr` | `--pull-request` | PR mode: create pull request at end |
| `-i` | `--interactive` | Interactive mode: configure flags via AskUserQuestion |
| `-p` | `--plan` | Plan only: stop after step 02 |
| `-v` | `--verify` | Verify only: run step 04 verify only |
| `-l` | `--learn` | Learn only: run step 06 learning extraction |
| `-s` | `--status` | Status: show project status and exit |
| `-c` | `--cleanup` | Cleanup: remove worktree after merge |
| `-f N` | `--from-step N` | Resume from step N (0-6), loading state from existing outputs |
| `-n N` | `--parallel N` | Run N features in parallel (design only, not implemented) |

### Disable Flags (turn OFF)

| Short | Long | Description |
|-------|------|-------------|
| `-A` | `--no-auto` | Disable auto mode |
| `-T` | `--no-test` | Disable test mode |
| `-PR` | `--no-pull-request` | Disable PR mode |
| `-C` | `--no-cleanup` | Disable cleanup (keep worktree) |

## Examples

```bash
# Basic - start feature F016
/nomos F016

# Autonomous (skip confirmations)
/nomos -a F016

# Full workflow with tests
/nomos -a -t F016

# With PR creation
/nomos -a -t -pr F016

# With worktree cleanup
/nomos -a -c F016

# Resume previous feature
/nomos -r F016
/nomos -r         # Resume current feature

# Plan only (stop after planning)
/nomos -p F016

# Verify only (run verify step)
/nomos -v F016

# Learn from history
/nomos -l

# Check status
/nomos -s

# Resume from specific step (e.g., re-run verify)
/nomos -f 4 F016

# Resume from planning (skip context)
/nomos -f 2 F016

# Interactive flag config
/nomos -i F016
```

## Resume Workflow

When using `-r {feature-id}`:

1. Locate the feature folder in `.nomos/output/`
2. Restore state from `00-context.md`
3. Find the last completed step
4. Continue from the next step

If no feature ID provided with `-r`, uses `currentFeature` from state.
