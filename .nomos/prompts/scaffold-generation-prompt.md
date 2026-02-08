# NOMOS AI — Full Project Generation Prompt

> Use this prompt with Claude (Opus or Sonnet) to generate the entire NOMOS AI application from a fresh `better-t-stack` scaffold.

---

## CONTEXT

You are building **NOMOS AI** — an Autonomous AI Development Studio. Users describe features on a Kanban board and Claude AI agents implement them autonomously with human oversight at strategic decision points.

**NOMOS** = **N**avigation · **O**rchestration · **M**emory · **O**bservation · **S**hipping

This project is inspired by [Automaker](https://github.com/AutoMaker-Org/automaker) (an Electron/Express/React app for autonomous AI coding) but rebuilt from scratch using a modern, leaner stack via [better-t-stack](https://github.com/AmanVarshney01/create-better-t-stack).

---

## STARTING POINT

Generate the scaffold with:

```bash
bun create better-t-stack@latest nomos-ai
```

**Select these options:**
- Frontend: **React** (TanStack Router)
- Backend: **Hono**
- API Layer: **oRPC**
- Database: **SQLite**
- ORM: **Drizzle**
- Auth: **Better-Auth**
- Runtime: **Bun**
- Addons: **Turborepo**, **Tauri**, **Biome**, **Ultracite**

This gives you this starting structure:

```
nomos-ai/
├── apps/
│   ├── web/              # React 19 + TanStack Router + Vite + Tauri
│   └── server/           # Hono + oRPC + Drizzle
├── packages/
│   ├── api/              # oRPC routers + services (business logic)
│   ├── auth/             # better-auth configuration
│   └── db/               # Drizzle schema + migrations + repositories
├── turbo.json
├── biome.json
└── package.json          # Bun workspaces + Turborepo scripts
```

---

## MISSION

Build a **complete autonomous AI development studio** with these core capabilities:

1. **Kanban Board** — Visual feature management with drag-and-drop status transitions
2. **AI Agent Execution** — Claude Agent SDK integration with real-time streaming
3. **Git Worktree Isolation** — Each feature developed in its own worktree
4. **Auto-Mode** — Autonomous feature execution loop with failure detection
5. **Terminal Integration** — Embedded terminal with xterm.js
6. **Desktop App** — Tauri wrapper for native experience

---

## TECHNOLOGY STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Runtime** | Bun 1.3+ | Package manager, runtime, test runner |
| **Monorepo** | Turborepo | Build orchestration, caching |
| **Frontend** | React 19 + TanStack Router + TanStack Query | File-based routing, type-safe data fetching |
| **State** | Zustand 5 | Client-only state (UI, preferences) |
| **Styling** | Tailwind CSS 4 + shadcn/ui | CSS-based config (v4), Radix primitives |
| **Backend** | Hono | Lightweight, Bun-native HTTP framework |
| **API** | oRPC | End-to-end type-safe RPC (replaces tRPC) |
| **Database** | SQLite via libSQL + Drizzle ORM | Portable, no server, with typed queries |
| **Auth** | better-auth | Session-based authentication |
| **AI** | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | Agent execution with tool use |
| **Validation** | Zod 4 | Runtime validation + type inference |
| **Desktop** | Tauri | Native app wrapper (Rust backend) |
| **Linting** | Biome + Ultracite | Fast, unified linter/formatter |
| **Testing** | Vitest + Playwright | Unit/integration + E2E |

---

## ARCHITECTURE

### Monorepo Packages

```
packages/
├── types/     # @nomos-ai/types — Zod schemas, branded types, shared constants
├── db/        # @nomos-ai/db — Drizzle schemas, migrations, repositories
├── api/       # @nomos-ai/api — oRPC routers, services, business logic
├── auth/      # @nomos-ai/auth — better-auth configuration
├── env/       # @nomos-ai/env — Environment variable validation (Zod)
└── config/    # @nomos-ai/config — Shared TypeScript/Biome config
```

### Applications

```
apps/
├── web/       # React frontend (Vite dev, Tauri desktop)
└── server/    # Hono HTTP server + WebSocket
```

### Data Flow

```
┌─────────┐  oRPC/HTTP   ┌──────────┐  Drizzle   ┌──────────┐
│   web   │ ───────────→  │  server  │ ─────────→  │  SQLite  │
│ (React) │ ←───────────  │  (Hono)  │ ←─────────  │   (DB)   │
└─────────┘  WebSocket    └──────────┘  Claude SDK └──────────┘
                               │
                               ↓
                        ┌──────────────┐
                        │ Claude Agent │
                        │    SDK API   │
                        └──────────────┘
```

---

## DATABASE SCHEMA (Drizzle ORM)

### Core Tables

```typescript
// packages/db/src/schema/

// projects.ts
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),           // P### format
  name: text('name').notNull(),
  path: text('path').notNull(),          // Filesystem path
  description: text('description'),
  status: text('status', { enum: ['active', 'archived'] }).default('active'),
  userId: text('user_id').notNull(),     // Data isolation
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// features.ts
export const features = sqliteTable('features', {
  id: text('id').primaryKey(),           // F### format (F001-F999)
  projectId: text('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),  // CAT-XXX
  phase: text('phase').notNull(),        // phase-1 to phase-4
  status: text('status', {
    enum: ['backlog', 'pending', 'in_progress', 'waiting_approval', 'verified', 'failed']
  }).default('backlog'),
  passes: integer('passes', { mode: 'boolean' }).default(false),
  priority: integer('priority'),
  estimation: text('estimation', { enum: ['XS', 'S', 'M', 'L', 'XL'] }),
  dependencies: text('dependencies', { mode: 'json' }).$type<string[]>(),
  acceptanceCriteria: text('acceptance_criteria', { mode: 'json' }).$type<string[]>(),
  model: text('model', { enum: ['opus', 'sonnet', 'haiku'] }).default('sonnet'),
  thinkingLevel: text('thinking_level', { enum: ['none', 'standard', 'extended', 'ultrathink'] }).default('standard'),
  planningMode: text('planning_mode', { enum: ['skip', 'lite', 'spec', 'full'] }).default('lite'),
  branchName: text('branch_name'),
  error: text('error'),
  summary: text('summary'),
  retries: integer('retries').default(0),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// sessions.ts — Agent chat sessions
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),           // S### format
  projectId: text('project_id').notNull().references(() => projects.id),
  featureId: text('feature_id').references(() => features.id),
  model: text('model').default('sonnet'),
  status: text('status', { enum: ['active', 'completed', 'failed', 'cancelled'] }).default('active'),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// messages.ts — Agent conversation messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls', { mode: 'json' }),
  thinkingContent: text('thinking_content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// events.ts — System event log
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),          // agent.started, feature.updated, etc.
  payload: text('payload', { mode: 'json' }),
  projectId: text('project_id').references(() => projects.id),
  featureId: text('feature_id').references(() => features.id),
  sessionId: text('session_id').references(() => sessions.id),
  userId: text('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// learnings.ts — Knowledge captured from feature execution
export const learnings = sqliteTable('learnings', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  featureId: text('feature_id').references(() => features.id),
  type: text('type', { enum: ['pattern', 'antipattern', 'insight', 'metric'] }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// notifications.ts
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['info', 'success', 'warning', 'error'] }).notNull(),
  title: text('title').notNull(),
  message: text('message'),
  projectId: text('project_id').references(() => projects.id),
  featureId: text('feature_id').references(() => features.id),
  read: integer('read', { mode: 'boolean' }).default(false),
  dismissed: integer('dismissed', { mode: 'boolean' }).default(false),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// settings.ts — Layered configuration
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  scope: text('scope', { enum: ['global', 'project', 'user'] }).default('global'),
  scopeId: text('scope_id'),            // projectId or userId
  userId: text('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// worktrees.ts — Git worktree tracking
export const worktrees = sqliteTable('worktrees', {
  id: text('id').primaryKey(),
  featureId: text('feature_id').notNull().references(() => features.id),
  projectId: text('project_id').notNull().references(() => projects.id),
  branchName: text('branch_name').notNull(),
  path: text('path').notNull(),
  status: text('status', { enum: ['active', 'merged', 'deleted'] }).default('active'),
  prNumber: integer('pr_number'),
  prState: text('pr_state', { enum: ['open', 'closed', 'merged'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### Repository Pattern

Each table gets a repository class in `packages/db/src/repositories/`:

```typescript
// Example: packages/db/src/repositories/feature.ts
export function createFeatureRepository(db: DrizzleDB) {
  return {
    findById(id: string) { ... },
    findByProject(projectId: string, filters?: FeatureFilters) { ... },
    create(data: InsertFeature) { ... },
    update(id: string, data: Partial<InsertFeature>) { ... },
    updateStatus(id: string, status: FeatureStatus) { ... },
    bulkUpdateStatus(ids: string[], status: FeatureStatus) { ... },
    delete(id: string) { ... },
    count(projectId: string) { ... },
  };
}
```

---

## TYPES PACKAGE (Zod Schemas)

```
packages/types/src/
├── ids.ts              # Branded types: FeatureId, ProjectId, SessionId
├── feature.ts          # FeatureSchema, FeatureStatus, Feature type
├── project.ts          # ProjectSchema, Project type
├── session.ts          # SessionSchema, Session type
├── message.ts          # MessageSchema, ContentBlock types
├── event.ts            # EventSchema, EventType enum
├── notification.ts     # NotificationSchema
├── settings.ts         # SettingsSchema, layered config types
├── provider.ts         # Claude model types, ExecuteOptions
├── pipeline.ts         # PipelineStep, PipelineState types
├── worktree.ts         # WorktreeSchema
├── pagination.ts       # PaginatedResponse<T>
├── status.ts           # VALID_TRANSITIONS, StatusColors (single source of truth)
└── index.ts            # Re-exports everything
```

### Key Types

```typescript
// ids.ts — Branded types prevent mixing IDs
type FeatureId = string & { readonly __brand: 'FeatureId' };  // F001-F999
type ProjectId = string & { readonly __brand: 'ProjectId' };  // P001-P999
type SessionId = string & { readonly __brand: 'SessionId' };  // S001-S999

// feature.ts
const FeatureStatusEnum = z.enum([
  'backlog', 'pending', 'in_progress', 'waiting_approval', 'verified', 'failed'
]);

// status.ts — Single source of truth for transitions
const VALID_TRANSITIONS: Record<FeatureStatus, FeatureStatus[]> = {
  backlog: ['pending', 'in_progress'],
  pending: ['in_progress', 'backlog'],
  in_progress: ['waiting_approval', 'failed', 'backlog'],
  waiting_approval: ['verified', 'in_progress', 'backlog'],
  verified: ['backlog'],       // reopen
  failed: ['in_progress'],     // retry
};

// provider.ts — Claude model resolution
const CLAUDE_MODEL_MAP = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
  opus: 'claude-opus-4-6',
} as const;
```

---

## BACKEND SERVICES (packages/api)

### Service Architecture

```
packages/api/src/
├── routers/                # oRPC routers (API layer)
│   ├── project.ts          # CRUD + list + switch
│   ├── feature.ts          # CRUD + bulk ops + status transitions + filters
│   ├── session.ts          # Create + list + history + replay
│   ├── agent.ts            # Start/stop/send/queue
│   ├── auto-mode.ts        # Start/stop/pause/resume/status
│   ├── worktree.ts         # Create/delete/list/status
│   ├── git.ts              # Diff/commit/status/merge
│   ├── terminal.ts         # Create/resize/input/output sessions
│   ├── settings.ts         # Get/set (global + project scoped)
│   ├── notification.ts     # List/read/dismiss
│   ├── github.ts           # PRs/issues integration
│   ├── health.ts           # Health check
│   └── index.ts            # Combined router export
├── services/               # Business logic
│   ├── agent-service.ts    # Claude SDK wrapper, session management
│   ├── auto-mode-service.ts# Autonomous execution loop
│   ├── pipeline-service.ts # Feature execution pipeline (worktree → code → gates → PR)
│   ├── worktree-service.ts # Git worktree create/delete/validate
│   ├── terminal-service.ts # PTY sessions via Bun.spawn
│   ├── settings-service.ts # Layered settings (default → global → project)
│   ├── notification-service.ts
│   ├── github-service.ts   # `gh` CLI wrapper
│   ├── spec-service.ts     # Project spec parsing
│   └── fs-service.ts       # Sandboxed file operations
├── lib/                    # Shared utilities
│   ├── websocket.ts        # WebSocket event broadcasting
│   ├── event-emitter.ts    # Typed event system
│   ├── error-handler.ts    # Standardized error responses
│   └── prompt-builder.ts   # Agent system prompt construction
└── index.ts                # Exports all routers + services
```

### Key Service: Agent Service

```typescript
// services/agent-service.ts
export class AgentService {
  // Start agent session for a feature
  async startSession(projectId: string, featureId: string, options: ExecuteOptions): Promise<Session>;

