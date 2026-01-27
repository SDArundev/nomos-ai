# Step 03: Analyze Results

<objective>
Collect and categorize findings from all verification agents.
</objective>

<instructions>

## 1. Parse Agent Results

For each agent result file, extract:
- Feature ID affected
- Pass/Fail status
- Issue description
- Severity level
- Evidence/location

## 2. Categorize by Severity

| Severity | Criteria |
|----------|----------|
| CRITICAL | Feature completely non-functional, blocks others |
| HIGH | Major AC not met, significant gap |
| MEDIUM | Minor AC gap, partial implementation |
| LOW | Nice-to-have, optimization opportunity |

## 3. Identify Regressions

For features with `status: verified`:
- If verification fails → REGRESSION
- Mark for status revert

```javascript
regressions = features_to_verify
  .filter(f => f.status === 'verified')
  .filter(f => verification_failed(f))
```

## 4. Map Issues to Features

Create issue-to-feature mapping:

```json
{
  "F027": {
    "status": "PASS",
    "issues": []
  },
  "F037": {
    "status": "FAIL",
    "issues": [
      {
        "id": "ISS-001",
        "severity": "CRITICAL",
        "description": "WebSocket returns 404",
        "evidence": "curl ws://localhost:3008/ws returns 404",
        "ac_affected": "AC1: WebSocket upgrade at /ws"
      }
    ]
  }
}
```

## 5. Determine Required Actions

For each issue:

| Severity | Action |
|----------|--------|
| CRITICAL | Create P1 bug fix, revert to pending |
| HIGH | Create P2-5 bug fix |
| MEDIUM | Document gap, keep pending |
| LOW | Add note to feature |

## 6. Build Issue Summary

```markdown
## Issue Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 4 |
| MEDIUM | 6 |
| LOW | 3 |

### Critical Issues
1. **ISS-001** (F037): WebSocket returns 404
2. **ISS-002** (F033): Delete doesn't cascade

### Regressions Detected
- F037: Was verified, now fails smoke test
```

## 7. Save Analysis

Write to `{output_dir}/analysis.json`:

```json
{
  "timestamp": "{timestamp}",
  "summary": {
    "total_features": 18,
    "passed": 15,
    "failed": 3,
    "regressions": 1
  },
  "issues": [...],
  "regressions": [...],
  "actions_required": [...]
}
```

</instructions>

<next_step>
Load `steps/step-04-report.md`
</next_step>
