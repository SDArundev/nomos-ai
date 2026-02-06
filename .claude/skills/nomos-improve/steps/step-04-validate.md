---
name: step-04-validate
description: Cross-reference checks, syntax validation, consistency verification
prev_step: steps/step-03-execute.md
---

# Step 4: Validate

## MANDATORY EXECUTION RULES:

- NEVER skip validation checks
- NEVER claim pass without running the actual check
- ALWAYS run script syntax checks if scripts were modified
- ALWAYS run JSON parse checks if learning files were modified
- FIX any failures found, then re-validate

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{target_files}` | Files that were modified |
| `{cascading_files}` | Cascading files that were updated |
| Execution log | From step-03 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Script Syntax Validation

If any scripts were modified:

```bash
bash -n .claude/skills/nomos/scripts/nomos.sh
bash -n .claude/skills/nomos/scripts/nomos-verify.sh
```

Both must exit 0 (no syntax errors).

### 2. JSON Parse Validation

If any JSON files were modified:

```bash
python3 -c "import json; json.load(open('.nomos/learning/patterns.json'))"
python3 -c "import json; json.load(open('.nomos/learning/antipatterns.json'))"
python3 -c "import json; json.load(open('.nomos/learning/metrics.json'))"
python3 -c "import json; json.load(open('.nomos/features.json'))"
```

Only run for files that were actually modified. All must parse without errors.

### 3. Cross-Reference Integrity

Run targeted checks for the modified files:

**If steps were modified:**
- Verify `next_step` / `prev_step` frontmatter forms a valid chain
- Verify all agent names reference existing `.claude/agents/*.md` files
- Verify all script commands reference existing script functions

**If agents were modified:**
- Verify agent is still referenced by at least one step file
- Verify agent name matches entry in `references/agent-prompts.md`

**If templates were modified:**
- Verify all `{{variable}}` placeholders are rendered by `nomos.sh init`
- Verify template number aligns with corresponding step

**If references were modified:**
- Verify reference is still linked from SKILL.md or a step file
- Verify no stale cross-references to renamed/removed content

**If SKILL.md was modified:**
- Verify step_files table matches actual step files
- Verify references section matches actual reference files

### 4. Orphan Check

Grep for any references to content that was removed or renamed:

```bash
# Example: if you renamed "old_name" to "new_name"
grep -r "old_name" .claude/skills/nomos/ .claude/agents/ .nomos/learning/
```

Zero matches expected. Any match is an orphaned reference that must be fixed.

### 5. Fix Failures

If any validation check fails:

1. Identify the specific failure
2. Fix the issue (minimal targeted edit)
3. Re-run the failed check
4. Repeat until all checks pass

### 6. Validation Report

```markdown
## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Script syntax | PASS/FAIL/SKIP | nomos.sh, nomos-verify.sh |
| JSON parsing | PASS/FAIL/SKIP | Which files validated |
| Cross-references | PASS/FAIL | Agent refs, template vars, script cmds |
| Orphan check | PASS/FAIL | Dangling references found |

**Overall: PASS / FAIL**
```

### 7. Summary

Present a concise summary of everything that was done:

```markdown
## Improvement Complete

**Type:** {improvement_type}
**Scope:** {scope}
**Files Modified:** {count}

### Changes Made
{Brief description of primary changes}

### Cascading Updates
{Brief description of cascading updates}

### Validation
All checks passed.
```

---

## SUCCESS METRICS:

- All applicable syntax checks pass
- All applicable JSON files parse
- Cross-references are intact
- No orphaned references
- Validation report generated
- Summary presented to user

## FAILURE MODES:

- Skipping validation checks
- Claiming pass without running checks
- Not fixing failures before reporting
- Not re-validating after fixes

---

## DONE

This is the final step. Present the validation report and summary.

<critical>
Every modified file type has specific validation. Script edits need bash -n. JSON edits need parse check. All edits need orphan grep. Fix failures before reporting PASS.
</critical>
