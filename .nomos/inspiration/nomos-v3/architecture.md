# NOMOS v3 Architecture

> System architecture, codebase structure, and design patterns for NOMOS v3.

---

## Codebase Structure

```
nomos/
+-- apps/
|   +-- web/                          # React + Vite frontend
|   |   +-- src/
|   |   |   +-- routes/               # TanStack Router files
|   |   |   +-- components/           # UI components (shadcn + Radix)
|   |   |   |   +-- ui/               # Base UI components
|   |   |   |   +-- features/         # Feature-specific components
|   |   |   |   +-- layout/           # Layout components
|   |   |   +-- stores/               # Zustand stores
|   |   |   |   +-- app-store.ts      # Global application state
|   |   |   |   +-- agent-store.ts    # Agent session state
|   |   |   |   +-- feature-store.ts  # Feature management state
|   |   |   +-- hooks/                # Custom React hooks
|   |   |   +-- lib/                  # Utilities (HTTP client, log parser)
|   |   |   +-- styles/               # Tailwind CSS
|   |   +-- vite.config.ts
|   |
|   +-- server/                       # Hono backend
|       +-- src/
|           +-- routes/               # Hono route handlers
|           |   +-- agent.ts          # Agent session routes
|           |   +-- features.ts       # Feature CRUD routes
|           |   +-- auto-mode.ts      # Auto-mode orchestration
|           |   +-- worktree.ts       # Git worktree routes
|           |   +-- terminal.ts       # Terminal WebSocket routes
|           |   +-- settings.ts       # Settings routes
|           +-- services/             # Business logic services
|           |   +-- agent-service.ts  # Agent execution
|           |   +-- auto-mode-service.ts # Auto loop orchestration
|           |   +-- feature-service.ts # Feature management
|           |   +-- terminal-service.ts # PTY sessions
|           |   +-- worktree-service.ts # Git worktree management
|           +-- providers/            # AI provider abstraction
|           |   +-- base-provider.ts  # Abstract base class
|           |   +-- claude-provider.ts # Claude Agent SDK
|           |   +-- provider-factory.ts # Provider selection
|           +-- lib/                  # SDK options, security
|           +-- middleware/           # Auth, validation, CORS
|           +-- ws/                   # WebSocket handlers
|
+-- packages/                         # Shared packages (monorepo)
|   +-- types/                        # 20+ Zod schema modules
|   +-- api/                          # tRPC routers
|   +-- db/                           # Drizzle ORM + SQLite
|   +-- env/                          # @t3-oss/env-core validation
|   +-- config/                       # Shared tsconfig, biome
|
+-- docker/                           # Docker configurations
|   +-- Dockerfile                    # Multi-stage production build
|   +-- Dockerfile.agent              # Agent container image
|   +-- docker-compose.yml            # Development environment
|   +-- docker-compose.prod.yml       # Production environment
|
+-- .nomos/                           # NOMOS system (centralized)
+-- test/                             # E2E Playwright tests
+-- scripts/                          # Build and utility scripts
```

---

## Runtime Architecture

