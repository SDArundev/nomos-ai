# Phase 4: REVIEW

Run quality gates: Gate A (static), Gate B (parallel code+security review), Gate C (functional QA).

**Input:** `.nomos/output/{feature_id}/cp-03.json`
**Output:** `.nomos/output/{feature_id}/cp-04.json`
**Context clearing:** After writing cp-04.json, all phase 4 context is discarded.

**Max fix cycles:** 2 total across all gates.

---

## 4.1 Read Checkpoint

Read `cp-03.json`. Extract:
- `env` (worktree_path, output_dir, server_port, web_port, project_root)
- `flags` (auto, test, merge)
- `feature_summary` (id, title, ac)
- `data` (verdict, files_changed, candidate_antipatterns)

```
fix_cycles_used = 0
MAX_FIX_CYCLES = 2
```

---

## 4.2 Gate A: Static Checks (no agent — bash)

Run directly from orchestrator:

```bash
cd {env.worktree_path} && bun run check-types
```

```bash
cd {env.worktree_path} && bun run check
```

```bash
cd {env.worktree_path} && bun run test:ci
```

**IF any fail AND fix_cycles_used < MAX_FIX_CYCLES:**

```
fix_result = Task(
  subagent_type = "code-writer",
  mode = "bypassPermissions",
  model = "sonnet",
  description = "Fix Gate A {feature_id}",
  prompt = "Fix these static check failures in {env.worktree_path}:
    {error output}
    Fix ONLY the failing checks. Return JSON: {files_changed: [...], summary: '...'}"
)
fix_cycles_used += 1
```

Re-run the failing checks. If still failing: gate_a = FAIL.

**Gate A result:**
```json
{
  "status": "PASS|FAIL",
  "typecheck": "PASS|FAIL",
  "lint": "PASS|FAIL",
  "tests": "PASS|FAIL",
  "test_count": 42
}
```

---

## 4.3 Gate B: Parallel Code + Security Review (2 agents)

<critical>
Launch BOTH agents in a SINGLE message using run_in_background.
Create tmux panes for visibility.
</critical>

```bash
bash .claude/skills/nomos/scripts/tmux-session.sh pane {feature_id} "code-reviewer"
bash .claude/skills/nomos/scripts/tmux-session.sh pane {feature_id} "security-reviewer"
```

```
cr = Task(
  subagent_type = "code-reviewer",
  model = "sonnet",
  run_in_background = true,
  description = "Code review {feature_id}",
  prompt = """
    Review code for {feature_summary.id}: {feature_summary.title}
    Working directory: {env.worktree_path}
    Files changed: {data.files_changed}
    Candidate antipatterns: {data.candidate_antipatterns}
    AC: {feature_summary.ac}

    Follow .claude/agents/code-reviewer.md.
    Return JSON: {verdict, findings, blocking_count, quality_summary, coverage_summary}
  """
)

sr = Task(
  subagent_type = "security-reviewer",
  model = "sonnet",
  run_in_background = true,
  description = "Security review {feature_id}",
  prompt = """
    Security review for {feature_summary.id}: {feature_summary.title}
    Working directory: {env.worktree_path}
    Files changed: {data.files_changed}

    Follow .claude/agents/security-reviewer.md.
    Return JSON: {verdict, findings, blocking_count}
  """
)
```

### Wait and Parse Results

Use `TaskOutput` to wait for each background agent to complete:

```
cr_result = TaskOutput(task_id=cr.agentId, block=true, timeout=300000)
sr_result = TaskOutput(task_id=sr.agentId, block=true, timeout=300000)
```

Each agent returns its JSON verdict as text in the final message.
Parse each result to extract `verdict` and `blocking_count`.
If parsing fails, treat as FAIL with `blocking_count = 1`.

**IF either FAIL AND fix_cycles_used < MAX_FIX_CYCLES:**

```
fix_result = Task(
  subagent_type = "code-writer",
  mode = "bypassPermissions",
  model = "sonnet",
  description = "Fix Gate B {feature_id}",
  prompt = "Fix these review findings in {env.worktree_path}:
    {blocking findings from failed reviewer(s)}
    Fix ONLY blocking issues. Return JSON."
)
fix_cycles_used += 1
```

Re-run ONLY the failing reviewer(s). If still failing: that reviewer = FAIL.

**Gate B result:**
```json
{
  "status": "PASS|FAIL|SKIP",
  "code_review": {"status": "PASS|FAIL", "findings": 3, "blocking": 0},
  "security_review": {"status": "PASS|FAIL", "findings": 1, "blocking": 0}
}
```

---

## 4.4 Gate C: Functional QA (conditional)

**SKIP if:** No UI or API acceptance criteria exist (pure backend/config features).

To determine: scan AC list for keywords: "page", "button", "form", "navigate", "API", "endpoint", "response", "display", "render", "click", "modal", "toast".

**IF Gate C applies:**

Start servers:
```bash
bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} start
bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} wait
```

```
qa = Task(
  subagent_type = "qa-functional-tester",
  model = "sonnet",
  description = "Functional QA {feature_id}",
  prompt = """
    Functional QA for {feature_summary.id}: {feature_summary.title}
    Working directory: {env.worktree_path}
    Server: http://localhost:{env.server_port}
    Web: http://localhost:{env.web_port}

    Test each acceptance criterion:
    {feature_summary.ac}

    Follow .claude/agents/qa-functional-tester.md.
    Return JSON: {verdict, ac_results, runtime_errors}
  """
)
```

Stop servers:
```bash
bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} stop
```

**IF FAIL AND fix_cycles_used < MAX_FIX_CYCLES:**
Fix cycle + re-test (restart servers for re-test).
fix_cycles_used += 1

**Gate C result:**
```json
{
  "status": "PASS|FAIL|SKIP",
  "ac_results": [{"ac": "AC1", "status": "PASS", "evidence": "..."}]
}
```

---

## 4.5 Aggregate Results

```
overall_verdict = "PASS" if all gates PASS or SKIP
overall_verdict = "FAIL" if any gate FAIL
overall_verdict = "ESCALATED" if FAIL and fix_cycles exhausted
```

---

## 4.6 Write cp-04.json

```json
{
  "v": 4,
  "phase": 4,
  "feature_id": "{feature_id}",
  "ts": "{ISO-8601}",
  "status": "{overall_verdict == 'PASS' ? 'completed' : 'failed'}",
  "env": {cp-03.env},
  "flags": {cp-03.flags},
  "feature_summary": {cp-03.feature_summary},
  "data": {
    "verdict": "{overall_verdict}",
    "gate_a": {gate_a_result},
    "gate_b": {gate_b_result},
    "gate_c": {gate_c_result},
    "fix_cycles_used": {fix_cycles_used},
    "total_findings": {N},
    "blocking_findings": {N}
  }
}
```

---

## 4.7 Handle Failure

**IF overall_verdict != "PASS":**
```bash
bash .claude/skills/nomos/scripts/nomos.sh state fail {feature_id} "review_gate_failed"
```
Show failure summary. EXIT.

---

## 4.8 State Transition

```bash
bash .claude/skills/nomos/scripts/nomos.sh state complete {feature_id}
```

---

## 4.9 Proceed

```
Review: {overall_verdict} | Gates: A={gate_a.status} B={gate_b.status} C={gate_c.status}
Fix cycles: {fix_cycles_used}/{MAX_FIX_CYCLES}
-> Phase 5: SHIP
```

**CLEAR context. Load:** `steps/phase-05-ship.md`
