# Automaker Architecture

> System architecture, codebase structure, and design patterns.

---

## Codebase Structure

```
automaker/
├── apps/
│   ├── ui/                          # React + Electron frontend
│   │   ├── src/
│   │   │   ├── routes/              # 23 TanStack Router files
│   │   │   ├── views/               # 24 view components
│   │   │   ├── components/          # 30+ UI components (Radix-based)
│   │   │   ├── stores/              # 5 Zustand stores
│   │   │   ├── hooks/               # 24 custom React hooks
│   │   │   ├── mutations/           # 9 React Query mutations
│   │   │   ├── lib/                 # Utilities (HTTP client, log parser)
│   │   │   ├── themes/              # 50 CSS theme files
│   │   │   └── config/              # API providers, models, themes
│   │   └── electron/                # Main process, preload scripts
│   │
│   └── server/                      # Express backend
│       └── src/
│           ├── routes/              # 29 API route directories
│           ├── services/            # 18 service classes
│           ├── providers/           # Claude, Codex, Cursor, OpenCode
│           ├── lib/                 # SDK options, security, utilities
│           └── middleware/          # Auth, validation, CORS
│
├── libs/                            # Shared packages (monorepo)
│   ├── types/                       # 34 TypeScript definition modules
│   ├── prompts/                     # 38KB prompt library
│   ├── model-resolver/              # Multi-model resolution
│   ├── dependency-resolver/         # Feature dependency graph
│   ├── git-utils/                   # Git operations
│   ├── platform/                    # Cross-platform abstraction
│   └── spec-parser/                 # XML spec parsing
│
├── test/                            # E2E Playwright tests
├── docker/                          # Docker configurations
└── scripts/                         # Build and utility scripts
```

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  ELECTRON MAIN PROCESS                                      │
├─────────────────────────────────────────────────────────────┤
│  - Environment Detection (Packaged vs Development)          │
│  - Port Allocation (3008 default, 100-port fallback)        │
│  - Security (API key generation, path validation)           │
│  - Backend Server Spawn (Node.js subprocess)                │
│  - Health Check (exponential backoff retry)                 │
│  - Window Creation & Preload Script                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC via HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ELECTRON RENDERER PROCESS (React App)                      │
├─────────────────────────────────────────────────────────────┤
│  Routes Layer (__root.tsx → 23 route files)                 │
│    ├─ Protected: /board, /dashboard, /setup                 │
│    ├─ Public: /login, /logged-out                           │
│    └─ Features: /agent, /graph, /terminal                   │
├─────────────────────────────────────────────────────────────┤
│  View Layer (24 view components)                            │
│    ├─ board-view (69 KB) - Kanban                           │
│    ├─ terminal-view (65.9 KB) - Console                     │
│    ├─ dashboard-view (42.7 KB) - Projects                   │
│    └─ 21 other specialized views                            │
├─────────────────────────────────────────────────────────────┤
│  State Management Layer                                     │
│    ├─ Zustand Stores (5 domains)                            │
│    ├─ React Query Hooks (15+ custom queries)                │
│    ├─ React Context (file-browser, etc)                     │
│    └─ Custom React Hooks (24 total)                         │
├─────────────────────────────────────────────────────────────┤
│  API Communication Layer                                    │
│    ├─ HTTP API Client (84 KB, dual-mode auth)               │
│    ├─ WebSocket Event Streaming                             │
│    └─ Mock API Fallback (development)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (3008) + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXPRESS BACKEND SERVER                                     │
├─────────────────────────────────────────────────────────────┤
│  Middleware Stack                                           │
│    ├─ Morgan HTTP Logging                                   │
│    ├─ CORS (localhost + allowlist)                          │
│    ├─ JSON Body Parser (50MB limit)                         │
│    ├─ Cookie Parser                                         │
│    ├─ Content-Type Validation                               │
│    └─ Path Sanitization                                     │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (~20 services)                               │
│    ├─ AgentService - Agent session management               │
│    ├─ AutoModeService - Autonomous loop orchestration       │
│    ├─ TerminalService - PTY session management              │
│    ├─ FeatureLoader - Feature metadata persistence          │
│    ├─ SettingsService - Configuration management            │
│    └─ 15+ other services                                    │
├─────────────────────────────────────────────────────────────┤
│  Provider Layer                                             │
│    ├─ ClaudeProvider - Claude Agent SDK                     │
│    ├─ CodexProvider - Codex integration                     │
│    ├─ CursorProvider - Cursor integration                   │
│    └─ OpenCodeProvider - OpenCode integration               │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Servers                                          │
│    ├─ /api/events - System event streaming                  │
│    └─ /api/terminal/ws - Terminal I/O                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SDK API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE AGENT SDK                                           │
├─────────────────────────────────────────────────────────────┤
│  - Autonomous agent execution                               │
│  - Tool invocation (Read, Write, Bash, etc.)                │
│  - Extended thinking (up to 32K tokens)                     │
│  - MCP server integration                                   │
│  - Session continuity                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Agent Message Flow

```
Client Request
    │ POST /api/agent/send
    │ {message, sessionId, images}
    ▼
AgentService.sendMessage()
    ├─ Validate session exists
    ├─ Convert images to base64
    ├─ Load settings (MCP, Skills)
    ├─ Build chat options
    └─ Invoke ProviderFactory.getProvider()
        │
        ├─ Detect model type (claude/codex/cursor/opencode)
        ├─ Instantiate provider
        └─ Call provider.executeQuery()
            │
            ├─ Build environment (filtered vars)
            ├─ Setup SDK options
            └─ Stream response via async generator
                │
                ├─ Emit agent:stream events
                ├─ Capture tool-use
                └─ Handle errors
    │
    ├─ Save message to disk
    ├─ Update isRunning flag
    └─ Process queue if pending
    │
    ▼ WebSocket Event Stream
    Client receives agent:stream events
```

