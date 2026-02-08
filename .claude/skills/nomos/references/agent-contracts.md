# NOMOS v4 Agent Contracts

Defines how each agent is dispatched via the Task tool, what inputs it receives, and what outputs it must return.

---

## Dispatch Model

All agents are dispatched via the native Claude Code `Task` tool. This gives each agent a **fresh context window** (no accumulated markdown pollution).

### Dispatch Patterns

| Pattern | When | Example |
|---------|------|---------|
| `Task(subagent_type, prompt)` | One-shot agent | scout, architect, qa-reviewer |
| `Task(resume: agentId, prompt)` | Continue previous work | code-writer iteration 2+ |
| `Task(run_in_background: true)` | Parallel execution | Gate B reviewers |

---

## Phase 1: UNDERSTAND

### scout (haiku)

**Dispatch:**
```
Task(subagent_type="explore-codebase", model="haiku", prompt=...)
```

**Input:**
- feature_id, title, description, AC list
- category, phase, dependencies

**Must return (JSON):**
```json
{
  "risk_level": "LOW|MEDIUM|HIGH",
  "patterns": ["..."],
  "antipatterns": ["..."],
  "key_files": [{"path": "...", "purpose": "..."}],
  "pre_implemented": false,
  "pre_implemented_evidence": [],
  "dependencies_status": "all_verified|blocked",
  "stack_context": ["..."],
  "thresholds": {"duration_min": 30, "files_max": 15}
}
```

**Consolidates:** load-learnings + explore-codebase + explore-docs (conditional)

---

## Phase 2: PLAN

### architect (opus)

**Dispatch:**
```
Task(subagent_type="code-architect", model="opus", prompt=...)
```

**Input:**
- cp-01.json data (risk_level, patterns, key_files, etc.)
- feature AC list
- feature description

**Must return (JSON):**
```json
{
  "plan_overview": "...",
  "file_operations": [
    {"path": "...", "action": "create|modify|delete", "purpose": "..."}
  ],
  "ac_mapping": [
    {"ac": "AC1: ...", "files": ["..."], "approach": "..."}
  ],
  "estimated_complexity": "S|M|L",
  "test_plan": ["..."],
  "risks": ["..."]
}
```

**Includes internal critique loop:** architect reviews its own plan for gaps before returning.

---

## Phase 3: EXECUTE

### code-writer (sonnet) — iteration 1

**Dispatch:**
```
Task(subagent_type="code-writer", model="sonnet", prompt=...)
```

**Input:**
- Full plan from cp-02.json
- Patterns for code (from nomos.sh patterns --for-code)
- Antipatterns (from nomos.sh patterns --for-qa)
- worktree_path

**Must return (JSON):**
```json
{
  "files_changed": ["..."],
  "lines_added": 150,
  "lines_removed": 30,
  "summary": "..."
}
```

### code-writer (sonnet) — iteration 2+

**Dispatch:**
```
Task(resume=writer_agent_id, prompt="FIX_ISSUES mode. QA found: {issues}. Fix ONLY these.")
```

**Key insight:** `resume` preserves full context from iteration 1 — the writer remembers what it built.

**Input (via resume prompt):**
- QA issues from previous iteration

**Must return (JSON):** Same schema as iteration 1.

### qa-reviewer (sonnet) — stateless per iteration

**Dispatch:**
```
Task(subagent_type="qa-reviewer", model="sonnet", prompt=...)
```

**Input:**
- Plan overview + AC list (from cp-02.json)
- Files changed (from code-writer output)
- Antipatterns (from nomos.sh patterns --for-qa)

**Must return (JSON):**
```json
{
  "verdict": "PASS|FAIL",
  "issues": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "...",
      "line": 42,
      "description": "...",
      "suggestion": "..."
    }
  ],
  "blocking_count": 0
}
```

---

## Phase 4: REVIEW

### Gate A: Static (no agent — bash)

**Commands:**
```bash
cd {worktree_path} && bun run check-types && bun run check && bun run test:ci
```

No agent dispatched. Orchestrator runs directly.

### Gate B: Parallel Reviews (2 agents)

**Dispatch (both in single message):**
```
cr = Task(subagent_type="code-reviewer", model="sonnet", run_in_background=true, prompt=...)
sr = Task(subagent_type="security-reviewer", model="sonnet", run_in_background=true, prompt=...)
```

**code-reviewer input:**
- Files changed (from cp-03.json)
- worktree_path
- Candidate antipatterns (from cp-03.json)

**code-reviewer must return (JSON):**
```json
{
  "verdict": "PASS|FAIL",
  "findings": [
    {
      "id": "CR-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": "Certain|Likely|Possible",
      "category": "bug|quality|coverage|pattern",
      "file": "...",
      "line": 42,
      "description": "...",
      "suggestion": "..."
    }
  ],
  "blocking_count": 0
}
```

**security-reviewer must return (JSON):**
```json
{
  "verdict": "PASS|FAIL",
  "findings": [
    {
      "id": "SEC-001",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "confidence": "Certain|Likely|Possible",
      "category": "injection|xss|auth|secrets|config",
      "file": "...",
      "line": 42,
      "description": "...",
      "suggestion": "..."
    }
  ],
  "blocking_count": 0
}
```

### Gate C: Functional QA (conditional — skip if no UI/API ACs)

**Dispatch:**
```
Task(subagent_type="qa-functional-tester", model="sonnet", prompt=...)
```

**Input:**
- AC list
- worktree_path, server_port, web_port

**Must return (JSON):**
```json
{
  "verdict": "PASS|FAIL",
  "ac_results": [
    {"ac": "AC1", "status": "PASS|FAIL", "evidence": "..."}
  ],
  "runtime_errors": 0
}
```

### Fix Cycle (max 2 total across all gates)

**Dispatch:**
```
Task(subagent_type="code-writer", model="sonnet", prompt="Fix these issues: {issues}")
```

---

## Phase 6: LEARN

### historian (haiku, conditional)

**Dispatch:**
```
Task(subagent_type="general-purpose", model="haiku", prompt=...)
```

**Condition:** Only runs if feature reached `waiting_approval` or `verified`. Skip if `failed` or `escalated`.

**Input:**
- All checkpoint data (cp-01 through cp-05)
- Feature metrics (from nomos.sh metrics)

**Must return (JSON):**
```json
{
  "metrics_recorded": true,
  "patterns_extracted": 2,
  "antipatterns_extracted": 1,
  "code_patterns_added": 3,
  "codebase_map_updated": true,
  "insight_written": true,
  "retrospective_summary": "..."
}
```

---

## Error Handling

All agents must handle errors gracefully:

1. If an agent returns malformed JSON, the orchestrator logs the error and retries once
2. If an agent fails (Task tool error), the orchestrator marks the phase as `failed`
3. Background agents (Gate B) — if one fails, wait for the other, then handle

---

## Model Selection

| Agent | Model | Rationale |
|-------|-------|-----------|
| scout | haiku | Fast exploration, one-shot |
| architect | opus | Complex planning needs strongest model |
| code-writer | sonnet | Good balance of speed and code quality |
| qa-reviewer | sonnet | Needs to understand code deeply |
| code-reviewer | sonnet | Comprehensive review with quality + coverage |
| security-reviewer | sonnet | Security analysis needs depth |
| qa-functional-tester | sonnet | Browser/API testing |
| historian | haiku | Learning extraction is formulaic |
