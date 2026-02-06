---
name: step-00-init
description: "Parse arguments, create isolated worktree, and setup output directory for refactoring session"
next_step: steps/step-01-analyze.md
---

# Step 00: Initialize Refactor

<objective>
Parse arguments, create isolated worktree, and setup output directory for refactoring session.
</objective>

<instructions>

## 1. Parse Arguments

Extract from command arguments:

| Variable | Description | Example |
|----------|-------------|---------|
| `{refactor_type}` | Type of refactor | `dependency`, `move`, `rename`, `optimize` |
| `{target}` | What to refactor | `lodash`, `src/utils`, `OldName` |
| `{replacement}` | Replacement (if applicable) | `es-toolkit`, `packages/utils`, `NewName` |
| `{auto_mode}` | Skip confirmations | `true/false` |
| `{dry_run}` | Plan only, no changes | `true/false` |
| `{force_mode}` | Skip safety checks | `true/false` |
| `{keep_worktree}` | Keep worktree after | `true/false` |
| `{path_filter}` | Limit to path | `apps/server` |

## 2. Validate Arguments

```bash
# Check refactor type is valid
VALID_TYPES="dependency move rename optimize extract inline modernize structure"
if ! echo "$VALID_TYPES" | grep -qw "$refactor_type"; then
    echo "Invalid refactor type: $refactor_type"
    exit 1
fi

# Check target is provided
if [ -z "$target" ]; then
    echo "Target is required"
    exit 1
fi

# Check replacement for types that need it
NEEDS_REPLACEMENT="dependency move rename modernize"
if echo "$NEEDS_REPLACEMENT" | grep -qw "$refactor_type" && [ -z "$replacement" ]; then
    echo "Replacement is required for type: $refactor_type"
    exit 1
fi
```

## 3. Create Timestamp and Paths

```bash
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
BRANCH_NAME="refactor/${refactor_type}-${TIMESTAMP}"
WORKTREE_PATH=".nomos/worktrees/refactor-${TIMESTAMP}"
OUTPUT_DIR=".nomos/refactor/${TIMESTAMP}"
```

## 4. Create Output Directory

```bash
mkdir -p "${OUTPUT_DIR}"
```

## 5. Create Worktree (Unless Dry Run)

```bash
if [ "${dry_run}" != "true" ]; then
    git branch "${BRANCH_NAME}"
    git worktree add "${WORKTREE_PATH}" "${BRANCH_NAME}"
    echo "✓ Created worktree: ${WORKTREE_PATH}"
fi
```

## 6. Initialize State

Create `{output_dir}/state.json`:

```json
{
  "timestamp": "{timestamp}",
  "refactor_type": "{refactor_type}",
  "target": "{target}",
  "replacement": "{replacement}",
  "status": "initialized",
  "auto_mode": false,
  "dry_run": false,
  "worktree_path": "{worktree_path}",
  "output_dir": "{output_dir}",
  "branch_name": "{branch_name}",
  "checkpoints": [],
  "steps_completed": [],
  "risk_level": "pending",
  "baseline": null,
  "results": null
}
```

## 7. Display Summary

```markdown
## Refactor Session Initialized

**Type:** {refactor_type}
**Target:** {target}
**Replacement:** {replacement}
**Worktree:** {worktree_path}
**Output:** {output_dir}
**Mode:** {auto_mode ? "Autonomous" : "Interactive"}
**Dry Run:** {dry_run}

---

Proceeding to analysis phase...
```

</instructions>

<state_variables>
After this step, these variables are available:

| Variable | Description |
|----------|-------------|
| `{timestamp}` | Session timestamp |
| `{refactor_type}` | Type of refactor |
| `{target}` | Refactor target |
| `{replacement}` | Replacement value |
| `{auto_mode}` | Autonomous mode flag |
| `{dry_run}` | Dry run flag |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output |
| `{branch_name}` | Git branch name |
</state_variables>

<next_step>
Load `steps/step-01-analyze.md`
</next_step>
