# Output Formats Reference

Compact context transfer patterns, report formats, and output directory structure for nomos-verify.

---

## Output Directory Structure

```
.nomos/verify/{timestamp}/
├── 00-init.md                # Session config, scope, feature list
├── 01-analyze.md             # Raw findings from all agents
├── 02-report.md              # Consolidated report (PRIMARY DELIVERABLE)
├── 03-fix.md                 # Fix iteration log (if fix mode)
├── 04-finish.md              # Final summary, learning, cleanup
├── issues.json               # Machine-readable issues
├── enhancements.json         # Enhancement suggestions
└── checkpoint.json           # Resume checkpoint (if interrupted)
```

---

## Compact Context Transfer Blocks

Used at the TOP of each step's output file to pass state efficiently to the next step.

### Step 00 -> Step 01

```markdown
## Compact Context -> Step 01

- **Scope:** {scope} ({analysis_mode} mode)
- **Depth:** {depth}
- **Features:** {feature_count} features to verify
- **Feature IDs:** {comma-separated list}
- **Fix Mode:** {yes/no}
- **Auto Mode:** {yes/no}
- **Output Dir:** {output_dir}
```

### Step 01 -> Step 02

```markdown
## Compact Context -> Step 02

- **Dimensions Analyzed:** {count} ({dimension_names})
- **Total Findings:** {count}
- **Critical:** {count} | **High:** {count} | **Medium:** {count} | **Low:** {count}
- **Agents Completed:** {count}/{expected}
- **Features with Issues:** {list of feature_ids}
- **Regressions Detected:** {count}
```

### Step 02 -> Step 03

```markdown
## Compact Context -> Step 03

- **Fixable Issues:** {count} (CRITICAL + HIGH only)
- **Fix Priority Order:** {ordered list of finding IDs}
- **Files to Modify:** {list of files}
- **Worktree Path:** {worktree_path}
- **Max Iterations:** {max_fix_iterations}
```

### Step 03 -> Step 04

```markdown
## Compact Context -> Step 04

- **Fix Result:** {PASS / PARTIAL / ESCALATED}
- **Iterations Used:** {n}/{max}
- **Issues Fixed:** {count}
- **Issues Remaining:** {count}
- **Files Changed:** {list}
- **Worktree:** {path or "none"}
```

---

## Report Template Variables

Variables available across all templates:

| Variable | Source | Description |
|----------|--------|-------------|
| `{timestamp}` | step-00 | ISO timestamp of session |
| `{scope}` | step-00 | single/range/verified/pending/all |
| `{analysis_mode}` | step-00 | feature/codebase |
| `{depth}` | step-00 | quick/standard/deep |
| `{feature_count}` | step-00 | Number of features in scope |
| `{features_to_verify}` | step-00 | List of feature IDs |
| `{output_dir}` | step-00 | Absolute path to output directory |
| `{fix_mode}` | step-00 | Whether fixes attempted |
| `{total_findings}` | step-01 | Total findings across all agents |
| `{critical_count}` | step-02 | CRITICAL severity count |
| `{high_count}` | step-02 | HIGH severity count |
| `{medium_count}` | step-02 | MEDIUM severity count |
| `{low_count}` | step-02 | LOW severity count |
| `{pass_rate}` | step-02 | Percentage of features passing |
| `{regression_count}` | step-02 | Regressions detected |
| `{fix_iterations}` | step-03 | Fix loop iterations used |
| `{fix_result}` | step-03 | PASS/PARTIAL/ESCALATED |

---

## Machine-Readable Output Schemas

### issues.json

See `templates/issues.json` for schema. Key fields:
- `id`: Unique finding ID (e.g., `ISS-001`)
- `feature`: Feature ID or `N/A`
- `severity`: CRITICAL/HIGH/MEDIUM/LOW
- `dimension`: Bugs/Quality/Requirements/Security/Testing
- `file`: File path with line number
- `description`: What is wrong
- `impact`: Why it matters
- `suggested_fix`: How to fix
- `status`: open/fixed/wontfix

### enhancements.json

See `templates/enhancements.json` for schema. Cumulative backlog of improvement suggestions.

### checkpoint.json

```json
{
  "version": "2.0",
  "timestamp": "{ISO}",
  "step": "01-analyze",
  "scope": "{scope}",
  "analysis_mode": "{analysis_mode}",
  "depth": "{depth}",
  "fix_mode": false,
  "features_to_verify": [],
  "completed_steps": ["00-init"],
  "fix_iterations": {
    "max": 3,
    "current": 0,
    "results": []
  }
}
```
