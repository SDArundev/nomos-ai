---
name: step-04-execute
description: Task-driven implementation - execute the plan file by file
prev_step: steps/step-03-plan.md
next_step: steps/step-04a-smoke.md
---

# Step 4: Execute (Implementation)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER deviate from the approved plan
- 🛑 NEVER add features not in the plan (scope creep)
- 🛑 NEVER modify files without reading them first
- ✅ ALWAYS follow the plan file-by-file
- ✅ ALWAYS mark tasks complete immediately after each one
- ✅ ALWAYS read files BEFORE editing them
- 📋 YOU ARE AN IMPLEMENTER following a plan, not a designer
- 💬 FOCUS on executing the plan exactly as approved
- 🚫 FORBIDDEN to add "improvements" not in the plan

## EXECUTION PROTOCOLS:

- 🎯 Create tasks from plan before starting (TaskCreate)
- 💾 Mark tasks complete immediately after each (TaskUpdate)
- 📖 Read each file BEFORE modifying it
- 🚫 FORBIDDEN to have multiple tasks in_progress simultaneously

## CONTEXT BOUNDARIES:

- Plan from step-03 is approved and must be followed
- Files to modify are known from the plan
- Patterns to follow are documented from step-01
- Don't add features - stick to the plan

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
| Implementation plan | File-by-file changes from step-03 |
| Patterns | How to implement from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Initialize Save Output

Append logs to `{output_dir}/04-execute.md` as you work.

### 2. Create Tasks from Plan

Convert each file change from the plan into tasks using **TaskCreate**:

```
Plan entry:
#### `src/auth/handler.ts`
- Add `validateToken` function
- Handle error case: expired token

Becomes tasks:
TaskCreate(
  subject: "Add validateToken function to handler.ts",
  description: "Implement validateToken in src/auth/handler.ts as specified in plan",
  activeForm: "Adding validateToken function"
)

TaskCreate(
  subject: "Handle expired token error in handler.ts",
  description: "Add error handling for expired tokens in src/auth/handler.ts",
  activeForm: "Adding expired token error handling"
)
```

Use **TaskList** to view all tasks and their status.

### 3. Skill Detection (MANDATORY)

**Before writing any code, discover and invoke relevant skills dynamically.**

#### Step 3.1: Discover Available Skills

List available skills from user and project directories:

```bash
# User-level skills
ls ~/.claude/skills/ 2>/dev/null | grep -v "^\."

# Project-level skills (if any)
ls .claude/skills/ 2>/dev/null | grep -v "^\."
```

#### Step 3.2: Load Skill Trigger Reference

Read the skill trigger mappings from `~/.claude/CLAUDE.md`:

```
Read ~/.claude/CLAUDE.md
```

Look for the **"Skill Triggers"** table which maps keywords to skills.

#### Step 3.3: Match Plan Keywords to Skills

Scan the implementation plan for domain keywords, then match against available skills:

**Common keyword patterns:**
- Language/Framework: TypeScript, React, Go, Python
- Data: Drizzle, Prisma, SQL, schema, migration
- Infrastructure: Docker, Kubernetes, CI/CD, GitHub Actions
- Quality: test, security, auth, validation

#### Step 3.4: Invoke Matched Skills

For each matched skill, invoke it using the Skill tool:

```
Skill(typescript-expert)  ← if types/interfaces detected
Skill(database-expert)    ← if Drizzle/SQL detected
Skill(docker-expert)      ← if Docker/container detected
```

**Read the skill's guidance before implementing that domain.**

#### Step 3.5: Log Invoked Skills

Document which skills were invoked and why:

```markdown
## Skills Invoked

| Skill | Trigger Keywords | Applied To |
|-------|------------------|------------|
| {skill-name} | {keywords found in plan} | {files affected} |
```

#### Always Invoke (Review Phase)

Consult `security-compliance` during step-06-review.

**If no skills match:** Document "No specialized skills required - general implementation" and proceed.

### 4. Execute File by File

For each task:

**4.1 Mark In Progress**
```
TaskUpdate(taskId: "task-id", status: "in_progress")
```
- Only ONE task in_progress at a time

**4.2 Read Before Edit**
```
ALWAYS read the file before modifying:
- Understand current structure
- Find exact insertion points
- Verify patterns match expectations
```

**4.3 Implement Changes**
```
Make changes specified in the plan:
- Follow patterns from step-01 analysis
- Use exact names from plan
- Handle error cases as specified
- NO comments unless truly necessary
```

**4.4 Mark Complete Immediately**
```
TaskUpdate(taskId: "task-id", status: "completed")
```
- Mark task complete RIGHT AFTER finishing
- Don't batch completions

**4.5 Log Progress**
```markdown
### ✓ src/auth/handler.ts
- Added `validateToken` function (lines 45-78)
- Added error handling for expired tokens
**Timestamp:** {ISO}
```

### 5. Handle Blockers

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

### 6. Verify Implementation

After completing all tasks (check with **TaskList**):

```bash
cd {worktree_path}
bun run check-types && bun run check
```

Fix any errors immediately.

### 7. Implementation Summary

```
**Implementation Complete**

**Files Modified:**
- `src/auth/handler.ts` - Added validateToken, error handling
- `src/api/auth/route.ts` - Integrated token validation

**New Files:**
- `src/types/auth.ts` - Auth type definitions

**Tasks:** {X}/{Y} complete (use TaskList to verify)
```

**If `{auto_mode}` = true:**
→ Proceed to validation

**If `{auto_mode}` = false:**

```yaml
questions:
  - header: "Execute"
    question: "Implementation complete. Ready to validate?"
    options:
      - label: "Proceed to validation (Recommended)"
        description: "Run typecheck, lint, and tests"
      - label: "Review changes"
        description: "I want to review what was changed"
      - label: "Make adjustments"
        description: "I want to modify something"
    multiSelect: false
```

### 8. Complete Save Output

Append to `{output_dir}/04-execute.md`:
```markdown
---
## Skills Invoked

| Skill | Trigger | Applied To |
|-------|---------|------------|
| {skill-name} | {keywords found} | {files affected} |

---
## Step Complete
**Status:** ✓ Complete
**Skills invoked:** {count}
**Files modified:** {count}
**Tasks completed:** {count}
**Next:** step-05-validate.md
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ Skills detected and invoked before coding
✅ All plan items implemented
✅ All tasks marked complete (TaskList shows all completed)
✅ No scope creep - only plan items
✅ Files read before modification
✅ Typecheck and lint pass
✅ Progress logged

## FAILURE MODES:

❌ Skipping skill detection step
❌ Adding features not in the plan
❌ Modifying files without reading first
❌ Not updating tasks as you work
❌ Multiple tasks in_progress simultaneously
❌ Ignoring type or lint errors
❌ **CRITICAL**: Not using AskUserQuestion for blockers

## EXECUTION PROTOCOLS:

- Follow the plan EXACTLY
- Read before write
- One file at a time
- Update tasks in real-time (TaskUpdate)
- Fix errors immediately

---

## NEXT STEP:

After implementation complete, load `./step-04a-smoke.md` (Runtime Smoke Test)

<critical>
Remember: Execution is about following the plan - don't redesign or add features!
</critical>
