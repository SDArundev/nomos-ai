---
name: step-03-execute
description: "Execute-verify loop: orchestrate code-writer and qa-reviewer agents (max 3 iterations)"
prev_step: steps/step-02-plan.md
next_step: steps/step-04-verify.md
---

> **DEPRECATED (v3):** Superseded by NOMOS v4 phases. Kept for rollback. Restore: change SKILL.md FIRST ACTION to step-00-init.md.

# Step 3: Execute-Verify Loop

## References
- `references/agent-prompts.md#step-03-execute-verify-loop-agents` — Code writer + QA reviewer prompts
- `references/output-formats.md#step-03` — Execute log format
- `references/output-formats.md#step-03---step-04` — Compact context transfer

## MANDATORY EXECUTION RULES:

- The MAIN THREAD is the ORCHESTRATOR — it NEVER writes code
- Code writing is delegated ONLY to the `code-writer` agent
- QA review is delegated ONLY to the `qa-reviewer` agent
- NEVER deviate from the approved plan
- NEVER add features not in the plan (scope creep)
- ALWAYS track iterations and write checkpoints
- ALWAYS escalate after 3 failed iterations
- The orchestrator formats prompts, passes data between agents, and decides when to stop

## ARCHITECTURE:

```
Orchestrator (main thread) — NEVER writes code
  │
  ├── Iteration 1: Code Writer (INITIAL) → QA Reviewer → PASS? done : continue
  ├── Iteration 2: Code Writer (FIX) → QA Reviewer → PASS? done : continue
  ├── Iteration 3: Code Writer (FIX) → QA Reviewer → PASS? done : ESCALATE
  │
  └── On PASS → Step 04 (full verification: runtime, security, coverage)
```

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{acceptance_criteria}` | Success criteria from features.json |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | **ABSOLUTE** path to output directory (at project root, NOT worktree) |
| `{max_execute_iterations}` | Max loop iterations (default: 3) |
| Implementation plan | File-by-file changes from step-02 |
| Patterns | How to implement from step-01 |
| Anti-patterns | What to avoid from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 0. Check for Existing Checkpoint

**IF `{from_step}` == 3 AND checkpoint file exists:**

```bash
ls {output_dir}/03-checkpoint.json 2>/dev/null && echo "FOUND" || echo "NOT_FOUND"
```

If found:
1. Read `{output_dir}/03-checkpoint.json`
2. Load `loop_state` — check `current_iteration` and `final_verdict`
3. If `final_verdict` == "PASS": skip to step 5 (write output)
4. If `final_verdict` == null: resume from `current_iteration`
5. Load any previous iteration results for context

If not found: Proceed normally (fresh execution, iteration 1).

### 1. Prepare Loop Context

Read and prepare the data the agents will need:

**1.1** Read the implementation plan from `{output_dir}/02-plan.md`
**1.2** Read patterns and antipatterns from `{output_dir}/01-context.md`
**1.3** Read acceptance criteria from features.json or step-00 output
**1.4** Initialize loop state:
```json
{
  "feature_id": "{feature_id}",
  "max_iterations": 3,
  "current_iteration": 1,
  "final_verdict": null,
  "iterations": []
}
```

### 2. Execute-Verify Loop (max {max_execute_iterations} iterations)

For each iteration (1 to {max_execute_iterations}):

#### 2.1 Launch Code Writer Agent

Determine mode: Iteration 1 = `INITIAL_IMPLEMENTATION`, Iteration 2+ = `FIX_ISSUES`.
Read prompt template from `references/agent-prompts.md#code-writer-agent`.

**Context Optimization for Iteration 2+:**
- Iteration 1: Pass full plan + patterns + antipatterns + codebase context
- Iteration 2+: Pass ONLY:
  1. The plan overview (not full file-by-file detail)
  2. The latest QA issue report (from previous iteration)
  3. Antipatterns relevant to the reported issues
  4. Do NOT re-pass: full plan details, previous diffs, previous QA reports
  - The code-writer already has the codebase in the worktree and can read any file
  - Cumulative context wastes tokens and can confuse the agent with stale information

