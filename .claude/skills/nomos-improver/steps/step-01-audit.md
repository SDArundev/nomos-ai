---
name: step-01-audit
description: Read target files, run consistency checks, identify findings
prev_step: steps/step-00-init.md
next_step: steps/step-02-plan.md
---

# Step 1: Audit

## References
- `references/component-map.md` — Full file inventory with dependency graph
- `references/audit-checklist.md` — Per-component checklists

## MANDATORY EXECUTION RULES:

- NEVER modify any files — this step is READ-ONLY
- NEVER skip consistency checks for the targeted scope
- ALWAYS read files before assessing them
- ALWAYS report findings with file paths and line numbers
- ALWAYS use the audit checklist from `references/audit-checklist.md`
- YOU ARE AN AUDITOR — report facts, not opinions

---

<available_state>
From step-00-init:

| Variable | Description |
|----------|-------------|
| `{improvement_type}` | audit, improve, fix, add, restructure, optimize |
| `{scope}` | Component type(s) targeted |
| `{target_files}` | Specific files to inspect |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Load Audit Checklist

Read `references/audit-checklist.md` for the relevant component type(s) in `{scope}`.

If `{scope}` is `system`, read the full checklist including the "System-Wide Consistency" section.

### 2. Read Target Files

Read each file in `{target_files}`. For each file:
- Note its current structure and content
- Identify which checklist items apply
- Check each applicable item

### 3. Run Cross-File Consistency Checks

**Always run these 7 checks** (regardless of scope):

**Check 1: Agent References**
```
For each agent name in step files → verify .claude/agents/{name}.md exists
```

**Check 2: Template Variables**
```
For each {{var}} in templates → verify nomos.sh init renders it
```

**Check 3: Script Commands**
```
For each nomos.sh <cmd> in steps → verify cmd exists in nomos.sh
```

**Check 4: Reference Links**
```
For each references/*.md in SKILL.md or steps → verify file exists
```

**Check 5: State Transitions**
```
For each state change in steps → verify matches references/state-machine.md
```

**Check 6: Pattern IDs**
```
In patterns.json + antipatterns.json → verify all IDs are unique
```

**Check 7: Step Numbering**
```
For each step-NN.md → verify NN-name.md template exists and matches
```

**Scope-limited check:** When `{scope}` is not `system`, only run checks relevant to the targeted component type. For example, if scope is `agent`, focus on Check 1 (agent references) and skip template/script checks.

### 4. Classify Findings

For each finding, classify:

| Severity | Meaning | Action |
|----------|---------|--------|
| **CRITICAL** | Broken reference, missing file, invalid JSON | Must fix |
| **HIGH** | Stale content, inconsistent naming, dead code | Should fix |
| **MEDIUM** | Suboptimal structure, missing checklist items | Consider fixing |
| **LOW** | Style inconsistency, minor improvement opportunity | Optional |

### 5. Generate Audit Report

Use the template structure from `templates/01-audit.md`:

```markdown
## Audit Report: {scope}

### Summary
- Files audited: {count}
- Findings: {critical} CRITICAL, {high} HIGH, {medium} MEDIUM, {low} LOW

### Findings

| # | Severity | File | Line | Finding | Recommendation |
|---|----------|------|------|---------|----------------|
| 1 | HIGH | path/to/file.md | 42 | Description | What to do |
```

### 6. Decision Point

**If `{improvement_type}` is `audit`:**
- Present audit report to user
- STOP — audit complete, do not proceed to planning

**If `{improvement_type}` is anything else:**
- Present findings relevant to the improvement
- Proceed to step-02-plan

---

## SUCCESS METRICS:

- All target files read
- Relevant consistency checks executed
- Findings classified by severity
- Report generated with file paths and line numbers
- No files modified

## FAILURE MODES:

- Modifying files (read-only step!)
- Skipping consistency checks
- Reporting findings without file paths / line numbers
- Not using the audit checklist
- Giving opinions instead of facts

---

## NEXT STEP:

If `{improvement_type}` is `audit` → **STOP** (done)
Otherwise → Load `./step-02-plan.md`

<critical>
This step is READ-ONLY. No file modifications allowed.
</critical>
