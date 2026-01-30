---
name: step-00-init
description: Parse user intent, identify scope, classify improvement complexity
next_step: steps/step-01-audit.md
---

# Step 0: Initialize Improvement

<critical>
## MANDATORY EXECUTION SEQUENCE

1. Parse intent → 2. Identify scope → 3. Resolve target files → 4. Classify complexity → 5. Present summary → 6. Proceed
</critical>

## EXECUTION RULES:

- NEVER start editing files in this step
- NEVER skip scope identification
- ALWAYS resolve specific file paths before proceeding
- ALWAYS classify complexity to set expectations

---

## EXECUTION SEQUENCE:

### 1. Parse User Intent

Classify the request into one of these improvement types:

| Type | Trigger Words | Description |
|------|--------------|-------------|
| `audit` | audit, check, verify, consistency | Read-only inspection, report findings |
| `improve` | improve, enhance, optimize, tighten | Enhance existing functionality |
| `fix` | fix, bug, broken, inconsistent | Correct a specific defect |
| `add` | add, new, create, introduce | Add new capability to the system |
| `restructure` | restructure, refactor, reorganize | Change architecture or organization |
| `optimize` | optimize, performance, lean, reduce | Reduce token usage or improve efficiency |

Set `{improvement_type}` based on classification.

### 2. Identify Scope

Determine which component type(s) are targeted:

| Scope | Files Involved |
|-------|---------------|
| `step` | `.claude/skills/nomos/steps/step-*.md` |
| `agent` | `.claude/agents/*.md` |
| `template` | `.claude/skills/nomos/templates/*.md` |
| `script` | `.claude/skills/nomos/scripts/*.sh` |
| `reference` | `.claude/skills/nomos/references/*.md` |
| `learning` | `.nomos/learning/*.json` |
| `skill` | `.claude/skills/nomos/SKILL.md` |
| `schema` | `.nomos/schemas/*.json` |
| `system` | All of the above (full system audit) |

Set `{scope}` based on what the user specified or what the request implies.

### 3. Resolve Target Files

Map scope to specific file paths:

```
If scope is specific (e.g., "improve step-04"):
  → {target_files} = [".claude/skills/nomos/steps/step-04-verify.md"]

If scope is a type (e.g., "audit agents"):
  → {target_files} = all files matching `.claude/agents/*.md`

If scope is "system":
  → {target_files} = all NOMOS files across all component types
```

List the resolved files for user confirmation.

### 4. Classify Complexity

| Complexity | Criteria | Expected Cascading Files |
|------------|----------|------------------------|
| **Low** | Single file, no cross-references | 0-1 |
| **Medium** | 2-3 files, known cascading pattern | 2-4 |
| **High** | 4+ files, multiple component types, new capability | 5+ |

Set complexity based on:
- Number of target files
- Whether the change affects cross-file references
- Whether it introduces new concepts (agents, gates, variables)

### 5. Present Summary

```markdown
## Improvement Session

| Field | Value |
|-------|-------|
| **Type** | {improvement_type} |
| **Scope** | {scope} |
| **Target Files** | {target_files} |
| **Complexity** | Low / Medium / High |
```

If `{auto_mode}` is false, ask for user confirmation before proceeding.

### 6. Proceed

If `{improvement_type}` is `audit`:
```
→ Loading step-01-audit.md (full audit)
```

If `{improvement_type}` is `improve`, `fix`, `add`, `restructure`, or `optimize`:
```
→ Loading step-01-audit.md (targeted audit of target files)
```

---

## SUCCESS METRICS:

- Intent correctly classified
- Scope resolved to specific files
- Complexity assessed
- Summary presented to user
- State variables initialized

## FAILURE MODES:

- Starting to read/edit NOMOS files (that's step 01+)
- Skipping scope identification
- Not resolving to specific file paths
- Proceeding without user awareness of scope

---

## NEXT STEP:

Load `./step-01-audit.md`
