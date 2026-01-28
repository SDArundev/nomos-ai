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
00-init → 01-context → 02-plan → 03-execute → 04-verify → 05-merge → 06-finish
           (parallel)                           (parallel)              (parallel)
           3 agents                             3 tracks               2 tracks
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
9. Load step-03-execute.md → implement in worktree
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
| `{output_dir}` | string | Path to output directory |
| `{learned_patterns}` | list | Patterns loaded from learning system |
| `{risk_level}` | string | LOW/MEDIUM/HIGH from context analysis |

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
| 03 | `steps/step-03-execute.md` | sequential | Task-driven implementation in worktree |
| 04 | `steps/step-04-verify.md` | **3 parallel tracks** | Static checks + runtime verify + code review |
| 05 | `steps/step-05-merge.md` | sequential | Rebase, validate, merge to main |
| 06 | `steps/step-06-finish.md` | **2 parallel tracks** | Extract learnings + ship (PR) |

</step_files>

<parallel_execution>

## Parallel Execution Architecture

### Step 01: Context (3 parallel agents)
| Agent | Purpose | Always? |
|-------|---------|---------|
| load-learnings | Patterns, metrics, risk, code knowledge | Yes |
| explore-codebase | Find files, patterns, utilities | Yes |
| research-docs | Library docs via Context7 MCP | If unfamiliar libs |

### Step 04: Verify (3 parallel tracks)
| Track | Purpose | Server needed? |
|-------|---------|----------------|
| A: Static | typecheck + lint + unit tests | No |
| B: Runtime | start servers ONCE → smoke → QA → stop | Yes |
| C: Review | security + quality + coverage agents | No |

**Gate:** ALL tracks must pass. Failed tracks use classify→fix→re-verify loop (up to 3 cycles).

### Step 06: Finish (2 parallel tracks)
| Track | Purpose | Always? |
|-------|---------|---------|
| A: Learnings | metrics, patterns, retrospective | Yes |
| B: Ship | push + create PR | If -pr flag |

### Rules
- Always launch parallel agents/tracks in a SINGLE message
- Never start servers except in Track B of step-04
- Servers started ONCE and stopped within the same track
- Failed tracks retried individually, not all tracks

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
</critical>

## Unified Script

All script operations use `scripts/nomos.sh` with subcommands:

```bash
# Feature state management
bash .claude/skills/nomos/scripts/nomos.sh state <action> <feature_id>
# Actions: start, claim, complete, verify, reset, preverify, get, next

# Port management
bash .claude/skills/nomos/scripts/nomos.sh ports allocate <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh ports release <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh ports cleanup

# Template initialization
bash .claude/skills/nomos/scripts/nomos.sh init <feature_id> <args...>
```

## Smart Agent Strategy

**Available agents:**
- `explore-codebase` - Find existing patterns, files, utilities (step-01)
- `explore-docs` - Research library docs via **Context7 MCP** (step-01)
- `websearch` - Find approaches, best practices, gotchas (step-01)
- `qa-smoke-tester` - Runtime smoke test (step-04 Track B)
- `qa-functional-tester` - Test acceptance criteria in running app (step-04 Track B)
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

## Parallel Features Design (--parallel N)

**Status:** Design only — not yet implemented.

**Concept:** Run N features simultaneously, each in its own worktree with unique ports.

```
/nomos -n 3        # Run next 3 available features in parallel
/nomos -n 2 -a     # Run 2 features autonomously in parallel
```

**Architecture:**
1. Orchestrator selects N features (using `state next` N times)
2. Each feature gets its own worktree + unique ports (already supported)
3. Features run the full pipeline independently
4. Learning extraction happens AFTER ALL features complete (not per-feature)
5. Orchestrator tracks progress and reports aggregate status

**Port allocation:** Already handled — each feature gets `base + (feature_num * 10)`.

**Merge order:** Features merge in dependency order. If F002 depends on F001, F001 merges first.

**Learning aggregation:** Patterns from all N features collected, then deduplicated and scored together.

**Limitations:**
- Each feature runs in a separate Claude Code session (not parallel within one session)
- Database conflicts possible if features modify same tables
- Max N = 4 (practical limit for port ranges and system resources)

</parallel_features_design>

<nomos_unique>

## NOMOS-Specific Features

### 1. Feature-Driven Development
- Features tracked in `features.json` with acceptance criteria
- State machine: `pending → in_progress → waiting_approval → verified`
- Requirement traceability (REQ-FXXX → FXXX)

### 2. Git Worktree Isolation
- Each feature gets isolated worktree at `.nomos/worktrees/{feature_id}`
- Branch naming: `nomos/{feature_id}`
- Clean merge back to main

### 3. Self-Learning System
- Patterns extracted from successful features
- Anti-patterns recorded from failures
- Metrics tracked: duration, files changed, retries
- Code-level patterns categorized and enhanced with Context7
- Learnings injected into planning phase

### 4. Quality Gates (Constitutional)
- ART-001: Specification-first
- ART-002: Test coverage
- ART-008: Requirement traceability
- Security scanning (secrets, XSS)
- Browser validation for UI features

### 5. Memory Persistence
- Session context preserved across conversations
- Decisions recorded for future reference
- Checkpoints for state snapshots

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

NOMOS has its **own git operations** that must NOT be replaced by generic git skills.

**Why NOMOS handles git internally:**

| Aspect | Git Skills | NOMOS Requirement |
|--------|------------|-------------------|
| Commit format | `type(scope): msg` | `feat({feature_id}): {title}` + AC summary |
| Push behavior | Auto-push always | Controlled (merge step only) |
| Staging | `git add .` | Selective per worktree |
| Merge strategy | `--no-commit` | `--no-ff` to preserve history |
| State tracking | None | Updates features.json |
| Worktrees | Not supported | Core workflow |

**Rules:**

- **During NOMOS workflow (steps 00-06):** Use NOMOS git operations only
- **Outside NOMOS workflow:** Git skills can be used for ad-hoc commits
- **git-create-pr:** Compatible with step-06-finish but NOMOS has richer context
- **git-merge:** NOT compatible - different strategies

**Rationale:** NOMOS needs feature traceability, state machine updates, and worktree isolation that generic git skills don't provide.

</git_skill_policy>
