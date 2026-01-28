---
name: step-04-verify
description: "Parallel verification: static checks + runtime testing + code review"
prev_step: steps/step-03-execute.md
next_step: steps/step-05-merge.md
---

# Step 4: Verify (3 Parallel Tracks)

## MANDATORY EXECUTION RULES:

- NEVER skip any verification track
- NEVER claim checks pass when they don't
- NEVER proceed with ANY track failing
- ALWAYS launch all 3 tracks in PARALLEL (single message)
- ALWAYS fix failures before proceeding
- YOU ARE A VERIFIER with an adversarial mindset
- FORBIDDEN to proceed with known failures

## MODE: 3 PARALLEL TRACKS

This step merges the old validate + smoke + QA + review + test steps into 3 parallel verification tracks.

```
Track A: STATIC CHECKS (no server needed)
  → typecheck + lint + unit tests

Track B: RUNTIME VERIFY (server needed ONCE)
  → start servers → smoke test → QA test → stop servers

Track C: CODE REVIEW (no server needed)
  → security + quality + coverage agents
```

**Gate:** ALL 3 tracks must pass. Failed tracks use classify→fix→re-verify loop (up to 5 cycles per track). Recurring issue detection: if same signature appears 3+ times → stop early even before cycle 5.

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
| `{output_dir}` | Path to output directory |
| `{server_port}` | Allocated server port |
| `{web_port}` | Allocated web port |
| Files modified | From step-03 execution |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Prepare Verification Context

Gather the list of modified files from step-03:

```bash
cd {worktree_path}
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only main
```

Read worktree ports:
```bash
PORTS_JSON=$(cat {worktree_path}/.nomos/ports.json)
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')
```

### 2. Launch ALL 3 Tracks in PARALLEL

<critical>
Launch ALL 3 tracks in a SINGLE message. They run concurrently.
Track B starts servers, the other two don't need them.
</critical>

---

#### TRACK A: Static Checks (no server needed)

```
Task agent: general-purpose
Prompt: |
  ## Track A: Static Verification for {feature_id}

  Working directory: {worktree_path}

  Run these checks IN ORDER. Fix issues before proceeding to next check.

  ### 1. TypeScript Check
  ```bash
  cd {worktree_path}
  bun run check-types
  ```
  MUST PASS. If fails: read errors, fix types, re-run.

  ### 2. Lint/Format (Biome)
  ```bash
  cd {worktree_path}
  bun run check
  ```
  MUST PASS. If fails: fix remaining issues, re-run.

  ### 3. Unit Tests
  ```bash
  cd {worktree_path}
  bun run test:ci
  ```
  MUST PASS. If fails: identify root cause (code bug vs test bug), fix, re-run.

  ### 4. Test Creation (if test_mode = {test_mode})
  IF test_mode is true:
  - Analyze existing test patterns (read 2-3 similar test files)
  - Create tests for new functionality
  - Map tests to acceptance criteria
  - Run tests to verify they pass

  ### Report Format:
  ```
  TRACK_A_RESULT: PASS or FAIL
  typecheck: PASS/FAIL
  lint: PASS/FAIL
  tests: PASS/FAIL (X/Y passing)
  new_tests_created: {count} (if test_mode)
  errors_fixed: {count}
  ```
```

---

#### TRACK B: Runtime Verification (server needed ONCE)

