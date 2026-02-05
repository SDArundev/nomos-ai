# Git Operations Reference

Verified git patterns for NOMOS and standalone git skills. Single source of truth for critical operations.

---

## Table of Contents

1. [Merge Verification](#merge-verification)
2. [Worktree Management](#worktree-management)
3. [Commit Message Templates](#commit-message-templates)
4. [Branch Cleanup](#branch-cleanup)

---

## Merge Verification

<critical>
**MANDATORY** — Always verify merges. Never assume success.
</critical>

### Pattern: Verify Branch Merged

```bash
# Capture state BEFORE merge
PRE_MERGE_MAIN=$(git rev-parse main)
FEATURE_COMMIT=$(git rev-parse {branch_name})

# Perform merge
git merge {branch_name} --no-ff -m "{message}"
MERGE_EXIT_CODE=$?

# Capture state AFTER merge
POST_MERGE_MAIN=$(git rev-parse main)

# VERIFICATION 1: Command exit code
if [[ $MERGE_EXIT_CODE -ne 0 ]]; then
    echo "ERROR: git merge command failed with exit code $MERGE_EXIT_CODE"
    exit 1
fi

# VERIFICATION 2: Main branch moved
if [[ "$PRE_MERGE_MAIN" == "$POST_MERGE_MAIN" ]]; then
    echo "ERROR: main branch did not move — merge had no effect"
    exit 1
fi

# VERIFICATION 3: Feature commit is ancestor of main
if ! git merge-base --is-ancestor "$FEATURE_COMMIT" main; then
    echo "ERROR: Feature commit $FEATURE_COMMIT is NOT in main ancestry"
    exit 1
fi

echo "VERIFIED: Merge successful"
echo "  PRE:  $PRE_MERGE_MAIN"
echo "  POST: $POST_MERGE_MAIN"
echo "  FEAT: $FEATURE_COMMIT"
```

### Evidence Format

Always record merge evidence:

```markdown
## Merge Evidence

| Field | Value |
|-------|-------|
| Pre-merge main | {PRE_MERGE_MAIN} |
| Post-merge main | {POST_MERGE_MAIN} |
| Feature commit | {FEATURE_COMMIT} |
| Merge exit code | {MERGE_EXIT_CODE} |
| Ancestry check | PASS |
```

### Common Failure Modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Main didn't move | Merge not executed | Run the merge command |
| Feature not ancestor | Fast-forward failed | Check branch divergence |
| Exit code non-zero | Conflicts or errors | Resolve conflicts first |

---

## Worktree Management

### Create Feature Worktree

```bash
# From project root
git worktree add .nomos/worktrees/{feature_id} -b nomos/{feature_id}

# Verify creation
ls -d .nomos/worktrees/{feature_id} || echo "FAILED: Worktree not created"
git -C .nomos/worktrees/{feature_id} branch --show-current
```

### Worktree vs Main Relationship

```
PROJECT_ROOT/           ← main branch checked out here
└── .nomos/worktrees/
    └── {feature_id}/   ← nomos/{feature_id} branch checked out here
```

<critical>
**Worktrees are NOT shared with main.** Each worktree has its own branch. Commits in a worktree do NOT appear on main until explicitly merged.
</critical>

### Merge FROM Worktree TO Main

```bash
# MUST run from project root (where main is checked out)
cd {project_root}

# Merge the feature branch into main
git merge nomos/{feature_id} --no-ff -m "{message}"

# Verify (see Merge Verification above)
```

### Cleanup Worktree

```bash
# FIRST verify branch was merged
if ! git branch --merged main | grep -q "nomos/{feature_id}"; then
    echo "ERROR: Branch not merged — cannot safely delete"
    exit 1
fi

# Remove worktree (from project root)
git worktree remove .nomos/worktrees/{feature_id} --force

# Delete branch (safe because we verified it's merged)
git branch -d nomos/{feature_id}

# Verify cleanup
ls -d .nomos/worktrees/{feature_id} 2>/dev/null && echo "WARNING: Directory still exists" || echo "Worktree removed"
git branch | grep -q "nomos/{feature_id}" && echo "WARNING: Branch still exists" || echo "Branch deleted"
```

---

## Commit Message Templates

### NOMOS Feature Commit

```
feat({feature_id}): {feature_title}

{description}

Acceptance Criteria:
{acceptance_criteria_list}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### NOMOS Merge Commit

```
feat({feature_id}): {feature_title}

Implements feature {feature_id} with acceptance criteria:
- {ac1}
- {ac2}
- {ac3}

Verified: All ACs passed runtime verification.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Conventional Commit Types

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, deps |
| `refactor` | Code restructure |
| `docs` | Documentation only |
| `test` | Test changes |
| `perf` | Performance |

---

## Branch Cleanup

### Safe Branch Deletion

```bash
# -d (lowercase) = safe delete, requires branch to be merged
git branch -d {branch_name}

# -D (uppercase) = force delete, DANGEROUS
# Only use when you're certain the branch is no longer needed
git branch -D {branch_name}
```

### Verify Before Delete

```bash
# List branches merged into main
git branch --merged main

# Check specific branch
git branch --merged main | grep -q "{branch_name}" && echo "MERGED" || echo "NOT MERGED"
```

### Cleanup Stale Remote References

```bash
git fetch --prune
```

---

## Integration Notes

### For NOMOS

NOMOS uses these patterns in:
- `step-00-init.md` — Worktree creation
- `step-05-merge.md` — Merge verification, cleanup

### For Standalone Git Skills

Git skills can reference this file for:
- `git-merge` — Merge verification pattern
- `git-commit` — Commit message templates
