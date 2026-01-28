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

### 1b. Pre-merge Conflict Detection

Before rebasing, check for potential conflicts:

```bash
cd {worktree_path}
git fetch origin main

# Files changed in this feature
FEATURE_FILES=$(git diff --name-only main...HEAD)

# Files changed on main since branch point
MAIN_FILES=$(git diff --name-only HEAD...origin/main)

# Find overlap
CONFLICTING_FILES=$(comm -12 <(echo "$FEATURE_FILES" | sort) <(echo "$MAIN_FILES" | sort))
```

**If overlapping files found, classify each conflict:**

| Pattern | Type | Auto-Resolvable? |
|---------|------|-------------------|
| Both sides add imports | Import dedup | Yes — merge both, deduplicate |
| Both sides append to array/object | Append-only | Yes — include both additions |
| Both sides add schema fields | Schema addition | Yes — merge fields |
| Same line edited differently | Same-line edit | No — pause for resolution |
| File deleted on one side | Delete conflict | No — pause for resolution |

```markdown
## Conflict Prediction

| File | Conflict Type | Resolution |
|------|--------------|------------|
| `src/path/file.ts` | Import dedup | Auto-resolve |
| `src/path/schema.ts` | Same-line edit | Manual needed |
```

**If all conflicts auto-resolvable:** Proceed with rebase (conflicts will be resolved during rebase).
**If any non-resolvable conflicts:** Warn before rebase, prepare resolution strategy.

### 1c. Apply Deterministic Merge Strategies

For each conflicting file, classify and apply the matching strategy:

#### ImportStrategy (both branches added imports)

1. Parse all import statements into `{source, specifiers[]}` tuples
2. Merge specifiers for the same source (union of both sides)
3. Deduplicate identical specifiers
4. Sort imports:
   - External packages first (no `./` or `../` prefix)
   - Then relative imports (`./ ` and `../`)
   - Alphabetically within each group
5. Write merged import block

**Example:**
```
// Ours:   import { a, b } from "lib"
// Theirs: import { b, c } from "lib"
// Result: import { a, b, c } from "lib"
```

#### AppendStrategy (both branches appended to same array/object/block)

1. Detect the append point — last common line between both sides
2. Concatenate both additions (ours first, theirs second) after the common line
3. Verify no duplicate keys (for objects) or duplicate entries (for arrays)
4. If duplicates found: keep the first occurrence, remove the second

**Example:**
```
// Ours added:   { id: "route-a", path: "/a" }
// Theirs added: { id: "route-b", path: "/b" }
// Result: both entries appended in order
```

#### OrderingStrategy (both branches modified barrel exports in index.ts)

1. Collect all `export` statements from both sides
2. Deduplicate — same export from same source = keep one
3. Sort alphabetically by source path
4. Write sorted export block

**Example:**
```
// Result: exports sorted alphabetically by source
export { auth } from "./auth"
export { db } from "./db"
export { users } from "./users"
```

#### Application Flow

```
For each conflicting file:
  1. Classify conflict type (imports / append / barrel exports / other)
  2. IF matching strategy exists → apply strategy → log result
  3. IF no matching strategy → mark for manual resolution
  4. Log all resolutions to merge report
```

```markdown
## Deterministic Merge Resolutions

| File | Strategy | Action | Result |
|------|----------|--------|--------|
| `src/path/file.ts` | ImportStrategy | Merged 3 specifiers | AUTO-RESOLVED |
| `src/index.ts` | OrderingStrategy | Sorted 5 exports | AUTO-RESOLVED |
| `src/config.ts` | None | Manual resolution needed | MANUAL |
```

**After all strategies applied:** Always run post-rebase quality re-check (section 3b below).

### 2. Update from Main

```bash
cd {worktree_path}
git rebase origin/main
```

**If conflicts occur:**
- In `{auto_mode}`: Apply auto-resolution for classified patterns, attempt merge for others
- Otherwise: List conflicts with classification and ask user for guidance

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

### 3b. Post-Rebase Quality Re-check

**If conflicts were resolved during rebase (auto or manual):**

Re-run static checks to ensure conflict resolution didn't break anything:

```bash
cd {worktree_path}
bun run check-types && bun run check
```

**If post-rebase checks fail:**
- Fix issues introduced by conflict resolution
- Commit fixes: `git add -A && git commit -m "fix({feature_id}): post-rebase conflict resolution"`
- Re-run checks

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

## Conflict Detection
**Overlapping files:** {count}
**Auto-resolvable:** {count}
**Manual required:** {count}

## Rebase Status
**Conflicts:** {none/list}
**Resolution:** {auto/manual/user-assisted}
**Post-rebase re-check:** PASS/SKIP (skip if no conflicts)

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
