---
name: nomos
description: NOMOS autonomous feature development - systematic implementation from backlog to production using worktrees, learnings, and quality gates. Use when implementing features tracked in features.json.
argument-hint: "[-a] [-t] [-pr] [-i] [-r <feature-id>] <feature-id>"
---

<objective>
Execute systematic feature development workflows using the NOMOS methodology. This skill uses progressive step loading, git worktrees for isolation, and a self-learning system to improve over time.
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
| `-p` | `--plan` | Plan only: stop after step 03 |
| `-v` | `--verify` | Verify only: run step 06 review only |
| `-l` | `--learn` | Learn only: run step 09 learning extraction |
| `-s` | `--status` | Status: show project status and exit |
| `-c` | `--cleanup` | Cleanup: remove worktree after merge |

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

# Verify only (run review step)
/nomos -v F016

# Learn from history
/nomos -l

# Check status
/nomos -s

# Interactive flag config
/nomos -i F016
```
</examples>

</parameters>

<output_structure>
**All outputs saved to `.nomos/output/{feature_id}/`:**

```
.nomos/output/F016/
├── 00-context.md      # Config, feature spec, timestamp
├── 01-context.md      # Loaded learnings and patterns
├── 02-analyze.md      # Analysis findings
├── 03-plan.md         # Implementation plan
├── 04-execute.md      # Execution log
├── 05-validate.md     # Validation results
├── 06-review.md       # Review findings
├── 07-test.md         # Test creation (if -t)
├── 08-merge.md        # Merge log
├── 09-learn.md        # Learning extraction
└── 10-ship.md         # PR creation (if -pr)
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
**Standard flow:**
1. Parse flags and feature ID
2. If `-r`: Execute resume workflow
3. If `-s`: Show status and exit
4. If `-l`: Run learning extraction only
5. Create/verify worktree at `.nomos/worktrees/{feature_id}`
6. Load step-01-context.md → load learnings, patterns, memory
7. Load step-02-analyze.md → gather codebase context
8. Load step-03-plan.md → create implementation strategy
9. If `-p`: Stop here (plan only mode)
10. Load step-04-execute.md → implement in worktree
11. Load step-05-validate.md → run checks
12. Load step-06-review.md → quality gate
13. If `-v`: Stop here (verify only mode)
14. If `-t`: Load step-07-test.md → create and run tests
15. Load step-08-merge.md → merge worktree to main
16. Load step-09-learn.md → extract patterns
17. If `-pr`: Load step-10-ship.md → create pull request
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
| `{verify_only}` | boolean | Run review step only |
| `{learn_only}` | boolean | Run learning extraction only |
| `{interactive_mode}` | boolean | Configure flags interactively |
| `{resume_mode}` | boolean | Resume from previous state |
| `{cleanup_mode}` | boolean | Remove worktree after merge |
| `{worktree_path}` | string | Path to feature worktree |
| `{output_dir}` | string | Path to output directory |
| `{learned_patterns}` | list | Patterns loaded from learning system |
| `{risk_level}` | string | LOW/MEDIUM/HIGH from context analysis |

</state_variables>

<entry_point>

**FIRST ACTION:** Load `steps/step-00-init.md`

Step 00 handles:

- Flag parsing
- Feature validation from features.json
- Resume mode detection
- Worktree creation/verification
- Output folder creation
- State variable initialization

After initialization, step-00 loads step-01-context.md.

</entry_point>

<step_files>
**Progressive loading - only load current step:**

| Step | File | Purpose |
|------|------|---------|
| 00 | `steps/step-00-init.md` | Parse flags, setup worktree, initialize state |
| 00i | `steps/step-00i-interactive.md` | Interactive flag configuration |
| 01 | `steps/step-01-context.md` | Load learnings, patterns, memory (NOMOS-unique) |
| 02 | `steps/step-02-analyze.md` | Smart context gathering with parallel agents |
| 03 | `steps/step-03-plan.md` | File-by-file implementation strategy |
| 04 | `steps/step-04-execute.md` | Task-driven implementation in worktree |
| 04a | `steps/step-04a-smoke.md` | **Runtime smoke test** - start app, verify it runs |
| 05 | `steps/step-05-validate.md` | TypeScript, lint, tests validation |
| 05a | `steps/step-05a-qa.md` | **Functional QA** - test acceptance criteria in running app |
| 06 | `steps/step-06-review.md` | Quality gate with constitutional checks |
| 07 | `steps/step-07-test.md` | Test creation and execution (if -t) |
| 08 | `steps/step-08-merge.md` | Merge worktree to main (NOMOS-unique) |
| 09 | `steps/step-09-learn.md` | Pattern extraction and retrospect (NOMOS-unique) |
| 10 | `steps/step-10-ship.md` | PR creation (if -pr) |

</step_files>

<execution_rules>

- **Load one step at a time** - Only load the current step file
- **Work in worktree** - All code changes happen in `.nomos/worktrees/{feature_id}`
- **Persist state variables** across all steps
- **Follow next_step directive** at end of each step
- **Save outputs** to `.nomos/output/{feature_id}/`
- **Use parallel agents** for independent exploration tasks

## Smart Agent Strategy in Analyze Phase

The analyze phase (step-02) uses **adaptive agent launching**:

**Available agents:**
- `explore-codebase` - Find existing patterns, files, utilities (step-02)
- `explore-docs` - Research library docs via **Context7 MCP** (step-02) ← **MANDATORY for all library docs**
- `websearch` - Find approaches, best practices, gotchas (step-02) ← General patterns only, NOT library docs

<critical>
**DOCUMENTATION RESEARCH RULE:**
- Library/framework documentation → **Context7 MCP ONLY** (via `explore-docs`)
- General approaches, patterns → WebSearch is acceptable
- NEVER use WebSearch for specific API syntax or library usage
</critical>
- `qa-smoke-tester` - Runtime smoke test, start app & verify (step-04a)
- `qa-functional-tester` - Test acceptance criteria in running app (step-05a)
- `security-reviewer` - OWASP security review (step-06)
- `code-quality-reviewer` - Code quality & patterns review (step-06)
- `test-coverage-analyzer` - Test coverage gap analysis (step-06/07)

**Launch 1-10 agents based on task complexity:**

| Complexity | Agents | When |
|------------|--------|------|
| Simple | 1-2 | Bug fix, small tweak |
| Medium | 2-4 | New feature in familiar stack |
| Complex | 4-7 | Unfamiliar libraries, integrations |
| Major | 6-10 | Multiple systems, many unknowns |

</execution_rules>

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
- Outputs saved to `.nomos/output/{feature_id}/`
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

- **During NOMOS workflow (steps 00-10):** Use NOMOS git operations only
- **Outside NOMOS workflow:** Git skills can be used for ad-hoc commits
- **git-create-pr:** Compatible with step-10-ship but NOMOS has richer context
- **git-merge:** NOT compatible - different strategies

**Rationale:** NOMOS needs feature traceability, state machine updates, and worktree isolation that generic git skills don't provide.

</git_skill_policy>
