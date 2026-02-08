# Phase 3: EXECUTE

Implement the plan via code-writer + qa-reviewer loop (max 3 iterations).

**Input:** `.nomos/output/{feature_id}/cp-02.json`
**Output:** `.nomos/output/{feature_id}/cp-03.json`
**Context clearing:** After writing cp-03.json, all phase 3 context is discarded.

---

## 3.1 Read Checkpoint

Read `cp-02.json`. Extract:
- `env` (worktree_path, output_dir, project_root)
- `flags` (auto, test, merge)
- `feature_summary` (id, title, ac)
- `data` (plan_overview, file_operations, ac_mapping, estimated_complexity)

---

## 3.2 Load Code Context

```bash
PATTERNS=$(bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-code 2>/dev/null || echo "none")
ANTIPATTERNS=$(bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-qa 2>/dev/null || echo "none")
```

---

## 3.3 Execute-Verify Loop

```
writer_agent_id = null
verdict = "FAIL"
iterations = 0

FOR iteration = 1 to 3:
  iterations = iteration
```

### Iteration 1: INITIAL_IMPLEMENTATION

```
writer_result = Task(
  subagent_type = "code-writer",
  model = "sonnet",
  description = "Implement {feature_id} iter 1",
  prompt = """
    ## Code Writer: {feature_id} — Iteration 1
    <mode>INITIAL_IMPLEMENTATION</mode>

    Working directory: {env.worktree_path}

    ### Implementation Plan
    {data.plan_overview}

    ### File Operations
    {data.file_operations — JSON}

    ### AC Mapping
    {data.ac_mapping — JSON}

    ### Patterns
    {PATTERNS}

    ### Anti-Patterns to Avoid
    {ANTIPATTERNS}

    Implement the plan. Use Write/Edit tools for file changes.
    After implementation, return JSON:
    {"files_changed": [...], "lines_added": N, "lines_removed": N, "summary": "..."}
  """
)

writer_agent_id = writer_result.agentId
```

### Iteration 2+: FIX_ISSUES

```
writer_result = Task(
  resume = writer_agent_id,
  description = "Fix {feature_id} iter {iteration}",
  prompt = """
    ## Code Writer: {feature_id} — Iteration {iteration}
    <mode>FIX_ISSUES</mode>

    QA found these issues in the previous iteration:
    {qa_issues — JSON array}

    Fix ONLY the issues listed above. Do NOT modify unrelated code.
    Focus on CRITICAL and HIGH severity issues first.
    Return JSON: {"files_changed": [...], "lines_added": N, "lines_removed": N, "summary": "..."}
  """
)
```

### QA Review (every iteration)

```
qa_result = Task(
  subagent_type = "qa-reviewer",
  model = "sonnet",
  description = "QA review {feature_id} iter {iteration}",
  prompt = """
    ## QA Review: {feature_id} — Iteration {iteration}

    <critical>READ-ONLY. MUST NOT modify files.</critical>

    Working directory: {env.worktree_path}

    ### Plan Summary
    {data.plan_overview}

    ### Acceptance Criteria
    {feature_summary.ac — one per line}

    ### Files Changed This Iteration
    {writer_result.files_changed}

    ### Anti-Patterns to Check
    {ANTIPATTERNS}

    Return JSON:
    {"verdict": "PASS|FAIL", "issues": [...], "blocking_count": N}
  """
)
```

### Loop Decision

```
IF qa_result.verdict == "PASS":
  verdict = "PASS"
  BREAK

IF iteration == 3:
  verdict = "ESCALATED"
  BREAK

qa_issues = qa_result.issues  # Feed into next iteration
```

---

## 3.4 Collect Candidate Anti-Patterns

If iterations > 1, track recurring QA issues across iterations:
- Issues that appeared in 2+ iterations -> candidate anti-patterns
- Store in cp-03.json for Phase 6 learning

---

## 3.5 Write cp-03.json

```json
{
  "v": 4,
  "phase": 3,
  "feature_id": "{feature_id}",
  "ts": "{ISO-8601}",
  "status": "{verdict == 'ESCALATED' ? 'escalated' : 'completed'}",
  "env": {cp-02.env},
  "flags": {cp-02.flags},
  "feature_summary": {cp-02.feature_summary},
  "data": {
    "verdict": "{verdict}",
    "iterations": {iterations},
    "writer_agent_id": "{writer_agent_id}",
    "files_changed": [{last writer_result.files_changed}],
    "lines_added": {N},
    "lines_removed": {N},
    "candidate_antipatterns": [{if any}],
    "last_qa_issues": [{if ESCALATED, remaining issues}]
  }
}
```

---

## 3.6 Handle Escalation

**IF verdict == "ESCALATED" AND NOT auto:**
Show remaining issues. Ask: "Continue to review phase anyway, or fail feature?"
- If continue: proceed to Phase 4 (review may catch fixable items)
- If fail:
  ```bash
  bash .claude/skills/nomos/scripts/nomos.sh state fail {feature_id} "execute_escalated"
  ```
  EXIT

**IF verdict == "ESCALATED" AND auto:**
Proceed to Phase 4 (let review gates decide).

---

## 3.7 Proceed

```
Execute: {verdict} after {iterations} iteration(s) | {files_changed count} files
-> Phase 4: REVIEW
```

**CLEAR context. Load:** `steps/phase-04-review.md`
