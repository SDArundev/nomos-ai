---
name: step-08-merge
description: Merge worktree changes to main branch
prev_step: steps/step-07-test.md
next_step: steps/step-09-learn.md
---

# Step 8: Merge (NOMOS-Unique)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER merge with failing tests
- 🛑 NEVER force push or destructive git operations
- ✅ ALWAYS ensure all changes are committed
- ✅ ALWAYS rebase on latest main before merge
- ✅ ALWAYS update feature state after successful merge
- 📋 YOU ARE A MERGER, not an implementer
- 💬 FOCUS on clean git operations
- 🚫 FORBIDDEN to modify code in this step

## EXECUTION PROTOCOLS:

- 🎯 Ensure worktree is clean before merge
- 💾 Create merge commit with feature reference
- 📖 Update features.json state
- 🚫 FORBIDDEN to leave worktree in dirty state

## CONTEXT BOUNDARIES:

- Code has been implemented and validated
- Review has passed (step-06)
- Tests have passed (if test_mode)
- Worktree contains all feature changes

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
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Initialize Output

Append to `{output_dir}/08-merge.md`:

```markdown
# Merge: {feature_id}

**Started:** {timestamp}
**Branch:** nomos/{feature_id}
**Target:** main

---
```

### 2. Verify Worktree State

```bash
cd {worktree_path}
git status
```

**If uncommitted changes exist:**

```bash
git add -A
git commit -m "chore({feature_id}): final changes before merge"
```

**Log:**
```markdown
## Pre-Merge State

**Uncommitted changes:** {yes/no}
**Action taken:** {committed/none}
```

### 3. Update from Main

```bash
cd {worktree_path}
git fetch origin main
git rebase origin/main
```

**If conflicts occur:**
- In `{auto_mode}`: Attempt auto-resolution for simple conflicts
- Otherwise: List conflicts and ask user for guidance

```markdown
## Rebase Status

**Conflicts:** {none/list}
**Resolution:** {auto/manual/user-assisted}
```

### 4. Final Validation

Run validation from worktree (dependencies installed during step-00):

```bash
cd {worktree_path}
bun run check-types
bun run test:ci
```

**If checks fail:**
- HALT merge
- Report failures
- Return to step-06 for fixes

```markdown
## Post-Rebase Validation

| Check | Status |
|-------|--------|
| TypeScript | ✓/✗ |
| Tests | ✓/✗ |
```

### 5. Merge to Main

**NOTE:** Main branch is already checked out in {project_root}. Do NOT run `git checkout main`.
Merge directly from the main repo:

```bash
cd {project_root}
git merge nomos/{feature_id} --no-ff -m "feat({feature_id}): {feature_title}

Implements feature {feature_id} with acceptance criteria:
{acceptance_criteria_summary}"
```

**Log:**
```markdown
## Merge Execution

**Merge type:** --no-ff (preserve history)
**Commit hash:** {hash}
**Files changed:** {count}
**Insertions:** +{count}
**Deletions:** -{count}
```

### 6. Update Feature State

**Update features.json (single source of truth):**

```bash
bash {skill_dir}/scripts/feature-state.sh verify {feature_id}
```

This will:
- Set status to "verified"
- Set verifiedAt to current timestamp

**Log:**
```markdown
## State Update

**Previous status:** {status}
**New status:** verified
**Verified at:** {timestamp}
```

### 7. Release Ports and Cleanup

**Always release allocated ports (parallel execution cleanup):**

```bash
bash .claude/skills/nomos/scripts/release-ports.sh {feature_id}
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

**If user selects "Remove worktree":**
```bash
cd {project_root}
git worktree remove {worktree_path}
git branch -d nomos/{feature_id}
```

**If `{cleanup_mode}` = false AND `{auto_mode}` = true:**
→ Keep worktree (default behavior when neither flag specified)

### 8. Complete Output

Append to `{output_dir}/08-merge.md`:

```markdown
---
## Step Complete

**Status:** ✓ Complete
**Merge commit:** {hash}
**Feature state:** verified
**Worktree:** {kept/removed}
**Next:** step-09-learn.md
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ Worktree clean before merge
✅ Rebased on latest main
✅ Post-rebase validation passed
✅ Merge commit created with proper message
✅ Feature state updated to "verified"
✅ Output saved

## FAILURE MODES:

❌ Merging with failing tests
❌ Force pushing or destructive operations
❌ Not updating feature state
❌ Leaving merge in incomplete state
❌ **CRITICAL**: Modifying code during merge step

## MERGE PROTOCOLS:

- Always use --no-ff to preserve history
- Include feature ID in commit message
- Update state AFTER successful merge
- Keep worktree by default for reference

---

## NEXT STEP:

After successful merge, proceed to `./step-09-learn.md`

<critical>
Remember: This step is ONLY about git operations - no code changes!
</critical>
