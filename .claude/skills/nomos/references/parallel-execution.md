# NOMOS v4 Parallel Execution & Agent Dispatch

Architecture for agent dispatch and parallel execution across the v4 pipeline.

---

## Dispatch Model: Native Task Tool

All agents are dispatched via the Claude Code `Task` tool, giving each a **fresh context window** (no accumulated markdown pollution). Three dispatch patterns:

| Pattern | When | Example |
|---------|------|---------|
| `Task(subagent_type, prompt)` | One-shot agent | scout, architect, qa-reviewer |
| `Task(resume: agentId, prompt)` | Continue previous work | code-writer iteration 2+ |
| `Task(run_in_background: true)` | Parallel execution | Gate B reviewers |

---

## Phase 1: UNDERSTAND (1 agent)

| Agent | Dispatch | Model | Purpose |
|-------|----------|-------|---------|
| scout | `Task(subagent_type="explore-codebase", model="haiku")` | haiku | Context gathering — replaces 3 v3 agents |

One-shot. Returns JSON with risk_level, patterns, key_files, etc.

---

## Phase 2: PLAN (1 agent)

| Agent | Dispatch | Model | Purpose |
|-------|----------|-------|---------|
| architect | `Task(subagent_type="code-architect", model="opus")` | opus | Implementation planning with self-critique |

One-shot. Returns JSON with plan_overview, file_operations, ac_mapping.

---

## Phase 3: EXECUTE (2 agents, loop max 3)

| Agent | Dispatch | Model | Purpose |
|-------|----------|-------|---------|
| code-writer (iter 1) | `Task(subagent_type="code-writer", model="sonnet")` | sonnet | Initial implementation |
| code-writer (iter 2+) | `Task(resume=writer_agent_id)` | sonnet | Fix QA issues (preserves context) |
| qa-reviewer | `Task(subagent_type="qa-reviewer", model="sonnet")` | sonnet | Stateless review per iteration |

**Key insight:** `resume` parameter lets code-writer iteration 2+ continue with full context from iteration 1. No need to re-explain what was built. qa-reviewer stays stateless (fresh each time, sees only current state).

**Loop:** code-writer -> qa-reviewer -> PASS? done : next iteration. Max 3, then ESCALATED.

---

## Phase 4: REVIEW (3 gates, up to 4 agents)

### Gate A: Static (no agent — bash)

```bash
cd {worktree_path} && bun run check-types && bun run check && bun run test:ci
```

Orchestrator runs directly. No agent dispatched.

### Gate B: Parallel Reviews (2 agents)

```
cr = Task(subagent_type="code-reviewer", run_in_background=true, model="sonnet", ...)
sr = Task(subagent_type="security-reviewer", run_in_background=true, model="sonnet", ...)
```

**MUST launch both in a SINGLE message.** Wait for both to complete.

### Gate C: Functional QA (1 agent, conditional)

```
qa = Task(subagent_type="qa-functional-tester", model="sonnet", ...)
```

Skip if no UI/API acceptance criteria exist.

### Fix Cycles

Max 2 total fix cycles across all gates. Fix via `Task(subagent_type="code-writer", model="sonnet", ...)`.

---

## Phase 5: SHIP (no agents)

Orchestrator handles git operations directly. No agent dispatch.

---

## Phase 6: LEARN (1 agent, conditional)

| Agent | Dispatch | Model | Purpose |
|-------|----------|-------|---------|
| historian | `Task(subagent_type="general-purpose", model="haiku")` | haiku | Learning extraction |

**Condition:** Only runs if feature reached `waiting_approval` or `verified`. Skipped for `failed` or `escalated`.

---

## Context Clearing

Each phase reads ONLY the previous checkpoint JSON. This prevents context pollution:

```
Phase 1 → writes cp-01.json → CLEARS context
Phase 2 → reads cp-01.json → writes cp-02.json → CLEARS context
Phase 3 → reads cp-02.json → writes cp-03.json → CLEARS context
...
```

**Inter-phase channel:** Checkpoint JSON files ONLY.
**Intra-phase channel:** Agent results (via Task tool return values).

---

## Rules

- Always launch parallel agents in a SINGLE message (Gate B)
- Never start servers except in Gate C of Phase 4
- Servers started ONCE and stopped within the same gate
- Failed gates retried individually, not all gates
- Max 2 fix cycles total across all gates (not per gate)
- code-writer `resume` preserves full context (iteration 2+ remembers iteration 1)
- qa-reviewer is stateless (fresh context each time)

---

## v3 Comparison

| Aspect | v3 | v4 |
|--------|----|----|
| Agent dispatch | Inline prompts in step files | Native Task tool |
| Context between steps | Accumulated markdown | JSON checkpoint only |
| Parallel execution | Conceptual (3 tracks) | Native (run_in_background) |
| code-writer persistence | Re-prompt each iteration | resume parameter |
| Total agents | 12 | 9 |
| Agent calls (M-feature) | 12-15 | 6-9 |
| Fix cycles | 5 max | 2 max |