  // Send message to active session (streaming response)
  async sendMessage(sessionId: string, message: string): AsyncGenerator<StreamEvent>;

  // Stop active session
  async stopSession(sessionId: string): Promise<void>;

  // Get session history
  async getHistory(sessionId: string): Promise<Message[]>;

  // Queue feature for execution
  async queueFeature(featureId: string, options?: QueueOptions): Promise<void>;
}
```

### Key Service: Auto-Mode

```typescript
// services/auto-mode-service.ts
export class AutoModeService {
  // Start autonomous loop
  async start(projectId: string): Promise<void>;

  // Picks next feature from queue by priority + dependencies
  // Creates worktree → executes agent → runs quality gates → creates PR
  // Pauses after 3 consecutive failures (ART-007)

  async stop(): Promise<void>;
  async pause(): Promise<void>;
  async resume(): Promise<void>;
  async getStatus(): Promise<AutoModeStatus>;
}
```

### Key Service: Pipeline

```typescript
// services/pipeline-service.ts — Feature execution pipeline
// 1. Create worktree (nomos/F###)
// 2. Start agent session with feature context
// 3. Agent implements feature
// 4. Run quality gates (TypeScript → Lint → Test → Build)
// 5. If gates pass → commit → push → create PR
// 6. If gates fail → retry up to 3 times
// 7. Capture learnings
```

---

## FRONTEND APPLICATION (apps/web)

### Route Structure (TanStack Router, file-based)

```
apps/web/src/routes/
├── __root.tsx              # Root layout: auth guard, sidebar, theme provider, WebSocket
├── index.tsx               # Dashboard / home
├── board.tsx               # Kanban board (main view)
├── feature.$featureId.tsx  # Feature detail view
├── agent.tsx               # Agent chat interface
├── terminal.tsx            # Terminal sessions
├── settings.tsx            # Settings page
├── auto-mode.tsx           # Auto-mode dashboard
├── graph.tsx               # Feature dependency graph
├── activity.tsx            # Event history / activity log
├── login.tsx               # Login page (unauthenticated)
└── signup.tsx              # Signup page
```

### Component Architecture

```
apps/web/src/
├── components/
│   ├── kanban/
│   │   ├── kanban-board.tsx        # Main board with columns (dnd-kit)
│   │   ├── kanban-column.tsx       # Status column with cards
│   │   ├── kanban-card.tsx         # Feature card (draggable)
│   │   ├── feature-detail-panel.tsx# Slide-over detail view
│   │   ├── kanban-filter-bar.tsx   # Search + category/phase filters
│   │   └── feature-form.tsx        # Create/edit feature dialog
│   ├── agent/
│   │   ├── agent-chat.tsx          # Chat interface with messages
│   │   ├── message-bubble.tsx      # Single message (user/assistant)
│   │   ├── tool-call-display.tsx   # Tool use visualization
│   │   ├── thinking-display.tsx    # Extended thinking block
│   │   └── streaming-indicator.tsx # Typing/streaming animation
│   ├── terminal/
│   │   ├── terminal-view.tsx       # xterm.js terminal emulator
│   │   ├── terminal-tabs.tsx       # Multiple terminal sessions
│   │   └── terminal-split.tsx      # Split pane terminals
│   ├── auto-mode/
│   │   ├── auto-mode-dashboard.tsx # Status, controls, progress
│   │   ├── feature-queue.tsx       # Ordered execution queue
│   │   ├── pipeline-stepper.tsx    # Current feature pipeline steps
│   │   └── event-feed.tsx          # Live event stream
│   ├── diff/
│   │   ├── diff-viewer.tsx         # Git diff display
│   │   └── diff-header.tsx         # File path + stats
│   ├── settings/
│   │   ├── settings-layout.tsx     # Tab layout for settings
│   │   ├── model-tab.tsx           # AI model configuration
│   │   ├── auto-mode-tab.tsx       # Auto-mode settings
│   │   ├── terminal-tab.tsx        # Terminal preferences
│   │   └── integration-tab.tsx     # API keys, GitHub, etc.
│   ├── notifications/
│   │   ├── notification-bell.tsx   # Header bell with badge
│   │   └── notification-list.tsx   # Dropdown list
│   ├── layout/
│   │   ├── app-sidebar.tsx         # Main sidebar navigation
│   │   ├── project-selector.tsx    # Project switcher dropdown
│   │   ├── header.tsx              # Top bar with actions
│   │   └── nav-links.tsx           # Sidebar navigation items
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx, card.tsx, dialog.tsx, input.tsx, ...
│   │   └── sonner.tsx              # Toast notifications
│   ├── error-boundary.tsx
│   ├── command-palette.tsx         # Ctrl+K command palette
│   ├── connection-status.tsx       # WebSocket status indicator
│   ├── mode-toggle.tsx             # Dark/light theme toggle
│   ├── sign-in-form.tsx
│   └── sign-up-form.tsx
├── hooks/
│   ├── use-websocket.ts            # WebSocket connection + auto-reconnect
│   ├── use-event-stream.ts         # Subscribe to typed events
│   ├── use-auto-mode.ts            # Auto-mode controls
│   ├── use-auto-mode-status.ts     # Auto-mode reactive status
│   ├── use-terminal.ts             # Terminal session management
│   ├── use-settings.ts             # Settings get/set
│   ├── use-notifications.ts        # Notification state
│   ├── use-keyboard-shortcuts.ts   # Global keyboard shortcuts
│   ├── use-worktrees.ts            # Worktree operations
│   └── use-github.ts               # GitHub integration
├── stores/
│   ├── app-store.ts                # Theme, sidebar, UI state (Zustand)
│   ├── project-store.ts            # Current project selection
│   └── notification-store.ts       # Unread count, dismiss
├── lib/
│   ├── orpc-client.ts              # oRPC client configuration
│   ├── query-client.ts             # TanStack Query setup
│   ├── utils.ts                    # cn() helper, formatters
│   └── auth-client.ts              # better-auth client
└── index.css                       # Tailwind CSS 4 + theme tokens
```

### Zustand Store Rules

- **Zustand** = client-only state (theme, sidebar open/closed, selected project)
- **TanStack Query** = server state (features, sessions, settings from API)
- **Never** duplicate server data in Zustand stores
- Keep stores small and focused — one per domain

### WebSocket Architecture

```typescript
// hooks/use-websocket.ts
// Connects to ws://localhost:3000/ws
// Events: agent.output, agent.started, agent.stopped, agent.error
//         feature.updated, feature.status_changed
//         auto-mode.started, auto-mode.paused, auto-mode.stopped
//         terminal.output
//         notification.created
// Auto-reconnect with exponential backoff
// Connection status indicator in header
```

---

## HONO SERVER (apps/server)

```typescript
// apps/server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createBunWebSocket } from 'hono/bun';
import { appRouter } from '@nomos-ai/api';
import { createORPCHandler } from '@orpc/server/hono';
import { db } from '@nomos-ai/db';
import { auth } from '@nomos-ai/auth';

