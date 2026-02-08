# Implementation Patterns: Automaker → nomos-ai

> Reference for agents implementing F040-F047. Contains concrete code patterns adapted from Automaker for our stack (Bun + Hono + oRPC + Drizzle + Zod).

---

## 1. Provider Pattern (Claude-Only)

Automaker uses a multi-provider factory. We simplify to a single Claude provider.

### ClaudeProvider

```typescript
// packages/api/src/services/claude-provider.ts
import { query, type MessageStream } from "@anthropic-ai/claude-agent-sdk";
import type { ExecuteOptions, ProviderMessage } from "@nomos/types";

export class ClaudeProvider {
  async *executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage> {
    const sdkOptions = {
      prompt: options.prompt,
      model: this.resolveModel(options.model),
      cwd: options.cwd,
      systemPrompt: options.systemPrompt,
      maxTurns: options.maxTurns ?? 10,
      allowedTools: options.allowedTools,
      permissionMode: "bypassPermissions" as const,
      abortController: options.abortController,
      ...(options.sdkSessionId && { sdkSessionId: options.sdkSessionId }),
      ...(options.thinkingLevel !== "none" && {
        maxThinkingTokens: THINKING_TOKEN_BUDGET[options.thinkingLevel ?? "standard"],
      }),
    };

    const stream: MessageStream = query(sdkOptions);

    for await (const message of stream) {
      yield message as ProviderMessage;
    }
  }

  private resolveModel(alias: string): string {
    const models: Record<string, string> = {
      haiku: "claude-haiku-4-5-20251001",
      sonnet: "claude-sonnet-4-5-20250929",
      opus: "claude-opus-4-6",
    };
    return models[alias] ?? alias;
  }
}

const THINKING_TOKEN_BUDGET: Record<string, number | undefined> = {
  none: undefined,
  low: 1024,
  standard: 10000,
  high: 16000,
  ultrathink: 32000,
};
```

### SDK Options Factory

```typescript
// packages/api/src/services/sdk-options.ts
import type { ExecuteOptions } from "@nomos/types";

export function createAgentOptions(overrides: Partial<ExecuteOptions>): ExecuteOptions {
  return {
    model: "sonnet",
    maxTurns: 10,
    thinkingLevel: "standard",
    permissionMode: "bypassPermissions",
    ...overrides,
  };
}

export function createAutoModeOptions(overrides: Partial<ExecuteOptions>): ExecuteOptions {
  return {
    model: "opus",
    maxTurns: 50,
    thinkingLevel: "high",
    permissionMode: "bypassPermissions",
    ...overrides,
  };
}
```

---

## 2. Event System Pattern

Automaker uses a simple in-memory pub-sub. We add DB persistence.

### EventService

```typescript
// packages/api/src/services/event-service.ts
import type { EventType, EventCallback } from "@nomos/types";

export class EventService {
  private subscribers = new Set<EventCallback>();

  emit(type: EventType, payload: unknown): void {
    for (const cb of this.subscribers) {
      try {
        cb(type, payload);
      } catch {
        // Isolate subscriber errors
      }
    }
  }

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
```

### EventBroadcaster (WebSocket bridge)

```typescript
// packages/api/src/services/event-broadcaster.ts
import type { ServerWebSocket } from "bun";
import type { EventService } from "./event-service";

export class EventBroadcaster {
  private clients = new Set<ServerWebSocket<unknown>>();

  constructor(private events: EventService) {
    this.events.subscribe((type, payload) => {
      const message = JSON.stringify({ type, payload });
      for (const ws of this.clients) {
        ws.send(message);
      }
    });
  }

  addClient(ws: ServerWebSocket<unknown>): void {
    this.clients.add(ws);
  }

  removeClient(ws: ServerWebSocket<unknown>): void {
    this.clients.delete(ws);
  }
}
```

---

## 3. WebSocket Pattern (Bun Native)

Automaker uses `ws` library with Express. We use Bun's native WebSocket.

