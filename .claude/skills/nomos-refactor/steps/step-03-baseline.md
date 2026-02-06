# Step 03: Capture Baseline

<objective>
Run full validation suite and capture metrics before any changes to ensure we can detect regressions.
</objective>

<instructions>

## 1. Run Test Suite

```bash
cd {worktree_path}

# Run all tests and capture results
bun test 2>&1 | tee {output_dir}/baseline-tests.log
TEST_EXIT_CODE=$?

# Parse results
TESTS_PASSED=$(grep -c "✓" {output_dir}/baseline-tests.log || echo "0")
TESTS_FAILED=$(grep -c "✗" {output_dir}/baseline-tests.log || echo "0")
```

## 2. Run Type Check

```bash
bun run check-types 2>&1 | tee {output_dir}/baseline-types.log
TYPES_EXIT_CODE=$?
TYPE_ERRORS=$(grep -c "error" {output_dir}/baseline-types.log || echo "0")
```

## 3. Run Linting

```bash
bun run lint 2>&1 | tee {output_dir}/baseline-lint.log
LINT_EXIT_CODE=$?
LINT_ERRORS=$(grep -c "error" {output_dir}/baseline-lint.log || echo "0")
```

## 4. Capture Metrics

```bash
# Build time
START=$(date +%s%N)
bun run build 2>&1 > /dev/null
END=$(date +%s%N)
BUILD_TIME_MS=$(( (END - START) / 1000000 ))

# Bundle size (if applicable)
BUNDLE_SIZE=$(du -sk dist/ 2>/dev/null | cut -f1 || echo "0")

# Line count of target
TARGET_LINES=$(wc -l < {target} 2>/dev/null || find {target} -name "*.ts" -exec wc -l {} + | tail -1 | awk '{print $1}')
```

## 5. Create Checkpoint

```bash
cd {worktree_path}
git add -A
git commit -m "checkpoint: baseline before refactor" --allow-empty
CHECKPOINT_HASH=$(git rev-parse HEAD)
```

## 6. Save Baseline

Save to `{output_dir}/baseline.json`:

```json
{
  "timestamp": "{timestamp}",
  "checkpoint_hash": "{checkpoint_hash}",
  "tests": {
    "passed": {tests_passed},
    "failed": {tests_failed},
    "exit_code": {test_exit_code}
  },
  "types": {
    "errors": {type_errors},
    "exit_code": {types_exit_code}
  },
  "lint": {
    "errors": {lint_errors},
    "exit_code": {lint_exit_code}
  },
  "metrics": {
    "build_time_ms": {build_time_ms},
    "bundle_size_kb": {bundle_size},
    "target_lines": {target_lines}
  }
}
```

## 7. Validate Baseline

```javascript
// Ensure we have a clean baseline
if (baseline.tests.failed > 0) {
  console.warn("⚠️ Warning: Baseline has failing tests");
  if (!force_mode) {
    throw new Error("Cannot refactor with failing tests. Use -f to force.");
  }
}

if (baseline.types.errors > 0) {
  throw new Error("Cannot refactor with type errors");
}
```

## 8. Display Baseline Summary

```markdown
## Baseline Captured

| Metric | Value |
|--------|-------|
| Tests Passed | {tests_passed} |
| Tests Failed | {tests_failed} |
| Type Errors | {type_errors} |
| Lint Errors | {lint_errors} |
| Build Time | {build_time_ms}ms |
| Bundle Size | {bundle_size}KB |

**Checkpoint:** `{checkpoint_hash}`

{tests_failed > 0 ? "⚠️ Warning: Failing tests in baseline" : "✓ Clean baseline"}

Proceeding to execution...
```

</instructions>

<next_step>
Load `steps/step-04-execute.md`
</next_step>
