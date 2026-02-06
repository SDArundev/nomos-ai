---
name: step-02-report
description: Consolidate findings, deduplicate, classify, generate comprehensive report
prev_step: steps/step-01-analyze.md
next_step: steps/step-03-fix.md
---

# Step 2: Report (Primary Deliverable)

## References
- `references/severity-guide.md` — Severity classification and deduplication rules
- `references/output-formats.md` — Report format and template variables

## MANDATORY EXECUTION RULES:

- ALWAYS deduplicate findings before reporting
- ALWAYS classify by severity using `references/severity-guide.md`
- ALWAYS check for regressions (verified features now failing)
- ALWAYS write both human-readable (02-report.md) AND machine-readable (issues.json) output
- NEVER inflate severity — follow the classification rules strictly

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{scope}` | single/range/verified/pending/all |
| `{analysis_mode}` | feature/codebase |
| `{depth}` | quick/standard/deep |
| `{fix_mode}` | Whether to attempt fixes |
| `{auto_mode}` | Skip confirmations |
| `{features_to_verify}` | Feature IDs |
| `{output_dir}` | Absolute path to output directory |
| Raw findings | From step-01 analysis agents |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Read All Agent Findings

Read `{output_dir}/01-analyze.md` for the raw findings from all agents.

### 2. Deduplicate Findings

Apply deduplication rules from `references/severity-guide.md`:

1. **Same file + same line** = duplicate → keep highest severity
2. **Same file + different line, same root cause** = related → group as single finding
3. **Same pattern across files** = systemic → one finding with multiple locations
4. **Different dimensions, same code** = keep both (different perspectives)

### 3. Classify by Severity

For each unique finding, classify using `references/severity-guide.md`:
- CRITICAL: Feature broken, security vulnerability, data loss
- HIGH: Major functionality gap, significant quality issue
- MEDIUM: Partial implementation, suboptimal patterns
- LOW: Style issues, minor improvements

### 4. Identify Regressions

<critical>
A **regression** means something that PREVIOUSLY PASSED now FAILS — not merely "we found a new issue."
Finding a code quality issue or missing best practice in a verified feature is NOT a regression.
It is an **enhancement** or **tech debt** item.
</critical>

For each feature with status `verified` in `.nomos/features.json`:

**IS a regression (mark as REGRESSION):**
- A CRITICAL bug that directly breaks a feature's acceptance criteria (AC was met before, now it isn't)
- A data loss or security vulnerability introduced by a LATER commit (not present at verification time)
- A runtime failure that prevents the feature from functioning at all

**IS NOT a regression (mark as ENHANCEMENT or TECH_DEBT):**
- Code quality issues (DRY violations, boilerplate, type safety patterns)
- Missing best practices (rate limiting, security headers) that were never implemented
- Race conditions or edge cases that existed at verification time but weren't caught
- Acceptance criteria that were aspirational or loosely defined (e.g., "rollback capability exists")

Only true regressions get severity bump (MEDIUM → HIGH, HIGH → CRITICAL).
Quality issues on verified features should be reported normally without severity inflation.

### 5. Build Improvement Strategy

If CRITICAL or HIGH issues exist:
1. Group by feature
2. Order by severity (CRITICAL first)
3. Estimate fix effort (single file = low, multi-file = medium, architectural = high)
4. Create prioritized fix queue

### 6. Generate Enhancement Suggestions

For features that PASSED (no CRITICAL/HIGH issues):
1. Convert LOW findings to enhancement suggestions
2. Identify proactive improvements (performance, security hardening)
3. Categorize: security, performance, resilience, ux, testing, documentation, architecture

### 7. Write Report (`{output_dir}/02-report.md`)

Use template `templates/02-report.md`:

```markdown
# Verification Report

## Executive Summary
{30-second overview: scope, depth, pass rate, key findings}

## Findings by Severity

### CRITICAL ({count})
{table of critical findings}

### HIGH ({count})
{table of high findings}

### MEDIUM ({count})
{table of medium findings}

### LOW ({count})
{table of low findings}

## Per-Feature Breakdown
{for each feature: status, findings, AC status}

## Regression Analysis
{regressions detected, affected features, impact}

## Improvement Strategy
{prioritized fix order with effort estimates}

## Enhancement Suggestions
{proactive improvements for passing features}

## Recommendations
{context-aware next steps}
```

### 8. Write Machine-Readable Output

Write `{output_dir}/issues.json` using template `templates/issues.json`.
Write `{output_dir}/enhancements.json` using template `templates/enhancements.json`.

### 9. Decision Gate

<critical>
This is the branching point that determines whether to fix or finish.
</critical>

| Condition | Action |
|-----------|--------|
| `{fix_mode}` AND (CRITICAL or HIGH found) | → Proceed to step-03-fix |
| No `{fix_mode}` OR no CRITICAL/HIGH issues | → Skip to step-04-finish |
| Not `{auto_mode}` AND CRITICAL/HIGH found | → Ask user: Fix now? |

**If skipping to step-04:** Load `./step-04-finish.md` directly.

### 10. Update Checkpoint

```json
{
  "step": "02-report",
  "completed_steps": ["00-init", "01-analyze", "02-report"],
  "report": {
    "total_findings": 0,
    "by_severity": { "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0 },
    "regressions": 0,
    "fix_needed": false,
    "skip_to_finish": false
  }
}
```

---

## SUCCESS METRICS:

- Findings deduplicated and classified
- Regressions identified
- Comprehensive report written (02-report.md)
- Machine-readable output written (issues.json, enhancements.json)
- Decision gate evaluated
- Checkpoint updated

## FAILURE MODES:

- Not deduplicating (inflated issue counts)
- Incorrect severity classification
- Missing regression detection
- Not writing machine-readable output
- Skipping the decision gate

---

## NEXT STEP:

If fix mode AND actionable issues → Load `./step-03-fix.md`
Otherwise → Load `./step-04-finish.md`
