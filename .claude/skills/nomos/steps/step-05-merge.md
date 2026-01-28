---
name: step-05-merge
description: Rebase, validate, and merge worktree changes to main branch
prev_step: steps/step-04-verify.md
next_step: steps/step-06-finish.md
---

# Step 5: Merge

## MANDATORY EXECUTION RULES:

- NEVER merge with failing tests
- NEVER force push or destructive git operations
- ALWAYS ensure all changes are committed
- ALWAYS rebase on latest main before merge
- ALWAYS update feature state after successful merge
- YOU ARE A MERGER, not an implementer
- FORBIDDEN to modify code in this step

## YOUR TASK:

Merge the feature worktree changes back to the main branch cleanly.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier (e.g., F016) |
| `{feature_title}` | Feature title |
| `{auto_mode}` | Skip confirmations |
| `{cleanup_mode}` | Remove worktree after merge |
| `{worktree_path}` | Path to worktree (.nomos/worktrees/{feature_id}) |
| `{output_dir}` | Path to output directory |
| `{acceptance_criteria}` | AC summary for commit message |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Verify Worktree State

```bash
cd {worktree_path}
git status
```

**If uncommitted changes exist:**

```bash
git add -A
git commit -m "chore({feature_id}): final changes before merge"
```

### 2. Update from Main

```bash
cd {worktree_path}
git fetch origin main
git rebase origin/main
```

**If conflicts occur:**
- In `{auto_mode}`: Attempt auto-resolution for simple conflicts
- Otherwise: List conflicts and ask user for guidance

### 3. Final Validation

Run validation from worktree:

```bash
cd {worktree_path}
bun run check-types
bun run test:ci
```

**If checks fail:**
- HALT merge
- Report failures
- Return to step-03 for fixes

### 4. Merge to Main

**NOTE:** Main branch is already checked out in {project_root}. Do NOT run `git checkout main`.

```bash
cd {project_root}
git merge nomos/{feature_id} --no-ff -m "feat({feature_id}): {feature_title}

Implements feature {feature_id} with acceptance criteria:
{acceptance_criteria_summary}"
```

### 5. Update Feature State

```bash
bash .claude/skills/nomos/scripts/nomos.sh state verify {feature_id}
```

This sets: status → verified, passes → true, verifiedAt → timestamp

### 6. Release Ports and Cleanup

**Always release allocated ports:**

```bash
bash .claude/skills/nomos/scripts/nomos.sh ports release {feature_id}
```

**If `{cleanup_mode}` = true:**

```bash
cd {project_root}
git worktree remove {worktree_path}
git branch -d nomos/{feature_id}
```

**If `{cleanup_mode}` = false AND `{auto_mode}` = false:**

```yaml
questions:
  - header: "Cleanup"
    question: "Merge complete. Remove the worktree?"
    options:
      - label: "Keep worktree"
        description: "Keep for reference"
      - label: "Remove worktree"
        description: "Clean up disk space"
    multiSelect: false
```

**If `{cleanup_mode}` = false AND `{auto_mode}` = true:**
→ Keep worktree (default)

### 7. Save Output

Write merge log to `{output_dir}/05-merge.md`:

```markdown
# Merge: {feature_id}

**Timestamp:** {timestamp}
**Branch:** nomos/{feature_id}
**Target:** main

## Pre-Merge State
**Uncommitted changes:** {yes/no}
**Action taken:** {committed/none}

## Rebase Status
**Conflicts:** {none/list}
**Resolution:** {auto/manual/user-assisted}

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

## State Update
**Previous status:** waiting_approval
**New status:** verified
**Verified at:** {timestamp}

## Cleanup
**Ports released:** YES
**Worktree:** {kept/removed}
```

---

## SUCCESS METRICS:

- Worktree clean before merge
- Rebased on latest main
- Post-rebase validation passed
- Merge commit created with proper message
- Feature state updated to "verified"
- Ports released
- Output saved

## FAILURE MODES:

- Merging with failing tests
- Force pushing or destructive operations
- Not updating feature state
- Not releasing ports
- Modifying code during merge step

---

## NEXT STEP:

After successful merge, proceed to `./step-06-finish.md`

<critical>
This step is ONLY about git operations - no code changes!
</critical>