const app = new Hono();

// Middleware
app.use('/*', cors({ origin: ['http://localhost:3001'], credentials: true }));
app.use('/api/auth/*', auth.handler);  // better-auth routes

// oRPC handler
app.use('/api/rpc/*', createORPCHandler({ router: appRouter, context: { db } }));

// WebSocket (Bun native)
const { upgradeWebSocket, websocket } = createBunWebSocket();
app.get('/ws', upgradeWebSocket((c) => ({
  onOpen(evt, ws) { /* register client */ },
  onMessage(evt, ws) { /* handle terminal input, subscriptions */ },
  onClose(evt, ws) { /* cleanup */ },
})));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));

export default {
  port: 3000,
  fetch: app.fetch,
  websocket,
};
```

---

## FEATURE STATE MACHINE

```
backlog ──→ pending ──→ in_progress ──→ waiting_approval ──→ verified
  ↑                        │                    │               │
  └── cancel ──────────────┘                    │               │
  ↑                        │                    │               │
  └── reset ───────────────┼────────────────────┘               │
  ↑                                                             │
  └── reopen ───────────────────────────────────────────────────┘
                           │
                           ↓
                        failed ──→ in_progress (retry)
```

### States

| Status | Description |
|--------|-------------|
| `backlog` | Not scheduled, awaiting prioritization |
| `pending` | Ready to start, dependencies met |
| `in_progress` | Agent actively working on feature |
| `waiting_approval` | Quality gates passed, awaiting human review |
| `verified` | Approved and merged (terminal state) |
| `failed` | Implementation failed (with error message, retryable) |

---

## QUALITY GATES

All 4 gates must pass before a feature can reach `waiting_approval`:

```bash
bun run check-types    # TypeScript compilation
bun run check          # Biome lint + format
bun run test           # Vitest test suite
bun run build          # Production build
```

---

## CONSTITUTIONAL PRINCIPLES (7 Immutable Articles)

These are non-negotiable rules the system enforces:

1. **ART-001: Specification First** — Every feature must have title, description, and acceptance criteria before implementation
2. **ART-002: Quality Gate Imperative** — All 4 quality gates must pass before merge to main
3. **ART-003: Human Approval Required** — Human approval required for all merges to main
4. **ART-004: Worktree Isolation** — Each feature developed in isolated git worktree (`nomos/F###`)
5. **ART-005: Incremental Progress** — Each agent session works on exactly one feature
6. **ART-006: Learning Preservation** — Insights captured and persisted after each merge
7. **ART-007: Fail-Safe Auto-Mode** — Auto-mode pauses after 3 consecutive failures

