# Workflow Patterns

> Automation patterns, pipeline execution, and auto-mode orchestration for NOMOS v3.

---

## Auto-Mode Architecture

### Core Loop

```typescript
// apps/server/src/services/auto-mode-service.ts
class AutoModeService {
  private loopStatus = new Map<string, boolean>();
  private runningFeatures = new Map<string, AbortController>();
  private failureTracker = new FailureTracker();

  async runAutoLoop(projectPath: string, workingDir: string): Promise<void> {
    this.loopStatus.set(projectPath, true);
    this.emit('auto_mode_started', { projectPath });

    while (this.loopStatus.get(projectPath)) {
      try {
        // 1. Check for pending features
        const features = await this.featureService.list({
          status: ['backlog', 'in_progress'],
          locked: false,
        });

        if (features.length === 0) {
          this.emit('auto_mode_idle', { projectPath });
          await Bun.sleep(5000);
          continue;
        }

        // 2. Check concurrency limits
        const maxConcurrency = await this.getMaxConcurrency(workingDir);
        if (this.runningFeatures.size >= maxConcurrency) {
          await Bun.sleep(5000);
          continue;
        }

        // 3. Select and lock feature atomically
        const feature = await this.atomicSelectFeature(projectPath);
        if (!feature) {
          await Bun.sleep(5000);
          continue;
        }

        // 4. Execute feature
        await this.executeFeature(feature, projectPath, workingDir);

      } catch (error) {
        this.handleLoopError(projectPath, error);
      }
    }

    this.emit('auto_mode_stopped', { projectPath });
  }

  async executeFeature(
    feature: Feature,
    projectPath: string,
    workingDir: string
  ): Promise<void> {
    const abortController = new AbortController();
    this.runningFeatures.set(feature.id, abortController);

    try {
      this.emit('auto_mode_feature_start', { featureId: feature.id, projectPath });

      // Update status to in_progress
      await this.featureService.updateStatus(feature.id, 'in_progress');

      // Create/locate worktree
      const worktreePath = feature.useWorktree
        ? await this.worktreeService.getOrCreate(projectPath, feature.branch!)
        : workingDir;

      // Load context
      const context = await this.contextService.loadContext(projectPath, feature);

      // Planning phase (if enabled)
      if (feature.planningMode !== 'skip') {
        await this.runPlanningPhase(feature, worktreePath, context);
      }

      // Implementation phase
      await this.agentService.sendMessage(
        feature.id,
        this.buildPrompt(feature, context),
        { workingDirectory: worktreePath }
      );

      // Pipeline execution
      await this.runPipeline(feature, worktreePath);

      // Update status
      await this.featureService.updateStatus(feature.id, 'waiting_approval');

      // Reset failure counter on success
      this.failureTracker.reset(projectPath);

      this.emit('auto_mode_feature_complete', { featureId: feature.id, projectPath });

    } catch (error) {
      await this.handleFeatureFailure(feature.id, projectPath, error);
    } finally {
      this.runningFeatures.delete(feature.id);
      await this.featureService.unlock(feature.id);
    }
  }

  private async handleFeatureFailure(
    featureId: string,
    projectPath: string,
    error: unknown
  ): Promise<void> {
    this.failureTracker.recordFailure(projectPath);
    this.emit('auto_mode_error', { featureId, error: String(error) });

    // Pause after consecutive failures
    if (this.failureTracker.shouldPause(projectPath)) {
      this.loopStatus.set(projectPath, false);
      this.emit('auto_mode_paused_failures', {
        projectPath,
        reason: `Paused after ${this.failureTracker.threshold} consecutive failures`,
      });
    }
  }

  stop(projectPath: string): void {
    this.loopStatus.set(projectPath, false);

    // Cancel all running features for this project
    for (const [featureId, controller] of this.runningFeatures) {
      controller.abort();
    }
  }
}
```

---

## Pipeline Execution

### Pipeline Steps

