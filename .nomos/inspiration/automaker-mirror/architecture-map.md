# Architecture Map: Automaker → nomos-ai

> Reference for agents implementing F040-F047. Describes stack comparison, service inventory, data flow, and mapping decisions.

---

## Stack Comparison

| Layer | Automaker | nomos-ai | Migration Notes |
|-------|-----------|----------|-----------------|
| Runtime | Node.js | Bun | Use `Bun.spawn` instead of `child_process`, native WebSocket |
| Framework | Express.js | Hono | Lighter, Bun-native, `app.get()` syntax similar |
| RPC | REST routes | oRPC | Type-safe procedures, auto client generation |
| Database | JSON files on disk | SQLite via Drizzle | All file-based storage becomes DB tables |
| Types | TypeScript interfaces in `libs/types` | Zod schemas in `packages/types` | Zod = runtime validation + inference |
| Frontend | React + Vite + Electron | React 19 + TanStack Router + Tauri | File-based routing, Tauri for desktop |
| State | Zustand (5 stores) | Zustand (existing) | Extend existing stores |
| AI SDK | Claude Agent SDK (multi-provider) | Claude Agent SDK (Claude-only) | Drop Cursor/Codex/OpenCode providers |
| Auth | API Key + Session Token | better-auth | Existing auth package |
| WebSocket | `ws` library (noServer mode) | Bun native WebSocket | `server.upgrade()` pattern |
| CSS | Custom themes | Tailwind 4 | Theme via CSS variables |
| Monorepo | pnpm workspaces | Turborepo + Bun workspaces | Already scaffolded |

---

## Automaker Service Inventory → nomos-ai Mapping

### Services We Adopt (adapted)

| Automaker Service | nomos-ai Target | Package | Notes |
|-------------------|-----------------|---------|-------|
| AgentService | AgentService | `packages/api` | Rewrite: oRPC procedures, Bun-native |
| AutoModeService | AutoModeService | `packages/api` | Simplified: Claude-only, no multi-provider |
| TerminalService | TerminalService | `packages/api` | Bun.spawn shells (no node-pty needed) |
| SettingsService | SettingsService | `packages/api` | DB-backed instead of JSON files |
| NotificationService | NotificationService | `packages/api` | DB-backed with event emission |
| EventEmitter | EventService | `packages/api` | Keep pub-sub pattern, add persistence |
| FeatureLoader | (DB queries) | `packages/db` | Features live in SQLite, not JSON files |
| PipelineService | PipelineService | `packages/api` | 7-step pipeline execution |

### Services We Skip

| Automaker Service | Reason |
|-------------------|--------|
| CursorConfigService | Claude-only provider |
| CodexUsageService | No Codex integration |
| CodexModelCacheService | No Codex integration |
| CodexAppServerService | No Codex integration |
| IdeationService | Phase 2+ feature |
| MCPTestService | Not needed initially |
| DevServerService | Different dev workflow |
| ClaudeUsageService | Can add later |
| EventHookService | Can add later |
| InitScriptService | Different worktree init |

### New Services (nomos-ai specific)

| Service | Purpose | Package |
|---------|---------|---------|
| GitHubService | `gh` CLI wrapper for PRs/issues | `packages/api` |
| FSService | Sandboxed file operations | `packages/api` |
| WorktreeService | Git worktree management via Bun.spawn | `packages/api` |
| PromptBuilder | Feature/planning/implementation prompts | `packages/api` |

---

## Data Flow Diagrams

### Agent Execution Flow

```
User → WebSocket → AgentRouter → AgentService → ClaudeProvider → SDK
                                      ↓
                                 EventService → WebSocket → UI
                                      ↓
                                 DB (messages, sessions)
```

### Auto-Mode Loop

```
AutoModeService.start()
    ↓
┌─→ Pick next pending feature (from DB, respecting dependencies)
│   ↓
│   WorktreeService.create(feature) → git worktree add
│   ↓
│   PromptBuilder.build(feature, context) → system + user prompt
│   ↓
│   AgentService.execute(prompt, worktreeDir) → SDK streaming
│   ↓
│   EventService.emit('feature:completed') → UI update
│   ↓
│   DB: feature.status = 'waiting_approval'
│   ↓
└─← Loop if more pending features & within concurrency limit
```

