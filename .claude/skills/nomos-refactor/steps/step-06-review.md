---
name: step-06-review
description: "Review all changes made and check for issues before merging"
prev_step: steps/step-05-validate.md
next_step: steps/step-07-merge.md
---

# Step 06: Review Changes

<objective>
Review all changes made and check for issues before merging.
</objective>

<instructions>

## 1. Generate Diff Summary

```bash
cd {worktree_path}
git diff main --stat > {output_dir}/diff-stat.txt
git diff main > {output_dir}/full-diff.patch
```

## 2. Analyze Changes

```markdown
## Changes Summary

**Files Changed:** {count}
**Insertions:** +{count}
**Deletions:** -{count}

### Files Modified
{list of files}

### Key Changes
{summary of what changed}
```

## 3. Check for Issues

- [ ] No unintended changes
- [ ] No leftover debug code
- [ ] No hardcoded values
- [ ] All imports updated
- [ ] No dead code left behind
- [ ] No console.log statements added

## 4. Security Review (Dependency Changes)

If `{refactor_type}` is `dependency`:

```javascript
Task({
  type: "security-reviewer",
  prompt: `Review the dependency change from ${target} to ${replacement}:
    1. Check for known vulnerabilities in ${replacement}
    2. Verify no security features were removed
    3. Check for supply chain risks
    Report any concerns.`
});
```

## 5. Generate Diff Summary

Save to `{output_dir}/diff-summary.md`:

```markdown
# Refactor Diff Summary

**Type:** {refactor_type}
**Target:** {target} → {replacement}

## Statistics
- Files changed: {count}
- Lines added: {count}
- Lines removed: {count}

## Files Changed
{categorized list}

## Notable Changes
{key changes to review}

## Security Notes
{security review results if applicable}
```

## 6. User Review (Unless Auto Mode)

If `{auto_mode}` is false:

```yaml
questions:
  - header: "Review"
    question: "Review complete. Proceed with merge?"
    options:
      - label: "Merge to main"
        description: "Apply changes to main branch"
      - label: "Keep for manual review"
        description: "Keep worktree, don't merge yet"
      - label: "Abort"
        description: "Discard all changes"
    multiSelect: false
```

</instructions>

<next_step>
Load `steps/step-07-merge.md`
</next_step>