```
+---------------------------------------------------------------+
|  BUN RUNTIME (Server Process)                                  |
+---------------------------------------------------------------+
|  - Environment Detection (Development vs Production)           |
|  - Port Allocation (3008 default, dynamic for parallel)        |
|  - Security (API key generation, path validation)              |
|  - Database Connection (SQLite + WAL mode)                     |
|  - Health Check (exponential backoff retry)                    |
+---------------------------------------------------------------+
                              |
                              | HTTP + WebSocket
                              v
+---------------------------------------------------------------+
|  VITE DEV SERVER / PRODUCTION BUILD (React App)                |
+---------------------------------------------------------------+
|  Routes Layer (TanStack Router)                                |
|    +-- Protected: /board, /dashboard, /settings                |
|    +-- Public: /login                                          |
|    +-- Features: /agent, /terminal, /diff                      |
+---------------------------------------------------------------+
|  Component Layer                                               |
|    +-- board-view - Kanban board                               |
|    +-- terminal-view - Multi-session terminal                  |
|    +-- agent-view - Agent chat/streaming                       |
|    +-- diff-view - Git diff viewer                             |
+---------------------------------------------------------------+
|  State Management Layer                                        |
|    +-- Zustand Stores (app, agent, feature, terminal)          |
|    +-- TanStack Query (server state, caching)                  |
|    +-- React Context (UI state)                                |
+---------------------------------------------------------------+
|  API Communication Layer                                       |
|    +-- tRPC Client (type-safe RPC)                             |
|    +-- WebSocket Event Streaming                               |
|    +-- REST fallback                                           |
+---------------------------------------------------------------+
                              |
                              | HTTP (3008) + WebSocket (/ws)
                              v
+---------------------------------------------------------------+
|  HONO BACKEND SERVER                                           |
+---------------------------------------------------------------+
|  Middleware Stack                                              |
|    +-- Pino HTTP Logging                                       |
|    +-- CORS (localhost + allowlist)                            |
|    +-- JSON Body Parser                                        |
|    +-- Bearer Token Auth                                       |
|    +-- Zod Request Validation                                  |
|    +-- Path Sanitization                                       |
+---------------------------------------------------------------+
|  Service Layer (~12 services)                                  |
|    +-- AgentService - Agent session management                 |
|    +-- AutoModeService - Autonomous loop orchestration         |
|    +-- TerminalService - PTY session management                |
|    +-- FeatureService - Feature CRUD + state machine           |
|    +-- WorktreeService - Git worktree lifecycle                |
|    +-- SettingsService - Configuration management              |
+---------------------------------------------------------------+
|  Provider Layer                                                |
|    +-- ClaudeProvider - Claude Agent SDK wrapper               |
|    +-- ProviderFactory - Model-based provider selection        |
+---------------------------------------------------------------+
|  Database Layer (Drizzle ORM)                                  |
|    +-- SQLite with WAL mode                                    |
|    +-- Type-safe queries                                       |
|    +-- Migrations                                              |
+---------------------------------------------------------------+
|  WebSocket Servers                                             |
|    +-- /ws - System event streaming                            |
|    +-- /ws/terminal - Terminal I/O                             |
+---------------------------------------------------------------+
                              |
                              | SDK API Calls
                              v
+---------------------------------------------------------------+
|  CLAUDE AGENT SDK                                              |
+---------------------------------------------------------------+
|  - Autonomous agent execution                                  |
|  - Tool invocation (Read, Write, Bash, etc.)                   |
|  - Extended thinking (up to 64K tokens)                        |
|  - MCP server integration                                      |
|  - Session continuity                                          |
+---------------------------------------------------------------+
                              |
                              | Container Orchestration (ADR-001)
                              v
+---------------------------------------------------------------+
|  DOCKER CONTAINER (Agent Isolation)                            |
+---------------------------------------------------------------+
|  - Isolated filesystem (worktree mount)                        |
|  - Resource limits (2GB RAM, 2 CPUs)                           |
|  - Network restrictions                                        |
|  - Non-root user execution                                     |
|  - Automatic cleanup on completion                             |
+---------------------------------------------------------------+
```

---

## Data Flow Diagrams

### Agent Message Flow

```
Client Request
    | POST /api/agent/send
    | {message, sessionId, images}
    v
AgentService.sendMessage()
    +-- Validate session exists
    +-- Convert images to base64
    +-- Load settings (MCP, Skills)
    +-- Build chat options
    +-- Invoke ProviderFactory.getProvider()
        |
        +-- Detect model type (claude-opus/sonnet/haiku)
        +-- Instantiate ClaudeProvider
        +-- Call provider.executeQuery()
            |
            +-- Build environment (filtered vars)
            +-- Setup SDK options
            +-- Stream response via async generator
                |
                +-- Emit agent:stream events
                +-- Capture tool-use
                +-- Handle errors
    |
    +-- Save message to database
    +-- Update session state
    +-- Process queue if pending
    |
    v WebSocket Event Stream
    Client receives agent:stream events
```

### Auto-Mode Execution Flow

```
POST /api/auto-mode/start
    | {projectPath, workingDir}
    v
AutoModeService.runAutoLoopForProject()
    |
    +-- Load pending features (status = backlog)
    +-- Check concurrency (if running >= max, sleep 5s)
    |
    +-- executeFeature(featureId)
    |   +-- Load context files
    |   +-- Locate/create worktree
    |   +-- Planning phase (if enabled)
    |   +-- Invoke agent (sendMessage)
    |   +-- Execute pipeline steps
    |   +-- Update feature status
    |
    +-- Emit events (feature_start, feature_complete)
    +-- Track failures (pause after 3)
    +-- Loop back to check concurrency
    |
    v WebSocket Events
    auto_mode_feature_start
    pipeline_step_started
    pipeline_step_complete
    auto_mode_feature_complete
```

### Terminal Session Flow

```
Client initiates WebSocket /ws/terminal
    |
    +-- Validate auth token
    +-- Create TerminalSession
        |
        +-- Detect shell (bash/zsh)
        +-- Create PTY with bun-pty
        +-- Setup output buffering (4KB/4ms)
        +-- Return scrollback buffer
    |
    +-- Client sends: {type: "input", data: "command"}
    |   +-- Write to PTY
    |   +-- Capture output
    |
    +-- Client sends: {type: "resize", rows: 24, cols: 80}
    |   +-- Resize PTY (debounced 100ms)
    |
    +-- Server streams: {type: "data", data: "output"}
        |
        +-- Buffer and send every 4ms (max 4KB)
    |
    Client closes WebSocket
    |
    +-- Send SIGTERM to PTY
    +-- Wait 1s
    +-- Send SIGKILL if still alive
    +-- Cleanup session
```