```
Task agent: qa-functional-tester
Model: sonnet
Prompt: |
  ## Track B: Runtime Verification for {feature_id}: {feature_title}

  Working directory: {worktree_path}
  Server port: {server_port} (or $SERVER_PORT from ports.json)
  Web port: {web_port} (or $WEB_PORT from ports.json)

  ### Phase 1: Start Application (ONCE)
  ```bash
  cd {worktree_path}

  PORTS_JSON=$(cat .nomos/ports.json)
  SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
  WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')

  SERVER_LOG="/tmp/nomos-server-{feature_id}.log"
  WEB_LOG="/tmp/nomos-web-{feature_id}.log"

  bun run dev:server > "$SERVER_LOG" 2>&1 &
  SERVER_PID=$!

  VITE_PORT=$WEB_PORT bun run dev:web > "$WEB_LOG" 2>&1 &
  WEB_PID=$!

  # Wait for startup (max 30s each)
  for i in {1..30}; do
    curl -s "http://localhost:$SERVER_PORT/health" > /dev/null && break
    sleep 1
  done
  for i in {1..30}; do
    curl -s "http://localhost:$WEB_PORT" > /dev/null && break
    sleep 1
  done
  ```

  ### Phase 2: Smoke Test
  - Health check: GET http://localhost:$SERVER_PORT/health → expect 200
  - Frontend check: GET http://localhost:$WEB_PORT → expect HTML
  - Check server logs for errors: grep -i "error|exception" "$SERVER_LOG"

  ### Phase 3: Functional QA (Acceptance Criteria)

  Test EACH acceptance criterion:
  {acceptance_criteria}

  For each AC:
  1. Navigate to relevant page/endpoint
  2. Perform required actions
  3. Verify expected outcome
  4. Capture evidence (screenshot or API response)
  5. Record PASS or FAIL

  For UI criteria: Use Playwright MCP
  For API criteria: Use curl

  ### Phase 4: Stop Servers (MANDATORY)
  ```bash
  kill $SERVER_PID 2>/dev/null || true
  kill $WEB_PID 2>/dev/null || true
  lsof -ti:$SERVER_PORT | xargs kill -9 2>/dev/null || true
  lsof -ti:$WEB_PORT | xargs kill -9 2>/dev/null || true
  ```

  Verify stopped:
  ```bash
  sleep 1
  curl -s "http://localhost:$SERVER_PORT" > /dev/null 2>&1 && echo "WARNING: Server still running!" || echo "Server stopped"
  curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1 && echo "WARNING: Web still running!" || echo "Web stopped"
  ```

  ### Report Format:
  ```
  TRACK_B_RESULT: PASS or FAIL
  server_startup: PASS/FAIL
  web_startup: PASS/FAIL
  smoke_test: PASS/FAIL
  ac_results:
    AC1: PASS/FAIL - {evidence}
    AC2: PASS/FAIL - {evidence}
  servers_stopped: true/false
  runtime_errors: {count}
  ```
```

---

#### TRACK C: Code Review (no server needed) — 3-Phase Structure

<critical>
Track C uses 3 phases: read-only review → conditional fix → conditional re-review.
Phase 1 agents are READ-ONLY. They MUST NOT modify any files.
</critical>

##### Phase 1: Read-Only Review

Launch ALL 3 review agents in a SINGLE message. Each agent is explicitly read-only.

```
Task agent: general-purpose
Model: {phase_models.qa_review}
Prompt: |
  ## Track C Phase 1: Read-Only Code Review for {feature_id}

  Launch these 3 review agents IN PARALLEL (single message):

  ### Agent 1: Security Review
  Task agent: security-reviewer
  ```
  <critical>
  You are READ-ONLY. You MUST NOT use Write, Edit, or any tool that modifies files.
  Your job is to REPORT findings only.
  </critical>

  Review for OWASP Top 10 vulnerabilities:
  - Injection flaws (SQL, command, XSS)
  - Auth/authz issues
  - Data exposure and secrets
  - Security misconfiguration

  Files to review: {modified files list}
  Working directory: {worktree_path}

  For each finding, classify:
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  - Validity: Real / Noise / Uncertain
  ```

  ### Agent 2: Code Quality Review
  Task agent: code-quality-reviewer
  ```
  <critical>
  You are READ-ONLY. You MUST NOT use Write, Edit, or any tool that modifies files.
  Your job is to REPORT findings only.
  </critical>

  Review for code quality issues:
  - Pattern violations
  - Code duplication
  - Complexity issues
  - Maintainability problems
  - Naming consistency

  Files to review: {modified files list}
  Working directory: {worktree_path}

  For each finding, classify:
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  - Validity: Real / Noise / Uncertain
  ```

  ### Agent 3: Test Coverage Analysis
  Task agent: test-coverage-analyzer
  ```
  <critical>
  You are READ-ONLY. You MUST NOT use Write, Edit, or any tool that modifies files.
  Your job is to REPORT findings only.
  </critical>

  Analyze test coverage:
  - What's tested vs untested
  - Missing edge cases
  - Acceptance criteria coverage gaps

  Files to review: {modified files list}
  Working directory: {worktree_path}

  For each finding, classify:
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  - Validity: Real / Noise / Uncertain
  ```

  ### Collect and Classify All Findings

  Aggregate findings from all 3 agents:
  - Severity: CRITICAL / HIGH / MEDIUM / LOW
  - Validity: Real / Noise / Uncertain
  - Blocking: CRITICAL or HIGH + Real

  ### Phase 1 Report Format:
  ```
  PHASE_1_RESULT: PASS or FAIL
  phase1_findings: {total count}
  phase1_blocking: {count of CRITICAL/HIGH + Real findings}
  critical: {count}
  high: {count}
  medium: {count}
  low: {count}
  ```
```

