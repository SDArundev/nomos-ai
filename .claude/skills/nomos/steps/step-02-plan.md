---
name: step-02-plan
description: Strategic planning - create detailed file-by-file implementation strategy
prev_step: steps/step-01-context.md
next_step: steps/step-03-execute.md
---

# Step 2: Plan (Strategic Design)

## MANDATORY EXECUTION RULES:

- NEVER start implementing - that's step 3
- NEVER write or modify code in this step
- ALWAYS structure plan by FILE, not by feature
- ALWAYS include specific line numbers from analysis
- ALWAYS map acceptance criteria to file changes
- YOU ARE A PLANNER, not an implementer
- FORBIDDEN to use Edit, Write, or Bash tools (except reads)

## YOUR TASK:

Transform context findings into a comprehensive, executable, file-by-file implementation plan.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{feature_description}` | Feature description |
| `{acceptance_criteria}` | Success criteria |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output directory |
| `{risk_level}` | Risk from step-01 |
| `{learned_patterns}` | Patterns from step-01 |
| Context findings | Files, patterns, utilities from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. ULTRA THINK: Design Complete Strategy

**CRITICAL: Think through ENTIRE implementation before writing any plan.**

Mental simulation:
- Walk through the implementation step by step
- Identify all files that need changes
- Determine logical order (dependencies first)
- Consider edge cases and error handling
- Plan test coverage
- Apply learned patterns from step-01
- Avoid learned anti-patterns from step-01

### 2. Clarify Ambiguities

**If `{auto_mode}` = true:**
→ Use recommended option for any ambiguity

**If `{auto_mode}` = false AND multiple valid approaches exist:**

```yaml
questions:
  - header: "Approach"
    question: "Multiple approaches are possible. Which should we use?"
    options:
      - label: "Approach A (Recommended)"
        description: "Description and tradeoffs of A"
      - label: "Approach B"
        description: "Description and tradeoffs of B"
    multiSelect: false
```

### 3. Create Detailed Plan

**Structure by FILE, not by feature:**

```markdown
## Implementation Plan: {feature_title}

### Overview
[1-2 sentences: High-level strategy and approach]

### Learned Patterns Applied
- {pattern}: {how it applies}

### Anti-Patterns to Avoid
- {antipattern}: {prevention strategy}

### Prerequisites
- [ ] Prerequisite 1 (if any)

---

### File Changes

#### `src/path/file1.ts`
- Add `functionName` that handles X
- Extract logic from Y (follow pattern in `example.ts:45`)
- Handle error case: [specific scenario]

#### `src/path/file2.ts`
- Update imports to include new module
- Call `functionName` in existing flow at line ~42
- Update types: Add `NewType` interface

#### `src/path/file3.ts` (NEW FILE)
- Create utility for Z
- Export: `utilityFunction`, `HelperType`
- Pattern: Follow `similar-util.ts` structure

---

### Testing Strategy

**New tests:**
- `src/path/file1.test.ts` - Test functionName

**Update existing:**
- `src/path/existing.test.ts` - Add test for new flow

---

### Acceptance Criteria Mapping
- [ ] AC1: Satisfied by changes in `file1.ts`
- [ ] AC2: Satisfied by changes in `file2.ts`

---

### Risks & Considerations
- Risk 1: [potential issue and mitigation]
```

### 4. Plan Critique (4 Structured Checks)

Run these 4 checks against the plan. ALL must pass.

#### Check 1: AC Coverage
Every acceptance criterion MUST map to ≥1 file change.

```markdown
| AC | Mapped To | Status |
|----|-----------|--------|
| AC1: {criterion} | `file.ts` change | COVERED / MISSING |
| AC2: {criterion} | `file.ts` change | COVERED / MISSING |
```

**FAIL if:** Any AC has no mapped file change.

#### Check 2: File Existence
Every referenced file must exist OR be explicitly marked `(NEW FILE)`.

```markdown
| File | Status |
|------|--------|
| `src/path/file.ts` | EXISTS / NEW / MISSING |
```

**FAIL if:** A file is referenced that doesn't exist and isn't marked NEW.

#### Check 3: Scope Boundary
No unexplained out-of-scope files. Every file change must trace back to an AC or prerequisite.

```markdown
| File | Justification |
|------|--------------|
| `src/path/file.ts` | AC1 - implements X |
| `src/path/shared.ts` | Prerequisite - shared utility needed by AC2 |
```

**FAIL if:** A file change has no clear justification.

#### Check 4: Complexity Match
File count should match feature size expectations.

| Size | Expected Files | Expected New Files |
|------|---------------|-------------------|
| S (1-2 AC) | 1-5 | 0-2 |
| M (3-4 AC) | 3-8 | 1-3 |
| L (5+ AC) | 5-15 | 2-6 |

**WARN if:** File count is >50% above expected range.

---

**Critique Result:**

```markdown
## Plan Critique Result

| Check | Status | Details |
|-------|--------|---------|
| AC Coverage | PASS/FAIL | {n}/{m} ACs covered |
| File Existence | PASS/FAIL | {n} missing |
| Scope Boundary | PASS/FAIL | {n} unexplained |
| Complexity Match | PASS/WARN/FAIL | {size}: {n} files |

**Overall:** PASS / FAIL
```

**IF critique FAILS:**
1. Revise the plan to address failures
2. Re-run critique (1 retry max)
3. If still fails: proceed with documented gaps

### 5. Present Plan for Approval

```
**Implementation Plan Ready**

**Overview:** [1 sentence summary]
**Files to modify:** {count} files
**New files:** {count} files
**Tests:** {count} test files
```

**If `{auto_mode}` = true:**
→ Skip confirmation, proceed directly to execution

**If `{auto_mode}` = false:**

```yaml
questions:
  - header: "Plan"
    question: "Review the implementation plan. Ready to proceed?"
    options:
      - label: "Approve and execute (Recommended)"
        description: "Plan looks good, start implementation"
      - label: "Adjust plan"
        description: "I want to modify specific parts"
      - label: "Start over"
        description: "Revise the entire plan"
    multiSelect: false
```

### 6. Save Output

Write plan to `{output_dir}/02-plan.md`

**If `{plan_only}` = true:**
→ STOP HERE. Show plan summary and exit.

---

## SUCCESS METRICS:

- Complete file-by-file plan created
- Logical dependency order established
- All acceptance criteria mapped to changes
- Learned patterns applied
- Test strategy defined
- User approved plan (or auto-approved)
- NO code written or modified
- Output saved

## FAILURE MODES:

- Organizing by feature instead of file
- Vague actions like "add feature" or "fix issue"
- Missing test strategy
- Not mapping to acceptance criteria
- Not applying learned patterns
- Starting to write code (that's step 3!)

---

## NEXT STEP:

After approval, load `./step-03-execute.md`

<critical>
Planning is ONLY about designing the approach - save all implementation for step-03!
</critical>
