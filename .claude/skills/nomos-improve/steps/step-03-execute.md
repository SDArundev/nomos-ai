---
name: step-03-execute
description: Apply primary changes and cascading updates
prev_step: steps/step-02-plan.md
next_step: steps/step-04-validate.md
---

# Step 3: Execute

## MANDATORY EXECUTION RULES:

- ALWAYS read a file before editing it
- ALWAYS apply primary changes BEFORE cascading updates
- ALWAYS preserve existing formatting conventions
- NEVER add changes outside the approved plan scope
- NEVER leave dangling references to removed content

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{improvement_type}` | Type of improvement |
| `{target_files}` | Primary files to modify |
| `{cascading_files}` | Files requiring cascading updates |
| Approved plan | From step-02 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Apply Primary Changes

For each file in `{target_files}`, in the order specified by the plan:

1. **Read** the current file content
2. **Apply** the planned change
3. **Verify** the edit matches the plan (check line counts, section structure)
4. **Log** what was changed

**Conventions to preserve:**

| Component | Convention |
|-----------|-----------|
| Steps | `##` sections, `###` subsections, `<critical>` tags, frontmatter with name/description/prev_step/next_step |
| Agents | Role paragraph first, then sections for Model/Tools/Input/Output/Constraints |
| Templates | `{{variable_name}}` syntax (double curly, snake_case) |
| Scripts | `snake_case` functions, `UPPER_CASE` constants, `cmd_*()` pattern |
| References | Tables for structured data, `##` sections, TOC if >100 lines |
| Learning JSON | `camelCase` keys, arrays for lists, numeric confidence 0.0-1.0 |
| SKILL.md | XML-style `<section>` tags, frontmatter with name/description/allowed-tools |

### 2. Apply Cascading Updates

For each file in `{cascading_files}`, in dependency order:

1. **Read** the current file content
2. **Apply** the cascading update (renaming references, adding entries, updating links)
3. **Verify** the update is consistent with the primary change

**Dependency order matters:** If file A references file B, update B before A so A's references are valid.

### 3. Handle New Files

If the plan requires creating new files:

1. Follow the convention of existing files in the same directory
2. Include all required structural elements (frontmatter for steps, TOC for long references)
3. Add references to the new file from all files that need to discover it

### 4. Handle Removed Content

If the plan removes content:

1. **Grep** for all references to the removed content across `.claude/` and `.nomos/`
2. **Remove or update** every reference found
3. **Verify** no orphaned references remain

### 5. Execution Log

Track all changes made:

```markdown
## Execution Log

| # | File | Action | Lines Changed |
|---|------|--------|--------------|
| 1 | path/to/file.md | Modified section X | +5 / -3 |
| 2 | path/to/other.md | Added entry to table | +2 / -0 |
```

---

## SUCCESS METRICS:

- All planned primary changes applied
- All cascading updates applied
- Formatting conventions preserved
- No orphaned references
- Execution log complete

## FAILURE MODES:

- Editing without reading first
- Applying cascading updates before primary changes
- Breaking formatting conventions
- Missing a cascading file from the plan
- Adding unplanned changes (scope creep)
- Leaving dangling references after deletion

---

## NEXT STEP:

After all changes applied → Load `./step-04-validate.md`

<critical>
Apply changes in order: primary first, then cascading in dependency order.
Read before every edit. Grep after every deletion.
</critical>
