---
name: step-02-plan
description: Design improvement with cascading impact analysis
prev_step: steps/step-01-audit.md
next_step: steps/step-03-execute.md
---

# Step 2: Plan

## References
- `references/improvement-patterns.md` — Proven recipes for common improvements
- `references/component-map.md` — Dependency graph for impact analysis

## MANDATORY EXECUTION RULES:

- NEVER start editing files — this step produces a plan ONLY
- NEVER skip impact analysis — every change cascades
- ALWAYS consult the improvement patterns reference
- ALWAYS identify ALL cascading files before proceeding
- ALWAYS present plan for user approval (unless auto_mode)

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{improvement_type}` | Type of improvement |
| `{scope}` | Component type(s) targeted |
| `{target_files}` | Specific files to modify |
| `{auto_mode}` | Skip confirmations |
| Audit findings | From step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Load Improvement Patterns

Read `references/improvement-patterns.md` for the pattern matching `{improvement_type}` and `{scope}`.

If the improvement matches a known pattern (e.g., "Tighten Agent Prompt", "Add Quality Gate"), follow the recipe steps from the reference.

### 2. Design Primary Changes

For each target file, specify:
- **What** to change (specific sections, lines, additions, removals)
- **Why** (which audit finding or user request drives this)
- **How** (edit approach: replace section, append, insert, restructure)

### 3. Cascading Impact Analysis

<critical>
Consult this table for EVERY primary change:

| If you change... | Also update... |
|-------------------|----------------|
| Step file | SKILL.md workflow, templates, agent-prompts.md, output-formats.md |
| Agent definition | agent-prompts.md, step file that launches it, SKILL.md agent list |
| Template | nomos.sh init (variable rendering), step that writes to it |
| Script command | Every step file that calls it, SKILL.md allowed tools |
| Reference file | SKILL.md reference list, any step that reads it |
| Learning schema | Step-01 (reader) and Step-06 (writer) |
| Feature schema | features.json, state-machine.md |
| Quality gate | quality-gates.md, step-04-verify.md, step-05-merge.md |
</critical>

For each primary change, trace through the dependency graph in `references/component-map.md` and list ALL cascading files.

Set `{cascading_files}` to the union of all cascading files identified.

### 4. Plan Critique

Self-review the plan against 4 checks:

| Check | Question | Pass? |
|-------|----------|-------|
| **Completeness** | Does every audit finding have a planned fix? | |
| **Cascade Coverage** | Are ALL cascading files identified and planned? | |
| **No Orphans** | Will any references be left dangling? | |
| **Backward Compat** | Will existing data (features.json, learning JSONs) remain valid? | |

If any check fails, revise the plan before presenting.

### 5. Present Plan

Use the template structure from `templates/02-plan.md`:

```markdown
## Improvement Plan

### Overview
{High-level description of what will change and why}

### Primary Changes
| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | path/to/file.md | What changes | Why |

### Cascading Updates
| # | File | Update Needed | Triggered By |
|---|------|--------------|--------------|
| 1 | path/to/other.md | What to update | Primary change #N |

### Plan Critique
| Check | Result |
|-------|--------|
| Completeness | PASS/FAIL |
| Cascade Coverage | PASS/FAIL |
| No Orphans | PASS/FAIL |
| Backward Compat | PASS/FAIL |
```

If `{auto_mode}` is false, ask for user approval before proceeding.

---

## SUCCESS METRICS:

- Primary changes clearly specified per file
- ALL cascading files identified
- Plan critique passes all 4 checks
- User approved (or auto_mode)
- No files modified yet

## FAILURE MODES:

- Starting to edit files (plan only!)
- Missing cascading files in impact analysis
- Not consulting improvement patterns reference
- Not checking backward compatibility
- Proceeding without user approval (when not auto_mode)

---

## NEXT STEP:

After plan approval → Load `./step-03-execute.md`

<critical>
This step produces a PLAN only. No file modifications.
The cascading impact analysis is the most critical part — every missed cascade file is a future bug.
</critical>
