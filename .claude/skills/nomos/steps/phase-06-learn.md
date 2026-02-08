# Phase 6: LEARN

Conditional learning extraction via historian agent.

**Input:** `.nomos/output/{feature_id}/cp-05.json` (or any previous checkpoint)
**Output:** `.nomos/output/{feature_id}/cp-06.json`
**Condition:** Only runs if feature reached `waiting_approval` or `verified`.

---

## 6.1 Read Checkpoint

Read the latest checkpoint (cp-05.json preferred, fallback to highest available).
Extract: `env`, `flags`, `feature_summary`, and all checkpoint data.

---

## 6.2 Check Condition

Read feature status:
```bash
jq -r --arg id "{feature_id}" '.features[] | select(.id == $id) | .status' .nomos/features.json
```

**IF status is `failed` or feature was `escalated`:**
```
Skip learning — insufficient data for reliable pattern extraction.
```
Write minimal cp-06.json with `data.skipped: true` and EXIT.

---

## 6.3 Dispatch Historian Agent

```
historian_result = Task(
  subagent_type = "general-purpose",
  model = "haiku",
  description = "Learn from {feature_id}",
  prompt = """
    You are the NOMOS historian agent. Extract learnings from feature {feature_id}.

    Feature: {feature_summary.title}
    Category: {feature_summary.category}
    AC count: {feature_summary.ac.length}

    Checkpoint data:
    - Phase 1 risk: {cp-01 data.risk_level}
    - Phase 3 iterations: {cp-03 data.iterations}
    - Phase 3 files changed: {cp-03 data.files_changed}
    - Phase 4 fix cycles: {cp-04 data.fix_cycles_used}
    - Phase 4 findings: {cp-04 data.total_findings}

    Working directory: {env.project_root}

    Follow the workflow in .claude/agents/historian.md:
    1. Collect metrics via: bash .claude/skills/nomos/scripts/nomos.sh metrics {feature_id}
    2. Analyze patterns and anti-patterns
    3. Process candidate anti-patterns from cp-03
    4. Update learning files (MERGE, don't overwrite)
    5. Update codebase map
    6. Write session insight

    Return JSON: {metrics_recorded, patterns_extracted, antipatterns_extracted,
                   code_patterns_added, codebase_map_updated, insight_written,
                   retrospective_summary}
  """
)
```

---

## 6.4 Write cp-06.json

```json
{
  "v": 4,
  "phase": 6,
  "feature_id": "{feature_id}",
  "ts": "{ISO-8601}",
  "status": "completed",
  "env": {previous_cp.env},
  "flags": {previous_cp.flags},
  "feature_summary": {previous_cp.feature_summary},
  "data": {historian_result or {skipped: true}}
}
```

---

## 6.5 Final Summary

```
NOMOS v4 COMPLETE: {feature_id} - {feature_summary.title}

| Phase | Status |
|-------|--------|
| 1 UNDERSTAND | DONE |
| 2 PLAN       | DONE |
| 3 EXECUTE    | DONE ({iterations} iterations) |
| 4 REVIEW     | DONE (fix cycles: {fix_cycles_used}) |
| 5 SHIP       | DONE (PR: {pr_url}) |
| 6 LEARN      | {DONE | SKIPPED} |

Status: {feature_status}
Files: {files_changed count}
Learnings: {patterns_extracted} patterns, {antipatterns_extracted} antipatterns
PR: {pr_url}

Checkpoints: {output_dir}/cp-01.json through cp-06.json
```

**DONE.** Pipeline complete.