```typescript
// apps/server/src/services/pipeline-service.ts
interface PipelineStep {
  name: string;
  command: string;
  blocking: boolean;
  timeout: number;
  retryOnFailure: boolean;
}

const DEFAULT_PIPELINE: PipelineStep[] = [
  {
    name: 'types',
    command: 'bun run check-types',
    blocking: true,
    timeout: 60000,
    retryOnFailure: false,
  },
  {
    name: 'lint',
    command: 'bun run check',
    blocking: true,
    timeout: 60000,
    retryOnFailure: false,
  },
  {
    name: 'tests',
    command: 'bun run test:ci',
    blocking: true,
    timeout: 300000,
    retryOnFailure: true,
  },
  {
    name: 'security',
    command: 'trivy fs --severity HIGH,CRITICAL --exit-code 1 .',
    blocking: true,
    timeout: 120000,
    retryOnFailure: false,
  },
];

class PipelineService {
  async runPipeline(
    feature: Feature,
    worktreePath: string,
    onStep: (step: PipelineStepEvent) => void
  ): Promise<PipelineResult> {
    const results: StepResult[] = [];

    for (const step of DEFAULT_PIPELINE) {
      onStep({ type: 'step_started', step: step.name });

      try {
        const result = await this.runStep(step, worktreePath, feature);
        results.push(result);

        onStep({
          type: 'step_completed',
          step: step.name,
          success: result.success,
          output: result.output,
        });

        // Stop pipeline on blocking failure
        if (!result.success && step.blocking) {
          return {
            success: false,
            failedStep: step.name,
            results,
          };
        }
      } catch (error) {
        onStep({
          type: 'step_error',
          step: step.name,
          error: String(error),
        });

        if (step.blocking) {
          return {
            success: false,
            failedStep: step.name,
            results,
            error: String(error),
          };
        }
      }
    }

    return { success: true, results };
  }

  private async runStep(
    step: PipelineStep,
    cwd: string,
    feature: Feature
  ): Promise<StepResult> {
    // Use Bun.spawn with array args (safe - no shell injection)
    const proc = Bun.spawn(['sh', '-c', step.command], {
      cwd,
      env: {
        ...process.env,
        FEATURE_ID: feature.id,
        FEATURE_TITLE: feature.title,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const timeout = setTimeout(() => {
      proc.kill();
    }, step.timeout);

    try {
      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      return {
        step: step.name,
        success: exitCode === 0,
        output: stdout + stderr,
        exitCode,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

---

## Feature State Machine

### State Transitions

```typescript
// packages/types/src/feature-state.ts
type FeatureStatus = 'backlog' | 'in_progress' | 'waiting_approval' | 'verified';

interface Transition {
  from: FeatureStatus;
  to: FeatureStatus;
  trigger: string;
  guard?: (feature: Feature) => Promise<boolean>;
}

const TRANSITIONS: Transition[] = [
  {
    from: 'backlog',
    to: 'in_progress',
    trigger: 'start',
    guard: async (f) => {
      // Check dependencies are verified
      const deps = await featureService.getDependencies(f.id);
      return deps.every(d => d.status === 'verified');
    },
  },
  {
    from: 'in_progress',
    to: 'waiting_approval',
    trigger: 'complete',
    guard: async (f) => {
      // Quality gate must pass
      const result = await pipelineService.runQualityGate(f.id);
      return result.success;
    },
  },
  {
    from: 'in_progress',
    to: 'backlog',
    trigger: 'cancel',
  },
  {
    from: 'waiting_approval',
    to: 'verified',
    trigger: 'verify',
    guard: async () => {
      // Requires human approval (checked in middleware)
      return true;
    },
  },
  {
    from: 'waiting_approval',
    to: 'in_progress',
    trigger: 'reject',
  },
  {
    from: 'waiting_approval',
    to: 'backlog',
    trigger: 'reset',
  },
  {
    from: 'verified',
    to: 'backlog',
    trigger: 'reset',
  },
];

// State machine implementation
class FeatureStateMachine {
  async transition(
    featureId: string,
    trigger: string
  ): Promise<Feature> {
    const feature = await this.featureService.getById(featureId);
    if (!feature) throw new Error('Feature not found');

    const transition = TRANSITIONS.find(
      t => t.from === feature.status && t.trigger === trigger
    );

    if (!transition) {
      throw new Error(
        `Invalid transition: ${feature.status} -> ${trigger}`
      );
    }

    // Check guard condition
    if (transition.guard) {
      const allowed = await transition.guard(feature);
      if (!allowed) {
        throw new Error(`Guard condition failed for ${trigger}`);
      }
    }

    // Execute transition
    return this.featureService.updateStatus(featureId, transition.to);
  }
}
```

---

## Context Loading

### Context Composition

```typescript
// apps/server/src/services/context-service.ts
interface ContextFile {
  path: string;
  content: string;
  type: 'claude_md' | 'memory' | 'spec' | 'custom';
}

