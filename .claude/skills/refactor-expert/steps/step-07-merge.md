# Step 07: Merge to Main

<objective>
Merge refactoring changes to main branch and cleanup.
</objective>

<instructions>

## 1. Ensure Worktree is Clean

```bash
cd {worktree_path}
git status

# Commit any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: final cleanup before merge"
fi
```

## 2. Rebase on Latest Main

```bash
git fetch origin main
git rebase origin/main

# If conflicts, resolve or abort
if [ $? -ne 0 ]; then
  echo "Conflicts during rebase - manual resolution needed"
  # Handle conflicts
fi
```

## 3. Final Validation

```bash
bun run check-types
bun test
```

## 4. Merge to Main

```bash
cd {project_root}

git merge {branch_name} --no-ff -m "refactor({refactor_type}): {target} → {replacement}

Type: {refactor_type}
Target: {target}
Replacement: {replacement}

Changes:
- Files modified: {count}
- Lines changed: +{add}/-{del}

Validation:
- Tests: {passed}/{total} passed
- Types: {errors} errors
- Metrics: {summary}"
```

## 5. Cleanup Worktree

If `{keep_worktree}` is false:

```bash
cd {project_root}
git worktree remove {worktree_path}
git branch -d {branch_name}
echo "✓ Worktree cleaned up"
```

If `{keep_worktree}` is true:

```markdown
Worktree kept at: `{worktree_path}`
Branch: `{branch_name}`

To cleanup later:
```bash
git worktree remove {worktree_path}
git branch -d {branch_name}
```
```

## 6. Update State

```json
{
  "status": "merged",
  "merge_commit": "{hash}",
  "merged_at": "{timestamp}"
}
```

## 7. Display Summary

```markdown
## Refactor Merged

**Commit:** `{merge_hash}`
**Branch:** `{branch_name}` → `main`

**Changes Applied:**
- {summary}

**Worktree:** {kept/removed}

Proceeding to documentation...
```

</instructions>

<next_step>
Load `steps/step-08-document.md`
</next_step>