##### Phase 2: Fix (CONDITIONAL — only if Phase 1 found blocking issues)

**IF `phase1_blocking` == 0:** Skip Phase 2 and Phase 3. Track C PASSES.

**IF `phase1_blocking` > 0:** Launch a separate fix agent WITH write access:

```
Task agent: general-purpose
Prompt: |
  ## Track C Phase 2: Fix Blocking Review Findings for {feature_id}

  Working directory: {worktree_path}

  Phase 1 review found {phase1_blocking} blocking issues.
  Fix ONLY the following reported issues:

  {list of CRITICAL/HIGH + Real findings with file, line, description}

  For each finding:
  1. Read the affected file
  2. Apply the minimal fix
  3. Do NOT modify unrelated code

  After all fixes:
  ```bash
  cd {worktree_path}
  bun run check-types
  ```

  Report:
  - phase2_fixes_applied: {count}
  - files_changed: {list}
  - typecheck_after_fix: PASS/FAIL
```

##### Phase 3: Re-Review (CONDITIONAL — only if Phase 2 executed)

**IF Phase 2 did not execute:** Skip Phase 3.

**IF Phase 2 executed:** Re-launch ONLY the affected review agents (read-only) to verify fixes:

```
Task agent: general-purpose
Model: {phase_models.qa_review}
Prompt: |
  ## Track C Phase 3: Re-Review Fixed Findings for {feature_id}

  <critical>
  You are READ-ONLY. You MUST NOT use Write, Edit, or any tool that modifies files.
  </critical>

  Working directory: {worktree_path}

  Phase 2 fixed {phase2_fixes_applied} blocking issues.
  Check ONLY the specific findings that were fixed:

  {list of fixed findings with file, line, original issue}

  For each:
  - Verify the fix addresses the original finding
  - Check the fix didn't introduce new issues

  Report:
  - phase3_verified: {count of successfully verified fixes}
  - remaining_blocking: {count of findings still not resolved}
```

##### Track C Final Report

```
TRACK_C_RESULT: PASS or FAIL
phase1_findings: {total}
phase1_blocking: {count}
phase2_fixes_applied: {count or "skipped"}
phase3_verified: {count or "skipped"}
remaining_blocking: {count}
```

**Track C PASSES** if `remaining_blocking` == 0 (or `phase1_blocking` was 0).

---

### 3. Collect Results and Gate Check

After all 3 tracks complete:

```markdown
## Verification Results

| Track | Status | Details |
|-------|--------|---------|
| A: Static | PASS/FAIL | typecheck, lint, tests |
| B: Runtime | PASS/FAIL | smoke, QA ({n}/{m} AC passed) |
| C: Review | PASS/FAIL | Phase 1: {n} findings ({m} blocking) → Phase 2: {fixes} applied → Phase 3: {remaining} blocking |

**Gate:** {PASS/FAIL}
```

### 4. Handle Failures (Classification-Based)

