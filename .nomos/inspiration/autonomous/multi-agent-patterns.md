# Multi-Agent Patterns

> Coordination patterns for parallel and sequential multi-agent execution.

---

## Agent Coordination Models

### 1. Sequential Pipeline

```
Feature → Plan Agent → Implement Agent → Test Agent → Review Agent → Done
```

Single agent executes multiple phases with different prompts:

```typescript
async function executeSequentialPipeline(feature: Feature): Promise<void> {
  const phases = [
    { name: 'planning', prompt: planningPrompt },
    { name: 'implementation', prompt: implementationPrompt },
    { name: 'testing', prompt: testingPrompt },
    { name: 'review', prompt: reviewPrompt },
  ];

  let context = { feature };

  for (const phase of phases) {
    const result = await runAgent(phase.prompt, context);
    context = { ...context, [`${phase.name}Output`]: result };
  }
}
```

### 2. Parallel Feature Execution

```
┌─ Feature A ─→ Agent 1 ─→ Done
│
┼─ Feature B ─→ Agent 2 ─→ Done
│
└─ Feature C ─→ Agent 3 ─→ Done
```

Multiple agents work on independent features simultaneously:

```typescript
interface ConcurrencyConfig {
  maxConcurrent: number;
  perWorktree?: Record<string, number>;
}

class ParallelExecutor {
  private running = new Map<string, AbortController>();
  private config: ConcurrencyConfig;

  async executeFeatures(features: Feature[]): Promise<void> {
    const queue = [...features];

    while (queue.length > 0 || this.running.size > 0) {
      // Start new agents up to concurrency limit
      while (queue.length > 0 && this.running.size < this.config.maxConcurrent) {
        const feature = queue.shift()!;
        this.startFeature(feature);
      }

      // Wait for any to complete
      await this.waitForSlot();
    }
  }
}
```

### 3. Spec Mode Multi-Agent

```
Feature → Spec Agent → Parse Tasks → Task Agent 1 ─┬→ Merge → Done
                                  → Task Agent 2 ─┤
                                  → Task Agent 3 ─┘
```

Spec agent breaks down work, then spawns dedicated agents per task:

```typescript
async function executeSpecMode(feature: Feature): Promise<void> {
  // Phase 1: Generate spec
  const spec = await runAgent(specPrompt, { feature });

  // Phase 2: Parse tasks from spec
  const tasks = parseTasksFromSpec(spec);

  // Phase 3: Execute tasks (potentially parallel)
  const results = await Promise.all(
    tasks.map(task => runTaskAgent(task, feature))
  );

  // Phase 4: Merge results
  await mergeTaskResults(feature, results);
}

function parseTasksFromSpec(spec: string): Task[] {
  const taskRegex = /<task id="(T\d+)" file="([^"]+)"[^>]*>([^<]+)<\/task>/g;
  const tasks: Task[] = [];

  let match;
  while ((match = taskRegex.exec(spec)) !== null) {
    tasks.push({
      id: match[1],
      file: match[2],
      description: match[3].trim(),
    });
  }

  return tasks;
}
```

### 4. Agent-to-Agent Delegation (Task Tool)

```
Main Agent ─→ calls Task tool ─→ Subagent ─→ returns result ─→ Main Agent continues
```

Agents can spawn subagents for specialized work:

```typescript
interface SubagentDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  maxTurns: number;
}

async function executeTaskTool(
  task: TaskToolInput,
  parentContext: AgentContext
): Promise<TaskToolResult> {
  const subagent = findSubagent(task.agentName);

  const result = await runAgent(task.prompt, {
    systemPrompt: subagent.systemPrompt,
    allowedTools: subagent.allowedTools,
    maxTurns: subagent.maxTurns,
    parentContext,
  });

  return { success: true, output: result };
}
```

---

## Concurrency Control

### Per-Worktree Limits

```typescript
interface WorktreeConfig {
  maxConcurrency: number;
  branchPattern?: string;
}

const defaultConfig: Record<string, WorktreeConfig> = {
  'main': { maxConcurrency: 1 },      // Only 1 agent on main
  'develop': { maxConcurrency: 2 },   // Up to 2 on develop
  'feature/*': { maxConcurrency: 3 }, // 3 per feature branch
};

function getMaxConcurrency(worktree: string): number {
  // Exact match first
  if (defaultConfig[worktree]) {
    return defaultConfig[worktree].maxConcurrency;
  }

  // Pattern match
  for (const [pattern, config] of Object.entries(defaultConfig)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(worktree)) {
        return config.maxConcurrency;
      }
    }
  }

  return 1; // Default
}
```

### Atomic Feature Selection

```typescript
// Prevent race conditions with file locking
async function atomicSelectFeature(
  projectPath: string
): Promise<Feature | null> {
  const lockFile = path.join(projectPath, '.automaker', '.feature-lock');

  // Acquire lock
  const lock = await acquireLock(lockFile, { timeout: 5000 });

  try {
    // Read current state
    const features = await loadFeatures(projectPath);
    const pending = features.filter(f =>
      f.status === 'backlog' &&
      !f.locked
    );

    if (pending.length === 0) {
      return null;
    }

    // Select and lock feature
    const selected = pending[0];
    selected.locked = true;
    selected.lockedAt = Date.now();
    await saveFeature(projectPath, selected);

    return selected;
  } finally {
    // Release lock
    await releaseLock(lock);
  }
}
```

