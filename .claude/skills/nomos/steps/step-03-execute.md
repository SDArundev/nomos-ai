---
name: step-03-execute
description: Task-driven implementation - execute the plan file by file
prev_step: steps/step-02-plan.md
next_step: steps/step-04-verify.md
---

# Step 3: Execute (Implementation)

## MANDATORY EXECUTION RULES:

- NEVER deviate from the approved plan
- NEVER add features not in the plan (scope creep)
- NEVER modify files without reading them first
- ALWAYS follow the plan file-by-file
- ALWAYS mark tasks complete immediately after each one
- ALWAYS read files BEFORE editing them
- YOU ARE AN IMPLEMENTER following a plan, not a designer
- FORBIDDEN to add "improvements" not in the plan

## YOUR TASK:

Execute the approved implementation plan file-by-file, tracking progress with tasks.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output directory |
| Implementation plan | File-by-file changes from step-02 |
| Patterns | How to implement from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Create Tasks from Plan

Convert each file change from the plan into tasks using **TaskCreate**:

```
Plan entry:
#### `src/auth/handler.ts`
- Add `validateToken` function
- Handle error case: expired token

Becomes:
TaskCreate(
  subject: "Implement handler.ts changes",
  description: "Add validateToken, handle expired token error",
  activeForm: "Implementing handler.ts"
)
```

### 2. Skill Detection (MANDATORY)

**Before writing any code, discover and invoke relevant skills.**

Scan the implementation plan for domain keywords and match against available skills:

```
TypeScript/types    → Skill(typescript-expert)
Drizzle/SQL/schema  → Skill(database-expert)
React/components    → Skill(react-ecosystem)
Docker/container    → Skill(docker-expert)
Auth/JWT            → Skill(auth-expert)
API/REST            → Skill(api-patterns)
```

**Read the skill's guidance before implementing that domain.**

Log invoked skills:
```markdown
## Skills Invoked

| Skill | Trigger Keywords | Applied To |
|-------|------------------|------------|
| {skill-name} | {keywords} | {files} |
```

### 3. Execute File by File

For each task:

**3.1 Mark In Progress**
```
TaskUpdate(taskId: "id", status: "in_progress")
```
- Only ONE task in_progress at a time

**3.2 Read Before Edit**
```
ALWAYS read the file before modifying:
- Understand current structure
- Find exact insertion points
- Verify patterns match expectations
```

**3.3 Implement Changes**
```
Make changes specified in the plan:
- Follow patterns from step-01 analysis
- Use exact names from plan
- Handle error cases as specified
- NO comments unless truly necessary
```

**3.4 Mark Complete Immediately**
```
TaskUpdate(taskId: "id", status: "completed")
```

**3.5 Log Progress**
```markdown
### src/auth/handler.ts
- Added `validateToken` function (lines 45-78)
- Added error handling for expired tokens
**Timestamp:** {ISO}
```

### 4. Handle Blockers

**If `{auto_mode}` = true:**
→ Make reasonable decision and continue

**If `{auto_mode}` = false:**

```yaml
questions:
  - header: "Blocker"
    question: "Encountered an issue. How should we proceed?"
    options:
      - label: "Use alternative approach (Recommended)"
        description: "Description of alternative"
      - label: "Skip this part"
        description: "Continue without this change"
      - label: "Stop for discussion"
        description: "I want to discuss before continuing"
    multiSelect: false
```

### 5. Quick Verify

After completing all tasks, run a quick check from worktree:

```bash
cd {worktree_path}
bun run check-types && bun run check
```

Fix any errors immediately.

### 6. Implementation Summary

```
**Implementation Complete**

**Files Modified:**
- `src/auth/handler.ts` - Added validateToken, error handling

**New Files:**
- `src/types/auth.ts` - Auth type definitions

**Skills Invoked:** {count}
**Tasks:** {X}/{Y} complete
```

### 7. Save Output

Write execution log to `{output_dir}/03-execute.md`

---

## SUCCESS METRICS:

- Skills detected and invoked before coding
- All plan items implemented
- All tasks marked complete
- No scope creep - only plan items
- Files read before modification
- Typecheck and lint pass
- Progress logged

## FAILURE MODES:

- Skipping skill detection step
- Adding features not in the plan
- Modifying files without reading first
- Not updating tasks as you work
- Multiple tasks in_progress simultaneously
- Ignoring type or lint errors

---

## CONTEXT COMPACTION (for step-04 handoff):

Before proceeding, add a compact transfer summary at the TOP of `{output_dir}/03-execute.md`:

```markdown
## Compact Context → Step 04

- **Files Modified:** {list of files changed with one-line summary each}
- **New Files Created:** {list}
- **Lines Changed:** +{added} / -{removed}
- **Issues Encountered:** {count} — {brief list or "none"}
- **Skills Invoked:** {list of skill names used}
- **Quick Verify:** typecheck {PASS/FAIL} | lint {PASS/FAIL}
```

This compact summary allows step-04 to scope verification without re-reading the full execution log.

---

## NEXT STEP:

After implementation complete, load `./step-04-verify.md`

<critical>
Execution is about following the plan - don't redesign or add features!
</critical>