### Server Setup

```typescript
// apps/server/src/lib/websocket.ts
import type { Server, ServerWebSocket } from "bun";

interface WSData {
  channel: "events" | "terminal";
  sessionId?: string;
  userId?: string;
}

export function configureWebSocket(server: Server, broadcaster: EventBroadcaster) {
  return {
    open(ws: ServerWebSocket<WSData>) {
      if (ws.data.channel === "events") {
        broadcaster.addClient(ws);
        ws.subscribe("events");
      } else if (ws.data.channel === "terminal") {
        ws.subscribe(`terminal:${ws.data.sessionId}`);
      }
    },
    message(ws: ServerWebSocket<WSData>, message: string) {
      if (ws.data.channel === "terminal") {
        // Forward input to terminal service
        terminalService.write(ws.data.sessionId!, message);
      }
    },
    close(ws: ServerWebSocket<WSData>) {
      if (ws.data.channel === "events") {
        broadcaster.removeClient(ws);
      }
    },
  };
}
```

### Upgrade Handler (Hono)

```typescript
// apps/server/src/index.ts
app.get("/ws/events", (c) => {
  const upgraded = c.env.server.upgrade(c.req.raw, {
    data: { channel: "events", userId: c.get("userId") },
  });
  if (upgraded) return undefined;
  return c.text("Upgrade failed", 400);
});

app.get("/ws/terminal", (c) => {
  const sessionId = c.req.query("sessionId");
  const upgraded = c.env.server.upgrade(c.req.raw, {
    data: { channel: "terminal", sessionId },
  });
  if (upgraded) return undefined;
  return c.text("Upgrade failed", 400);
});
```

---

## 4. Agent Session Management

Automaker manages sessions in-memory with JSON persistence. We use DB.

### Key Pattern: Streaming + Persistence

```typescript
// packages/api/src/services/agent-service.ts
export class AgentService {
  private runningSessions = new Map<string, AbortController>();
  private provider = new ClaudeProvider();

  async sendMessage(sessionId: string, content: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new Error("Session not found");

    const abortController = new AbortController();
    this.runningSessions.set(sessionId, abortController);

    // Persist user message
    await this.messageRepo.create({
      sessionId,
      role: "user",
      content,
    });

    // Stream response
    const options = createAgentOptions({
      prompt: content,
      cwd: session.workingDirectory,
      sdkSessionId: session.sdkSessionId,
      model: session.model ?? "sonnet",
      abortController,
    });

    let fullResponse = "";
    for await (const msg of this.provider.executeQuery(options)) {
      // Emit streaming event
      this.events.emit("agent:stream", {
        sessionId,
        message: msg,
      });

      // Accumulate for persistence
      if (msg.type === "assistant" && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === "text") fullResponse += block.text;
        }
      }

      // Capture SDK session ID for resumption
      if (msg.session_id) {
        await this.sessionRepo.update(sessionId, {
          sdkSessionId: msg.session_id,
        });
      }
    }

    // Persist assistant message
    await this.messageRepo.create({
      sessionId,
      role: "assistant",
      content: fullResponse,
    });

    this.runningSessions.delete(sessionId);
  }

  async stop(sessionId: string): void {
    this.runningSessions.get(sessionId)?.abort();
    this.runningSessions.delete(sessionId);
  }
}
```

---

## 5. Auto-Mode Pipeline Pattern

Automaker's autonomous loop adapted for our stack.

### Pipeline Execution

