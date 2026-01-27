# Workflow Patterns

> Automation and pipeline patterns for autonomous AI development systems.

---

## Core Workflow

### Feature Lifecycle

```
BACKLOG → IN_PROGRESS → WAITING_APPROVAL → VERIFIED
    │          │               │              │
    │          │               │              └── Feature completed
    │          │               └── Needs human review
    │          └── Agent working on feature
    └── Not started, in queue
```

### Auto-Mode Loop

```typescript
async function autoModeLoop(projectPath: string): Promise<void> {
  emitEvent('auto_mode_started', { projectPath });

  while (isAutoModeEnabled(projectPath)) {
    // 1. Check concurrency
    const running = getRunningFeatureCount(projectPath);
    const maxConcurrency = getMaxConcurrency(projectPath);

    if (running >= maxConcurrency) {
      await sleep(5000);
      continue;
    }

    // 2. Select next feature
    const feature = await selectNextFeature(projectPath);
    if (!feature) {
      emitEvent('auto_mode_idle', { projectPath });
      await sleep(5000);
      continue;
    }

    // 3. Start feature (don't await - parallel)
    startFeature(feature, projectPath).catch(error => {
      handleFeatureError(feature.id, error);
    });
  }

  emitEvent('auto_mode_stopped', { projectPath });
}
```

---

## Feature Pipeline

### Pipeline Steps

```
CONTEXT → PLANNING → IMPLEMENT → TEST → REVIEW → COMMIT → COMPLETE
```

### Pipeline Implementation

```typescript
interface PipelineStep {
  name: string;
  prompt: string;
  condition?: (context: PipelineContext) => boolean;
  onError?: 'continue' | 'stop' | 'retry';
}

const defaultPipeline: PipelineStep[] = [
  { name: 'implementation', prompt: implementationPrompt },
  { name: 'testing', prompt: testingPrompt, onError: 'continue' },
  { name: 'review', prompt: reviewPrompt, onError: 'continue' },
  { name: 'commit', prompt: commitPrompt },
];

async function runPipeline(
  feature: Feature,
  context: PipelineContext
): Promise<PipelineResult> {
  const results: StepResult[] = [];

  for (const step of defaultPipeline) {
    if (step.condition && !step.condition(context)) continue;

    emitEvent('pipeline_step_started', { featureId: feature.id, step: step.name });

    try {
      const result = await runStep(step, feature, context);
      results.push({ step: step.name, success: true, output: result });
      emitEvent('pipeline_step_complete', { featureId: feature.id, step: step.name });
    } catch (error) {
      if (step.onError === 'stop') throw error;
      results.push({ step: step.name, success: false, error: error.message });
    }
  }

  return { feature: feature.id, steps: results };
}
```

---

## Context Loading

### Context Sources

```
┌─────────────────────────────────────────────────────────┐
│                    CONTEXT SOURCES                       │
├─────────────────────────────────────────────────────────┤
│  1. CLAUDE.md (project)    - Project conventions         │
│  2. CLAUDE.md (global)     - User preferences            │
│  3. CODE_QUALITY.md        - Quality standards           │
│  4. Memory files           - Task-relevant knowledge     │
│  5. Feature description    - What to implement           │
│  6. Dependencies context   - Ancestor features           │
└─────────────────────────────────────────────────────────┘
```

### Context Loading

```typescript
async function loadContext(
  projectPath: string,
  feature: Feature
): Promise<ContextResult> {
  const files: ContextFile[] = [];

  // Load CLAUDE.md files
  const claudeMdPaths = [
    path.join(projectPath, 'CLAUDE.md'),
    path.join(os.homedir(), '.claude', 'CLAUDE.md'),
  ];

  for (const p of claudeMdPaths) {
    if (await fileExists(p)) {
      files.push(await loadContextFile(p, 'claude_md'));
    }
  }

  // Load CODE_QUALITY.md
  const codeQualityPath = path.join(projectPath, 'CODE_QUALITY.md');
  if (await fileExists(codeQualityPath)) {
    files.push(await loadContextFile(codeQualityPath, 'code_quality'));
  }

  // Load task-relevant memories
  const memories = await findRelevantMemories(projectPath, {
    title: feature.title,
    description: feature.description,
  });
  files.push(...memories);

  const systemPrompt = files.map(f => f.content).join('\n\n---\n\n');

  return { systemPrompt, files, totalTokens: estimateTokens(systemPrompt) };
}
```

---

## Planning Workflow

### Planning Modes

| Mode | Output | Use Case |
|------|--------|----------|
| skip | None | Pipeline steps, simple tasks |
| lite | Quick outline | Fast implementation |
| spec | XML specification | Task breakdown |
| full | Full SDD | Complex features |

### Planning Flow