class ContextService {
  async loadContext(
    projectPath: string,
    feature: Feature
  ): Promise<string> {
    const files: ContextFile[] = [];

    // 1. Load CLAUDE.md (project conventions)
    const claudeMd = await this.loadClaudeMd(projectPath);
    if (claudeMd) {
      files.push({ path: 'CLAUDE.md', content: claudeMd, type: 'claude_md' });
    }

    // 2. Load relevant memory files
    const memories = await this.loadRelevantMemories(projectPath, feature);
    files.push(...memories);

    // 3. Load dependency context (if ancestors have context)
    const depContext = await this.loadDependencyContext(feature.dependencies);
    files.push(...depContext);

    // 4. Load feature-specific context (images, attachments)
    const featureContext = await this.loadFeatureContext(projectPath, feature);
    files.push(...featureContext);

    // Compose final context
    return this.composeContext(files);
  }

  private composeContext(files: ContextFile[]): string {
    const sections: string[] = [];

    // Group by type
    const claudeMd = files.filter(f => f.type === 'claude_md');
    const memories = files.filter(f => f.type === 'memory');
    const specs = files.filter(f => f.type === 'spec');
    const custom = files.filter(f => f.type === 'custom');

    if (claudeMd.length > 0) {
      sections.push('## Project Conventions\n\n' + claudeMd[0].content);
    }

    if (memories.length > 0) {
      sections.push('## Relevant Memory\n\n' + memories.map(m => m.content).join('\n\n---\n\n'));
    }

    if (specs.length > 0) {
      sections.push('## Related Specifications\n\n' + specs.map(s => s.content).join('\n\n'));
    }

    if (custom.length > 0) {
      sections.push('## Additional Context\n\n' + custom.map(c => c.content).join('\n\n'));
    }

    return sections.join('\n\n---\n\n');
  }
}
```

---

## Planning Modes

### Planning Phase Implementation

| Mode | Description | Approval Required |
|------|-------------|-------------------|
| `skip` | No planning, direct execution | No |
| `lite` | Brief outline (3-7 tasks) | No |
| `spec` | Detailed XML specification | No |
| `full` | Full spec with human approval | Yes |

```typescript
// Planning mode selection
switch (feature.planningMode) {
  case 'skip':
    // Direct to implementation
    break;

  case 'lite':
    // Quick outline, auto-continue
    await runLitePlanning(feature, context);
    break;

  case 'spec':
    // Detailed XML spec
    await runSpecPlanning(feature, context);
    break;

  case 'full':
    // Spec + pause for approval
    const plan = await runSpecPlanning(feature, context);
    await waitForHumanApproval(feature.id, plan);
    break;
}
```

---

## Event System

### Event Types

```typescript
type AutoModeEvent =
  | { type: 'auto_mode_started'; projectPath: string }
  | { type: 'auto_mode_stopped'; projectPath: string }
  | { type: 'auto_mode_idle'; projectPath: string }
  | { type: 'auto_mode_paused_failures'; projectPath: string; reason: string }
  | { type: 'auto_mode_feature_start'; featureId: string; projectPath: string }
  | { type: 'auto_mode_feature_complete'; featureId: string; projectPath: string }
  | { type: 'auto_mode_error'; featureId: string; error: string };

type PipelineEvent =
  | { type: 'pipeline_started'; featureId: string }
  | { type: 'pipeline_step_started'; featureId: string; step: string }
  | { type: 'pipeline_step_completed'; featureId: string; step: string; success: boolean }
  | { type: 'pipeline_step_error'; featureId: string; step: string; error: string }
  | { type: 'pipeline_completed'; featureId: string; success: boolean };

type FeatureEvent =
  | { type: 'feature_created'; feature: Feature }
  | { type: 'feature_updated'; feature: Feature }
  | { type: 'feature_status_changed'; featureId: string; from: string; to: string }
  | { type: 'feature_locked'; featureId: string; lockedBy: string }
  | { type: 'feature_unlocked'; featureId: string };
```

---

## Resume & Recovery

### Checkpoint System

```typescript
interface Checkpoint {
  featureId: string;
  step: string;
  data: unknown;
  createdAt: string;
}

// Save checkpoint after each step
await checkpointService.save(featureId, 'implementation', {
  lastFile: 'src/auth.ts',
  progress: 0.7,
});

// Resume from checkpoint on restart
const checkpoint = await checkpointService.load(featureId);
if (checkpoint) {
  await resumeFromStep(checkpoint.step, checkpoint.data);
}
```

---

## Failure Handling

### Consecutive Failure Detection

```typescript
class FailureTracker {
  private failures = new Map<string, number[]>();
  private windowMs = 60000; // 60 second window
  public threshold = 3;

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

---

*Reference: Workflow patterns for NOMOS v3 inspired by Automaker v0.13.0+*
