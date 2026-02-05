---
name: nomos
description: NOMOS autonomous feature development - systematic implementation from backlog to production using worktrees, learnings, and quality gates. Use when implementing features tracked in features.json.
argument-hint: "[-a] [-t] [-pr] [-i] [-r <feature-id>] <feature-id>"
allowed-tools:
  # File operations (core)
  - Read
  - Write
  - Edit
  - Glob
  - Grep

  # Research & documentation
  - WebSearch
  - WebFetch
  - mcp__context7__resolve-library-id
  - mcp__context7__query-docs

  # Task agents (all NOMOS subagents)
  - Task(*)

  # Browser testing (Playwright MCP)
  - mcp__playwright__*
  - mcp__plugin_playwright_playwright__*

  # Git operations
  - Bash(git *)
  - Bash(gh *)

  # Build tools
  - Bash(bun *)
  - Bash(bunx *)
  - Bash(npm *)
  - Bash(npx *)
  - Bash(node *)
  - Bash(turbo *)
  - Bash(biome *)
  - Bash(tsc *)

  # File system operations
  - Bash(ls *)
  - Bash(mkdir *)
  - Bash(cp *)
  - Bash(mv *)
  - Bash(rm *)
  - Bash(cat *)
  - Bash(touch *)
  - Bash(tree *)
  - Bash(find *)
  - Bash(chmod *)
  - Bash(echo *)
  - Bash(pwd)

  # Search & text processing
  - Bash(grep *)
  - Bash(rg *)
  - Bash(fd *)
  - Bash(jq *)
  - Bash(head *)
  - Bash(tail *)
  - Bash(wc *)
  - Bash(sort *)
  - Bash(uniq *)
  - Bash(diff *)
  - Bash(sed *)
  - Bash(awk *)
  - Bash(xargs *)

  # Database & utilities
  - Bash(sqlite3 *)
  - Bash(curl *)
  - Bash(timeout *)
  - Bash(gtimeout *)
  - Bash(lsof *)
  - Bash(pkill *)
  - Bash(kill *)

  # Shell constructs
  - Bash(for *)
  - Bash(while *)
  - Bash(bash *)
  - Bash(sh *)
---

<objective>
Execute systematic feature development workflows using the NOMOS v2 methodology. This skill uses progressive step loading, parallel verification, git worktrees for isolation, and a self-learning system to improve over time.
</objective>

<quick_start>
**Basic usage:**

```bash
/nomos F016
```

**Recommended workflow (autonomous):**

```bash
/nomos -a F016
```

**Full pipeline with tests and PR:**

```bash
/nomos -a -t -pr F016
```

**Flags:**

- `-a` (auto): Skip confirmations, full pipeline
- `-t` (test): Include test creation/run
- `-pr` (pull-request): Create PR at end
- `-i` (interactive): Configure flags interactively
- `-r` (resume): Resume from previous state

See `<parameters>` for complete flag list.
</quick_start>

<parameters>

<flags>
**Enable flags (turn ON):**
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
| `-n N` | `--parallel N` | Run N features in parallel (each in separate worktree) — **design only, not yet implemented** |

**Disable flags (turn OFF):**
| Short | Long | Description |
|-------|------|-------------|
| `-A` | `--no-auto` | Disable auto mode |
| `-T` | `--no-test` | Disable test mode |
| `-PR` | `--no-pull-request` | Disable PR mode |
| `-C` | `--no-cleanup` | Disable cleanup (keep worktree) |
</flags>

<examples>
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
</examples>

</parameters>

<output_structure>
**All outputs saved to `.nomos/output/{feature_id}/` (7 files):**

```
.nomos/output/F016/
├── 00-context.md      # Config, feature spec, progress (7 rows)
├── 01-context.md      # Learnings + codebase + research (merged)
├── 02-plan.md         # Implementation plan
├── 03-execute.md      # Execution log
├── 04-verify.md       # Static + runtime + review (unified)
├── 05-merge.md        # Merge log
└── 06-finish.md       # Learning extraction + ship
```

**Worktree location:** `.nomos/worktrees/{feature_id}/`
</output_structure>

<resume_workflow>
**Resume mode (`-r {feature-id}`):**

When provided, step-00 will:

1. Locate the feature folder in `.nomos/output/`
2. Restore state from `00-context.md`
3. Find the last completed step
4. Continue from the next step

If no feature ID provided with `-r`, uses `currentFeature` from state.
</resume_workflow>

<workflow>
**NOMOS v2 Pipeline (7 steps):**

```
00-init → 01-context → 02-plan → 03-execute-loop → 04-verify → 05-merge → 06-finish
           (parallel)              (loop: max 3)      (parallel)              (parallel)
           3 agents                2 agents/iter       3 tracks               2 tracks
```

