---
name: step-03-fix
description: Fix loop — code-writer fixes issues, qa-reviewer validates (Stage 2)
prev_step: steps/step-02-report.md
next_step: steps/step-04-finish.md
---

# Step 3: Fix Loop (Stage 2 — Conditional)

## References
- `references/agent-prompts.md` — Fix agent prompt templates
- `references/severity-guide.md` — Fix priority and escalation rules

## MANDATORY EXECUTION RULES:

- ONLY entered if `{fix_mode}` is true AND step-02 found CRITICAL/HIGH issues
- ALWAYS create worktree before making changes
- ALWAYS fix in priority order (CRITICAL first, then HIGH)
- NEVER exceed `{max_fix_iterations}` iterations
- NEVER fix MEDIUM or LOW issues (document only)
- ALWAYS validate fixes with qa-reviewer before declaring success

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{scope}` | single/range/verified/pending/all |
| `{fix_mode}` | true (required to enter this step) |
| `{auto_mode}` | Skip confirmations |
| `{features_to_verify}` | Feature IDs |
| `{output_dir}` | Absolute path to output directory |
| `{max_fix_iterations}` | Max iterations (default: 3) |
| Issues list | CRITICAL + HIGH issues from step-02 report |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Create Worktree

<critical>
Worktree is ONLY created here, not in step-00.
This keeps the default verification flow read-only.
</critical>

```bash
timestamp=$(date +%Y-%m-%dT%H-%M-%S)
branch_name="verify/${timestamp}"
worktree_path=".nomos/worktrees/verify-${timestamp}"

git branch "${branch_name}"
git worktree add "${worktree_path}" "${branch_name}"
```

Set `{worktree_path}` for use in agent prompts.

Install dependencies in worktree:
```bash
cd "${worktree_path}" && bun install
```

### 2. Prepare Fix Queue

From step-02 report, extract CRITICAL and HIGH issues:
1. Sort by severity (CRITICAL first)
2. Then by feature (group related fixes)
3. Build `{prioritized_issues_list}` for code-writer

### 3. Fix Loop (max `{max_fix_iterations}` iterations)

For each iteration `{n}` (1 to `{max_fix_iterations}`):

#### 3a. Launch Code Writer

```
Task agent: code-writer
Prompt: (from references/agent-prompts.md → "Code Writer (Fix Mode)")
  - Working directory: {worktree_path}
  - Issues to fix: {prioritized_issues_list}
  - Iteration: {n}
```

Wait for completion. Collect list of changes made.

#### 3b. Launch QA Reviewer

```
Task agent: qa-reviewer
Prompt: (from references/agent-prompts.md → "QA Reviewer (Fix Validation)")
  - Working directory: {worktree_path}
  - Issues that were fixed: {list from 3a}
  - Iteration: {n}
```

Wait for completion. Collect verdict.

#### 3c. Evaluate Verdict

| Verdict | Action |
|---------|--------|
| **PASS** | All fixes validated, no regressions → exit loop, proceed to step-04 |
| **FAIL** | Remaining issues → update `{prioritized_issues_list}`, next iteration |
| **MAX REACHED** | Escalate: document remaining issues → proceed to step-04 |

#### 3d. Write Iteration Log

Append to `{output_dir}/03-fix.md`:

```markdown
### Iteration {n}

**Code Writer:**
- Issues targeted: {count}
- Files changed: {list}
- Fixes applied: {count}

**QA Reviewer:**
- Verdict: PASS/FAIL
- Issues resolved: {count}
- New issues: {count}
- Remaining: {count}
```

#### 3e. Update Checkpoint

```json
{
  "step": "03-fix",
  "fix_iterations": {
    "max": 3,
    "current": 1,
    "results": [
      {
        "iteration": 1,
        "issues_targeted": 0,
        "issues_fixed": 0,
        "verdict": "FAIL"
      }
    ]
  }
}
```

### 4. Escalation (if max iterations reached)

If loop exits without PASS:
1. Document remaining unfixed issues
2. If `{auto_mode}`:
   - Mark as ESCALATED
   - Proceed to step-04 with partial results
3. If not `{auto_mode}`:
   - Ask user: "Fix loop reached max iterations. {n} issues remain. Continue manually or proceed?"

### 5. Write Final Fix Summary

Write compact context transfer block at top of `{output_dir}/03-fix.md`:

```markdown
## Compact Context -> Step 04

- **Fix Result:** {PASS / PARTIAL / ESCALATED}
- **Iterations Used:** {n}/{max}
- **Issues Fixed:** {count}
- **Issues Remaining:** {count}
- **Files Changed:** {list}
- **Worktree:** {worktree_path}
```

---

## SUCCESS METRICS:

- Worktree created and dependencies installed
- Fix loop executed (1 to max iterations)
- Each iteration: code-writer + qa-reviewer
- Verdict evaluated per iteration
- Checkpoint updated per iteration
- Fix summary written with context transfer block

## FAILURE MODES:

- Fixing without worktree (changes on main!)
- Exceeding max iterations without escalating
- Fixing MEDIUM/LOW issues (out of scope)
- Not validating fixes with qa-reviewer
- Modifying files outside worktree

---

## NEXT STEP:

Load `./step-04-finish.md`

<critical>
All code changes happen ONLY in the worktree, NEVER on main.
Fix loop is sequential: code-writer → qa-reviewer → verdict → repeat.
CRITICAL fixes first, then HIGH. Never touch MEDIUM/LOW.
</critical>
