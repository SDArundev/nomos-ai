# Verification Complete: {timestamp}

## Final Summary

| Metric | Value |
|--------|-------|
| **Scope** | {scope} ({analysis_mode}) |
| **Depth** | {depth} |
| **Features Verified** | {feature_count} |
| **Total Findings** | {total_findings} |
| **Critical** | {critical_count} |
| **High** | {high_count} |
| **Medium** | {medium_count} |
| **Low** | {low_count} |
| **Regressions** | {regression_count} |
| **Fix Mode** | {fix_mode} |
| **Fix Result** | {fix_result} |

## Pipeline Status

| Step | Status |
|------|--------|
| 00-init | DONE |
| 01-analyze | DONE |
| 02-report | DONE |
| 03-fix | {fix_status} |
| 04-finish | DONE |

## Features Updated

### Regressions Reverted

{regressions_reverted}

### Bug Fix Features Created

{bug_fixes_created}

## Learning Extracted

| Metric | Value |
|--------|-------|
| Patterns Recorded | {patterns_recorded} |
| Patterns Updated | {patterns_updated} |
| Regressions Logged | {regressions_logged} |
| Enhancements Suggested | {enhancements_count} |

## Worktree Status

{worktree_status}

## Output Files

| File | Description |
|------|-------------|
| `00-init.md` | Session configuration |
| `01-analyze.md` | Raw agent findings |
| `02-report.md` | Comprehensive report (PRIMARY) |
| `03-fix.md` | Fix iteration log (if applicable) |
| `04-finish.md` | This file |
| `issues.json` | Machine-readable issues |
| `enhancements.json` | Enhancement suggestions |
| `checkpoint.json` | Resume checkpoint |

## Next Steps

{next_steps}

---

*Session completed at {finish_timestamp}*
*Report: {output_dir}/02-report.md*
