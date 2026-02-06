---
name: step-05-validate
description: "Run complete validation suite and compare results to baseline"
prev_step: steps/step-04-execute.md
next_step: steps/step-06-review.md
---

# Step 05: Full Validation

<objective>
Run complete validation suite and compare results to baseline.
</objective>

<instructions>

## 1. Run Full Test Suite

```bash
cd {worktree_path}
bun test 2>&1 | tee {output_dir}/results-tests.log
```

## 2. Run Type Check

```bash
bun run check-types 2>&1 | tee {output_dir}/results-types.log
```

## 3. Run Linting

```bash
bun run lint 2>&1 | tee {output_dir}/results-lint.log
```

## 4. Capture Metrics

```bash
# Build time
bun run build
BUILD_TIME_MS=$(...)

# Bundle size
BUNDLE_SIZE=$(du -sk dist/ | cut -f1)
```

## 5. Compare to Baseline

```json
{
  "tests": {
    "baseline_passed": 150,
    "current_passed": 150,
    "delta": 0,
    "status": "✓ SAME"
  },
  "types": {
    "baseline_errors": 0,
    "current_errors": 0,
    "status": "✓ SAME"
  },
  "metrics": {
    "build_time_delta_ms": -50,
    "bundle_size_delta_kb": -10,
    "status": "✓ IMPROVED"
  }
}
```

## 6. Launch QA Agent

```javascript
Task({
  type: "qa-smoke-tester",
  prompt: `Start the application and verify basic functionality:
    1. App starts without errors
    2. Key features still work
    3. No console errors
    Report any issues found.`
});
```

## 7. Save Results

Save to `{output_dir}/results.json`

## 8. Determine Pass/Fail

```javascript
const passed =
  results.tests.current_passed >= results.tests.baseline_passed &&
  results.types.current_errors === 0 &&
  results.lint.current_errors <= results.lint.baseline_errors;

if (!passed) {
  console.error("❌ Validation failed - see details above");
  // Offer rollback
}
```

## 9. Display Comparison

```markdown
## Validation Results

| Metric | Baseline | Current | Delta |
|--------|----------|---------|-------|
| Tests Passed | {b} | {c} | {d} |
| Type Errors | {b} | {c} | {d} |
| Lint Errors | {b} | {c} | {d} |
| Build Time | {b}ms | {c}ms | {d}ms |
| Bundle Size | {b}KB | {c}KB | {d}KB |

**Overall:** {passed ? "✓ PASSED" : "❌ FAILED"}
```

</instructions>

<next_step>
Load `steps/step-06-review.md`
</next_step>
