# Phase 1: ASSEMBLE

Create the agent team, spawn teammates, and assign initial tasks.

**Input:** `session_config` from Phase 0 (session.json contents)

---

## 1. Create Team

```
TeamCreate(team_name="{session_config.team_name}")
```

This creates the shared task list and team config.

---

## 2. Spawn Agents by Mode

Use the `Task` tool with `team_name` and `name` parameters. Each agent gets a role-specific prompt from `references/agent-prompts.md`.

<critical>
Agent `subagent_type` values MUST use existing registered types — NOT custom agent file names.
The role differentiation comes from the **prompt**, not the subagent_type.

Read `references/agent-prompts.md` to get the full prompt template for each role.
Read `references/team-compositions.md` for the exact spawn configuration per mode.
</critical>

### Audit Mode (3 agents, or 2 if `-q`)

```
Task(
  team_name="{team_name}",
  name="explorer",
  subagent_type="explore-codebase",
  model="haiku",
  prompt="{explorer_prompt from agent-prompts.md}"
)

Task(
  team_name="{team_name}",
  name="skeptic",
  subagent_type="general-purpose",
  model="sonnet",
  prompt="{skeptic_prompt from agent-prompts.md}"
)

# Skip if -q (quick mode)
Task(
  team_name="{team_name}",
  name="tester",
  subagent_type="qa-smoke-tester",
  model="sonnet",
  prompt="{tester_prompt from agent-prompts.md}"
)
```

### Research Mode (2 agents)

```
Task(
  team_name="{team_name}",
  name="researcher",
  subagent_type="general-purpose",
  model="sonnet",
  prompt="{researcher_prompt from agent-prompts.md}"
)

Task(
  team_name="{team_name}",
  name="librarian",
  subagent_type="explore-codebase",
  model="haiku",
  prompt="{librarian_prompt from agent-prompts.md}"
)
```

### Discuss Mode (3 agents)

```
Task(
  team_name="{team_name}",
  name="advocate",
  subagent_type="general-purpose",
  model="sonnet",
  prompt="{advocate_prompt from agent-prompts.md}"
)

Task(
  team_name="{team_name}",
  name="critic",
  subagent_type="general-purpose",
  model="sonnet",
  prompt="{critic_prompt from agent-prompts.md}"
)

Task(
  team_name="{team_name}",
  name="pragmatist",
  subagent_type="explore-codebase",
  model="haiku",
  prompt="{pragmatist_prompt from agent-prompts.md}"
)
```

### Learn Mode (2 agents)

```
Task(
  team_name="{team_name}",
  name="auditor",
  subagent_type="explore-codebase",
  model="haiku",
  prompt="{auditor_prompt from agent-prompts.md}"
)

Task(
  team_name="{team_name}",
  name="analyst",
  subagent_type="general-purpose",
  model="sonnet",
  prompt="{analyst_prompt from agent-prompts.md}"
)
```

---

## 3. Create Initial Tasks

Use `TaskCreate` to populate the shared task list based on mode.

### Audit Mode

Create one task per batch of features:

```
For each batch (batch_size features from scope):
  TaskCreate(
    subject="Audit batch {N}: {F0XX}-{F0YY}",
    description="Explore implementation of features {list}. For each feature, check every AC against actual code. Report findings with evidence.",
    activeForm="Auditing batch {N}"
  )
```

Then assign the first batch:
```
TaskUpdate(taskId="1", owner="explorer")
```

### Research Mode

Create research questions as tasks:

```
TaskCreate(subject="Map existing patterns for {feature}", ...)
TaskCreate(subject="Research external library docs", ...)
TaskCreate(subject="Identify reusable components", ...)
TaskCreate(subject="Analyze dependency chain", ...)
```

Assign: researcher gets codebase tasks, librarian gets docs tasks.

### Discuss Mode

Create round-based tasks:

```
TaskCreate(subject="Round 1: Opening arguments", ...)
TaskCreate(subject="Round 2: Counterarguments", ...)
TaskCreate(subject="Feasibility assessment", ...)
```

Assign: advocate + critic get Round 1 in parallel, pragmatist gets feasibility.

### Learn Mode

```
TaskCreate(subject="Audit all learning files", ...)
TaskCreate(subject="Cross-reference learning vs codebase", ...)
```

Assign: auditor gets file audit, analyst waits for auditor's findings.

---

## 4. Update Session

Update `session.json` with team info:

```json
{
  "status": "assembled",
  "team": {
    "agents": ["explorer", "skeptic", "tester"],
    "task_count": 5
  }
}
```

---

## 5. Continue

**IMMEDIATELY load:** `steps/phase-02-execute.md`

Pass `session_config` (updated) forward.
