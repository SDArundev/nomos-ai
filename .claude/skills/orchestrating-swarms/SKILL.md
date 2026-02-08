---
name: orchestrating-swarms
description: >
  Master multi-agent orchestration using Claude Code's TeammateTool and Task system.
  Use when coordinating multiple agents, running parallel code reviews, creating pipeline
  workflows with dependencies, building self-organizing task queues, or any task benefiting
  from divide-and-conquer patterns.
  Triggers: "swarm", "multi-agent", "activate swarm mode", "create a team",
  "work as a team", "parallel review", "pipeline workflow"
---

# Claude Code Swarm Orchestration

Master multi-agent orchestration using Claude Code's TeammateTool and Task system.

## Swarm Protocol

**Triggers:** "Activate Swarm Mode", "Work as a multi-agent team", "Create a team to handle this feature"

**Roles:**
- **Manager** — Plans work, splits tasks, coordinates agents. Does not write code.
- **Builder** — Implements code.
- **QA** — Writes and runs tests.
- **Docs** — Writes technical documentation and changelogs.

**Rules:**
- Use TeammateTool for agent generation and task allocation.
- Each agent should work in an independent git worktree or equivalent isolated workspace.
- Only merge code to main after tests pass.

---

## Primitives

| Primitive | What It Is |
|-----------|-----------|
| **Agent** | A Claude instance that can use tools. You are an agent. Subagents are agents you spawn. |
| **Team** | A named group of agents working together. One leader, multiple teammates. |
| **Teammate** | An agent that joined a team. Has a name, color, inbox. Spawned via Task with `team_name` + `name`. |
| **Leader** | The agent that created the team. Receives teammate messages, approves plans/shutdowns. |
| **Task** | A work item with subject, description, status, owner, and dependencies. |
| **Inbox** | JSON file where an agent receives messages from teammates. |
| **Message** | A JSON object sent between agents (text or structured). |
| **Backend** | How teammates run: `in-process`, `tmux`, or `iterm2`. Auto-detected. |

### File Locations

```
~/.claude/teams/{team-name}/
├── config.json              # Team metadata and member list
└── inboxes/
    ├── team-lead.json       # Leader's inbox
    └── worker-1.json        # Worker inbox

~/.claude/tasks/{team-name}/
├── 1.json                   # Task #1
└── 2.json                   # Task #2
```

### Lifecycle

```
1. Create Team → 2. Create Tasks → 3. Spawn Teammates → 4. Work → 5. Coordinate → 6. Shutdown → 7. Cleanup
```

---

## Two Ways to Spawn Agents

### Method 1: Task Tool (Subagents) — short-lived, focused work

```javascript
Task({
  subagent_type: "Explore",
  description: "Find auth files",
  prompt: "Find all authentication-related files",
  model: "haiku"
})
```

### Method 2: Task + team_name + name (Teammates) — persistent, coordinated

```javascript
// First create a team
Teammate({ operation: "spawnTeam", team_name: "my-project" })

// Then spawn a teammate
Task({
  team_name: "my-project",
  name: "security-reviewer",
  subagent_type: "general-purpose",
  prompt: "Review auth code for vulnerabilities. Send findings to team-lead via Teammate write.",
  run_in_background: true
})
```

| Aspect | Task (subagent) | Task + team_name + name (teammate) |
|--------|-----------------|-----------------------------------|
| Lifespan | Until task complete | Until shutdown requested |
| Communication | Return value | Inbox messages |
| Task access | None | Shared task list |
| Team membership | No | Yes |
| Coordination | One-off | Ongoing |

---

## Built-in Agent Types

| Type | Tools | Best For |
|------|-------|----------|
| **Bash** | Bash only | Git operations, command execution |
| **Explore** | All read-only | Codebase exploration, file searches |
| **Plan** | All read-only | Architecture planning, implementation strategies |
| **general-purpose** | All tools (*) | Multi-step tasks, research + action |
| **claude-code-guide** | Read-only + WebFetch + WebSearch | Questions about Claude Code, Agent SDK |
| **statusline-setup** | Read, Edit only | Claude Code status line configuration |

---

## Quick Reference

### Spawn Subagent (No Team)
```javascript
Task({ subagent_type: "Explore", description: "Find files", prompt: "..." })
```

### Spawn Teammate (With Team)
```javascript
Teammate({ operation: "spawnTeam", team_name: "my-team" })
Task({ team_name: "my-team", name: "worker", subagent_type: "general-purpose", prompt: "...", run_in_background: true })
```

### Message Teammate
```javascript
Teammate({ operation: "write", target_agent_id: "worker-1", value: "..." })
```

### Create Task Pipeline
```javascript
TaskCreate({ subject: "Step 1", description: "..." })
TaskCreate({ subject: "Step 2", description: "..." })
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
```

### Shutdown Team
```javascript
Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
// Wait for approval...
Teammate({ operation: "cleanup" })
```

---

## Reference Files

Read these for detailed guidance on specific topics:

| File | When to Read |
|------|-------------|
| [teammate-operations.md](references/teammate-operations.md) | All 13 TeammateTool operations with examples |
| [task-system.md](references/task-system.md) | Task creation, dependencies, auto-unblocking |
| [orchestration-patterns.md](references/orchestration-patterns.md) | 6 patterns: parallel, pipeline, swarm, research+impl, plan approval, multi-file refactor |
| [spawn-backends.md](references/spawn-backends.md) | in-process, tmux, iterm2 — auto-detection, forcing, troubleshooting |
| [complete-workflows.md](references/complete-workflows.md) | 3 end-to-end workflows with full code |
| [message-formats.md](references/message-formats.md) | All message JSON formats (7 types) |
| [error-handling.md](references/error-handling.md) | Error table, graceful shutdown, crashed teammates, debugging |

---

## Best Practices

1. **Always cleanup** — Don't leave orphaned teams. Always call `cleanup` when done.
2. **Use meaningful names** — `security-reviewer` not `worker-1`.
3. **Write clear prompts** — Tell workers exactly what to do, step by step.
4. **Use task dependencies** — Let the system manage unblocking instead of manual polling.
5. **Check inboxes** — Workers send results to your inbox.
6. **Handle failures** — Workers have 5-minute heartbeat timeout. Tasks of crashed workers can be reclaimed.
7. **Prefer `write` over `broadcast`** — `broadcast` sends N messages for N teammates.
8. **Match agent type to task** — Explore for searching, Plan for design, general-purpose for implementation.

---

*Based on Claude Code v2.1.19 — Tested and verified 2026-01-25*