---

## Design Patterns

### 1. Provider Abstraction Pattern

```typescript
// Base interface all providers implement
abstract class BaseProvider {
  abstract getName(): string;
  abstract executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage>;
  abstract detectInstallation(): Promise<InstallationStatus>;
  abstract getAvailableModels(): Promise<ModelInfo[]>;
  abstract validateConfig(): Promise<ValidationResult>;
  abstract supportsFeature(feature: string): boolean;
}

// Factory with model-based selection
class ProviderFactory {
  private providers = new Map<string, ProviderRegistration>();

  register(config: ProviderRegistration) {
    this.providers.set(config.name, config);
  }

  getProviderForModel(modelId: string): BaseProvider {
    // Always returns Claude provider for NOMOS
    return this.providers.get('claude')!.factory();
  }
}
```

### 2. Event-Driven Streaming Pattern

```typescript
// WebSocket event broadcaster
class EventBroadcaster {
  private subscribers = new Map<WebSocket, Set<string>>();

  emit(type: EventType, payload: unknown) {
    const message = JSON.stringify({ type, data: payload, timestamp: Date.now() });

    for (const [ws, subscriptions] of this.subscribers) {
      if (subscriptions.has('*') || subscriptions.has(type)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }
}
```

### 3. Worktree Isolation Pattern

```typescript
// Feature execution in isolated branch
async function executeFeature(featureId: string) {
  const feature = await featureService.getById(featureId);

  // Create or locate worktree
  const worktreePath = feature.useWorktree
    ? await worktreeService.getOrCreate(feature.branch)
    : projectRoot;

  // Execute agent in isolated directory
  await agentService.run(worktreePath, feature.prompt);

  // Changes isolated to feature branch
}
```

### 4. Repository Pattern (Drizzle)

```typescript
// Type-safe database operations
class FeatureRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Feature | null> {
    return this.db.query.features.findFirst({
      where: eq(features.id, id),
      with: { dependencies: true }
    });
  }

  async updateStatus(id: string, status: FeatureStatus): Promise<Feature> {
    const [updated] = await this.db
      .update(features)
      .set({ status, updatedAt: new Date() })
      .where(eq(features.id, id))
      .returning();
    return updated;
  }
}
```

### 5. Configuration Layering Pattern

```
Priority (highest first):
1. Feature-level override
2. Project-level settings
3. Global settings
4. Default values

Example:
const model = feature.model
  || projectSettings.phaseModels[phase]
  || globalSettings.phaseModels[phase]
  || DEFAULT_MODELS[phase];
```

---

## Key File Sizes (Target)

| File | Size | Purpose |
|------|------|---------|
| `auto-mode-service.ts` | ~50 KB | Autonomous loop orchestration |
| `agent-service.ts` | ~30 KB | Agent session management |
| `app-store.ts` | ~20 KB | Global application state |
| `feature-service.ts` | ~25 KB | Feature lifecycle management |
| `board-view.tsx` | ~40 KB | Kanban feature board |
| `terminal-view.tsx` | ~30 KB | Multi-session terminal |
| `claude-provider.ts` | ~20 KB | Claude SDK wrapper |

---

## Scalability Considerations

### Performance Optimizations

1. **Terminal Output Throttling** - 4KB batches every 4ms
2. **Scrollback Buffer Limit** - 50KB per session
3. **TanStack Query Caching** - Hierarchical invalidation
4. **SQLite WAL Mode** - Concurrent read/write
5. **Dynamic Port Allocation** - Parallel execution support

### Recommended Improvements

1. **Virtual Scrolling** - For large feature lists/logs
2. **Query Batching** - Combine multiple feature queries
3. **Code Splitting** - Further isolate auto mode, terminal logic
4. **Worker Threads** - Offload heavy computations

---

## Deployment Configurations

| Mode | Command | Description |
|------|---------|-------------|
| Dev All | `bun dev` | All services via Turbo |
| Dev Web | `bun dev:web` | Frontend at localhost:3001 |
| Dev Server | `bun dev:server` | Backend at localhost:3008 |
| Production | `bun run build` | Optimized bundle |
| Docker Dev | `docker compose up -d` | Containerized development |
| Docker Prod | `docker compose -f docker-compose.prod.yml up -d` | Production |

---

*Reference: NOMOS v3 architecture patterns inspired by Automaker v0.13.0+*
