# Claude Agent SDK Integration

> Detailed patterns for integrating the Claude Agent SDK into NOMOS v3.

---

## SDK Overview

**Package:** `@anthropic-ai/claude-agent-sdk`
**Runtime:** Bun 1.3+

The Claude Agent SDK enables autonomous AI agents with:
- Full codebase access (read, write, execute)
- Extended thinking capabilities (up to 64K tokens)
- Tool invocation (built-in + MCP servers)
- Session continuity across restarts
- Permission bypass for autonomous operation

---

## Integration Architecture

### Provider Abstraction Layer

NOMOS wraps the SDK through a provider abstraction:

```typescript
// packages/types/src/agent.ts
import { z } from 'zod';

export const ModelSchema = z.enum([
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-haiku-3'
]);
export type Model = z.infer<typeof ModelSchema>;

export const ThinkingLevelSchema = z.enum([
  'none',
  'medium',
  'deep',
  'ultra'
]);
export type ThinkingLevel = z.infer<typeof ThinkingLevelSchema>;

export const PlanningModeSchema = z.enum([
  'skip',
  'lite',
  'spec',
  'full'
]);
export type PlanningMode = z.infer<typeof PlanningModeSchema>;

// apps/server/src/providers/base-provider.ts
export abstract class BaseProvider {
  abstract getName(): string;
  abstract executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage>;
  abstract getAvailableModels(): Promise<ModelInfo[]>;
  abstract validateConfig(): Promise<ValidationResult>;
  abstract supportsFeature(feature: string): boolean;
}

// apps/server/src/providers/claude-provider.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export class ClaudeProvider extends BaseProvider {
  async *executeQuery(options: ExecuteOptions) {
    const stream = query({
      prompt: options.promptPayload,
      options: {
        apiKey: options.apiKey,
        environment: this.sanitizeEnv(process.env),
        allowedTools: options.allowedTools,
        maxThinkingTokens: options.thinkingBudget,
        mcpServers: options.mcpServers,
        permissionMode: 'bypassPermissions', // Autonomous mode
        workingDirectory: options.workingDirectory,
      },
    });

    for await (const message of stream) {
      yield this.normalizeMessage(message);
    }
  }

  private sanitizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
    const allowed = [
      'ANTHROPIC_API_KEY',
      'HOME',
      'USER',
      'PATH',
      'SHELL',
      'TERM',
    ];
    return Object.fromEntries(
      Object.entries(env).filter(([k, v]) => allowed.includes(k) && v)
    ) as Record<string, string>;
  }
}
```

---

## SDK Options Configuration

### Options Factory Pattern

```typescript
// apps/server/src/lib/sdk-options.ts
import type { ThinkingLevel, PlanningMode } from '@nomos/types';

interface SDKOptions {
  workingDirectory: string;
  allowedTools: string[];
  maxTurns: number;
  permissionMode: 'default' | 'bypassPermissions';
  maxThinkingTokens?: number;
  systemPrompt?: string;
  mcpServers?: MCPServerConfig[];
  maxBudgetUsd?: number;
}

export const THINKING_BUDGETS: Record<ThinkingLevel, number | undefined> = {
  none: undefined,
  medium: 16000,
  deep: 32000,
  ultra: 64000,
};

// Preset configurations for different use cases
export const sdkOptionsFactory = {
  createSpecOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Glob', 'Grep'],
      maxTurns: 20,
      permissionMode: 'default',
    };
  },

  createChatOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch'],
      maxTurns: 30,
      permissionMode: 'default',
    };
  },

  createAutonomousOptions(workDir: string, thinkingLevel: ThinkingLevel): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
      maxTurns: 50,
      permissionMode: 'bypassPermissions',
      maxThinkingTokens: THINKING_BUDGETS[thinkingLevel],
      maxBudgetUsd: 5.0, // Cost control
    };
  },
};
```

### Dynamic Tool Extension