---

## FEATURE CATEGORIES (20)

| ID | Name | Scope |
|----|------|-------|
| CAT-PRJ | Project Management | Multi-project support, workspace management |
| CAT-KAN | Kanban & Features | Feature board UI, drag-drop, filters |
| CAT-AGT | AI Agent System | Claude SDK integration, execution engine |
| CAT-AUT | Automation & Auto-Mode | Autonomous loop, queue management |
| CAT-GIT | Git Integration | Worktrees, branches, commits, merges |
| CAT-TRM | Terminal Integration | PTY sessions, xterm.js, splits |
| CAT-GHB | GitHub Integration | PRs, issues, actions |
| CAT-THM | Theming & Customization | Dark/light modes, fonts, layouts |
| CAT-DXP | Developer Experience | Shortcuts, productivity, ergonomics |
| CAT-SEC | Security | Auth, validation, sandboxing |
| CAT-CFG | Configuration | Settings, preferences, persistence |
| CAT-NTF | Notifications & Events | Alerts, toasts, event streaming |
| CAT-SPC | Specification System | Specs, acceptance criteria, planning |
| CAT-MEM | Memory & Context | Learning, patterns, CLAUDE.md |
| CAT-DEP | Dependency Management | Feature deps, resolution, ordering |
| CAT-DSK | Desktop Integration | Tauri, native features, tray |
| CAT-API | API & Backend | oRPC, endpoints, WebSocket |
| CAT-DBS | Database | Drizzle, SQLite, migrations |
| CAT-TST | Testing | Unit, integration, E2E tests |
| CAT-OBS | Observability | Logging, metrics, debugging |

