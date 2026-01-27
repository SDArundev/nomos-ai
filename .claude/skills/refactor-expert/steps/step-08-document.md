# Step 08: Document Refactoring

<objective>
Record the refactoring in history and update any affected documentation.
</objective>

<instructions>

## 1. Record in Refactoring History

Append to `.nomos/learning/refactoring-history.json`:

```json
{
  "id": "REF-{timestamp}",
  "timestamp": "{timestamp}",
  "type": "{refactor_type}",
  "target": "{target}",
  "replacement": "{replacement}",
  "commit": "{merge_hash}",
  "files_changed": {count},
  "lines_added": {add},
  "lines_removed": {del},
  "risk_level": "{risk_level}",
  "duration_minutes": {duration},
  "rollbacks": {rollback_count},
  "baseline": {
    "tests_passed": {baseline_tests},
    "build_time_ms": {baseline_build}
  },
  "results": {
    "tests_passed": {result_tests},
    "build_time_ms": {result_build}
  },
  "notes": "{any_notes}"
}
```

## 2. Generate Migration Guide (If Breaking Changes)

If the refactor has breaking changes, create `{output_dir}/migration-guide.md`:

```markdown
# Migration Guide: {target} → {replacement}

## Overview

This refactoring replaced `{target}` with `{replacement}`.

## Breaking Changes

{list of breaking changes}

## Migration Steps

### Before

```typescript
import { x } from '{target}';
x.oldMethod();
```

### After

```typescript
import { x } from '{replacement}';
x.newMethod();
```

## API Changes

| Old | New | Notes |
|-----|-----|-------|
| {old_api} | {new_api} | {notes} |

## Common Issues

### Issue 1: {issue}
**Solution:** {solution}

## Verification

Run these commands to verify migration:

```bash
bun run check-types
bun test
```
```

## 3. Update Project Documentation (If Needed)

Check if any documentation references the changed code:

```bash
grep -r "{target}" docs/ README.md CLAUDE.md 2>/dev/null
```

If found, update the references.

## 4. Record Patterns Learned

If new patterns discovered, add to `.nomos/learning/patterns.json`:

```json
{
  "refactoring_patterns": [
    {
      "type": "{refactor_type}",
      "pattern": "{description}",
      "learned_from": "REF-{timestamp}",
      "recommendation": "{recommendation}"
    }
  ]
}
```

## 5. Final Summary

```markdown
## Refactoring Complete

**Session:** REF-{timestamp}
**Type:** {refactor_type}
**Target:** {target} → {replacement}

### Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Tests | {b} | {a} | {d} |
| Build | {b}ms | {a}ms | {d}ms |
| Bundle | {b}KB | {a}KB | {d}KB |

### Artifacts

- Analysis: `{output_dir}/analysis.md`
- Plan: `{output_dir}/plan.md`
- Diff: `{output_dir}/diff-summary.md`
- Results: `{output_dir}/results.json`
{migration_guide ? "- Migration: `{output_dir}/migration-guide.md`" : ""}

### Commit

`{merge_hash}` - refactor({refactor_type}): {target} → {replacement}

---

✓ Refactoring session complete
```

</instructions>

<success_criteria>
- Refactoring recorded in history
- Migration guide created (if breaking)
- Documentation updated (if needed)
- Patterns recorded for future learning
- Clear summary provided
</success_criteria>