```typescript
// apps/server/src/lib/tool-builder.ts
import type { Settings, Feature } from '@nomos/types';

export function buildToolList(settings: Settings, feature: Feature): string[] {
  const baseTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'];
  const tools = [...baseTools];

  // Add Skill tool if enabled
  if (settings.enableSkills) {
    tools.push('Skill');
  }

  // Add Task tool for subagents if configured
  if (settings.enableSubagents && settings.customSubagents?.length > 0) {
    tools.push('Task');
  }

  return tools;
}
```

---

## Session Management

### V2 Session API (Multi-turn Conversations)

```typescript
// apps/server/src/services/agent-service.ts
import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  unstable_v2_prompt
} from '@anthropic-ai/claude-agent-sdk';
import { db } from '@nomos/db';
import { agentSessions } from '@nomos/db/schema';

export class AgentService {
  private activeSessions = new Map<string, AbortController>();

  async createSession(options: CreateSessionOptions): Promise<AgentSession> {
    const session = await unstable_v2_createSession({
      model: options.model || 'claude-sonnet-4',
      workingDirectory: options.workingDirectory,
      systemPrompt: options.systemPrompt,
      permissionMode: options.permissionMode || 'default',
      mcpServers: options.mcpServers,
      tools: options.allowedTools,
    });

    // Persist session to database
    const [dbSession] = await db.insert(agentSessions).values({
      id: session.id,
      projectPath: options.projectPath,
      workingDirectory: options.workingDirectory,
      model: options.model,
      sdkSessionId: session.id,
      status: 'active',
      createdAt: new Date(),
    }).returning();

    return dbSession;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const abortController = new AbortController();
    this.activeSessions.set(sessionId, abortController);

    try {
      // Resume or create SDK session
      const sdkSession = session.sdkSessionId
        ? await unstable_v2_resumeSession(session.sdkSessionId, { model: session.model })
        : await unstable_v2_createSession({ model: session.model, workingDirectory: session.workingDirectory });

      const response = unstable_v2_prompt(sdkSession, {
        prompt: message,
        signal: abortController.signal,
      });

      for await (const chunk of response) {
        onEvent(this.normalizeEvent(chunk, sessionId));
      }
    } finally {
      this.activeSessions.delete(sessionId);
      await this.updateSessionStatus(sessionId, 'idle');
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const controller = this.activeSessions.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeSessions.delete(sessionId);
    }
  }

  private normalizeEvent(chunk: unknown, sessionId: string): AgentEvent {
    // Convert SDK message types to NOMOS events
    const message = chunk as Record<string, unknown>;

    switch (message.type) {
      case 'assistant':
        return { type: 'text', sessionId, content: String(message.content) };
      case 'tool_call':
        return { type: 'tool_call', sessionId, tool: String(message.tool_name), input: message.input };
      case 'tool_result':
        return { type: 'tool_result', sessionId, tool: String(message.tool_name), result: message.result };
      case 'error':
        return { type: 'error', sessionId, error: String(message.error) };
      default:
        return { type: 'system', sessionId, data: message };
    }
  }
}
```

---

## Custom Tools with MCP

### Define Custom MCP Tools