---

## DEVELOPMENT PHASES (4)

### Phase 1: Foundation (66 features)
- Monorepo scaffold with Turborepo
- Shared types package with Zod schemas + branded types
- Database schema, migrations, repository pattern
- Hono server setup with oRPC routers (projects, features, sessions)
- React app with TanStack Router + Query + Zustand
- Kanban board with drag-drop, filters, search
- Feature create/edit forms
- better-auth session authentication
- Basic security headers

### Phase 2: Agent Integration (79 features)
- Claude Agent SDK client setup
- Agent session creation and management
- Agent execution with streaming output
- WebSocket server for real-time events
- Agent output viewer, tool call visualization, thinking display
- Git worktree creation/deletion services
- Git commit, diff, status operations
- Quality gates chain (TypeScript → Lint → Test → Build)
- Agent tools (read, write, edit, bash, glob, grep)
- System prompt builder

### Phase 3: Auto-Mode (46 features)
- Auto-mode execution loop
- Feature queue management with priority + dependency ordering
- Failure detection and automatic pause
- Resume after human intervention
- Concurrency limit (parallel agent execution)
- Session persistence and recovery
- MCP server integration
- Agent checkpoint system
- Batch feature execution

### Phase 4: Desktop & Polish (37 features)
- Tauri desktop wrapper with system tray
- Terminal integration (xterm.js + PTY + tabs + splits)
- Theme system (dark/light + 10+ color themes)
- Keyboard shortcuts + command palette (Ctrl+K)
- Notification system (bell + toasts + event log)
- GitHub PR/issue integration
- Feature dependency graph visualization
- Settings UI (model, auto-mode, terminal, integrations)
- Error boundary + toast system
- Production Dockerfile + CI pipeline

