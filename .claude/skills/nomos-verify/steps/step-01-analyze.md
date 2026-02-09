---
name: step-01-analyze
description: Launch parallel analysis agents across dimensions (Stage 1)
prev_step: steps/step-00-init.md
next_step: steps/step-02-report.md
---

# Step 1: Analyze (Stage 1 — Parallel)

## References
- `references/agent-prompts.md` — Agent prompt templates (feature mode + codebase mode)
- `references/analysis-dimensions.md` — What each agent checks at each depth

## MANDATORY EXECUTION RULES:

- ALL agents are READ-ONLY — no file modifications
- ALL agents launch in a SINGLE message for true parallelism
- ALWAYS use the correct prompt variant (feature mode vs codebase mode)
- NEVER launch more agents than the depth level allows
- ALWAYS pass acceptance criteria to agents that need them

---

<available_state>
From step-00-init:

| Variable | Description |
|----------|-------------|
| `{scope}` | single/range/verified/pending/all |
| `{analysis_mode}` | `feature` or `codebase` |
| `{depth}` | quick/standard/deep |
| `{features_to_verify}` | Feature IDs to verify |
| `{output_dir}` | Absolute path to output directory |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Prepare Agent Context

**For feature mode** (`{analysis_mode}` = `feature`):
1. Read features from `.nomos/features.json` — get acceptance criteria using **jq**:
   ```bash
   # Get feature with ACs (single feature)
   jq -r --arg id "F027" '.features[] | select(.id == $id) | "### \(.id) [\(.status)] \(.title)\n  ACs:\n" + ([.acceptanceCriteria[]? // empty | "    - " + .] | join("\n"))' .nomos/features.json

   # Get features with ACs (range)
   jq -r '.features[] | select(.id >= "F027" and .id <= "F050" and .status != "backlog") | "### \(.id) [\(.status)] \(.title)\n  ACs:\n" + ([.acceptanceCriteria[]? // empty | "    - " + .] | join("\n"))' .nomos/features.json
   ```
2. Identify files related to each feature:
   - Check feature metadata for `files` field
   - If no metadata, search codebase for feature references
   - Include related test files
3. Build `{feature_files}` list and `{acceptance_criteria}` block

**For codebase mode** (`{analysis_mode}` = `codebase`):
1. Read all features in scope from `.nomos/features.json` using **jq**:
   ```bash
   # List all non-backlog features with ACs
   jq -r '.features[] | select(.status != "backlog") | "### \(.id) [\(.status)] \(.title)\n  ACs:\n" + ([.acceptanceCriteria[]? // empty | "    - " + .] | join("\n"))' .nomos/features.json

   # Count features by status
   jq -r '[.features[] | select(.status != "backlog")] | group_by(.status) | map("\(.[0].status): \(length)") | join(", ")' .nomos/features.json
   ```
2. Scan `apps/` and `packages/` directories for implemented code
3. Build full file inventory as context

<important>
**NEVER use `python3 -c "..."` for JSON processing** — the `!=` operator causes bash history expansion issues with `!`. Always use **jq** which is the standard tool across the NOMOS ecosystem.
</important>

### 2. Load Known Patterns

Read `.nomos/learning/verification-patterns.json` (if exists).
Pass relevant patterns to agents as `{verification_patterns_if_exists}`.

### 3. Select Agent Prompt Variants

Read `references/agent-prompts.md`.

Select prompt section based on `{analysis_mode}`:
- Feature mode → "Step 01: Analysis Agents (Feature Mode)"
- Codebase mode → "Step 01: Analysis Agents (Codebase Mode)"

### 4. Launch Agents (SINGLE MESSAGE)

<critical>
Launch ALL agents in a SINGLE message using the Task tool.
Each Task call must specify the correct subagent_type matching the dimension.
This ensures true parallel execution.
</critical>

**Agent selection by depth:**

| Depth | Agents to Launch |
|-------|-----------------|
| `quick` | `code-reviewer` + `qa-reviewer` (2 agents) |
| `standard` | `code-reviewer` + `scout` + `qa-reviewer` (3 agents) |
| `deep` | `code-reviewer` + `scout` + `qa-reviewer` + `security-reviewer` (4 agents) |

**For each agent:**
1. Use the prompt template from `references/agent-prompts.md`
2. Substitute variables: `{features_to_verify}`, `{feature_files}`, `{acceptance_criteria}`, `{verification_patterns_if_exists}`
3. Launch as Task with appropriate `subagent_type`

### 5. Collect Results

After all agents complete:
1. Collect findings from each agent
2. Tag each finding with its source dimension
3. Count totals by severity

### 6. Write Output

Write `{output_dir}/01-analyze.md` using template `templates/01-analyze.md`.

Include compact context transfer block at the top:

```markdown
## Compact Context -> Step 02

- **Dimensions Analyzed:** {count} ({dimension_names})
- **Total Findings:** {count}
- **Critical:** {count} | **High:** {count} | **Medium:** {count} | **Low:** {count}
- **Agents Completed:** {count}/{expected}
- **Features with Issues:** {list of feature_ids}
- **Regressions Detected:** {count}
```

Update checkpoint:
```json
{
  "step": "01-analyze",
  "completed_steps": ["00-init", "01-analyze"],
  "analysis_results": {
    "dimensions_analyzed": 0,
    "total_findings": 0,
    "by_severity": { "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0 }
  }
}
```

---

## SUCCESS METRICS:

- All depth-appropriate agents launched in parallel
- All agents completed successfully
- Findings collected and tagged by dimension
- Output file written with compact context block
- Checkpoint updated
- No files modified (read-only step)

## FAILURE MODES:

- Launching agents sequentially instead of in parallel
- Launching wrong number of agents for depth level
- Using wrong prompt variant (feature vs codebase)
- Modifying files (read-only step!)
- Not collecting all agent results

---

## NEXT STEP:

Load `./step-02-report.md`

<critical>
This step is READ-ONLY. No file modifications allowed.
All analysis agents MUST be launched in a SINGLE message for true parallelism.
</critical>
