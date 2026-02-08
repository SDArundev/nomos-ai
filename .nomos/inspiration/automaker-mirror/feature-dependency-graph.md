# Feature Dependency Graph: Automaker Mirror

> Reference for session planning. Defines execution groups, parallel plan, per-feature file lists, and dependencies.
>
> **Feature IDs: F258-F265** (mapped from plan's F040-F047)

---

## ID Mapping (Plan → Actual)

| Plan ID | Actual ID | Title |
|---------|-----------|-------|
| F040 | **F258** | Types + DB Layer |
| F041 | **F259** | Agent Engine + WebSocket |
| F042 | **F260** | Autonomous Loop + Pipeline |
| F043 | **F261** | Terminal Service |
| F044 | **F262** | Settings + Notifications + GitHub + FS |
| F045 | **F263** | WebSocket Client + Agent View |
| F046 | **F264** | Terminal + Diff + Enhanced Kanban |
| F047 | **F265** | Settings UI + Auto-Mode Dashboard |

---

## Execution Groups Overview

```
Session 1:  F258 ‖ F259                          (2 agents: Types+DB ‖ Agent+WS)
Session 2:  F260 ‖ F261 ‖ F262                   (3 agents: AutoLoop ‖ Terminal ‖ Services)
Session 3:  F263 ‖ F264 ‖ F265                   (3 agents: Agent UI ‖ Terminal UI ‖ Polish)
```

---

## Dependency Graph

```
F258 (Types + DB) ──────────────┬──→ F260 (Autonomous Loop)
                                ├──→ F261 (Terminal Service)
                                └──→ F262 (Settings + Notifications + GitHub + FS)

F259 (Agent + WebSocket) ───────┬──→ F260 (Autonomous Loop)
                                └──→ F263 (WebSocket Client + Agent View)

F260 (Autonomous Loop) ─────────┬──→ F263 (Agent View — needs auto-mode events)
                                └──→ F265 (Auto-Mode Dashboard)

F261 (Terminal Service) ────────┬──→ F264 (Terminal UI)

F262 (Settings + Services) ─────┬──→ F265 (Settings UI)
                                └──→ F264 (Notification display)

F263 (Agent View) ──────────────┘ (frontend, no downstream)
F264 (Terminal + Diff + Kanban) ┘ (frontend, no downstream)
F265 (Settings + Dashboard) ────┘ (frontend, no downstream)
```

### Simplified Dependency Matrix

| Feature | Depends On | Blocks |
|---------|------------|--------|
| F258 | — | F260, F261, F262, F263, F264, F265 |
| F259 | — | F260, F263 |
| F260 | F258, F259 | F263, F265 |
| F261 | F258 | F264 |
| F262 | F258 | F264, F265 |
| F263 | F258, F259, F260 | — |
| F264 | F258, F261, F262 | — |
| F265 | F258, F260, F262 | — |

---

## Group 1: Backend Foundation (Session 1)

### F258: Types + DB Layer (~27 files)

**No dependencies.** Can run immediately.

#### Files to Create

```
packages/types/src/event.ts
packages/types/src/provider.ts
packages/types/src/message.ts
packages/types/src/notification.ts
packages/types/src/worktree.ts
packages/types/src/settings.ts
packages/types/src/pipeline.ts
packages/types/src/pagination.ts
packages/db/src/schema/events.ts
packages/db/src/schema/messages.ts
packages/db/src/schema/notifications.ts
packages/db/src/schema/settings.ts
packages/db/src/schema/worktrees.ts
packages/db/src/repositories/event.ts
packages/db/src/repositories/message.ts
packages/db/src/repositories/notification.ts
packages/db/src/repositories/setting.ts
packages/db/src/repositories/worktree.ts
```

#### Files to Modify

```
packages/types/src/ids.ts              # Add WorktreeId, EventId, MessageId, NotificationId, SettingId
packages/types/src/feature.ts          # Add worktree/locking/pipeline fields
packages/types/src/session.ts          # Add sdkSessionId, model, isRunning
packages/types/src/agent.ts            # Add AgentDefinition
packages/types/src/index.ts            # Re-export new modules
packages/db/src/schema/features.ts     # Add new columns
packages/db/src/schema/sessions.ts     # Add new columns
packages/db/src/schema/index.ts        # Re-export new schemas
packages/db/src/repositories/index.ts  # Re-export new repos
```

#### Acceptance Criteria

1. `bun run check-types` passes with zero errors
2. `bun run db:generate` creates migrations for all new/modified tables
3. All new types importable from `@nomos/types`
4. All new schemas importable from `@nomos/db`
5. All repository methods have proper TypeScript signatures
6. Branded ID types enforce type safety at compile time

---

### F259: Agent Engine + WebSocket (~11 files)

**No dependencies.** Can run in parallel with F258.

> Note: F259 creates service files that import from `@nomos/types` and `@nomos/db`. If running truly in parallel, F259 agent should define local type stubs that match F258's output. In practice, F258 is fast and can complete first.

#### Files to Create

```
packages/api/src/services/claude-provider.ts
packages/api/src/services/sdk-options.ts
packages/api/src/services/event-service.ts
packages/api/src/services/event-broadcaster.ts
packages/api/src/routers/agent.ts
packages/api/src/routers/events.ts
apps/server/src/lib/websocket.ts
```

#### Files to Modify

```
packages/api/src/services/agent-service.ts    # REWRITE: full session + SDK streaming
packages/api/src/routers/index.ts             # Mount agent, events routers
apps/server/src/index.ts                      # Add WebSocket upgrade handler
packages/api/src/context.ts                   # Add services to oRPC context
```

#### Acceptance Criteria

1. Server starts without errors
2. WebSocket connection to `/ws/events` succeeds with auth
3. Agent session can be created via oRPC
4. Sending a message invokes Claude SDK and streams response
5. Events are broadcast to connected WebSocket clients
6. SDK session ID is persisted for conversation resumption

---

## Group 2: Backend Services (Session 2)

### F260: Autonomous Loop (~11 files)

**Depends on: F258 (types/DB), F259 (agent/WS)**

#### Files to Create

```
packages/api/src/services/worktree-service.ts
packages/api/src/services/prompt-builder.ts
packages/api/src/services/pipeline-service.ts
packages/api/src/services/auto-mode-service.ts
packages/api/src/routers/auto-mode.ts
packages/api/src/routers/worktree.ts
packages/api/src/routers/pipeline.ts
packages/api/src/lib/git-utils.ts
```

#### Files to Modify

```
packages/api/src/routers/index.ts             # Mount auto-mode, worktree, pipeline routers
packages/api/src/context.ts                   # Add new services to context
packages/db/src/repositories/feature.ts       # Add findNextPending, updatePipelineStep
packages/db/src/repositories/worktree.ts      # (created in F040, may need adjustments)
```

#### Acceptance Criteria

1. Auto-mode starts and emits `auto-mode:started` event
2. Picks next pending feature respecting dependency order
3. Creates git worktree for feature isolation
4. Runs 7-step pipeline with checkpoint/resume
5. Updates feature status through lifecycle (pending → in_progress → waiting_approval)
6. Stops gracefully with `auto-mode:stopped` event
7. Pauses after 3 consecutive failures

---

### F261: Terminal Service (~6 files)

**Depends on: F258 (types/DB only)**

#### Files to Create

```
packages/api/src/services/terminal-service.ts
packages/api/src/routers/terminal.ts
```

#### Files to Modify

```
packages/api/src/routers/index.ts             # Mount terminal router
packages/api/src/context.ts                   # Add terminal service
apps/server/src/lib/websocket.ts              # Add terminal WS channel handling
apps/server/src/index.ts                      # Add /ws/terminal upgrade route
```

#### Acceptance Criteria

1. Terminal session creates via API
2. WebSocket connection to `/ws/terminal?sessionId=X` streams output
3. Input sent via WebSocket reaches shell process
4. Output is batched (4KB/4ms) to prevent flooding
5. 50KB scrollback buffer maintained
6. Session cleanup on disconnect

---

### F262: Settings + Notifications + GitHub + FS (~11 files)

**Depends on: F258 (types/DB)**

#### Files to Create

```
packages/api/src/services/settings-service.ts
packages/api/src/services/notification-service.ts
packages/api/src/services/github-service.ts
packages/api/src/services/fs-service.ts
packages/api/src/routers/settings.ts
packages/api/src/routers/notifications.ts
packages/api/src/routers/github.ts
packages/api/src/routers/fs.ts
packages/api/src/routers/models.ts
```

#### Files to Modify

```
packages/api/src/routers/index.ts             # Mount all new routers
packages/api/src/context.ts                   # Add all new services
```

#### Acceptance Criteria

1. Settings save/load with layered resolution (default → global → project)
2. Notifications created on feature events, retrievable by project
3. Mark-read and dismiss work
4. GitHub service lists issues and PRs via `gh` CLI
5. FS service validates paths against allowed root (no traversal)
6. Models endpoint returns available Claude models

---

## Group 3: Frontend (Session 3)

### F263: WebSocket Client + Agent View (~14 files)

**Depends on: F258, F259, F260**

#### Files to Create

```
apps/web/src/lib/websocket.ts
apps/web/src/hooks/use-websocket.ts
apps/web/src/hooks/use-event-stream.ts
apps/web/src/hooks/use-agent-stream.ts
apps/web/src/store/agent-store.ts
apps/web/src/routes/agent.tsx
apps/web/src/components/agent/agent-chat.tsx
apps/web/src/components/agent/message-list.tsx
apps/web/src/components/agent/message-bubble.tsx
apps/web/src/components/agent/tool-call-display.tsx
apps/web/src/components/agent/streaming-indicator.tsx
apps/web/src/components/agent/session-sidebar.tsx
apps/web/src/components/agent/agent-input.tsx
```

#### Files to Modify

```
apps/web/src/routes/__root.tsx                # Add agent route
apps/web/src/routeTree.gen.ts                 # Auto-generated
apps/web/src/store/index.ts                   # Export agent store (if central)
```

#### Acceptance Criteria

1. WebSocket client auto-connects with backoff on failure
2. Agent view renders at `/agent` route
3. Real-time streaming of agent output with typing indicator
4. Tool calls display with name, input, and result
5. Session sidebar shows history, allows switching
6. Messages persist across page reloads (from DB via API)

---

### F264: Terminal + Diff + Enhanced Kanban (~13 files)

**Depends on: F258, F261, F262**

#### Files to Create

```
apps/web/src/routes/terminal.tsx
apps/web/src/components/terminal/terminal-view.tsx
apps/web/src/components/terminal/terminal-tabs.tsx
apps/web/src/components/terminal/terminal-split.tsx
apps/web/src/store/terminal-store.ts
apps/web/src/hooks/use-terminal.ts
apps/web/src/components/diff/diff-viewer.tsx
apps/web/src/components/diff/diff-header.tsx
apps/web/src/components/kanban/kanban-board.tsx
apps/web/src/components/kanban/kanban-column.tsx
apps/web/src/components/kanban/kanban-card.tsx
apps/web/src/components/kanban/kanban-card-detail.tsx
```

#### Files to Modify

```
apps/web/src/routes/__root.tsx                # Add terminal route
apps/web/src/routeTree.gen.ts                 # Auto-generated
package.json (apps/web)                       # Add @xterm/xterm, @dnd-kit/core, react-diff-viewer-continued
```

#### New Dependencies

```
@xterm/xterm
@xterm/addon-fit
@xterm/addon-web-links
@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities
react-diff-viewer-continued
```

#### Acceptance Criteria

1. Terminal renders at `/terminal` route with xterm.js
2. Multi-session tabs, switch between terminals
3. Input/output flows through WebSocket
4. Diff viewer renders side-by-side with syntax highlighting
5. Kanban board supports cross-column drag-and-drop via dnd-kit
6. Feature cards show status, progress, assignee

---

### F265: Settings + Auto-Mode Dashboard + Notifications + Themes (~24 files)

**Depends on: F258, F260, F262**

#### Files to Create

```
apps/web/src/routes/settings.tsx
apps/web/src/components/settings/settings-layout.tsx
apps/web/src/components/settings/general-tab.tsx
apps/web/src/components/settings/model-tab.tsx
apps/web/src/components/settings/auto-mode-tab.tsx
apps/web/src/components/settings/terminal-tab.tsx
apps/web/src/components/settings/integration-tab.tsx
apps/web/src/store/settings-store.ts
apps/web/src/hooks/use-settings.ts
apps/web/src/components/auto-mode/auto-mode-dashboard.tsx
apps/web/src/components/auto-mode/feature-queue.tsx
apps/web/src/components/auto-mode/event-feed.tsx
apps/web/src/components/auto-mode/pipeline-stepper.tsx
apps/web/src/store/auto-mode-store.ts
apps/web/src/hooks/use-auto-mode.ts
apps/web/src/components/notifications/notification-bell.tsx
apps/web/src/components/notifications/notification-list.tsx
apps/web/src/hooks/use-notifications.ts
apps/web/src/hooks/use-worktrees.ts
apps/web/src/hooks/use-github.ts
apps/web/src/lib/themes/index.ts
apps/web/src/lib/themes/theme-registry.ts
```

#### Files to Modify

```
apps/web/src/routes/__root.tsx                # Add settings route, notification bell
apps/web/src/routeTree.gen.ts                 # Auto-generated
apps/web/src/index.css                        # Theme CSS variables
```

#### Acceptance Criteria

1. Settings page with tabbed layout (general, model, auto-mode, terminal, integrations)
2. Settings persist via API (layered: global + project)
3. Auto-mode dashboard shows start/stop, active features, queue, event feed
4. Pipeline stepper visualizes 7-step progress per feature
5. Notification bell shows unread count, dropdown with list
6. Theme system with 10+ themes applied via CSS variables
7. All hooks connect to respective backend APIs

---

## File Count Summary

| Feature | Create | Modify | Total |
|---------|--------|--------|-------|
| F258 | 18 | 9 | 27 |
| F259 | 7 | 4 | 11 |
| F260 | 8 | 3 | 11 |
| F261 | 2 | 4 | 6 |
| F262 | 9 | 2 | 11 |
| F263 | 13 | 1 | 14 |
| F264 | 12 | 1 | 13 |
| F265 | 22 | 2 | 24 |
| **Total** | **91** | **26** | **~117** |

---

## Parallel Execution Rules

### Session 1 (F258 ‖ F259)
- **No cross-dependency**: Both build on existing codebase
- F258 creates types/DB that F259 imports, but F259 can use stub types until F258 merges
- Recommend: Start F258 first, F259 ~5 min later (types ready fast)

### Session 2 (F260 ‖ F261 ‖ F262)
- **F260** depends on both F258 + F259 (needs types + agent service)
- **F261** depends only on F258 (types for terminal events)
- **F262** depends only on F258 (types for settings/notifications)
- F261 and F262 can start immediately after Session 1
- F260 needs F259's agent service interface

### Session 3 (F263 ‖ F264 ‖ F265)
- All depend on Session 2 backend being in place
- No cross-dependencies within Session 3
- Each frontend feature touches different routes/components

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| F259 SDK integration fails | Mock SDK with fake responses for frontend dev |
| F260 worktree git conflicts | Test with clean repo, add rollback on failure |
| F261 Bun.spawn terminal issues | Fallback to simpler exec model if PTY doesn't work |
| F264 xterm.js bundle size | Lazy-load xterm only on terminal route |
| Session 3 blocked by Session 2 | Frontend can mock API responses during development |