### WebSocket Event Flow

```
Server                          Client
  │                               │
  │◄──── WS Connect ─────────────│
  │      (auth token)             │
  │                               │
  ├──── agent:stream ────────────►│  (real-time agent output)
  ├──── feature:started ─────────►│  (status update)
  ├──── feature:completed ───────►│  (status update)
  ├──── auto-mode:event ─────────►│  (loop status)
  ├──── notification:created ────►│  (bell icon)
  │                               │
  │◄──── terminal:input ──────────│  (keystrokes)
  ├──── terminal:output ─────────►│  (shell output)
  │                               │
```

### Settings Hierarchy

```
Default Settings (code)
    ↓ override
Global Settings (DB: settings table, scope='global')
    ↓ override
Project Settings (DB: settings table, scope='project', projectId)
    ↓ override
Feature Settings (inline in feature record)
```

---

## Package Dependency Graph

```
packages/types (Zod schemas, branded types)
    ↓
packages/db (Drizzle schemas, repositories, migrations)
    ↓
packages/config (env validation, constants)
    ↓
packages/auth (better-auth)
    ↓
packages/api (oRPC routers, services)
    ↓
apps/server (Hono app, WebSocket, entry point)
apps/web (React app, TanStack Router, Zustand)
```

---

## Directory Structure (Target)

### New Files by Package

```
packages/types/src/
├── agent.ts         (extend)     # Add AgentDefinition, ContentBlock, ProviderMessage
├── event.ts         (NEW)        # EventType union, EventCallback
├── feature.ts       (extend)     # Add worktree/locking/pipeline fields
├── ids.ts           (extend)     # Add WorktreeId, EventId, MessageId, NotificationId, SettingId
├── message.ts       (NEW)        # ConversationMessage, ContentBlock
├── notification.ts  (NEW)        # Notification, NotificationType
├── pagination.ts    (NEW)        # PaginatedResult<T>, PaginationParams
├── pipeline.ts      (NEW)        # PipelineStep, PipelineConfig
├── provider.ts      (NEW)        # ExecuteOptions, ProviderMessage, ThinkingLevel
├── session.ts       (extend)     # Add sdkSessionId, model, isRunning
├── settings.ts      (NEW)        # GlobalSettings, ProjectSettings, ThemeMode
├── status.ts        (extend)     # Add FeatureStatusWithPipeline
├── worktree.ts      (NEW)        # WorktreeInfo, PRState, WorktreePRInfo
└── index.ts         (extend)     # Re-export new modules

packages/db/src/schema/
├── features.ts      (extend)     # Add useWorktree, locked, lockedBy, lockedAt, branchName
├── sessions.ts      (extend)     # Add sdkSessionId, model, isRunning, workingDirectory
├── events.ts        (NEW)        # Events table
├── messages.ts      (NEW)        # Messages table (agent conversation history)
├── notifications.ts (NEW)        # Notifications table
├── settings.ts      (NEW)        # Settings table (key-value with scope)
├── worktrees.ts     (NEW)        # Worktrees table
└── index.ts         (extend)     # Re-export new schemas

packages/db/src/repositories/
├── event.ts         (NEW)
├── message.ts       (NEW)
├── notification.ts  (NEW)
├── setting.ts       (NEW)
├── worktree.ts      (NEW)
└── index.ts         (extend)

packages/api/src/services/
├── agent-service.ts (REWRITE)    # Full session management, SDK streaming
├── event-service.ts (NEW)        # Pub-sub + persistence
├── auto-mode-service.ts (NEW)    # Autonomous loop
├── terminal-service.ts (NEW)     # Shell sessions via Bun.spawn
├── worktree-service.ts (NEW)     # Git worktree management
├── pipeline-service.ts (NEW)     # 7-step execution
├── prompt-builder.ts (NEW)       # Prompt construction
├── settings-service.ts (NEW)     # Layered config
├── notification-service.ts (NEW) # Notifications + events
├── github-service.ts (NEW)       # gh CLI wrapper
└── fs-service.ts (NEW)           # Sandboxed file ops

packages/api/src/routers/
├── agent.ts         (NEW)        # start, send, stop, history, clear
├── auto-mode.ts     (NEW)        # start, stop, status
├── terminal.ts      (NEW)        # CRUD sessions
├── worktree.ts      (NEW)        # CRUD worktrees
├── settings.ts      (NEW)        # get, set, reset
├── notifications.ts (NEW)        # list, read, mark-read
├── github.ts        (NEW)        # issues, PRs
├── fs.ts            (NEW)        # browse, read, write
├── models.ts        (NEW)        # available models
├── events.ts        (NEW)        # event history
├── pipeline.ts      (NEW)        # pipeline config
└── index.ts         (extend)     # Mount new routers

apps/server/src/
├── index.ts         (extend)     # Add WebSocket upgrade handler
├── lib/
│   └── websocket.ts (NEW)        # WS server setup, auth, routing
└── (uses packages/api routers)

apps/web/src/
├── lib/
│   └── websocket.ts (NEW)        # WS client with auto-reconnect
├── hooks/
│   ├── use-websocket.ts (NEW)
│   ├── use-event-stream.ts (NEW)
│   ├── use-agent-stream.ts (NEW)
│   ├── use-settings.ts (NEW)
│   ├── use-auto-mode.ts (NEW)
│   ├── use-notifications.ts (NEW)
│   ├── use-worktrees.ts (NEW)
│   └── use-github.ts (NEW)
├── store/
│   ├── agent-store.ts (NEW)
│   ├── terminal-store.ts (NEW)
│   ├── auto-mode-store.ts (NEW)
│   └── settings-store.ts (NEW)
├── routes/
│   ├── agent.tsx (NEW)
│   ├── terminal.tsx (NEW)
│   ├── settings.tsx (NEW)
│   └── (more frontend routes)
└── components/
    ├── agent/ (NEW)
    ├── terminal/ (NEW)
    ├── settings/ (NEW)
    ├── notifications/ (NEW)
    └── diff/ (NEW)
```

