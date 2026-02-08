---
name: step-04-verify
description: "Parallel verification: static checks + runtime testing + code review"
prev_step: steps/step-03-execute.md
next_step: steps/step-05-merge.md
---

> **DEPRECATED (v3):** Superseded by NOMOS v4 phases. Kept for rollback. Restore: change SKILL.md FIRST ACTION to step-00-init.md.

# Step 4: Verify (3 Parallel Tracks)

## References
- `references/agent-prompts.md#step-04` — Track A, B, C agent prompts + failure fix agent
- `references/failure-classification.md` — Failure types, signatures, recurring issues, escalation
- `references/output-formats.md#step-04` — Verification report format
- `references/output-formats.md#step-04---step-05` — Compact context transfer

## MANDATORY EXECUTION RULES:

- NEVER skip any verification track
- NEVER claim checks pass when they don't
- NEVER proceed with ANY track failing
- ALWAYS launch all 3 tracks in PARALLEL (single message)
- ALWAYS fix failures before proceeding
- YOU ARE A VERIFIER with an adversarial mindset
- FORBIDDEN to proceed with known failures

## MODE: 3 PARALLEL TRACKS

```
Track A: STATIC CHECKS (no server needed)
  → typecheck + lint + unit tests

Track B: RUNTIME VERIFY (server needed ONCE)
  → start servers → smoke test → QA test → stop servers

Track C: CODE REVIEW (no server needed)
  → security + quality + coverage agents (3-phase: review → fix → re-review)
```

**Gate:** ALL 3 tracks must pass. Failed tracks use classify→fix→re-verify loop (up to 5 cycles per track). Recurring issue detection: if same signature appears 3+ times → stop early. Track C selective re-review: only re-run reviewers that found blocking issues (see section 3b).

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{acceptance_criteria}` | Success criteria |
| `{auto_mode}` | Skip confirmations |
| `{test_mode}` | Include test creation |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | **ABSOLUTE** path to output directory (at project root, NOT worktree) |
| `{server_port}` | Allocated server port |
| `{web_port}` | Allocated web port |
| Files modified | From step-03 execution |
</available_state>

---

## EXECUTION SEQUENCE:

### 0. Read Execute Loop Results

Read `{output_dir}/03-checkpoint.json` to understand the execute-verify loop history.

Extract: iterations used, issues found/fixed, areas requiring fixes, candidate antipatterns.

Use this to: focus extra scrutiny on fix-mode files, pass loop history to Track C agents, check for subtle issues missed by in-loop QA.

If checkpoint shows `final_verdict: "ESCALATED"`, log a warning about extra verification rigor.

Also read candidate antipatterns:
```bash
cat {output_dir}/03-candidate-antipatterns.json 2>/dev/null || echo "NONE"
```

### 1. Prepare Verification Context

Gather modified files:
```bash
bash .claude/skills/nomos/scripts/nomos.sh diff {feature_id} --names
```

Read worktree ports from `{worktree_path}/.nomos/ports.json`.

### 2. Launch ALL 3 Tracks in PARALLEL

<critical>
Launch ALL 3 tracks in a SINGLE message. They run concurrently.
Track B starts servers, the other two don't need them.
Read agent prompts from `references/agent-prompts.md`.
</critical>

**Track A:** Static Checks — see `references/agent-prompts.md#step-04-static-checks-track-a`
**Track B:** Runtime Verification — see `references/agent-prompts.md#step-04-runtime-verification-track-b`
**Track C:** Code Review (3-Phase) — see `references/agent-prompts.md#step-04-code-review-track-c----3-phase-structure`

### 3. Collect Results and Gate Check

After all 3 tracks complete:

```markdown
## Verification Results

| Track | Status | Details |
|-------|--------|---------|
| A: Static | PASS/FAIL | typecheck, lint, tests |
| B: Runtime | PASS/FAIL | smoke, QA ({n}/{m} AC passed) |
| C: Review | PASS/FAIL | Phase 1: {n} findings → Phase 2: {fixes} → Phase 3: {remaining} |

**Gate:** {PASS/FAIL}
```

### 3b. Track C Selective Re-Review Optimization

When Track C Phase 1 completes, only re-run reviewers that found blocking issues:

```
Phase 1 results:
  security-reviewer: 2 CRITICAL findings  → INCLUDE in Phase 3
  code-quality-reviewer: 0 blocking       → SKIP Phase 3
  test-coverage-analyzer: 1 HIGH finding  → INCLUDE in Phase 3
```

**Rule:** In Phase 3 (re-review), only launch agents that produced CRITICAL or HIGH findings in Phase 1. Agents that passed with no blocking issues do NOT need re-verification.

This optimization reduces Track C agent calls by ~30-40% on average.

### 3c. Write Verification Checkpoint

After all 3 tracks complete (and after each fix cycle), write checkpoint:

```bash
# Write to output_dir (using Write tool)
```

```json
{
  "feature_id": "{feature_id}",
  "timestamp": "{ISO}",
  "tracks": {
    "A": {"status": "PASS/FAIL", "cycles": 0},
    "B": {"status": "PASS/FAIL", "cycles": 0},
    "C": {"status": "PASS/FAIL", "cycles": 0, "phase1_reviewers_with_findings": []}
  },
  "gate": "PASS/FAIL/IN_PROGRESS",
  "total_fix_cycles": 0
}
```

File: `{output_dir}/04-checkpoint.json`

This enables resume if step-04 crashes mid-verification.

### 4. Handle Failures (Classification-Based)

**If ANY track fails**, follow the failure classification system in `references/failure-classification.md`:

1. **Classify** each failure using the type table
2. **Track issue signatures** across cycles
3. **Check for recurring issues** (3+ → escalate)
4. **Check for human feedback** (`HUMAN_FEEDBACK.md`)
5. **Launch fix agent** (see `references/agent-prompts.md#step-04-failure-fix-agent`)
6. **Re-verify ONLY the failed track** (not all tracks)
7. Max 5 cycles per track → escalate to user

### 5. Update Feature State

**If gate PASSES:**

```bash
bash .claude/skills/nomos/scripts/nomos.sh state complete {feature_id}
```

This transitions: `in_progress → waiting_approval`

### 6. Save Output

Write unified verification report to `{output_dir}/04-verify.md`.
Use the format from `references/output-formats.md#step-04-verification-report-format`.
Include the compact context transfer block at the TOP (see `references/output-formats.md#step-04---step-05`).

---

## SUCCESS METRICS:

- All 3 tracks launched in PARALLEL (single message)
- Track A: typecheck + lint + tests all pass
- Track B: servers started ONCE, smoke + QA pass, servers stopped
- Track C: no blocking findings (CRITICAL/HIGH real issues)
- Gate check completed
- Feature state updated to waiting_approval
- Output saved
- Servers confirmed stopped

## FAILURE MODES:

- Launching tracks sequentially (MUST be parallel)
- Starting servers in Track A or C (only Track B)
- Not stopping servers in Track B
- Claiming pass without actual verification
- Not classifying failures before retrying
- Retrying without a targeted fix (blind retry)
- Not retrying failed tracks before giving up
- Skipping any track for any feature type
- Not fixing blocking findings before proceeding

---

## NEXT STEP:

After gate passes, load `./step-05-merge.md`

<critical>
ALL 3 tracks must pass. No exceptions. Failed tracks use classify→fix→re-verify (up to 5 cycles).
Recurring issues (3+ occurrences) are escalated, not retried.
Servers are started ONCE in Track B and stopped before Track B completes.
</critical>
