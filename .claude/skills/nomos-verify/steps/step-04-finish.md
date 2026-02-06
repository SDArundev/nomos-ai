---
name: step-04-finish
description: Final summary, learning extraction, feature updates, worktree handling
prev_step: steps/step-02-report.md
---

# Step 4: Finish

## MANDATORY EXECUTION RULES:

- ALWAYS update features.json for regressions
- ALWAYS extract learning patterns
- ALWAYS display final summary to user
- NEVER merge without verification (if step-03 ran)
- NEVER delete worktree if issues remain (keep for manual review)

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{scope}` | single/range/verified/pending/all |
| `{analysis_mode}` | feature/codebase |
| `{depth}` | quick/standard/deep |
| `{fix_mode}` | Whether fixes were attempted |
| `{auto_mode}` | Skip confirmations |
| `{features_to_verify}` | Feature IDs |
| `{output_dir}` | Absolute path to output directory |
| Report data | From step-02 (always) |
| Fix results | From step-03 (if fix mode) |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Generate Final Summary

Combine step-02 report with step-03 fix results (if applicable):

```markdown
## Verification Complete

| Metric | Value |
|--------|-------|
| **Scope** | {scope} ({analysis_mode}) |
| **Depth** | {depth} |
| **Features Verified** | {feature_count} |
| **Total Findings** | {total} |
| **Critical** | {critical_count} |
| **High** | {high_count} |
| **Medium** | {medium_count} |
| **Low** | {low_count} |
| **Regressions** | {regression_count} |
| **Fix Iterations** | {fix_iterations}/{max} (if applicable) |
| **Fix Result** | {PASS/PARTIAL/ESCALATED/N/A} |
```

### 2. Update features.json

**Regressions:**
- For each verified feature that failed verification:
  - Set `status` back to `pending`
  - Add `regressionDetected` timestamp
  - Log reason in feature notes

**Auto mode bug features:**
- If `{auto_mode}` AND issues found:
  - Create new bug-fix features in features.json for CRITICAL/HIGH issues
  - Set priority based on severity (CRITICAL=1, HIGH=2-5)
  - Set dependency on affected feature

### 3. Learning Extraction

Write to `.nomos/learning/`:

**verification-patterns.json:**
```json
{
  "patterns": [
    {
      "id": "VP-{NNN}",
      "name": "Pattern name",
      "description": "What this pattern represents",
      "category": "CAT-API|CAT-UI|CAT-DB|CAT-CORE",
      "type": "runtime|logic|security|quality|integration",
      "frequency": 1,
      "first_seen": "{timestamp}",
      "last_seen": "{timestamp}",
      "features_affected": ["{feature_id}"],
      "root_cause": "Why this happens",
      "prevention": "How to prevent it",
      "detection": "How to detect it early",
      "fix_pattern": "Common fix approach"
    }
  ]
}
```

Read existing file first, MERGE new patterns (increment frequency if pattern exists).

**regression-log.json** (if regressions detected):
```json
{
  "regressions": [
    {
      "feature_id": "FXXX",
      "detected_at": "{timestamp}",
      "cause": "Description of what broke",
      "severity": "CRITICAL|HIGH",
      "related_changes": ["feature IDs or commits that may have caused it"]
    }
  ]
}
```

### 4. Enhancement Backlog

If enhancements were discovered in step-02:
1. Read existing `.nomos/enhancements-backlog.json` (create if missing)
2. Append new enhancements (avoid duplicates by checking title similarity)
3. Update summary counts

### 5. Worktree Handling (if step-03 ran)

**If all fixes PASSED:**
1. Commit changes in worktree:
   ```bash
   cd {worktree_path}
   git add -A
   git commit -m "fix: verification fixes ({timestamp})"
   ```
2. Merge to main (with verification):
   ```bash
   # Record pre-merge state
   PRE_MERGE=$(git -C . rev-parse HEAD)

   # Merge
   git merge --no-ff {branch_name} -m "fix: merge verification fixes ({timestamp})"

   # Verify merge
   POST_MERGE=$(git rev-parse HEAD)
   git merge-base --is-ancestor {branch_commit} HEAD
   ```
3. Cleanup worktree:
   ```bash
   git worktree remove {worktree_path}
   git branch -d {branch_name}
   ```

**If issues remain (PARTIAL/ESCALATED):**
1. Keep worktree for manual review
2. Display: "Worktree kept at {worktree_path} for manual review"
3. List remaining issues

**If no step-03 (read-only verification):**
- No worktree exists, nothing to handle

### 6. Display Final Summary

```
VERIFY COMPLETE: {scope} ({analysis_mode})

| Step | Status |
|------|--------|
| 00-init | DONE |
| 01-analyze | DONE |
| 02-report | DONE |
| 03-fix | {DONE/SKIPPED} |
| 04-finish | DONE |

Findings: {critical} CRITICAL, {high} HIGH, {medium} MEDIUM, {low} LOW
Regressions: {count}
{if fix_mode: "Fixes: {fixed}/{total} issues resolved"}

Report: {output_dir}/02-report.md
Output: {output_dir}/
```

### 7. Write Output

Write `{output_dir}/04-finish.md` using template `templates/04-finish.md`.

Update checkpoint to final state:
```json
{
  "step": "04-finish",
  "completed_steps": ["00-init", "01-analyze", "02-report", "03-fix", "04-finish"],
  "final_result": "COMPLETE",
  "features_updated": [],
  "patterns_extracted": 0,
  "worktree_status": "merged|kept|none"
}
```

---

## SUCCESS METRICS:

- Final summary generated and displayed
- features.json updated (regressions, bug features)
- Learning patterns extracted and merged
- Enhancement backlog updated
- Worktree handled appropriately
- Output file written
- Checkpoint finalized

## FAILURE MODES:

- Not updating features.json for regressions
- Overwriting learning files instead of merging
- Merging without verification
- Deleting worktree with remaining issues
- Not displaying final summary

---

## DONE

This is the final step. Present the summary and report path to the user.

<critical>
Always merge learning data, never overwrite.
Regressions MUST update features.json status back to pending.
Worktree with remaining issues MUST be kept for review.
</critical>