**Collect from code writer:**
- List of files changed
- Skills invoked
- Quick verify results (typecheck, lint)
- Summary of changes (or fixes applied)

#### 2.2 Launch QA Reviewer Agent

After code writer completes, launch QA reviewer.
Read prompt template from `references/agent-prompts.md#qa-reviewer-agent`.

**Context Optimization for Iteration 2+:**
- Iteration 1: Pass plan summary + AC mapping + files changed + antipatterns
- Iteration 2+: Pass ONLY:
  1. Previous QA report (to check fixes AND detect regressions)
  2. Files changed THIS iteration (from code writer report)
  3. Antipatterns
  4. Do NOT re-pass: full plan, unchanged files from iteration 1

**Collect from QA reviewer:**
- Structured JSON issue report
- Verdict: PASS or FAIL

#### 2.3 Evaluate Verdict

**If PASS:**
1. Log: `ITERATION {n}: PASS — Code meets all requirements`
2. Set `final_verdict = "PASS"`
3. Write final checkpoint (section 3)
4. Break out of loop → proceed to step 4

**If FAIL:**
1. Log: `ITERATION {n}: FAIL — {count} blocking issues found`
2. Log each CRITICAL/HIGH issue briefly
3. Record iteration result in loop state
4. Write checkpoint (section 3)
5. If iteration < {max_execute_iterations}: continue to next iteration
6. If iteration == {max_execute_iterations}: escalate (section 2.4)

#### 2.4 Escalation (after {max_execute_iterations} failures)

**If `{auto_mode}` = true:**
1. Write escalation report to `{output_dir}/03-escalation.md`
2. Set `final_verdict = "ESCALATED"`
3. HALT — do not proceed to step-04

**If `{auto_mode}` = false:**
Ask user via AskUserQuestion: provide guidance, continue with known issues, or abort.

### 3. Write Checkpoint

After EVERY iteration, write checkpoint to `{output_dir}/03-checkpoint.json`:

```json
{
  "feature_id": "{feature_id}",
  "timestamp": "{ISO}",
  "loop_state": {
    "max_iterations": 3,
    "current_iteration": "{n}",
    "final_verdict": "PASS|FAIL|ESCALATED|null",
    "iterations": [...]
  },
  "candidate_antipatterns": []
}
```

Write using **Write tool** after each iteration (not just at end). This enables resume from any point.

### 4. Extract Candidate Anti-Patterns

After the loop completes, analyze issue patterns across iterations.

**Issue signature:** `{dimension}:{file}:{description_pattern}`

For each issue that appeared in 2+ iterations with the same signature:
- Flag as candidate antipattern
- Record: signature, occurrences, iterations seen, description

Write to `{output_dir}/03-candidate-antipatterns.json`. Step-06 will process these.

### 5. Save Output

Write execution log to `{output_dir}/03-execute.md`.
Use the format from `references/output-formats.md#step-03-execute-log-format`.
Include the compact context transfer block at the TOP (see `references/output-formats.md#step-03---step-04`).

---

## SUCCESS METRICS:

- Main thread NEVER writes code — only orchestrates
- Code writer agent handles ALL code changes
- QA reviewer agent is strictly read-only
- Loop converges within {max_execute_iterations} iterations
- All plan items implemented
- All acceptance criteria addressed
- Typecheck and lint pass
- Checkpoints written after every iteration
- Candidate antipatterns extracted for step-06
- Clear execution log with iteration history

## FAILURE MODES:

- Main thread writing code instead of delegating to code-writer
- QA reviewer modifying files
- Not tracking iterations or writing checkpoints
- Continuing beyond max iterations without escalating
- Passing QA issues back to code writer without structured format
- Not extracting candidate antipatterns from recurring issues

---

## NEXT STEP:

After loop completes with PASS, load `./step-04-verify.md`

<critical>
The main thread is an ORCHESTRATOR ONLY. It formats prompts, launches agents, collects results, and decides next actions. It NEVER writes, edits, or modifies code files.
</critical>
