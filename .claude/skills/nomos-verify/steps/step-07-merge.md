# Step 07: Merge or Cleanup

<objective>
Merge verification changes back to main or cleanup based on results and user preference.
</objective>

<instructions>

## 1. Determine Merge Strategy

Based on verification results:

| Result | Default Action | User Override |
|--------|---------------|---------------|
| All Pass | Auto-merge | Can skip |
| Issues Found | Ask user | Can force merge |
| Critical Issues | No merge | Can force (not recommended) |

## 2. Changes Made in Worktree

Review what will be merged:

```bash
cd {worktree_path}
git diff main --stat
```

Typical changes:
- `features.json` - Status updates, new bug fix features
- `.nomos/learning/` - Patterns, heuristics, regression log
- `.nomos/verify/` - Reports and analysis

## 3. Merge Decision

### If All Passed (Auto-merge)
```bash
# Switch to main
git checkout main

# Merge verification branch
git merge {branch_name} --no-ff -m "$(cat <<'EOF'
chore(verify): verification passed - {timestamp}

Verified {count} features - all passed.

Learning updates:
- Patterns recorded: {pattern_count}
- Heuristics updated: {heuristic_count}
EOF
)"
```

### If Issues Found (Ask User)
```markdown
## Verification Complete - Issues Found

**Changes in worktree:**
- features.json: {change_count} modifications
- Bug fixes created: {bugfix_count}
- Regressions reverted: {regression_count}

**Options:**
1. **Merge** - Apply all changes to main
2. **Review** - Keep worktree, review manually
3. **Discard** - Delete worktree, no changes to main
```

Use AskUserQuestion if not in auto mode.

### If Critical Issues (No Auto-merge)
```markdown
## Critical Issues Found - Manual Review Required

{critical_count} critical issues detected.
Auto-merge disabled for safety.

**Worktree preserved at:** {worktree_path}

**To merge manually:**
```bash
git checkout main
git merge {branch_name} --no-ff
```

**To discard:**
```bash
git worktree remove {worktree_path}
git branch -D {branch_name}
```
```

## 4. Post-Merge Cleanup

After successful merge:

```bash
# Remove worktree
git worktree remove {worktree_path}

# Delete branch (already merged)
git branch -d {branch_name}

echo "Cleanup complete"
```

## 5. Keep Worktree Option

If user chooses to keep worktree for review:

```markdown
## Worktree Preserved

**Location:** {worktree_path}
**Branch:** {branch_name}

**To continue working:**
```bash
cd {worktree_path}
# Make additional changes
git add . && git commit -m "Additional fixes"
```

**To merge later:**
```bash
git checkout main
git merge {branch_name} --no-ff
```

**To discard:**
```bash
git worktree remove {worktree_path}
git branch -D {branch_name}
```
```

## 6. Final Status

```markdown
## Verification Session Complete

| Action | Status |
|--------|--------|
| Verification | ✅ Complete |
| Learning | ✅ Recorded |
| Merge | {merge_status} |
| Cleanup | {cleanup_status} |

**Branch:** {branch_name}
**Worktree:** {worktree_status}

**Next Steps:**
{next_steps}
```

</instructions>

<merge_rules>

## Auto-Merge Rules

| Condition | Auto-Merge |
|-----------|------------|
| All features pass | ✅ Yes |
| Only LOW issues | ✅ Yes |
| MEDIUM issues | ⚠️ Ask user |
| HIGH issues | ⚠️ Ask user |
| CRITICAL issues | ❌ No (manual only) |
| Regressions found | ⚠️ Ask user |

## In Auto Mode (-a)

- All Pass → Auto-merge
- Issues Found → Merge anyway (user accepted auto mode)
- Critical → Still ask (safety override)

</merge_rules>

<completion>
Verification workflow complete. Worktree merged or preserved based on results.
</completion>
