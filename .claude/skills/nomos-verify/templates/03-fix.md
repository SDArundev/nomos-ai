# Fix Loop Log: {timestamp}

## Compact Context -> Step 04

- **Fix Result:** {fix_result}
- **Iterations Used:** {iterations_used}/{max_iterations}
- **Issues Fixed:** {issues_fixed}
- **Issues Remaining:** {issues_remaining}
- **Files Changed:** {files_changed}
- **Worktree:** {worktree_path}

---

## Configuration

| Setting | Value |
|---------|-------|
| **Worktree** | {worktree_path} |
| **Branch** | {branch_name} |
| **Max Iterations** | {max_iterations} |
| **Issues Targeted** | {total_issues_targeted} (CRITICAL + HIGH only) |

## Fix Queue (Priority Order)

| # | Issue ID | Severity | Feature | Description |
|---|----------|----------|---------|-------------|
{fix_queue_table}

---

## Iteration History

{iteration_logs}

---

## Final Result

| Metric | Value |
|--------|-------|
| **Result** | {fix_result} |
| **Iterations** | {iterations_used}/{max_iterations} |
| **Issues Fixed** | {issues_fixed} |
| **Issues Remaining** | {issues_remaining} |
| **Files Changed** | {files_changed_count} |

{escalation_notes}

---

*Fix loop completed at {fix_timestamp}*