**Standard flow:**
1. Parse flags, interactive config (if -i), and feature ID
2. If `-r`: Execute resume workflow
3. If `-s`: Show status and exit
4. If `-l`: Run learning extraction only
5. Create/verify worktree at `.nomos/worktrees/{feature_id}`
6. Load step-01-context.md → **3 parallel agents**: load-learnings, explore-codebase, research-docs
7. Load step-02-plan.md → create implementation strategy
8. If `-p`: Stop here (plan only mode)
9. Load step-03-execute.md → execute-verify loop (code-writer + qa-reviewer, max 3 iterations)
10. Load step-04-verify.md → **3 parallel tracks**: static-checks, runtime-verify, code-review
11. If `-v`: Stop here (verify only mode)
12. Load step-05-merge.md → rebase, validate, merge
13. Load step-06-finish.md → **2 parallel tracks**: extract-learnings, ship-feature (if -pr)
</workflow>

<state_variables>
**Persist throughout all steps:**

| Variable | Type | Description |
|----------|------|-------------|
| `{feature_id}` | string | Feature identifier (e.g., F016) |
| `{feature_title}` | string | Feature title from features.json |
| `{feature_description}` | string | Feature description |
| `{acceptance_criteria}` | list | Success criteria from features.json |
| `{auto_mode}` | boolean | Skip confirmations |
| `{test_mode}` | boolean | Include test steps |
| `{pr_mode}` | boolean | Create pull request at end |
| `{plan_only}` | boolean | Stop after planning |
| `{verify_only}` | boolean | Run verify step only |
| `{learn_only}` | boolean | Run learning extraction only |
| `{interactive_mode}` | boolean | Configure flags interactively |
| `{resume_mode}` | boolean | Resume from previous state |
| `{cleanup_mode}` | boolean | Remove worktree after merge |
| `{from_step}` | number\|null | Resume from this step (0-6), null if full run |
| `{worktree_path}` | string | Path to feature worktree |
| `{output_dir}` | string | **ABSOLUTE** path to output directory (project root, NOT worktree) |
| `{learned_patterns}` | list | Patterns loaded from learning system |
| `{risk_level}` | string | LOW/MEDIUM/HIGH from context analysis |
| `{max_execute_iterations}` | number | Max execute-verify loop iterations (default: 3) |
| `{phase_models}` | object | Per-phase model defaults: `{ planning: "opus", coding: "sonnet", qa_review: "sonnet", learning: "haiku" }` |

</state_variables>

<entry_point>

**FIRST ACTION:** Load `steps/step-00-init.md`

Step 00 handles:

- Flag parsing
- Interactive configuration (if -i, absorbed from old step-00i)
- Feature validation from features.json
- Resume mode detection
- Worktree creation/verification
- Output folder creation
- State variable initialization

After initialization, step-00 loads step-01-context.md.

</entry_point>

<step_files>
**Progressive loading - only load current step:**

| Step | File | Mode | Purpose |
|------|------|------|---------|
| 00 | `steps/step-00-init.md` | sequential | Parse flags, interactive config, setup worktree |
| 01 | `steps/step-01-context.md` | **3 parallel agents** | Load learnings + explore codebase + research docs |
| 02 | `steps/step-02-plan.md` | sequential | File-by-file implementation strategy |
| 03 | `steps/step-03-execute.md` | **execute-verify loop (max 3)** | Orchestrate code-writer + qa-reviewer agents |
| 04 | `steps/step-04-verify.md` | **3 parallel tracks** | Static checks + runtime verify + code review |
| 05 | `steps/step-05-merge.md` | sequential | Rebase, validate, merge to main |
| 06 | `steps/step-06-finish.md` | **2 parallel tracks** | Extract learnings + ship (PR) |

</step_files>

<parallel_execution>

## Parallel Execution Architecture

See `references/parallel-execution.md` for full architecture details.

**Summary:** Steps 01 (3 agents), 03 (2-agent loop), 04 (3 tracks), and 06 (2 tracks) use parallel execution. Always launch parallel agents/tracks in a SINGLE message. Servers only in Track B of step-04.

</parallel_execution>

<execution_rules>

- **Load one step at a time** - Only load the current step file
- **Work in worktree** - All code changes happen in `.nomos/worktrees/{feature_id}`
- **Persist state variables** across all steps
- **Follow next_step directive** at end of each step
- **Save outputs** to `.nomos/output/{feature_id}/`
- **Use parallel agents** for independent tasks (steps 01, 04, 06)

<critical>
**FILE WRITING RULE:**
- ALWAYS use the **Write tool** for creating/writing files
- NEVER use `cat >`, `cat >>`, or heredocs (`<< EOF`) for file creation
- `cat` is ONLY for reading files, not writing
- This applies to: .env files, output markdown files, JSON files, all file creation

