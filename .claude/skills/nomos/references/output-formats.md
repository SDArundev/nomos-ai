> **DEPRECATED (v3):** Superseded by NOMOS v4 phases. Kept for rollback. Restore: change SKILL.md FIRST ACTION to step-00-init.md.

# Output Formats Reference

Standard output markdown formats and compact context transfer patterns for all NOMOS pipeline steps.

---

## Compact Context Transfer Pattern

Used at the TOP of output files to enable the next step to start without re-reading full context.

### Step 01 -> Step 02

```markdown
## Compact Context -> Step 02

- **Risk Level:** {LOW/MEDIUM/HIGH}
- **Key Patterns:** {top 3 patterns to apply, one-line each}
- **Anti-Patterns:** {top 2 to avoid, one-line each}
- **Key Files:** {up to 10 most relevant files with one-line purpose}
- **Dependencies:** {dep status: all verified / {n} pending}
- **Thresholds:** Duration: {n} min | Files: {n} max
- **Pre-Implementation:** {all met (skip to finish) / {n}/{m} met}
- **Stack (relevant):** {matched deps with category + provides}
- **Registries:** {type: installed[], installCommand}
- **Best Practices:** {rules from matched deps}
```

### Step 03 -> Step 04

```markdown
## Compact Context -> Step 04

- **Loop Result:** {PASS | FAIL | ESCALATED}
- **Iterations Used:** {n}/{max}
- **Files Modified:** {list of files changed with one-line summary each}
- **New Files Created:** {list}
- **Lines Changed:** +{added} / -{removed}
- **Issues Found (total):** {count across all iterations}
- **Issues Fixed:** {count}
- **Remaining Issues:** {count} (MEDIUM/LOW only if PASS)
- **Skills Invoked:** {list of skill names used}
- **Quick Verify:** typecheck {PASS/FAIL} | lint {PASS/FAIL}
- **Candidate Anti-Patterns:** {count}
```

### Step 04 -> Step 05

```markdown
## Compact Context -> Step 05

- **Gate Result:** PASS / FAIL
- **Track A (Static):** PASS -- typecheck, lint, {n} tests
- **Track B (Runtime):** PASS -- {n}/{m} ACs met
- **Track C (Review):** PASS -- {n} findings ({m} blocking)
- **Fix Cycles Used:** {n} total across all tracks
- **Blocking Issues:** {count} -- {brief list or "none"}
```

---

## Step 01: Context Summary Format

```markdown
## Context Summary: {feature_id}

### Learnings Applied
**Risk Level:** {risk_level}
**Patterns to Apply:** {list}
**Anti-Patterns to Avoid:** {list}
**Thresholds:** Duration: {n} min, Files: {n}

### Codebase Context
**Related Files:** {count} files found
| File | Contains |
|------|----------|
| `src/path/file.ts` | Existing implementation |

### Patterns Observed
- {pattern_1}
- {pattern_2}

### Utilities Available
- {utility_1}
- {utility_2}

### Session Insights (cross-feature memory)
| Source Feature | Relevance | Key Takeaway |
|---------------|-----------|--------------|
| {insight_feature_id} | {score} | {top recommendation} |

### Documentation Insights (if researched)
- {library}: {key_finding}

### Dependencies
| Dependency | Status |
|------------|--------|
| {dep_id} | Verified / Pending |
```

---

## Step 03: Execute Log Format

```markdown
# Execute-Verify Loop: {feature_id}

**Started:** {ISO}
**Feature:** {feature_title}
**Max Iterations:** {max_execute_iterations}

## Iteration History

### Iteration 1: INITIAL_IMPLEMENTATION
**Verdict:** {PASS/FAIL}

#### Code Writer Report
{summary of code writer output}

#### QA Review Report
{summary or full JSON of QA report}

### Iteration 2: FIX_ISSUES (if applicable)
**Verdict:** {PASS/FAIL}

#### Code Writer Report
{summary}

#### QA Review Report
{summary or full JSON}

## Final Result
**Verdict:** {PASS/FAIL/ESCALATED}
**Total Iterations:** {n}
**Blocking Issues Resolved:** {count}
**Candidate Anti-Patterns Found:** {count}

**Timestamp:** {ISO}
```