```typescript
// packages/api/src/services/pipeline-service.ts
export class PipelineService {
  private readonly STEPS = [
    { id: "init", name: "Initialize" },
    { id: "context", name: "Gather Context" },
    { id: "plan", name: "Plan Implementation" },
    { id: "execute", name: "Execute" },
    { id: "verify", name: "Verify" },
    { id: "merge", name: "Merge" },
    { id: "finish", name: "Finish" },
  ];

  async executeFeature(featureId: string): Promise<void> {
    const feature = await this.featureRepo.findById(featureId);

    for (const step of this.STEPS) {
      this.events.emit("feature:progress", {
        featureId,
        step: step.id,
        status: "running",
      });

      const prompt = this.promptBuilder.buildStepPrompt(feature, step.id);
      await this.agentService.executeInWorktree(feature, prompt);

      // Checkpoint after each step
      await this.featureRepo.updatePipelineStep(featureId, step.id, "completed");

      this.events.emit("feature:progress", {
        featureId,
        step: step.id,
        status: "completed",
      });
    }
  }
}
```

### Auto-Mode Loop

```typescript
// packages/api/src/services/auto-mode-service.ts
export class AutoModeService {
  private isRunning = false;
  private maxConcurrency = 1;
  private runningFeatures = new Map<string, AbortController>();
  private consecutiveFailures = 0;
  private readonly MAX_FAILURES = 3;

  async start(projectId: string): Promise<void> {
    this.isRunning = true;
    this.events.emit("auto-mode:started", { projectId });

    while (this.isRunning) {
      // Check concurrency limit
      if (this.runningFeatures.size >= this.maxConcurrency) {
        await Bun.sleep(1000);
        continue;
      }

      // Pick next feature
      const feature = await this.featureRepo.findNextPending(projectId);
      if (!feature) {
        this.events.emit("auto-mode:idle", { projectId });
        await Bun.sleep(5000);
        continue;
      }

      // Check dependencies satisfied
      if (!await this.areDependenciesMet(feature)) {
        continue;
      }

      // Execute in background
      this.executeFeature(feature).catch((err) => {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.MAX_FAILURES) {
          this.stop();
        }
      });
    }
  }

  private async executeFeature(feature: Feature): Promise<void> {
    const abort = new AbortController();
    this.runningFeatures.set(feature.id, abort);

    try {
      // Create worktree
      const worktree = await this.worktreeService.create(feature);

      // Run pipeline
      await this.pipelineService.executeFeature(feature.id);

      // Success
      this.consecutiveFailures = 0;
      await this.featureRepo.updateStatus(feature.id, "waiting_approval");
    } catch (err) {
      await this.featureRepo.updateStatus(feature.id, "failed", String(err));
    } finally {
      this.runningFeatures.delete(feature.id);
    }
  }

  stop(): void {
    this.isRunning = false;
    for (const [, abort] of this.runningFeatures) {
      abort.abort();
    }
    this.runningFeatures.clear();
    this.events.emit("auto-mode:stopped", {});
  }
}
```

---

## 6. Worktree Pattern

Automaker manages git worktrees for feature isolation.

### WorktreeService

```typescript
// packages/api/src/services/worktree-service.ts
export class WorktreeService {
  async create(feature: Feature): Promise<WorktreeInfo> {
    const branchName = `nomos/${feature.id}`;
    const worktreePath = `${this.projectRoot}/.worktrees/${feature.id}`;

    // Create branch
    await this.git("checkout", "-b", branchName);

    // Create worktree
    await this.git("worktree", "add", worktreePath, branchName);

    // Store in DB
    const worktree = await this.worktreeRepo.create({
      featureId: feature.id,
      branchName,
      path: worktreePath,
    });

    this.events.emit("worktree:init-completed", { featureId: feature.id });
    return worktree;
  }

  async remove(featureId: string): Promise<void> {
    const worktree = await this.worktreeRepo.findByFeatureId(featureId);
    if (!worktree) return;

    await this.git("worktree", "remove", worktree.path, "--force");
    await this.worktreeRepo.delete(worktree.id);
  }

  private async git(...args: string[]): Promise<string> {
    const proc = Bun.spawn(["git", ...args], {
      cwd: this.projectRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`git ${args[0]} failed: ${stderr}`);
    }
    return output.trim();
  }
}
```

---

## 7. Terminal Service Pattern

Automaker uses node-pty. We use Bun.spawn with shell mode.