**If ANY track fails, CLASSIFY the failure first:**

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

**Failure handling sequence (Verify→Fix→Re-verify Loop):**

```
Track fails → CLASSIFY failure → Launch FIX agent → Re-verify ONLY failed track
Max 5 cycles per track → escalate to user
```

1. **Classify** each failure using the signature column

1b. **Track Issue Signatures** — For each failure, compute a signature:
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

1c. **Check for Recurring Issues** — For each failure signature:
   - IF same signature appears **3+ times**: stop retrying that issue, add to `escalation_log`
   - IF **ALL remaining failures** are recurring (3+ occurrences) → escalate to user:
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
   - Write escalation report to `{output_dir}/04-escalation-{track}.md`

1d. **Check for Human Feedback** — Before launching fix agent:
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

2. **Launch FIX agent** — a scoped Task (general-purpose) that fixes ONLY the specific failure:
   ```
   Task agent: general-purpose
   Prompt: |
     ## Fix: {failure_type} in Track {track}

     Working directory: {worktree_path}
     Failure: {failure_signature}
     Error output: {error_details}

     {IF HUMAN_FEEDBACK was found:}
     <human_guidance>
     {contents of HUMAN_FEEDBACK.md}
     </human_guidance>
     {END IF}

     Fix ONLY this specific issue:
     - Strategy: {fix_strategy_from_table}
     - If human guidance is provided, prioritize it over default strategy
     - Do NOT modify unrelated code
     - Verify your fix compiles/works before reporting

     Report:
     - Files changed: {list}
     - Fix applied: {description}
     - Human guidance applied: {yes/no}
   ```
3. **Re-verify ONLY the failed track** (not all tracks)
4. If still fails → back to step 1 (max 5 cycles per track)
5. Do NOT re-run passing tracks

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

**If all fix cycles exhausted (5 per track) OR all remaining issues are recurring:**

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

### 5. Update Feature State

**If gate PASSES:**

```bash
bash .claude/skills/nomos/scripts/nomos.sh state complete {feature_id}
```

This transitions: `in_progress → waiting_approval`

### 6. Save Output

Write unified verification report to `{output_dir}/04-verify.md`:

```markdown
# Verification Report: {feature_id}

## Track A: Static Checks
- TypeScript: PASS
- Lint: PASS
- Tests: {X}/{Y} passing
- New tests created: {count}

## Track B: Runtime Verification
- Server startup: PASS (port {server_port})
- Web startup: PASS (port {web_port})
- Smoke test: PASS
- Acceptance Criteria:
  - AC1: PASS - {evidence}
  - AC2: PASS - {evidence}
- Servers stopped: YES

## Track C: Code Review
- Security: {n} findings
- Quality: {n} findings
- Coverage: {gaps}

### Findings Table
| ID | Severity | Category | Location | Issue | Validity |
|----|----------|----------|----------|-------|----------|
| F1 | CRITICAL | Security | auth.ts:42 | SQL injection | Real |

## Gate: PASS
**Timestamp:** {ISO}
```

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

## CONTEXT COMPACTION (for step-05 handoff):

Before proceeding, add a compact transfer summary at the TOP of `{output_dir}/04-verify.md`:

```markdown
## Compact Context → Step 05

- **Gate Result:** PASS / FAIL
- **Track A (Static):** PASS — typecheck, lint, {n} tests
- **Track B (Runtime):** PASS — {n}/{m} ACs met
- **Track C (Review):** PASS — {n} findings ({m} blocking)
- **Fix Cycles Used:** {n} total across all tracks
- **Blocking Issues:** {count} — {brief list or "none"}
```

This compact summary allows step-05 to proceed with merge confidence.

---

## NEXT STEP:

After gate passes, load `./step-05-merge.md`

<critical>
ALL 3 tracks must pass. No exceptions. Failed tracks use classify→fix→re-verify (up to 5 cycles).
Recurring issues (3+ occurrences) are escalated, not retried.
Servers are started ONCE in Track B and stopped before Track B completes.
</critical>