### Auto-Mode Execution Flow

```
POST /api/auto-mode/start
    │ {projectPath, workingDir}
    ▼
AutoModeService.runAutoLoopForProject()
    │
    ├─ Load pending features
    ├─ Check concurrency (if running >= max, sleep 5s)
    │
    ├─ executeFeature(featureId)
    │   ├─ Load context files
    │   ├─ Locate/create worktree
    │   ├─ Planning phase (if enabled)
    │   ├─ Invoke agent (sendMessage)
    │   ├─ Execute pipeline steps
    │   └─ Update feature status
    │
    ├─ Emit events (feature_start, feature_complete)
    ├─ Track failures (pause after 3)
    └─ Loop back to check concurrency
    │
    ▼ WebSocket Events
    auto_mode_feature_start
    pipeline_step_started
    pipeline_step_complete
    auto_mode_feature_complete
```

### Terminal Session Flow

```
Client initiates WebSocket /api/terminal/ws
    │
    ├─ Validate auth token (5-min expiration)
    └─ Create TerminalSession
        │
        ├─ Detect shell (bash/zsh/powershell)
        ├─ Create PTY with node-pty
        ├─ Setup output buffering (4KB/4ms)
        └─ Return scrollback buffer
    │
    ├─ Client sends: {type: "input", data: "command"}
    │   ├─ Write to PTY
    │   └─ Capture output
    │
    ├─ Client sends: {type: "resize", rows: 24, cols: 80}
    │   └─ Resize PTY (debounced 100ms)
    │
    └─ Server streams: {type: "data", data: "output"}
        │
        └─ Buffer and send every 4ms (max 4KB)
    │
    Client closes WebSocket
    │
    ├─ Send SIGTERM to PTY
    ├─ Wait 1s
    ├─ Send SIGKILL if still alive
    └─ Cleanup session
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

// Factory with priority-based selection
class ProviderFactory {
  private providers: Map<string, ProviderRegistration>;

  register(config: ProviderRegistration) {
    // Priority: Cursor(10) → Codex(5) → OpenCode(3) → Claude(0)
  }

  getProviderForModel(modelId: string): BaseProvider {
    // Sort by priority, check canHandleModel()
  }
}
```

### 2. Event-Driven Streaming Pattern

```typescript
// EventEmitter with typed events
class EventBroadcaster {
  private subscribers = new Set<EventCallback>();

  emit(type: EventType, payload: unknown) {
    for (const callback of this.subscribers) {
      callback(type, payload);
    }
  }

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
```

### 3. Worktree Isolation Pattern

```typescript
// Feature execution in isolated branch
async function executeFeature(featureId: string) {
  const feature = await loadFeature(featureId);

  // Create or locate worktree
  const worktreePath = feature.useWorktree
    ? await getOrCreateWorktree(feature.branch)
    : projectRoot;

  // Execute agent in isolated directory
  await runAgent(worktreePath, feature.prompt);

  // Changes isolated to feature branch
}
```

### 4. Optimistic Update Pattern

```typescript
useMutation({
  mutationFn: (feature) => api.updateFeature(feature),
  onMutate: async (newFeature) => {
    await queryClient.cancelQueries({ queryKey: ['features'] });
    const oldData = queryClient.getQueryData(['features']);
    queryClient.setQueryData(['features'], (old) =>
      old.map(f => f.id === newFeature.id ? newFeature : f)
    );
    return { oldData };
  },
  onError: (err, newFeature, context) => {
    queryClient.setQueryData(['features'], context.oldData);
  }
});
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

## Key File Sizes

| File | Size | Purpose |
|------|------|---------|
| `auto-mode-service.ts` | 171 KB | Autonomous loop orchestration |
| `app-store.ts` | 142.5 KB | Global application state |
| `electron.ts` | 100 KB | Electron API surface |
| `http-api-client.ts` | 84 KB | HTTP communication |
| `board-view.tsx` | 69 KB | Kanban feature board |
| `terminal-view.tsx` | 65.9 KB | Multi-session terminal |
| `ideation-service.ts` | 60 KB | Idea generation |
| `settings.ts` (types) | 46 KB | Type definitions |
| `log-parser.ts` | 40 KB | Agent output parsing |
| `prompts/defaults.ts` | 38 KB | Prompt library |

---

## Scalability Considerations

### Performance Optimizations

1. **Terminal Output Throttling** - 4KB batches every 4ms
2. **Scrollback Buffer Limit** - 50KB per session
3. **React Query Caching** - Hierarchical invalidation
4. **Concurrent Session Limits** - Configurable max sessions
5. **Dynamic Port Allocation** - Parallel execution support

### Recommended Improvements

1. **Micro-frontend Pattern** - Isolate terminal, graph, board
2. **Virtual Scrolling** - For large feature lists/logs
3. **Query Batching** - Combine multiple feature queries
4. **Code Splitting** - Further isolate auto mode, terminal logic

---

## Deployment Configurations

| Mode | Command | Description |
|------|---------|-------------|
| Web Dev | `npm run dev:web` | Browser at localhost:3007 |
| Electron Dev | `npm run dev:electron` | Desktop application |
| Production Web | `npm run build` | Static bundle |
| Production Desktop | `npm run build:electron` | macOS/Windows/Linux |
| Docker | `docker-compose up -d` | Containerized (most secure) |

---

*Reference: Automaker architecture patterns for autonomous AI development systems.*