### TerminalService

```typescript
// packages/api/src/services/terminal-service.ts
import type { Subprocess } from "bun";

interface TerminalSession {
  id: string;
  process: Subprocess;
  scrollback: string[];
  maxScrollback: number;
}

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private readonly MAX_SCROLLBACK = 50 * 1024; // 50KB
  private readonly BATCH_SIZE = 4096; // 4KB
  private readonly BATCH_INTERVAL = 4; // 4ms

  async createSession(cwd: string): Promise<string> {
    const id = crypto.randomUUID();
    const shell = this.detectShell();

    const proc = Bun.spawn([shell], {
      cwd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, TERM: "xterm-256color" },
    });

    const session: TerminalSession = {
      id,
      process: proc,
      scrollback: [],
      maxScrollback: this.MAX_SCROLLBACK,
    };

    this.sessions.set(id, session);

    // Stream output with batching
    this.streamOutput(session);

    return id;
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.process.stdin.write(data);
  }

  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.process.kill();
    this.sessions.delete(sessionId);
  }

  private async streamOutput(session: TerminalSession): Promise<void> {
    const reader = session.process.stdout.getReader();
    let batch = "";
    let timer: Timer | null = null;

    const flush = () => {
      if (batch) {
        // Add to scrollback
        session.scrollback.push(batch);
        // Trim scrollback
        while (session.scrollback.join("").length > session.maxScrollback) {
          session.scrollback.shift();
        }
        // Emit to WebSocket
        this.events.emit("terminal:output", {
          sessionId: session.id,
          data: batch,
        });
        batch = "";
      }
      timer = null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      batch += new TextDecoder().decode(value);

      if (batch.length >= this.BATCH_SIZE) {
        flush();
      } else if (!timer) {
        timer = setTimeout(flush, this.BATCH_INTERVAL);
      }
    }

    flush(); // Final flush
  }

  private detectShell(): string {
    return process.env.SHELL ?? "/bin/zsh";
  }
}
```

---

## 8. Settings Pattern (Layered Config)

Automaker uses JSON files. We use DB with scope-based layering.

### SettingsService

```typescript
// packages/api/src/services/settings-service.ts
export class SettingsService {
  async get<T>(key: string, projectId?: string): Promise<T | undefined> {
    // Feature-level (passed inline, not from DB)
    // ↓
    // Project-level
    if (projectId) {
      const projectSetting = await this.settingRepo.findByKeyAndScope(
        key, "project", projectId
      );
      if (projectSetting) return JSON.parse(projectSetting.value) as T;
    }
    // ↓
    // Global-level
    const globalSetting = await this.settingRepo.findByKeyAndScope(key, "global");
    if (globalSetting) return JSON.parse(globalSetting.value) as T;
    // ↓
    // Default
    return DEFAULT_SETTINGS[key] as T;
  }

  async set(key: string, value: unknown, scope: "global" | "project", scopeId?: string): Promise<void> {
    await this.settingRepo.upsert({
      key,
      value: JSON.stringify(value),
      scope,
      scopeId: scopeId ?? null,
    });
  }
}
```

---

## 9. Notification Pattern

```typescript
// packages/api/src/services/notification-service.ts
export class NotificationService {
  async create(notification: Omit<Notification, "id" | "createdAt" | "read">): Promise<Notification> {
    const created = await this.notificationRepo.create({
      ...notification,
      read: false,
    });

    this.events.emit("notification:created", created);
    return created;
  }

  async markRead(id: string): Promise<void> {
    await this.notificationRepo.update(id, { read: true });
  }

  async getUnread(projectId: string): Promise<Notification[]> {
    return this.notificationRepo.findUnread(projectId);
  }
}
```

---

## 10. oRPC Router Pattern

Automaker uses Express routes. We use oRPC.

