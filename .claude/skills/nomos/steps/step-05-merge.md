---
name: step-05-merge
description: Rebase, validate, and merge worktree changes to main branch
prev_step: steps/step-04-verify.md
next_step: steps/step-06-finish.md
---

> **DEPRECATED (v3):** Superseded by NOMOS v4 phases. Kept for rollback. Restore: change SKILL.md FIRST ACTION to step-00-init.md.

# Step 5: Merge

## References
- `references/merge-strategies.md` — Conflict detection, classification, resolution algorithms
- `references/git-operations.md` — **Merge verification patterns (CRITICAL)**
- `references/output-formats.md#step-05` — Merge log format

## MANDATORY EXECUTION RULES:

- NEVER merge with failing tests
- NEVER force push or destructive git operations
- ALWAYS ensure all changes are committed
- ALWAYS rebase on latest main before merge
- ALWAYS update feature state after successful merge
- YOU ARE A MERGER, not an implementer
- FORBIDDEN to modify code in this step

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
| `{output_dir}` | **ABSOLUTE** path to output directory (at project root, NOT worktree) |
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
git reset HEAD -- .nomos/features.json 2>/dev/null || true
git commit -m "chore({feature_id}): final changes before merge"
```

### 1b. Pre-merge Conflict Detection

Follow the procedure in `references/merge-strategies.md#pre-merge-conflict-detection`.

Classify conflicts using the table in `references/merge-strategies.md#conflict-classification`.

### 1c. Apply Deterministic Merge Strategies

For each conflicting file, apply the matching strategy from `references/merge-strategies.md`:
- **ImportStrategy** — merge import specifiers
- **AppendStrategy** — concatenate additions
- **OrderingStrategy** — sort barrel exports

After all strategies applied: always run post-rebase quality re-check (section 3b).

### 2. Update from Main

```bash
cd {worktree_path}
git rebase origin/main
```

**If conflicts occur:**
- In `{auto_mode}`: Apply auto-resolution for classified patterns, attempt merge for others
- Otherwise: List conflicts with classification and ask user for guidance

### 3. Final Validation

```bash
cd {worktree_path}
bun run check-types
bun run test:ci
```

**If checks fail:** HALT merge, report failures, return to step-03 for fixes.

### 3b. Post-Rebase Quality Re-check

**If conflicts were resolved during rebase:**

```bash
cd {worktree_path}
bun run check-types && bun run check
```

If post-rebase checks fail: fix issues, commit, re-run checks.

### 4. Merge to Main

**NOTE:** Main branch is already checked out in {project_root}. Do NOT run `git checkout main`.

<critical>
**REQUIRED COMMANDS — MUST EXECUTE LITERALLY**

The following commands are NOT descriptions — they MUST be executed and their output captured.
Do NOT paraphrase, summarize, or skip. Run each command and verify the result.
</critical>

**Step 4a: Capture pre-merge state**
```bash
cd {project_root}
PRE_MERGE_MAIN=$(git rev-parse main)
FEATURE_COMMIT=$(git rev-parse nomos/{feature_id})
echo "PRE_MERGE_MAIN=$PRE_MERGE_MAIN"
echo "FEATURE_COMMIT=$FEATURE_COMMIT"
```

**Step 4b: Execute merge**
```bash
git merge nomos/{feature_id} --no-ff -m "feat({feature_id}): {feature_title}

Implements feature {feature_id} with acceptance criteria:
{acceptance_criteria_summary}"
```

**Step 4c: Verify merge succeeded (MANDATORY)**

See `references/git-operations.md#merge-verification` for the full pattern.

```bash
# Capture post-merge state
POST_MERGE_MAIN=$(git rev-parse main)
echo "POST_MERGE_MAIN=$POST_MERGE_MAIN"

# VERIFICATION 1: Main branch moved
if [[ "$PRE_MERGE_MAIN" == "$POST_MERGE_MAIN" ]]; then
    echo "ERROR: main branch did not move — merge had no effect"
    echo "MERGE VERIFICATION: FAILED"
    exit 1
fi

# VERIFICATION 2: Feature commit is ancestor of main
if ! git merge-base --is-ancestor "$FEATURE_COMMIT" main; then
    echo "ERROR: Feature commit $FEATURE_COMMIT is NOT in main ancestry"
    echo "MERGE VERIFICATION: FAILED"
    exit 1
fi

echo "MERGE VERIFICATION: PASSED"
echo "  Feature $FEATURE_COMMIT merged into main ($POST_MERGE_MAIN)"
```

<critical>
**DO NOT PROCEED** to step 5 unless merge verification outputs "PASSED".
If verification fails, investigate and retry the merge.
</critical>

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

See `references/git-operations.md#cleanup-worktree` for the safe cleanup pattern.

```bash
cd {project_root}

# FIRST: Verify branch was merged (safety check)
if ! git branch --merged main | grep -q "nomos/{feature_id}"; then
    echo "ERROR: Cannot delete branch — nomos/{feature_id} was NOT merged into main"
    echo "Skipping cleanup to preserve unmerged work"
    # Do NOT exit — continue without cleanup
else
    # Safe to remove worktree and branch
    git worktree remove {worktree_path} --force

    # Delete branch (will fail if not merged, which is correct behavior)
    git branch -d nomos/{feature_id}

    echo "Cleanup: worktree and branch removed"
fi
```

**Verify cleanup:**
```bash
# Check worktree removed
if ls -d {worktree_path} 2>/dev/null; then
    echo "WARNING: worktree directory still exists — removing manually"
    rm -rf {worktree_path}
fi

# Check branch removed
if git branch | grep -q "nomos/{feature_id}"; then
    echo "WARNING: branch still exists"
else
    echo "Branch deleted"
fi
```

**If `{cleanup_mode}` = false AND `{auto_mode}` = false:** Ask user via AskUserQuestion.
**If `{cleanup_mode}` = false AND `{auto_mode}` = true:** Keep worktree (default).

### 7. Save Output

<critical>
**Write to `{output_dir}/05-merge.md` using the ABSOLUTE output_dir path.**
The `{output_dir}` is an absolute path at the project root — use it directly.
</critical>

Write merge log using the format from `references/output-formats.md#step-05-merge-log-format`.

---

## SUCCESS METRICS:

- Worktree clean before merge
- Rebased on latest main
- Post-rebase validation passed
- Merge commit created with proper message
- **Merge verification PASSED** (main moved, feature is ancestor)
- **Merge evidence recorded** (pre/post hashes, feature commit)
- Feature state updated to "verified"
- Ports released
- Output saved with evidence

## FAILURE MODES:

- Merging with failing tests
- Force pushing or destructive operations
- **Skipping merge verification**
- **Reporting success without evidence**
- **Cleaning up unmerged branches**
- Not updating feature state
- Not releasing ports
- Modifying code during merge step

---

## NEXT STEP:

After successful merge, proceed to `./step-06-finish.md`

<critical>
This step is ONLY about git operations - no code changes!
</critical>
