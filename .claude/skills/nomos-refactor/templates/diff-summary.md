# Refactor Diff Summary

**Type:** {refactor_type}
**Target:** {target} -> {replacement}
**Session:** REF-{timestamp}

---

## Statistics

| Metric | Value |
|--------|-------|
| Files Changed | {files_changed} |
| Lines Added | +{lines_added} |
| Lines Removed | -{lines_removed} |

---

## Files Changed

### Source Files
{source_files_changed}

### Test Files
{test_files_changed}

### Configuration Files
{config_files_changed}

---

## Notable Changes

{notable_changes}

---

## Security Notes

{security_notes}

---

## Review Checklist

- [ ] No unintended changes
- [ ] No leftover debug code
- [ ] No hardcoded values
- [ ] All imports updated
- [ ] No dead code left behind
- [ ] No console.log statements added
