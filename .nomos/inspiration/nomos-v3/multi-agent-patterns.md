# Multi-Agent Patterns

> Coordination patterns for parallel and sequential multi-agent execution in NOMOS v3.

---

## Agent Coordination Models

### 1. Sequential Pipeline

```
Feature -> Plan Agent -> Implement Agent -> Test Agent -> Review Agent -> Done
```

Single agent executes multiple phases with different prompts.

### 2. Parallel Feature Execution

```
+-- Feature A --> Agent 1 --> Done
|
+-- Feature B --> Agent 2 --> Done
|
+-- Feature C --> Agent 3 --> Done
```

Multiple agents work on independent features simultaneously.

### 3. Spec Mode Multi-Agent

```
Feature -> Spec Agent -> Parse Tasks -> Task Agent 1 -+-> Merge -> Done
                                    -> Task Agent 2 -|
                                    -> Task Agent 3 -+
```

Spec agent breaks down work, then spawns dedicated agents per task.

---

## Concurrency Control

### Per-Worktree Limits

| Worktree | Max Concurrency |
|----------|-----------------|
| main | 1 |
| develop | 2 |
| feature/* | 3 |

### Atomic Feature Selection

Use file locking (`flock`) to prevent race conditions when multiple agents try to claim the same feature.

### Dynamic Port Allocation

| Mode | Server | Web |
|------|--------|-----|
| Primary (first agent) | 3008 | 3001 |
| Parallel (F001) | 3018 | 3011 |
| Parallel (F002) | 3028 | 3021 |

---

## Failure Handling

### Consecutive Failure Detection

- Track failures within a 60-second window
- Pause auto-mode after 3 consecutive failures
- Reset counter on success

### Pipeline Resume

- Save checkpoint after each step
- Resume from last successful step on restart
- Clear checkpoint on successful completion

---

## Event Coordination

### Event Types

| Event | Description |
|-------|-------------|
| `agent:start` | Agent session started |
| `agent:stream` | Text output chunk |
| `agent:tool_use` | Tool invocation |
| `agent:complete` | Session finished |
| `agent:error` | Error occurred |
| `auto_mode_started` | Auto loop began |
| `auto_mode_feature_start` | Feature execution started |
| `auto_mode_feature_complete` | Feature finished |
| `auto_mode_paused_failures` | Paused due to failures |

---

## Best Practices

### 1. Isolation
- Each agent operates in isolated worktree
- No shared mutable state between agents
- Clean context per feature

### 2. Failure Handling
- Track consecutive failures
- Implement backoff and retry
- Save checkpoints for resume

### 3. Resource Management
- Limit concurrency per worktree
- Monitor memory usage
- Set budget limits per agent

### 4. Communication
- Use events for status updates
- WebSocket for real-time UI updates

---

## Coordination Patterns Summary

| Pattern | Use Case | Agents | Coordination |
|---------|----------|--------|--------------|
| Sequential Pipeline | Single feature, multiple phases | 1 | Phases pass context |
| Parallel Features | Multiple independent features | N | Concurrency limits |
| Spec Mode | Complex features with subtasks | 1 + N | Spec parses to tasks |

---

*Reference: Multi-agent coordination patterns for NOMOS v3*
