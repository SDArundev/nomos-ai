# Failure Classification Reference

Failure handling system for step-04 verification tracks.

---

## Failure Type Classification

| Type | Signature | Fix Strategy | Retry Scope |
|------|-----------|-------------|-------------|
| `TYPE_ERROR` | TS errors (TS2xxx) | Fix types, add missing imports | Track A only |
| `LINT_ERROR` | Biome errors | Auto-fix with `bunx biome check . --write` | Track A only |
| `TEST_FAILURE` | Assertion failed, expect() | Fix test or code logic | Track A only |
| `BUILD_ERROR` | Module not found, resolve error | Fix imports, check dependencies | Track A only |
| `SERVER_CRASH` | Port in use, EADDRINUSE, startup fail | Release/realloc ports | Track B only |
| `RUNTIME_ERROR` | 500 status, unhandled exception | Fix API logic, error handling | Track B only |
| `AC_NOT_MET` | AC check returns FAIL | Implement missing functionality | Track B only |
| `SECURITY_FINDING` | CRITICAL/HIGH vulnerability | Fix vulnerability | Track C only |
| `QUALITY_ISSUE` | Blocking code quality finding | Refactor affected code | Track C only |

---

## Failure Handling Sequence

```
Track fails -> CLASSIFY failure -> Launch FIX agent -> Re-verify ONLY failed track
Max 5 cycles per track -> escalate to user
```

1. **Classify** each failure using the signature column
2. **Launch FIX agent** (see `references/agent-prompts.md#step-04-failure-fix-agent`)
3. **Re-verify ONLY the failed track** (not all tracks)
4. If still fails -> back to step 1 (max 5 cycles per track)
5. Do NOT re-run passing tracks

---

## Issue Signature Computation

For each failure, compute a signature:

```
signature = "{failure_type}:{file_path}:{error_code}"
```

Maintain `{issue_tracker}` dict across cycles:

```json
{
  "signatures": {
    "TYPE_ERROR:src/auth.ts:TS2345": {
      "count": 2,
      "first_seen_cycle": 1,
      "last_fix_attempted": "Added type cast"
    }
  }
}
```

Increment count for each occurrence. Record last fix attempted.

---

## Recurring Issue Detection

For each failure signature:
- IF same signature appears **3+ times**: stop retrying that issue, add to `escalation_log`
- IF **ALL remaining failures** are recurring (3+ occurrences) -> escalate to user:

```yaml
questions:
  - header: "Recurring"
    question: "These issues keep recurring after {cycle} fix cycles. How to proceed?"
    options:
      - label: "Provide guidance (Recommended)"
        description: "Write guidance to .nomos/output/{feature_id}/HUMAN_FEEDBACK.md"
      - label: "Skip these issues"
        description: "Continue with known recurring issues documented"
      - label: "Abort feature"
        description: "Stop this feature run entirely"
    multiSelect: false
```

Write escalation report to `{output_dir}/04-escalation-{track}.md`

---

## Human Feedback Integration

Before launching fix agent, check for human feedback:

```bash
ls {output_dir}/HUMAN_FEEDBACK.md 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

- IF found: Read contents of `.nomos/output/{feature_id}/HUMAN_FEEDBACK.md`
- Rename to `HUMAN_FEEDBACK.processed.md` after reading:
  ```bash
  mv {output_dir}/HUMAN_FEEDBACK.md {output_dir}/HUMAN_FEEDBACK.processed.md
  ```
- Inject contents into fix agent prompt inside `<human_guidance>` tags
- This enables mid-loop human intervention during autonomous runs

---

## Failure Log Format

```markdown
## Failure Log

| # | Type | Track | Signature | Fix Applied | Retry |
|---|------|-------|-----------|-------------|-------|
| 1 | TYPE_ERROR | A | TS2345: Argument of type... | Added missing type cast | Cycle 1/5 |

### Escalation Log (recurring issues)

| Signature | Occurrences | First Seen | Last Fix Attempted | Status |
|-----------|-------------|------------|-------------------|--------|
| {signature} | {count} | Cycle {n} | {description} | Escalated / Skipped |
```

---

## Exhaustion Escalation

If all fix cycles exhausted (5 per track) OR all remaining issues are recurring:

```yaml
questions:
  - header: "Verify Failed"
    question: "Verification failed after classified retries. How to proceed?"
    options:
      - label: "Return to step-03 to fix (Recommended)"
        description: "Go back to implementation to address issues"
      - label: "Continue with known issues"
        description: "Proceed despite failures (document as known issues)"
      - label: "Review failures in detail"
        description: "Show me the full failure details"
    multiSelect: false
```