**OUTPUT PATH RULE:**
- `{output_dir}` is ALWAYS an **ABSOLUTE** path at the project root (e.g., `/Users/.../nomos-ai/.nomos/output/F016`)
- NEVER construct a relative `.nomos/output/` path — it will resolve inside the worktree when the agent has `cd`'d there
- Output files written inside the worktree are LOST when the worktree is cleaned up after merge
- Code changes go in `{worktree_path}`. Pipeline logs go in `{output_dir}`. These are DIFFERENT locations.
</critical>

## Scripts

All operations use `scripts/nomos.sh` and `scripts/nomos-verify.sh`:

```bash
# Feature state management
bash .claude/skills/nomos/scripts/nomos.sh state <action> <feature_id>

# Port management
bash .claude/skills/nomos/scripts/nomos.sh ports allocate|release|cleanup <feature_id>

# Template initialization
bash .claude/skills/nomos/scripts/nomos.sh init <feature_id> <args...>

# Feature diff/metrics/health
bash .claude/skills/nomos/scripts/nomos.sh diff <feature_id> [--stat|--names|--summary]
bash .claude/skills/nomos/scripts/nomos.sh metrics <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh metrics <feature_id> --category-stats
bash .claude/skills/nomos/scripts/nomos.sh health <feature_id> [--wait|--check]

# Learning system (insights, patterns)
bash .claude/skills/nomos/scripts/nomos.sh insights <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh patterns <feature_id> [--for-plan|--for-code|--for-qa]

# Server lifecycle (step-04 Track B)
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> start|wait|smoke|stop|status
```

## Smart Agent Strategy

**Available agents:**
- `explore-codebase` - Find existing patterns, files, utilities (step-01)
- `explore-docs` - Research library docs via **Context7 MCP** (step-01)
- `websearch` - Find approaches, best practices, gotchas (step-01)
- `code-writer` - Implements plan or fixes QA issues, full write access (step-03 loop)
- `qa-reviewer` - Reviews changes against plan/ACs, read-only (step-03 loop)
- `qa-functional-tester` - Test acceptance criteria in running app (step-04 Track B)
- `qa-smoke-tester` - Runtime smoke test (nomos-verify skill only, not in NOMOS pipeline)
- `security-reviewer` - OWASP security review (step-04 Track C)
- `code-quality-reviewer` - Code quality & patterns review (step-04 Track C)
- `test-coverage-analyzer` - Test coverage gap analysis (step-04 Track C)

<critical>
**DOCUMENTATION RESEARCH RULE:**
- Library/framework documentation → **Context7 MCP ONLY** (via `explore-docs`)
- General approaches, patterns → WebSearch is acceptable
- NEVER use WebSearch for specific API syntax or library usage
</critical>

**Launch agents based on task complexity:**

| Complexity | Agents | When |
|------------|--------|------|
| Simple | 1-2 | Bug fix, small tweak |
| Medium | 2-4 | New feature in familiar stack |
| Complex | 4-7 | Unfamiliar libraries, integrations |
| Major | 6-10 | Multiple systems, many unknowns |

</execution_rules>

<parallel_features_design>

**Status:** Design only — not yet implemented. See `references/parallel-execution.md#appendix-parallel-features-design`.

</parallel_features_design>

<nomos_unique>

## NOMOS-Specific Features

1. **Feature-Driven** — `features.json` with state machine (`pending → in_progress → waiting_approval → verified`) and traceability
2. **Worktree Isolation** — Each feature in `.nomos/worktrees/{feature_id}` with branch `nomos/{feature_id}`
3. **Self-Learning** — Patterns, anti-patterns, and metrics extracted per feature; injected into future planning (see `references/output-formats.md`)
4. **Quality Gates** — Specification-first, test coverage, traceability, security scanning, browser validation (see `references/quality-gates.md`)
5. **Memory Persistence** — Session insights, checkpoints, cross-feature recommendations

</nomos_unique>

<success_criteria>

- Each step loaded progressively
- All validation checks passing
- Outputs saved to `.nomos/output/{feature_id}/` (7 files)
- Tests passing if `{test_mode}` enabled
- Feature merged and state updated
- Learnings extracted
- Clear completion summary provided

</success_criteria>

<git_skill_policy>

## Git Skill Compatibility

NOMOS uses its own git operations during steps 00-06. See:
- `references/git-operations.md` — **Merge verification, worktree management, commit templates**
- `references/merge-strategies.md#git-skill-compatibility` — Conflict resolution, skill compatibility

**Key rule:** During NOMOS workflow, use NOMOS git operations only. Outside NOMOS workflow, generic git skills are fine.

**Critical:** All merges MUST be verified using the pattern in `references/git-operations.md#merge-verification`.

</git_skill_policy>