---

## Key Architectural Decisions

### 1. Claude-Only Provider
Automaker supports 4 providers (Claude, Cursor, Codex, OpenCode). We implement **Claude only**. This eliminates:
- Provider factory/registry pattern
- Model resolution complexity
- Provider-specific configuration

Instead: Direct `@anthropic-ai/claude-agent-sdk` usage with a thin `ClaudeProvider` wrapper.

### 2. DB Instead of JSON Files
Automaker stores everything in JSON files. We use **SQLite via Drizzle**:
- Sessions, messages, features, events, notifications, settings → DB tables
- Concurrent access safety (no file locking)
- Query capability (filter, sort, paginate)
- Migration support via Drizzle

### 3. Bun-Native WebSocket
Automaker uses `ws` library with Express HTTP upgrade. We use **Bun's native WebSocket**:
```typescript
// Hono + Bun WebSocket
app.get('/ws/events', (c) => {
  const server = c.env?.server;
  const success = server.upgrade(c.req.raw);
  if (success) return undefined;
  return c.text('WebSocket upgrade failed', 400);
});
```

### 4. oRPC Instead of REST
Automaker has ~20 Express route files. We use **oRPC** for type-safe procedures:
- Auto-generated client types
- Zod validation built-in
- Middleware support for auth

### 5. Terminal via Bun.spawn
Automaker uses `node-pty` for PTY. We use **Bun.spawn** with shell mode:
- No native addon dependency
- Simpler process management
- Output buffering pattern preserved (4KB/4ms batching)

---

## Port Configuration

| Service | Port | Notes |
|---------|------|-------|
| Web (Vite dev) | 3000 | TanStack Router |
| Server (Hono) | 3001 | API + WebSocket |
| WebSocket events | 3001/ws/events | Same server, upgrade |
| WebSocket terminal | 3001/ws/terminal | Same server, upgrade |