---

## ENVIRONMENT VARIABLES

```env
# apps/server/.env
DATABASE_URL=file:./data/nomos.db
BETTER_AUTH_SECRET=<random-32-char>
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=<optional-if-using-cli-auth>
PORT=3000

# apps/web/.env
VITE_SERVER_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

---

## GIT WORKFLOW

- **Branch naming:** `nomos/{feature-id}` (e.g., `nomos/F034`)
- **Commit format:** `feat(F034): WebSocket server for real-time events`
- **Worktree path:** `.worktrees/nomos-F034/`
- **PR creation:** Automatic after quality gates pass
- **Main branch:** `main` (protected, requires approval)

---

## IMPLEMENTATION PATTERNS

### 1. oRPC Router Pattern

```typescript
// packages/api/src/routers/feature.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { FeatureSchema } from '@nomos-ai/types';

export const featureRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string(), status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.feature.findByProject(input.projectId, { status: input.status });
    }),
  create: publicProcedure
    .input(FeatureSchema.omit({ id: true }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.feature.create(input);
    }),
  updateStatus: publicProcedure
    .input(z.object({ id: z.string(), status: FeatureStatusEnum }))
    .mutation(async ({ input, ctx }) => {
      // Validate transition
      return ctx.db.feature.updateStatus(input.id, input.status);
    }),
});
```

### 2. WebSocket Event Pattern

```typescript
// packages/api/src/lib/websocket.ts
type WSEvent =
  | { type: 'agent.output'; sessionId: string; content: string }
  | { type: 'agent.tool_call'; sessionId: string; tool: string; input: unknown }
  | { type: 'feature.status_changed'; featureId: string; from: string; to: string }
  | { type: 'auto_mode.status'; status: 'running' | 'paused' | 'stopped' }
  | { type: 'terminal.output'; terminalId: string; data: string }
  | { type: 'notification'; notification: Notification };

