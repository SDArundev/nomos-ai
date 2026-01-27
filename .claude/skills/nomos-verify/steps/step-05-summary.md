# Step 05: Summary and Next Steps

<objective>
Display final summary and provide actionable next steps.
</objective>

<instructions>

## 1. Display Verification Summary

```markdown
## Verification Complete

### Results

| Metric | Value |
|--------|-------|
| Features Verified | {total} |
| Passed | {passed} ✅ |
| Failed | {failed} ❌ |
| Regressions | {regressions} ⚠️ |
| Issues Found | {issues} |

### Pass Rate: {pass_rate}%

{progress_bar}
```

## 2. Show Priority Queue

If issues were found:

```markdown
### Priority Queue (Next Fixes)

| Priority | ID | Title | Severity |
|----------|-----|-------|----------|
| 1 | F162 | Fix WebSocket Routing | CRITICAL |
| 2 | F163 | Add ID Validation | HIGH |
| 10 | F164 | Add Cascade Delete | MEDIUM |
```

## 3. Recommendations

Based on results, provide actionable recommendations:

### If All Passed
```markdown
### Status: All Clear ✅

All {total} features passed verification.
No regressions detected.

**Recommendation:** Safe to proceed with development.
```

### If Issues Found
```markdown
### Status: Issues Found ⚠️

{failed} feature(s) failed verification.
{regressions} regression(s) detected.

**Immediate Actions:**
1. Run `/nomos -a F162` to fix WebSocket routing
2. Run `/nomos -a F163` to add ID validation

**After Fixes:**
Run `/verify -r` to confirm regressions resolved.
```

### If Regressions Found
```markdown
### Status: Regressions Detected 🔴

{regressions} previously verified feature(s) now failing.

**Root Cause Analysis Needed:**
- Review recent commits
- Check for breaking changes
- Verify dependencies

**Affected Features:**
{regression_list}

**Recommendation:** Fix regressions before new development.
```

## 4. Integration Reminder

```markdown
### NOMOS Integration

**Continue Development:**
```bash
/nomos -a {next_feature}
```

**Re-verify After Fixes:**
```bash
/verify -r
```

**Full Regression Check:**
```bash
/verify -s verified
```
```

## 5. Session Complete

```markdown
---

**Verification session complete.**

Report saved to: `{output_dir}/summary.md`

Time elapsed: {duration}
```

</instructions>

<next_step>
Load `steps/step-06-learn.md` to extract patterns and update heuristics.
</next_step>
