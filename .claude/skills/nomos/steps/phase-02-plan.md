# Phase 2: PLAN

Design the implementation plan via the architect agent.

**Input:** `.nomos/output/{feature_id}/cp-01.json`
**Output:** `.nomos/output/{feature_id}/cp-02.json`
**Context clearing:** After writing cp-02.json, all phase 2 context is discarded.

---

## 2.1 Read Checkpoint

Read `cp-01.json` from the output directory. Extract:
- `env` (worktree_path, output_dir, project_root)
- `flags` (plan_only, auto, test, etc.)
- `feature_summary` (id, title, ac, category)
- `learning` (patterns, antipatterns from learning system)
- `data` (risk_level, patterns, antipatterns, key_files, stack_context)

---

## 2.2 Dispatch Architect Agent

<critical>
Use the Task tool to dispatch the architect agent with a FRESH context window.
</critical>

```
architect_result = Task(
  subagent_type = "code-architect",
  model = "opus",
  description = "Plan {feature_id}",
  prompt = """
    You are the NOMOS architect agent. Create a comprehensive implementation plan.

    Feature: {feature_summary.id} - {feature_summary.title}
    Acceptance Criteria:
    {feature_summary.ac - one per line}

    Risk Level: {data.risk_level}
    Patterns to apply: {data.patterns}
    Anti-patterns to avoid: {data.antipatterns}
    Key files: {data.key_files}
    Stack context: {data.stack_context}

    Learning system patterns (proven approaches):
    {learning.patterns}

    Learning system antipatterns (known pitfalls):
    {learning.antipatterns}

    Working directory: {env.project_root}
    Worktree: {env.worktree_path}
    Test mode: {flags.test}

    Follow the workflow in .claude/agents/architect.md.
    Include the self-critique loop before returning.
    Return ONLY a JSON object (no markdown, no explanation).
  """
)
```

---

## 2.3 Validate Plan

Check the architect result:
- Every AC must appear in `ac_mapping`
- At least one `file_operations` entry
- `estimated_complexity` is valid (S/M/L)

If validation fails and auto mode: retry architect once.
If validation fails and not auto: show issues, ask user to approve or re-plan.

---

## 2.4 Plan Approval

**IF NOT auto mode AND NOT plan_only:**
Show plan summary to user:
```
Plan: {plan_overview}
Complexity: {estimated_complexity}
Files: {file_operations count}
Risks: {risks count}

AC Mapping:
{ac_mapping formatted}
```
Ask: "Approve plan or request changes?"

**IF plan_only (-p):**
Show full plan and EXIT.

---

## 2.5 Write cp-02.json

Create `.nomos/output/{feature_id}/cp-02.json`:

```json
{
  "v": 4,
  "phase": 2,
  "feature_id": "{feature_id}",
  "ts": "{ISO-8601}",
  "status": "completed",
  "env": {cp-01.env},
  "flags": {cp-01.flags},
  "feature_summary": {cp-01.feature_summary},
  "data": {architect_result}
}
```

---

## 2.6 Proceed

```
Plan approved: {file_operations count} files, complexity {estimated_complexity}
-> Phase 3: EXECUTE
```

**CLEAR context. Load:** `steps/phase-03-execute.md`
