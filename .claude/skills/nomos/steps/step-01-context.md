---
name: step-01-context
description: "Parallel context gathering: load learnings + explore codebase + research docs"
prev_step: steps/step-00-init.md
next_step: steps/step-02-plan.md
---

# Step 1: Context (Parallel Gathering)

## References
- `references/agent-prompts.md#step-01-context-agents` — Agent prompt templates
- `references/output-formats.md#step-01` — Context summary format
- `references/output-formats.md#compact-context-transfer-pattern` — Compact context transfer

## MANDATORY EXECUTION RULES:

- NEVER plan or design solutions - that's step 2
- NEVER create tasks or implementation plans
- ALWAYS focus on discovering WHAT EXISTS and loading learned knowledge
- ALWAYS report findings with file paths and line numbers
- YOU ARE AN EXPLORER AND LEARNER, not a planner
- FORBIDDEN to suggest implementations or approaches

## MODE: 3 PARALLEL AGENTS

Launch **up to 3 agents simultaneously** depending on task complexity:

| Agent | Purpose | Always? |
|-------|---------|---------|
| **load-learnings** | Load patterns, metrics, risk assessment, code knowledge | Yes |
| **explore-codebase** | Find existing patterns, files, utilities related to feature | Yes |
| **research-docs** | Research library docs via Context7 MCP | Only if unfamiliar libraries |

---

<available_state>
From step-00-init:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier (e.g., F016) |
| `{feature_title}` | Feature title |
| `{feature_description}` | Feature description |
| `{acceptance_criteria}` | Success criteria |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | **ABSOLUTE** path to output directory (at project root, NOT worktree) |
</available_state>

<critical>
**OUTPUT PATH RULE:** `{output_dir}` is an ABSOLUTE path at the project root (e.g., `/Users/.../nomos-ai/.nomos/output/F016`).
When writing output files, ALWAYS use this absolute path. NEVER construct a relative `.nomos/output/` path — it will resolve inside the worktree and files will be lost after merge/cleanup.
</critical>

---

## EXECUTION SEQUENCE:

### 1. Analyze Task Complexity (THINK FIRST)

```
Task: {feature_description}

1. SCOPE: How many areas of the codebase are affected?
   - Single file/function → Low
   - Multiple related files → Medium
   - Cross-cutting concerns → High

2. LIBRARIES: Which external libraries are involved?
   - None or well-known basics → Skip docs agent
   - Unfamiliar library or specific API → Need docs agent
   - Multiple libraries interacting → Need multiple doc queries

3. UNCERTAINTY: What am I unsure about?
   - Clear requirements, known approach → 2 agents
   - Unclear approach, unfamiliar territory → 3 agents
```

### 1b. Load Tech Stack (BEFORE launching agents)

Read `.nomos/stack.json` (if exists). This is a pre-computed inventory of all
dependencies, frameworks, and component registries in the project.

Set state variable:
`{tech_stack}` = parsed contents of stack.json

Pass to ALL agents:
- Key dependencies matching the feature's layer/category
- Component registries with installed/available lists
- Best practices for matched dependencies

If stack.json does not exist: WARN and skip (agents fall back to codebase scanning).

### 2. Launch Parallel Agents (SINGLE MESSAGE)

<critical>
Launch ALL agents in ONE message for parallel execution.
Read agent prompts from `references/agent-prompts.md#step-01-context-agents`.
</critical>

<critical>
**Documentation Research Rule:**
- Library/Framework docs → Context7 MCP ONLY (via `explore-docs` agent)
- General approaches/patterns → WebSearch is acceptable
- Specific API/syntax → Context7 ONLY
- NEVER use WebSearch for specific library docs
</critical>

### 2b. Pre-Filter Learnings (BEFORE agent launch)

Before launching the load-learnings agent, use the existing insights scoring to pre-filter relevant learning data:

```bash
# Get top relevant insights (scored by dependency +3, category +2, phase +1)
RELEVANT_INSIGHTS=$(bash .claude/skills/nomos/scripts/nomos.sh insights {feature_id})

# Get category-specific patterns (includes verification patterns with source: "verification")
RELEVANT_PATTERNS=$(bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-code)

# Get verification patterns for QA awareness (includes VP entries with detection signatures)
VERIFICATION_PATTERNS=$(bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-qa)
```

Pass ONLY these pre-filtered results to the load-learnings agent prompt, NOT the raw file paths. This prevents the agent from reading ALL learning files (50% of which are typically irrelevant).

The load-learnings agent should still read:
- `antipatterns.json` (always relevant, small file)
- `metrics.json` (for threshold calculation)
- Code knowledge files matching the feature's category ONLY
- The pre-scored insights (top 3 from above, not all insight files)
- Verification patterns are already included in RELEVANT_PATTERNS and VERIFICATION_PATTERNS (no extra read needed)

### 3. Pre-Implementation Check (CRITICAL)

After agents return, check if feature is ALREADY IMPLEMENTED:

```markdown
## Pre-Implementation Check

| Acceptance Criterion | Status | Evidence |
|---------------------|--------|----------|
| AC1: {criterion} | Met / Not met | {file:line or "not found"} |
| AC2: {criterion} | Met / Not met | {file:line or "not found"} |
```

**IF ALL acceptance criteria are ALREADY MET:**

```bash
bash .claude/skills/nomos/scripts/nomos.sh state preverify {feature_id}
```

Then:
1. Document what exists and where
2. Skip to step-06-finish.md (extract patterns from existing implementation)
3. Do NOT proceed to planning/execution

### 4. Synthesize All Results

Combine all agent results into a unified context document.
Use the format from `references/output-formats.md#step-01-context-summary-format`.

### 5. Save Output

Write combined findings to `{output_dir}/01-context.md`.
Include the compact context transfer block at the TOP (see `references/output-formats.md#step-01---step-02`).

### 6. Proceed

<critical>
Do NOT ask for user confirmation - always proceed directly to step-02-plan.
</critical>

```
→ Proceeding to planning phase...
```

---

## SUCCESS METRICS:

- Tech stack loaded from stack.json (if exists)
- Learnings loaded (patterns, anti-patterns, metrics)
- Code knowledge loaded and filtered by severity
- Risk assessment completed
- Related files identified with paths and line numbers
- Existing patterns documented
- Pre-implementation check completed
- All agents launched in PARALLEL (single message)
- Right NUMBER of agents launched based on complexity
- Context summary generated
- Output saved

## FAILURE MODES:

- Starting to plan or design (that's step 2!)
- Launching agents sequentially instead of parallel
- Launching too many agents for a simple task
- Skipping learning files without checking
- Not calculating risk assessment
- Not checking if feature is already implemented
- Blocking workflow with unnecessary confirmation prompts

---

## NEXT STEP:

Always proceed directly to `./step-02-plan.md`

<critical>
This step is ONLY about gathering context - save all planning for step-02!
</critical>