```typescript
// packages/api/src/routers/agent.ts
import { createRouter, protectedProcedure } from "../lib/orpc";
import { z } from "zod";

export const agentRouter = createRouter({
  createSession: protectedProcedure
    .input(z.object({
      name: z.string(),
      projectId: z.string(),
      workingDirectory: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.agentService.createSession(input);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.agentService.sendMessage(input.sessionId, input.content);
    }),

  stop: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.agentService.stop(input.sessionId);
    }),

  listSessions: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.agentService.listSessions();
    }),

  getHistory: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.agentService.getHistory(input.sessionId);
    }),
});
```

---

## 11. Prompt Builder Pattern

```typescript
// packages/api/src/services/prompt-builder.ts
export class PromptBuilder {
  buildFeaturePrompt(feature: Feature, context: string): string {
    return `You are implementing feature ${feature.id}: ${feature.title}

## Description
${feature.description}

## Acceptance Criteria
${feature.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join("\n")}

## Project Context
${context}

## Instructions
- Implement the feature according to the acceptance criteria
- Write clean, type-safe TypeScript code
- Follow existing patterns in the codebase
- Run tests after implementation`;
  }

  buildPlanningPrompt(feature: Feature): string {
    return `Analyze feature ${feature.id}: ${feature.title}

Create an implementation plan with:
1. Files to create/modify
2. Step-by-step approach
3. Testing strategy
4. Potential risks`;
  }
}
```

---

## 12. GitHub Service Pattern

```typescript
// packages/api/src/services/github-service.ts
export class GitHubService {
  async listIssues(repo: string): Promise<GitHubIssue[]> {
    const proc = Bun.spawn(["gh", "issue", "list", "--repo", repo, "--json", "number,title,body,labels,state"], {
      stdout: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    return JSON.parse(output);
  }

  async createPR(options: { title: string; body: string; branch: string; base?: string }): Promise<string> {
    const proc = Bun.spawn([
      "gh", "pr", "create",
      "--title", options.title,
      "--body", options.body,
      "--head", options.branch,
      "--base", options.base ?? "main",
    ], { stdout: "pipe" });
    return (await new Response(proc.stdout).text()).trim();
  }

  async importIssuesAsFeatures(repo: string): Promise<Feature[]> {
    const issues = await this.listIssues(repo);
    return issues.map((issue) => ({
      title: issue.title,
      description: issue.body ?? issue.title,
      category: this.inferCategory(issue.labels),
      status: "backlog" as const,
    }));
  }
}
```

---

## 13. FS Service Pattern (Sandboxed)

```typescript
// packages/api/src/services/fs-service.ts
import { resolve, relative } from "path";

export class FSService {
  constructor(private allowedRoot: string) {}

  private validatePath(requestedPath: string): string {
    const resolved = resolve(this.allowedRoot, requestedPath);
    const rel = relative(this.allowedRoot, resolved);
    if (rel.startsWith("..") || resolve(resolved) !== resolved) {
      throw new Error("Path traversal detected");
    }
    return resolved;
  }

  async readFile(path: string): Promise<string> {
    const safe = this.validatePath(path);
    return Bun.file(safe).text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const safe = this.validatePath(path);
    await Bun.write(safe, content);
  }

  async listDir(path: string): Promise<string[]> {
    const safe = this.validatePath(path);
    const glob = new Bun.Glob("*");
    return Array.from(glob.scanSync({ cwd: safe }));
  }
}
```

---

## Summary of Pattern Adaptations

| Automaker Pattern | nomos-ai Adaptation |
|-------------------|---------------------|
| Multi-provider factory | Single ClaudeProvider class |
| `ws` WebSocket library | Bun native WebSocket |
| Express routes | oRPC type-safe procedures |
| JSON file storage | SQLite + Drizzle ORM |
| `node-pty` terminal | Bun.spawn shell sessions |
| In-memory event emitter | EventService + DB persistence |
| File-based settings | DB settings with scope layering |
| `child_process.spawn` | `Bun.spawn` |
| Session JSON files | DB messages table |
| Worktree JSON metadata | DB worktrees table |