---

## Step 04: Verification Report Format

```markdown
# Verification Report: {feature_id}

## Track A: Static Checks
- TypeScript: PASS
- Lint: PASS
- Tests: {X}/{Y} passing
- New tests created: {count}

## Track B: Runtime Verification
- Server startup: PASS (port {server_port})
- Web startup: PASS (port {web_port})
- Smoke test: PASS
- Acceptance Criteria:
  - AC1: PASS - {evidence}
  - AC2: PASS - {evidence}
- Servers stopped: YES

## Track C: Code Review
- Security: {n} findings
- Quality: {n} findings
- Coverage: {gaps}

### Findings Table
| ID | Severity | Category | Location | Issue | Validity |
|----|----------|----------|----------|-------|----------|
| F1 | CRITICAL | Security | auth.ts:42 | SQL injection | Real |

## Gate: PASS
**Timestamp:** {ISO}
```

---

## Step 05: Merge Log Format

```markdown
# Merge: {feature_id}

**Timestamp:** {timestamp}
**Branch:** nomos/{feature_id}
**Target:** main

## Pre-Merge State
**Uncommitted changes:** {yes/no}
**Action taken:** {committed/none}

## Conflict Detection
**Overlapping files:** {count}
**Auto-resolvable:** {count}
**Manual required:** {count}

## Rebase Status
**Conflicts:** {none/list}
**Resolution:** {auto/manual/user-assisted}
**Post-rebase re-check:** PASS/SKIP (skip if no conflicts)

## Post-Rebase Validation
| Check | Status |
|-------|--------|
| TypeScript | PASS |
| Tests | PASS |

## Merge Execution
**Merge type:** --no-ff (preserve history)
**Commit hash:** {hash}
**Files changed:** {count}
**Insertions:** +{count}
**Deletions:** -{count}

## Merge Evidence (REQUIRED)

| Field | Value |
|-------|-------|
| Pre-merge main | {PRE_MERGE_MAIN} |
| Post-merge main | {POST_MERGE_MAIN} |
| Feature commit | {FEATURE_COMMIT} |
| Verification | PASSED — feature commit is ancestor of main |

## State Update
**Previous status:** waiting_approval
**New status:** verified
**Verified at:** {timestamp}

## Cleanup
**Ports released:** YES
**Worktree:** {kept/removed}
```

---

## Step 06: Finish Report Format

```markdown
# Finish: {feature_id}

## Learning Extraction

### Feature Metrics
| Metric | Value |
|--------|-------|
| Duration | {minutes} min |
| Files Changed | {count} |
| Lines Added | +{count} |
| Lines Removed | -{count} |
| Commits | {count} |
| Risk Level | {risk_level} |
| Loop Iterations | {loop_iterations_used} |
| Outcome | SUCCESS |

### Patterns Extracted
| Pattern | Evidence | Recommendation |
|---------|----------|----------------|
| {pattern} | {evidence} | {recommendation} |

### Anti-Patterns Identified
| Anti-Pattern | Evidence | Prevention |
|--------------|----------|------------|
| {antipattern} | {evidence} | {prevention} |

### Code Patterns Added
| ID | Category | Title |
|----|----------|-------|
| {id} | {category} | {title} |

### Retrospective
{retrospective content}

## Ship (if pr_mode)
**Pushed:** YES/NO
**PR Created:** YES/NO
**PR URL:** {url}

---

## Step Complete
**Timestamp:** {ISO timestamp}
```

---

## Final Summary Format

```
NOMOS COMPLETE: {feature_id} - {feature_title}

| Step | Status |
|------|--------|
| 00-init | DONE |
| 01-context | DONE |
| 02-plan | DONE |
| 03-execute | DONE |
| 04-verify | DONE |
| 05-merge | DONE |
| 06-finish | DONE |

Status: verified
Duration: {duration} min
Files: {count} changed
Learnings: {count} patterns extracted
{if pr_mode: "PR: {pr_url}"}

Output: {output_dir}/
```