```typescript
async function executePlanning(
  feature: Feature,
  context: ContextResult,
  settings: Settings
): Promise<PlanResult> {
  if (feature.planningMode === 'skip') {
    return { content: '', tasks: [], approved: true };
  }

  // Generate plan
  const planPrompt = getPlanningPrompt(feature.planningMode);
  const planContent = await runAgent(planPrompt, { feature, context });

  // Parse tasks
  const tasks = parseTasks(planContent, feature.planningMode);

  // Handle approval if required
  if (settings.requirePlanApproval) {
    emitEvent('planning_approval_required', {
      featureId: feature.id,
      plan: planContent,
      tasks,
    });

    const approval = await waitForApproval(feature.id);
    if (!approval.approved) {
      throw new PlanRejectedError(approval.reason);
    }
  }

  return { content: planContent, tasks, approved: true };
}
```

---

## Git Workflow

### Worktree Management

```typescript
async function prepareWorktree(
  projectPath: string,
  feature: Feature
): Promise<string> {
  if (!feature.useWorktree) {
    return projectPath;
  }

  const branchName = feature.branch || `feature/${feature.id}`;
  const sanitizedBranch = sanitizeBranchName(branchName);
  const worktreePath = path.join(
    projectPath, '.automaker', 'worktrees', sanitizedBranch
  );

  // Check if worktree exists
  if (await fileExists(worktreePath)) {
    const isValid = await verifyWorktree(worktreePath);
    if (isValid) return worktreePath;
    await cleanupWorktree(projectPath, sanitizedBranch);
  }

  // Create new worktree (using array-based git command)
  await gitCommand(projectPath, ['worktree', 'add', worktreePath, '-b', sanitizedBranch]);

  // Store metadata
  await saveWorktreeMetadata(projectPath, sanitizedBranch, {
    branchName: sanitizedBranch,
    createdAt: Date.now(),
  });

  return worktreePath;
}
```

### Commit Flow

```typescript
async function commitChanges(
  worktreePath: string,
  feature: Feature,
  settings: Settings
): Promise<CommitResult | null> {
  const status = await getGitStatus(worktreePath);
  if (!status.hasChanges) return null;

  // Stage changes
  await gitCommand(worktreePath, ['add', '-A']);

  // Generate message
  let message: string;
  if (settings.aiCommitMessages) {
    message = await generateCommitMessage(worktreePath, feature);
  } else {
    message = `feat: ${feature.title}`;
  }

  // Commit
  await gitCommand(worktreePath, ['commit', '-m', message]);

  return { hash: await getLatestCommitHash(worktreePath), message };
}
```

---

## Error Recovery

### Checkpoint System

```typescript
interface Checkpoint {
  featureId: string;
  step: string;
  timestamp: number;
  context: Record<string, unknown>;
}

async function saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
  const checkpointPath = path.join(
    '.automaker', 'checkpoints', `${checkpoint.featureId}.json`
  );
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

async function resumeFromCheckpoint(featureId: string): Promise<void> {
  const checkpoint = await loadCheckpoint(featureId);
  if (!checkpoint) throw new Error('No checkpoint found');

  const pipeline = getPipeline();
  const stepIndex = pipeline.findIndex(s => s.name === checkpoint.step);

  await runPipeline(
    await loadFeature(featureId),
    { ...checkpoint.context, resumeFromStep: stepIndex }
  );
}
```

### Failure Classification

```typescript
type ErrorCategory =
  | 'retryable'    // Network, timeout - retry with backoff
  | 'rate_limit'   // API limits - backoff and retry
  | 'auth'         // Auth failure - pause auto-mode
  | 'fatal';       // Unrecoverable - stop and report

function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'auth';
  }
  if (message.includes('timeout') || message.includes('network')) {
    return 'retryable';
  }
  return 'fatal';
}
```

---

## Event Flow

### Event Timeline

```
auto_mode_started
      │
      ▼
auto_mode_feature_start
      │
      ▼
pipeline_step_started (planning)
      │
      ▼
planning_approval_required (if needed)
      │
      ▼
pipeline_step_complete (planning)
      │
      ▼
agent:start
      ├──▶ agent:stream (multiple)
      ├──▶ agent:tool_use (multiple)
      ▼
agent:complete
      │
      ▼
pipeline_step_started (testing)
      │
      ▼
pipeline_step_complete (testing)
      │
      ▼
auto_mode_feature_complete
      │
      ▼
auto_mode_stopped
```

---

## Best Practices

### 1. Atomic Operations
- Each pipeline step is atomic
- Checkpoints after each step
- Clear rollback points

### 2. Idempotency
- Steps can be re-run safely
- Check state before action
- Handle partial completion

### 3. Observability
- Emit events at each transition
- Log all decisions
- Track timing metrics

### 4. Graceful Degradation
- Continue on non-critical errors
- Provide partial results
- Clear error reporting

### 5. Resource Cleanup
- Clean up worktrees on completion
- Release locks promptly
- Remove temporary files

---

*Reference: Workflow patterns from Automaker v0.13.0+*