### Dynamic Port Allocation

```typescript
interface PortAllocation {
  server: number;
  web: number;
}

const PORT_BASE = {
  primary: { server: 3008, web: 3001 },
  parallel: { server: 3018, web: 3011 },
};

async function allocatePorts(featureId: string): Promise<PortAllocation> {
  // Hash feature ID to get consistent offset
  const hash = crypto.createHash('md5').update(featureId).digest();
  const offset = hash.readUInt8(0) % 100;

  const ports = {
    server: PORT_BASE.parallel.server + offset,
    web: PORT_BASE.parallel.web + offset,
  };

  // Verify ports available
  for (const port of Object.values(ports)) {
    if (!(await isPortAvailable(port))) {
      const available = await findAvailablePort(port, 100);
      if (port === ports.server) ports.server = available;
      else ports.web = available;
    }
  }

  return ports;
}
```

---

## Failure Handling

### Consecutive Failure Detection

```typescript
class FailureTracker {
  private failures: Map<string, number[]> = new Map();
  private windowMs = 60000; // 60 second window
  private threshold = 3;

  recordFailure(projectPath: string): void {
    const now = Date.now();
    const failures = this.failures.get(projectPath) || [];
    const recent = failures.filter(t => now - t < this.windowMs);
    recent.push(now);
    this.failures.set(projectPath, recent);
  }

  shouldPause(projectPath: string): boolean {
    const failures = this.failures.get(projectPath) || [];
    const now = Date.now();
    const recent = failures.filter(t => now - t < this.windowMs);
    return recent.length >= this.threshold;
  }

  reset(projectPath: string): void {
    this.failures.delete(projectPath);
  }
}
```

### Pipeline Resume

```typescript
interface PipelineState {
  featureId: string;
  currentStep: number;
  completedSteps: string[];
  checkpoints: Record<string, unknown>;
}

async function resumePipeline(state: PipelineState): Promise<void> {
  const pipeline = getPipeline();
  const remainingSteps = pipeline.slice(state.currentStep);

  for (const [index, step] of remainingSteps.entries()) {
    try {
      const context = state.checkpoints[step.name] || {};
      const result = await runStep(step, context);

      state.completedSteps.push(step.name);
      state.currentStep = state.currentStep + index + 1;
      state.checkpoints[step.name] = result;
      await savePipelineState(state);

    } catch (error) {
      await savePipelineState(state);
      throw error;
    }
  }
}
```

---

## Event Coordination

### Event Types

```typescript
type AgentEvent =
  | { type: 'agent:start'; sessionId: string; featureId?: string }
  | { type: 'agent:stream'; sessionId: string; content: string }
  | { type: 'agent:tool_use'; sessionId: string; tool: string; input: unknown }
  | { type: 'agent:complete'; sessionId: string; output: string }
  | { type: 'agent:error'; sessionId: string; error: string };

type AutoModeEvent =
  | { type: 'auto_mode_started'; projectPath: string; branchName: string }
  | { type: 'auto_mode_feature_start'; featureId: string; projectPath: string }
  | { type: 'auto_mode_feature_complete'; featureId: string; projectPath: string }
  | { type: 'auto_mode_paused_failures'; projectPath: string; reason: string }
  | { type: 'auto_mode_stopped'; projectPath: string };
```

### Event Broadcasting

```typescript
class EventCoordinator {
  private subscribers = new Map<string, Set<(event: unknown) => void>>();

  subscribe(
    eventType: string,
    callback: (event: unknown) => void
  ): () => void {
    const subscribers = this.subscribers.get(eventType) || new Set();
    subscribers.add(callback);
    this.subscribers.set(eventType, subscribers);

    return () => subscribers.delete(callback);
  }

  emit(eventType: string, payload: unknown): void {
    const event = { type: eventType, ...payload, timestamp: Date.now() };

    // Type-specific subscribers
    const typeSubscribers = this.subscribers.get(eventType) || new Set();
    for (const callback of typeSubscribers) {
      callback(event);
    }

    // Wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*') || new Set();
    for (const callback of wildcardSubscribers) {
      callback(event);
    }
  }
}
```

---

## Coordination Patterns Summary

| Pattern | Use Case | Agents | Coordination |
|---------|----------|--------|--------------|
| Sequential Pipeline | Single feature, multiple phases | 1 | Phases pass context |
| Parallel Features | Multiple independent features | N | Concurrency limits |
| Spec Mode | Complex features with subtasks | 1 + N | Spec parses to tasks |
| Task Delegation | Specialized subagent work | 1 + subagents | Task tool invocation |
| Agent Pool | High-volume processing | Pool | Resource management |

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
- Use agent pools for efficiency
- Monitor memory usage

### 4. Communication
- Use events for status updates
- Message bus for agent-to-agent
- WebSocket for real-time UI updates

---

*Reference: Multi-agent coordination patterns from Automaker v0.13.0+*
