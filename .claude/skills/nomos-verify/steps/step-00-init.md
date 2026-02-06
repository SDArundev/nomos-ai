---
name: step-00-init
description: Parse arguments, determine scope, create output directory, initialize session
next_step: steps/step-01-analyze.md
---

# Step 0: Initialize Verification Session

## State Variables (persist across all steps)

| Variable | Type | Description |
|----------|------|-------------|
| `{scope}` | string | single/range/verified/pending/all |
| `{analysis_mode}` | string | `feature` (single/range) or `codebase` (verified/pending/all) |
| `{depth}` | string | quick/standard/deep |
| `{fix_mode}` | boolean | Whether to attempt fixes (`-f` flag) |
| `{auto_mode}` | boolean | Skip confirmations (`-a` flag) |
| `{features_to_verify}` | list | Feature IDs to verify |
| `{output_dir}` | string | ABSOLUTE path to `.nomos/verify/{timestamp}/` |
| `{timestamp}` | string | Session timestamp (ISO) |
| `{max_fix_iterations}` | number | Max fix loop iterations (default: 3) |

---

## Rules

- NEVER create a worktree in this step (read-only by default)
- NEVER start analyzing code in this step
- ALWAYS resolve to specific feature IDs before proceeding
- ALWAYS create the output directory

---

## Execution Sequence

### 1. Parse Flags

| Short | Long | Default | Description |
|-------|------|---------|-------------|
| `-a` | `--auto` | false | Auto mode: skip confirmations |
| `-s` | `--scope` | single | Scope: single/range/verified/pending/all |
| `-r` | `--resume` | false | Resume previous session |
| `-q` | `--quick` | false | Quick: 2 dimensions only |
| `-d` | `--deep` | false | Deep: all 5 dimensions |
| `-f` | `--fix` | false | Attempt to fix issues found |
| `-o` | `--output` | auto | Custom output path |

If no depth flag: `{depth}` = `standard`.
If `-q`: `{depth}` = `quick`.
If `-d`: `{depth}` = `deep`.

### 2. Determine Scope

```
If argument is a single feature ID (e.g., "F027"):
  → {scope} = "single"
  → {analysis_mode} = "feature"

If argument is a range (e.g., "F027-F050"):
  → {scope} = "range"
  → {analysis_mode} = "feature"

If -s verified:
  → {scope} = "verified"
  → {analysis_mode} = "codebase"

If -s pending:
  → {scope} = "pending"
  → {analysis_mode} = "codebase"

If -s all:
  → {scope} = "all"
  → {analysis_mode} = "codebase"
```

### 3. Load Features

Read `.nomos/features.json` and filter by scope:

```
single → find feature by ID
range → filter features in ID range
verified → filter features where status == "verified"
pending → filter features where status == "pending" or "in_progress"
all → all features with status != "backlog"
```

Set `{features_to_verify}` to the filtered list.

If no features match the scope, display warning and stop.

### 4. Create Output Directory

```bash
timestamp=$(date +%Y-%m-%dT%H-%M-%S)
output_dir="$(pwd)/.nomos/verify/${timestamp}"
mkdir -p "${output_dir}"
```

Set `{output_dir}` to the **absolute** path.
Set `{timestamp}` to the generated timestamp.

### 5. Check for Resume (`-r` flag)

If `-r` flag is set:
1. Find the most recent `.nomos/verify/*/checkpoint.json`
2. Read checkpoint to determine last completed step
3. Restore state variables from checkpoint
4. Skip to the appropriate step

### 6. Display Configuration Summary

```markdown
## Verification Session

| Field | Value |
|-------|-------|
| **Scope** | {scope} |
| **Analysis Mode** | {analysis_mode} |
| **Depth** | {depth} |
| **Fix Mode** | {fix_mode} |
| **Auto Mode** | {auto_mode} |
| **Features** | {feature_count} features |
| **Feature IDs** | {comma-separated list} |
| **Output** | {output_dir} |
| **Max Fix Iterations** | {max_fix_iterations} |
```

If not `{auto_mode}`, ask user for confirmation before proceeding.

### 7. Write Session Config

Write `{output_dir}/00-init.md` using template `templates/00-init.md`.

Write checkpoint:
```json
{
  "version": "2.0",
  "timestamp": "{timestamp}",
  "step": "00-init",
  "scope": "{scope}",
  "analysis_mode": "{analysis_mode}",
  "depth": "{depth}",
  "fix_mode": false,
  "auto_mode": false,
  "features_to_verify": [],
  "completed_steps": ["00-init"]
}
```

---

## SUCCESS METRICS:

- Scope resolved to specific feature list
- Output directory created
- State variables initialized
- Configuration displayed to user
- Checkpoint written

## FAILURE MODES:

- Creating a worktree (not needed yet)
- Starting code analysis (that's step-01)
- No features matching scope (should warn and stop)

---

## NEXT STEP:

Load `./step-01-analyze.md`