export class EventBroadcaster {
  private clients = new Set<ServerWebSocket>();
  broadcast(event: WSEvent) { ... }
  subscribe(ws: ServerWebSocket) { ... }
  unsubscribe(ws: ServerWebSocket) { ... }
}
```

### 3. Claude Agent SDK Pattern

```typescript
// packages/api/src/services/agent-service.ts
import { Claude } from '@anthropic-ai/claude-agent-sdk';

const claude = new Claude({
  model: resolveModel(feature.model),
  maxTurns: 50,
  systemPrompt: buildFeaturePrompt(feature, project),
});

// Stream execution
for await (const event of claude.stream(userMessage)) {
  if (event.type === 'text') broadcaster.broadcast({ type: 'agent.output', ... });
  if (event.type === 'tool_use') broadcaster.broadcast({ type: 'agent.tool_call', ... });
  if (event.type === 'thinking') broadcaster.broadcast({ type: 'agent.thinking', ... });
}
```

### 4. Kanban Drag-and-Drop Pattern

```typescript
// Uses @dnd-kit/core + @dnd-kit/sortable
// Columns = feature statuses (backlog, in_progress, waiting_approval, verified)
// Cards = features (draggable between columns)
// On drop: validate transition via VALID_TRANSITIONS, call updateStatus mutation
// Optimistic update via TanStack Query's onMutate
```

---

## NON-FUNCTIONAL REQUIREMENTS

### Security
- Session-based auth with better-auth (no raw JWT)
- API key protection (ANTHROPIC_API_KEY in env, never exposed to client)
- Input validation on all endpoints (Zod)
- CORS protection (whitelist origins)
- Security headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options)
- Agent tools sandboxed to worktree directory only
- User data isolation (all queries scoped by userId)

### Performance
- API response time <100ms for CRUD operations
- WebSocket latency <50ms for streaming
- UI renders at 60fps
- Database queries optimized with indexes
- Lazy loading for heavy components (terminal, diff viewer)

### Reliability
- Graceful error handling with error boundary
- Session recovery after crashes
- Atomic database writes
- Auto-reconnect for WebSocket with exponential backoff
- Auto-mode pause on consecutive failures

### Accessibility
- WCAG 2.1 AA compliance
- Full keyboard navigation
- Screen reader support
- Sufficient color contrast across all themes

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Feature completion rate | >90% first-attempt success |
| Quality gate pass rate | >95% on first submission |
| Auto-mode uptime | >99% when enabled |
| Context recovery time | <30 seconds |

---

## IMPORTANT CONVENTIONS

1. **IDs use branded format:** F001-F999 (features), P001-P999 (projects), S001-S999 (sessions) — not UUIDs
2. **Status transitions validated server-side** using VALID_TRANSITIONS from `@nomos-ai/types`
3. **Constants (categories, phases, sizes, colors) defined once** in `@nomos-ai/types` and imported everywhere
4. **Error handlers never expose internal details** — standardized error responses
5. **Tailwind v4 uses CSS-based config** (`index.css @theme`), NOT `tailwind.config.js`
6. **TanStack Query for server state, Zustand for client state** — never mix
7. **oRPC provides end-to-end type safety** — never manually type API responses
8. **All database access goes through repository pattern** — no raw queries in routers
9. **WebSocket events are typed** — use discriminated unions
10. **Agent execution always happens in a worktree** — never modify main branch directly

---

## REFERENCE APPLICATION

This project is modeled after **Automaker** (https://github.com/AutoMaker-Org/automaker), an Electron/Express/Node.js autonomous coding studio. Key differences:

| Aspect | Automaker | NOMOS AI |
|--------|-----------|----------|
| Runtime | Node.js | Bun |
| Server | Express 5 | Hono |
| RPC | REST routes | oRPC (type-safe) |
| Database | JSON files | SQLite + Drizzle |
| Desktop | Electron | Tauri |
| Types | TS interfaces | Zod schemas + branded types |
| WebSocket | `ws` library | Bun native |
| Terminal | `node-pty` | Bun.spawn |
| AI Providers | Multi (Claude, Codex, Cursor) | Claude only |
| Auth | Session + API key | better-auth |
| State | Zustand + localStorage | Zustand + TanStack Query + SQLite |

---

## INSTRUCTIONS FOR THE AI

1. Start from the `better-t-stack` scaffold output
2. Build incrementally — Phase 1 first (foundation), then Phase 2 (agent integration), etc.
3. Follow the constitutional principles (7 articles) strictly
4. Use the exact technology stack specified — no substitutions
5. Implement the repository pattern for all database access
6. Type everything with Zod schemas in the types package
7. Use branded types for entity IDs
8. WebSocket events must use typed discriminated unions
9. All features on the Kanban board support drag-and-drop status transitions
10. Agent execution MUST happen in isolated git worktrees
11. The auto-mode loop MUST pause after 3 consecutive failures
12. Quality gates are blocking — no merge without all 4 passing
13. Keep the codebase clean — Biome lint + format, TypeScript strict
14. Run `bun run check-types && bun run check && bun run build` after each major change
15. Test critical paths with Vitest (repositories, services, status transitions)
