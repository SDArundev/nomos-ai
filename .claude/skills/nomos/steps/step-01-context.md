---
name: step-01-context
description: "Parallel context gathering: load learnings + explore codebase + research docs"
prev_step: steps/step-00-init.md
next_step: steps/step-02-plan.md
---

# Step 1: Context (Parallel Gathering)

## MANDATORY EXECUTION RULES:

- NEVER plan or design solutions - that's step 2
- NEVER create tasks or implementation plans
- ALWAYS focus on discovering WHAT EXISTS and loading learned knowledge
- ALWAYS report findings with file paths and line numbers
- YOU ARE AN EXPLORER AND LEARNER, not a planner
- FORBIDDEN to suggest implementations or approaches

## MODE: 3 PARALLEL AGENTS

This step merges the old context-loading (learnings) and analyze (codebase exploration) into a single parallel phase.

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

### 2. Launch Parallel Agents (SINGLE MESSAGE)

<critical>
Launch ALL agents in ONE message for parallel execution.
</critical>

**Agent 1: load-learnings** (ALWAYS launch)

```
Task agent: general-purpose
Prompt: |
  Load NOMOS learnings for feature {feature_id}: {feature_title}

  1. Load patterns from .nomos/learning/patterns.json (if exists)
     - Filter by relevance to this feature's phase and category
     - Apply confidence-based filtering:
       * confidence ≥ 0.7 → ALWAYS include
       * confidence ≥ 0.3 → include IF relevant to this feature
       * confidence < 0.3 → SKIP unless risk_if_ignored == "HIGH"
     - Sort included patterns by confidence (highest first)
  2. Load anti-patterns from .nomos/learning/antipatterns.json (if exists)
  3. Load metrics from .nomos/learning/metrics.json (if exists)
     - Calculate thresholds from historical data
  4. Load code knowledge from .nomos/learning/code/ (if exists)
     - Detect relevant categories from feature description
     - Load matching category files (database.json, typescript.json, etc.)
     - Filter by severity (always include CRITICAL and HIGH)
  5. Check dependencies from features.json
     - Verify all dependencies are verified
  5b. Load session insights from `.nomos/learning/insights/`
     - List all insight JSON files in the directory
     - Score relevance for each insight:
       * +3 if insight's feature is a direct dependency of {feature_id}
       * +2 if insight's category matches this feature's category
       * +1 if insight's phase matches this feature's phase
     - Sort by relevance score (highest first)
     - Load top 3 insights
     - From each loaded insight, inject into context:
       * `discoveries` → things to look for / reuse
       * `what_worked` → approaches to follow
       * `what_failed` → approaches to avoid
       * `recommendations_for_next` → direct guidance
  6. Calculate risk assessment:
     - Phase success rate < 80% → +1 RISK
     - Many dependencies → +1 RISK
     - Unfamiliar technology → +1 RISK
     - Large scope (many AC) → +1 RISK
     - 0-1 factors: LOW, 2-3: MEDIUM, 4+: HIGH

  Report:
  - Patterns to apply
  - Anti-patterns to avoid
  - Historical thresholds
  - Code-level patterns (with severity)
  - Session insights (top 3 relevant: discoveries, what_worked, what_failed, recommendations)
  - Risk level (LOW/MEDIUM/HIGH)
  - Dependency status
```

**Agent 2: explore-codebase** (ALWAYS launch)

```
Task agent: explore-codebase
Prompt: |
  Explore codebase for feature {feature_id}: {feature_title}
  Description: {feature_description}

  ### Step 0: Load Codebase Map (FIRST)
  Read `.nomos/learning/code/codebase-map.json` if it exists.
  - If map has entries: use it to instantly locate relevant files by purpose/layer/exports
  - Then explore ONLY for files NOT already in the map
  - If map is empty or missing: fall back to full exploration (no error)

  ### Step 1: Find Related Files
  1. Files with paths and line numbers related to this feature
  2. Patterns used for similar features
  3. Relevant utilities and shared code
  4. Test patterns in use
  5. Configuration and schema files involved

  Check if feature is ALREADY IMPLEMENTED:
  - Compare acceptance criteria against findings
  - Report status per criterion: Met / Not met with evidence

  DO NOT suggest implementations. Report what EXISTS.
```

**Agent 3: research-docs** (CONDITIONAL - only if unfamiliar libraries)

<critical>
**Documentation Research Rule:**
- Library/Framework docs → Context7 MCP ONLY (via `explore-docs` agent)
- General approaches/patterns → WebSearch is acceptable
- Specific API/syntax → Context7 ONLY
- NEVER use WebSearch for specific library docs
</critical>

```
Task agent: explore-docs
Prompt: |
  Research documentation for: {specific_library_or_framework}
  Context: Implementing {feature_title}

  MUST USE: Context7 MCP
  1. mcp__context7__resolve-library-id for {library}
  2. mcp__context7__query-docs for specific API questions

  Find:
  1. Current API for {specific_feature}
  2. Code examples
  3. Configuration needed
  4. Common pitfalls
```

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

Combine all agent results into a unified context document:

```markdown
## Context Summary: {feature_id}

### Learnings Applied
**Risk Level:** {risk_level}
**Patterns to Apply:** {list}
**Anti-Patterns to Avoid:** {list}
**Thresholds:** Duration: {n} min, Files: {n}

### Codebase Context
**Related Files:** {count} files found
| File | Contains |
|------|----------|
| `src/path/file.ts` | Existing implementation |

### Patterns Observed
- {pattern_1}
- {pattern_2}

### Utilities Available
- {utility_1}
- {utility_2}

### Session Insights (cross-feature memory)
| Source Feature | Relevance | Key Takeaway |
|---------------|-----------|--------------|
| {insight_feature_id} | {score} | {top recommendation} |

### Documentation Insights (if researched)
- {library}: {key_finding}

### Dependencies
| Dependency | Status |
|------------|--------|
| {dep_id} | Verified / Pending |
```

### 5. Save Output

Write combined findings to `{output_dir}/01-context.md`

### 6. Proceed

<critical>
Do NOT ask for user confirmation - always proceed directly to step-02-plan.
</critical>

```
→ Proceeding to planning phase...
```

---

## SUCCESS METRICS:

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

## CONTEXT COMPACTION (for step-02 handoff):

Before proceeding, compact the full context into a transfer summary at the TOP of `{output_dir}/01-context.md`:

```markdown
## Compact Context → Step 02

- **Risk Level:** {LOW/MEDIUM/HIGH}
- **Key Patterns:** {top 3 patterns to apply, one-line each}
- **Anti-Patterns:** {top 2 to avoid, one-line each}
- **Key Files:** {up to 10 most relevant files with one-line purpose}
- **Dependencies:** {dep status: all verified / {n} pending}
- **Thresholds:** Duration: {n} min | Files: {n} max
- **Pre-Implementation:** {all met (skip to finish) / {n}/{m} met}
```

This compact summary allows step-02 to start immediately without re-reading the full context.

---

## NEXT STEP:

Always proceed directly to `./step-02-plan.md`

<critical>
This step is ONLY about gathering context - save all planning for step-02!
</critical>