```typescript
// apps/server/src/tools/nomos-tools.ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { featureService } from '../services/feature-service';
import { worktreeService } from '../services/worktree-service';

export const nomosTools = createSdkMcpServer({
  name: 'nomos-services',
  version: '1.0.0',
  tools: [
    tool(
      'update_feature_status',
      'Update the status of a feature in the NOMOS backlog',
      {
        featureId: z.string().describe('Feature ID (e.g., F001)'),
        status: z.enum(['backlog', 'in_progress', 'waiting_approval', 'verified']),
        notes: z.string().optional().describe('Optional notes about the status change'),
      },
      async (args) => {
        const result = await featureService.updateStatus(args.featureId, args.status, args.notes);
        return {
          content: [{
            type: 'text',
            text: `Feature ${args.featureId} status updated to ${args.status}`,
          }],
        };
      }
    ),

    tool(
      'get_feature_context',
      'Get the full context for a feature including dependencies and requirements',
      {
        featureId: z.string().describe('Feature ID'),
      },
      async (args) => {
        const context = await featureService.getFullContext(args.featureId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(context, null, 2),
          }],
        };
      }
    ),

    tool(
      'create_worktree',
      'Create a git worktree for isolated feature development',
      {
        branchName: z.string().describe('Branch name for the worktree'),
        baseBranch: z.string().default('main').describe('Base branch to create from'),
      },
      async (args) => {
        const worktree = await worktreeService.create(args.branchName, args.baseBranch);
        return {
          content: [{
            type: 'text',
            text: `Worktree created at ${worktree.path}`,
          }],
        };
      }
    ),

    tool(
      'run_quality_gate',
      'Run quality gate checks (types, lint, tests, security)',
      {
        gate: z.enum(['all', 'types', 'lint', 'tests', 'security']).default('all'),
      },
      async (args) => {
        const results = await qualityGateService.run(args.gate);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2),
          }],
          isError: !results.passed,
        };
      }
    ),
  ],
});

// Usage in agent execution
const response = query({
  prompt: 'Implement feature F017',
  options: {
    mcpServers: {
      'nomos-services': nomosTools,
    },
    allowedTools: [
      'Read', 'Write', 'Edit', 'Bash',
      'mcp__nomos-services__update_feature_status',
      'mcp__nomos-services__get_feature_context',
      'mcp__nomos-services__run_quality_gate',
    ],
  },
});
```

---

## Permission Modes

### Three Permission Levels

```typescript
// apps/server/src/lib/permissions.ts
import { query } from '@anthropic-ai/claude-agent-sdk';

export type PermissionStrategy = 'interactive' | 'autonomous' | 'restricted';

export function getPermissionConfig(strategy: PermissionStrategy) {
  switch (strategy) {
    case 'interactive':
      return {
        permissionMode: 'default' as const,
        // User confirms each action
      };

    case 'autonomous':
      return {
        permissionMode: 'bypassPermissions' as const,
        maxBudgetUsd: 5.0, // Always set budget in autonomous mode
      };

    case 'restricted':
      return {
        permissionMode: 'default' as const,
        canUseTool: async (toolName: string, input: Record<string, unknown>) => {
          // Only allow read operations
          if (['Read', 'Grep', 'Glob'].includes(toolName)) {
            return { behavior: 'allow' as const };
          }
          return {
            behavior: 'deny' as const,
            message: 'Only read operations allowed in restricted mode',
          };
        },
      };
  }
}
```

---

## Streaming & Event Handling

### WebSocket Event Broadcasting

```typescript
// apps/server/src/ws/agent-events.ts
import type { ServerWebSocket } from 'bun';
import type { AgentEvent } from '@nomos/types';

class AgentEventBroadcaster {
  private subscribers = new Map<string, Set<ServerWebSocket>>();

  subscribe(sessionId: string, ws: ServerWebSocket) {
    const subs = this.subscribers.get(sessionId) || new Set();
    subs.add(ws);
    this.subscribers.set(sessionId, subs);
  }

  unsubscribe(sessionId: string, ws: ServerWebSocket) {
    const subs = this.subscribers.get(sessionId);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.subscribers.delete(sessionId);
      }
    }
  }

  broadcast(sessionId: string, event: AgentEvent) {
    const subs = this.subscribers.get(sessionId);
    if (!subs) return;

    const message = JSON.stringify({
      type: event.type,
      sessionId,
      data: event,
      timestamp: Date.now(),
    });

    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

export const agentEvents = new AgentEventBroadcaster();
```

### Process Multiple Message Types

```typescript
// apps/server/src/services/agent-service.ts
async function processAgentStream(
  stream: AsyncGenerator<unknown>,
  sessionId: string,
  onEvent: (event: AgentEvent) => void
) {
  for await (const message of stream) {
    const msg = message as Record<string, unknown>;

    switch (msg.type) {
      case 'assistant':
        // Agent's textual response
        if (typeof msg.content === 'string') {
          onEvent({ type: 'text', sessionId, content: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'text') {
              onEvent({ type: 'text', sessionId, content: block.text });
            } else if (block.type === 'tool_use') {
              onEvent({ type: 'tool_call', sessionId, tool: block.name, input: block.input });
            }
          }
        }
        break;

      case 'tool_result':
        onEvent({
          type: 'tool_result',
          sessionId,
          tool: String(msg.tool_name),
          result: msg.result,
        });
        break;

      case 'error':
        onEvent({ type: 'error', sessionId, error: String(msg.error) });
        break;

      case 'system':
        if (msg.subtype === 'init') {
          onEvent({ type: 'session_init', sessionId, sdkSessionId: String(msg.session_id) });
        } else if (msg.subtype === 'completion') {
          onEvent({ type: 'complete', sessionId });
        }
        break;
    }
  }
}
```

---

## Error Handling & Retry

### Error Classification

```typescript
// apps/server/src/lib/error-handling.ts
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  BILLING = 'billing',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  CONTEXT_EXCEEDED = 'context_exceeded',
  BUDGET_EXCEEDED = 'budget_exceeded',
  UNKNOWN = 'unknown',
}

export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const code = (error as { code?: string }).code;

  if (code === 'AUTHENTICATION_FAILED' || message.includes('401')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (code === 'RATE_LIMIT_EXCEEDED' || message.includes('429')) {
    return ErrorCategory.RATE_LIMIT;
  }
  if (code === 'CONTEXT_LENGTH_EXCEEDED') {
    return ErrorCategory.CONTEXT_EXCEEDED;
  }
  if (code === 'BUDGET_EXCEEDED') {
    return ErrorCategory.BUDGET_EXCEEDED;
  }
  if (message.includes('timeout')) {
    return ErrorCategory.TIMEOUT;
  }

  return ErrorCategory.UNKNOWN;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; retryableErrors?: ErrorCategory[] } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryableErrors = [ErrorCategory.RATE_LIMIT, ErrorCategory.NETWORK, ErrorCategory.TIMEOUT],
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const category = classifyError(lastError);

      if (!retryableErrors.includes(category)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await Bun.sleep(delay);
      }
    }
  }

  throw lastError!;
}
```

---

## Best Practices

### 1. Always Set Budget in Autonomous Mode
```typescript
const options = {
  permissionMode: 'bypassPermissions',
  maxBudgetUsd: 5.0, // Prevent runaway costs
};
```

### 2. Validate Working Directory
```typescript
function validateWorkingDirectory(cwd: string): void {
  const allowed = process.env.ALLOWED_ROOT_DIRECTORIES?.split(',') || [];
  const normalized = path.normalize(cwd);

  const isAllowed = allowed.some(dir =>
    normalized.startsWith(path.normalize(dir))
  );

  if (!isAllowed) {
    throw new Error(`Working directory not allowed: ${cwd}`);
  }
}
```

### 3. Use Appropriate Thinking Levels
```typescript
// Simple tasks: medium or none
// Standard work: medium
// Complex reasoning: deep
// Only use ultra when necessary (timeout risk)
```

### 4. Implement Graceful Cancellation
```typescript
const abortController = new AbortController();

// Pass to agent
const options = { signal: abortController.signal };

// Cancel on user request
function stopAgent(sessionId: string) {
  const controller = activeSessions.get(sessionId);
  controller?.abort();
}
```

### 5. Store Session IDs for Resume
```typescript
// Save to database for session continuity
await db.update(agentSessions)
  .set({ sdkSessionId: session.id })
  .where(eq(agentSessions.id, sessionId));
```

---

*Reference: Claude Agent SDK integration patterns for NOMOS v3*
