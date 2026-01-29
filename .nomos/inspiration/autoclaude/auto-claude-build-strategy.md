# Auto-Claude Build Strategy for NOMOS AI (Updated)

> Updated strategy reflecting current project state. Original preserved as `auto-claude-build-strategy.original.md`.
>
> **Last updated:** 2026-01-29
> **Features completed:** 16 verified, 1 waiting approval, 1 in progress (of 220 total)

---

## Current State Summary

### What's Done (F001-F017)

| Area | Features | Status |
|------|----------|--------|
| **Monorepo scaffold** | F001 | Bun + Turborepo, apps/web + apps/server + 6 packages |
| **Type system** | F002-F005 | Branded types (FeatureId, ProjectId, SessionId), Zod schemas for features, projects, sessions |
| **Database** | F006-F011 | Drizzle ORM + SQLite, 4 domain tables (project, feature, agent_session, learning) + auth tables, migrations |
| **Repositories** | F012-F014 | Repository pattern for projects, features, sessions (full CRUD, transactions) |
| **Server** | F015-F016 | Hono server with oRPC, CORS, health check, auth mounting, OpenAPI reference |
| **API routers** | F017 | Projects oRPC router (list, get, create, update, delete) with Zod validation |

### What's In Flight

| Feature | Status | Description |
|---------|--------|-------------|
| F016 | waiting_approval | Health check endpoint (needs verify) |
| F018 | in_progress | Features oRPC router (list, get, create, update, delete, updateStatus, bulkUpdate) |

### What Exists But Isn't Wired Yet

- **Frontend (apps/web):** React 19 scaffolded with TanStack Router, Tailwind 4, shadcn/ui, better-auth client. Has login/signup forms, dashboard route guard, theme toggle. No Kanban board or data fetching yet.
- **Auth (packages/auth):** better-auth configured with Drizzle adapter, email/password auth working.
- **API package (packages/api):** oRPC base procedures (public + protected), context creation, project router. Features/sessions/learnings router files exist but features router is WIP.

### What's NOT Built Yet

- Features, Sessions, Learnings oRPC routers (F018-F019, plus learnings)
- Frontend data fetching (TanStack Query + oRPC client)
- Kanban board UI
- Feature detail/editor
- WebSocket infrastructure
- Agent execution engine (Claude Agent SDK)
- Git worktree operations
- Quality gates pipeline
- Auto-mode orchestrator
- Terminal integration (xterm.js)
- Tauri desktop wrapper

---

## Project CLAUDE.md for Auto-Claude

This replaces the CLAUDE.md at the project root when running under Auto-Claude:

```markdown
# NOMOS AI - Auto-Claude Project Guide

## What This Project Is
NOMOS AI is an autonomous AI development studio. Users manage features on a Kanban board,
and Claude agents implement them autonomously with human oversight at strategic points.

## Current State
- **Phase 1 Foundation**: 16/220 features verified, 2 in flight
- **What exists**: Monorepo (Bun/Turborepo), branded types, Zod schemas, Drizzle ORM,
  SQLite DB with tables (project, feature, agent_session, learning, auth tables),
  migrations, repository pattern (CRUD), Hono server with oRPC, Projects API router,
  React web app scaffold with TanStack Router, Tailwind 4, shadcn/ui, better-auth
- **What's missing**: Features/Sessions/Learnings API routers, frontend data integration,
  Kanban board UI, feature detail panel, agent execution, WebSocket, git ops, auto-mode

## Stack (MANDATORY - do not deviate)
| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Bun 1.3+ | NOT Node.js |
| Monorepo | Turborepo | Workspaces in apps/ and packages/ |
| Frontend | React 19 + TanStack Router + Zustand + Tailwind 4 | Use shadcn/ui components |
| Backend | Hono + oRPC | Type-safe RPC, NOT REST |
| Database | Drizzle ORM + SQLite (libSQL) | Schema in packages/db/src/schema/ |
| Auth | better-auth | Already working in packages/auth/ |
| Validation | Zod | Schemas in packages/types/src/schemas/ |
| AI | Claude Agent SDK (@anthropic-ai/claude-agent-sdk) | TypeScript SDK |
| Desktop | Tauri (Phase 4) | NOT Electron |
| Linting | Biome | NOT ESLint |
| Testing | Vitest | NOT Jest |

## Critical Patterns (READ THESE — already established in codebase)
1. **Branded types** - Use `FeatureId`, `ProjectId`, `SessionId` from `@nomos-ai/types`
2. **Zod-first** - Define Zod schemas, infer TypeScript types with `z.infer<>`
3. **oRPC procedures** - All API is oRPC with `publicProcedure` and `protectedProcedure`
4. **Repository pattern** - packages/db/src/repositories/ wraps Drizzle queries
5. **Biome, not ESLint** - Run `bunx biome check . --write --unsafe` to fix
6. **TanStack Router** - File-based routing in `apps/web/src/routes/`
7. **Zustand stores** - State in `apps/web/src/stores/` (NOT Redux, NOT Context)
8. **Follow existing patterns** - Look at `packages/api/src/routers/project.ts` and
   `packages/db/src/repositories/project.ts` as templates for new routers/repos

## Project Structure
\```
apps/
  web/          → React frontend (TanStack Router, Zustand, Tailwind 4)
  server/       → Hono backend (oRPC, health check, auth, OpenAPI reference)
packages/
  types/        → Branded types + Zod schemas (FeatureId, ProjectId, etc.)
  db/           → Drizzle ORM + SQLite (4 domain tables + auth tables, repositories)
  auth/         → better-auth setup (working, email/password)
  api/          → oRPC router + procedures (projects done, features/sessions WIP)
  env/          → Environment variable validation (server + web)
  config/       → Shared TypeScript configuration (tsconfig.base.json)
\```

## Database Schema (Already Exists & Working)
- `project` - id, name, path, settings (JSON), status, timestamps
- `feature` - id, projectId, title, description, status, phase, priority, category,
  size, model, thinkingLevel, acceptanceCriteria (JSON), dependencies (JSON), etc. (38 cols)
- `agent_session` - id, featureId, status, output, error, startedAt, completedAt, etc.
- `learning` - id, featureId, category, pattern, context (JSON), severity, tags
- Auth tables: user, session, account, verification (managed by better-auth)

## Repositories (Already Exist)
- `ProjectRepository` - getAll, getById, create, update, delete (packages/db/src/repositories/project.ts)
- `FeatureRepository` - getAll, getById, getByProjectId, create, update, updateStatus,
  bulkUpdate, findByStatus (packages/db/src/repositories/feature.ts)
- `SessionRepository` - getAll, getById, getByFeatureId, create, update, findActive,
  appendOutput, calculateDuration (packages/db/src/repositories/session.ts)

## API Router Pattern (Follow This Exactly)
See `packages/api/src/routers/project.ts` — every new router should:
1. Import `protectedProcedure` from the api index
2. Import repository from `@nomos-ai/db`
3. Import Zod schemas from `@nomos-ai/types`
4. Define input schemas with Zod `.input()`
5. Use repository methods in handlers
6. Export router object and register in `packages/api/src/routers/index.ts`

## Constitution (NEVER violate)
1. Every feature needs a spec before implementation
2. All quality gates must pass before merge
3. Human approval required for merges to main
4. Each feature developed in isolated git worktree
5. One feature per agent session
6. Learning captured after each merge
7. Auto-mode pauses after 3 consecutive failures

## Quality Gates
\```bash
bun run check-types    # TypeScript (tsc -b)
bun run lint           # Biome lint
bun run test           # Vitest
bun run build          # Production build
\```

## Reference Documentation
See `.nomos/inspiration/` for architecture patterns from reference implementations.
See `.nomos/app_spec.json` for complete application specification.
See `.nomos/features.json` for the 220-feature backlog with acceptance criteria.
```

---

## Spec Sequence (Revised — 8 Specs to Build NOMOS)

The original 10-spec plan is collapsed to 8 because Spec 001 is mostly done.
Specs are adjusted to reflect what exists and what's next.

### Spec 001 — Complete Backend API Layer (ALMOST DONE)

```
Complete the remaining oRPC API routers for NOMOS AI.

ALREADY DONE:
- packages/api/ has oRPC base setup (publicProcedure, protectedProcedure, context creation)
- projects router complete (list, get, create, update, delete) at packages/api/src/routers/project.ts
- Hono server mounted with oRPC RPC handler + OpenAPI reference at apps/server/src/index.ts
- All repositories exist: ProjectRepository, FeatureRepository, SessionRepository
- All Zod schemas exist in packages/types/src/schemas/
- appRouter in packages/api/src/routers/index.ts currently exports: healthCheck, privateData, projects

WHAT TO BUILD (remaining):
1. Features router (packages/api/src/routers/features.ts) — F018
   - list (with filtering by projectId, status, category), get, create, update, delete
   - updateStatus (validates state machine: backlog → in_progress → waiting_approval → verified)
   - bulkUpdateStatus
2. Sessions router (packages/api/src/routers/sessions.ts) — F019
   - list (by featureId), get, create, update, updateStatus
3. Learnings router (packages/api/src/routers/learnings.ts) — not yet in features.json
   - list (by featureId), create, getPatterns
4. Register all new routers in appRouter (packages/api/src/routers/index.ts)

PATTERN TO FOLLOW:
Look at packages/api/src/routers/project.ts — follow the exact same pattern:
- Import protectedProcedure, repository, Zod schemas
- Define .input() with Zod, use repository in handler
- Export as named object

TECH CONSTRAINTS:
- Use oRPC (@orpc/server), NOT tRPC, NOT REST
- Use existing repositories from @nomos-ai/db
- Validate all inputs with existing Zod schemas from @nomos-ai/types
- Feature status transitions must follow the state machine
- Follow the exact pattern of project.ts

ACCEPTANCE CRITERIA:
- All CRUD operations work for features, sessions, learnings
- Feature status transitions validated (invalid transitions rejected)
- All routers registered in appRouter
- Input validation errors return structured error responses
- Type-safe end-to-end
```

### Spec 002 — Frontend Data Layer & Layout

```
Set up the frontend data fetching layer and application layout for NOMOS AI.

ALREADY DONE:
- React 19 app at apps/web/ with TanStack Router (file-based routing)
- Routes exist: / (home), /login, /dashboard
- Tailwind CSS 4 configured with shadcn/ui components
- better-auth client configured (sign in/up forms work)
- UI components installed: Button, Card, Input, Label, Checkbox, Dropdown, Skeleton, Sonner
- Theme toggle (dark/light) working with next-themes

WHAT TO BUILD:
1. oRPC client setup (apps/web/src/lib/api.ts)
   - Create oRPC client pointing to server /rpc endpoint
   - Type-safe using AppRouterClient from @nomos-ai/api
   - TanStack Query integration via @orpc/tanstack-query
2. TanStack Query provider setup in app root
3. Zustand stores:
   - feature-store.ts: feature list, active filters, selected feature
   - project-store.ts: active project, project list
   - ui-store.ts: sidebar state, modal state
4. App layout component (sidebar + header + main content)
   - Sidebar: project selector, navigation (Kanban, Features, Sessions, Settings)
   - Header: breadcrumb, search, user menu
   - Main content area with router outlet
5. Protected layout wrapper (redirects to /login if not authenticated)
6. Route structure:
   - /kanban — Kanban board (new)
   - /features — Features list (new)
   - /features/$featureId — Feature detail (new)
   - /settings — Settings (new)
7. API hooks using TanStack Query + oRPC:
   - useProjects(), useProject(id)
   - useFeatures(filters), useFeature(id), useUpdateFeatureStatus()
   - useSessions(featureId)

TECH CONSTRAINTS:
- Use TanStack Router for routing (file-based in src/routes/)
- Use TanStack Query for server state (via @orpc/tanstack-query)
- Use Zustand for client state only (NOT server state)
- Use shadcn/ui components
- Tailwind CSS 4 for styling
- Mobile-responsive (desktop-first)

ACCEPTANCE CRITERIA:
- oRPC client connects to server and fetches data
- TanStack Query manages server state with caching
- App layout renders with sidebar and header
- Route navigation works between pages
- Authentication guard redirects unauthenticated users
- Zustand stores manage client-only state
```

### Spec 003 — Kanban Board UI

```
Build the Kanban board frontend for NOMOS AI feature management.

CONTEXT:
- Frontend data layer exists (from spec 002)
- oRPC client can fetch features with filtering
- Zustand stores for features and projects exist
- App layout with sidebar navigation exists
- Features have status: backlog | in_progress | waiting_approval | verified

WHAT TO BUILD:
1. Kanban board page at route /kanban
   - 4 columns: Backlog, In Progress, Waiting Approval, Verified
   - Feature cards with: title, category badge, size badge, priority indicator
   - Drag-and-drop between columns (use @dnd-kit/core + @dnd-kit/sortable)
   - Card count per column header
   - Column scroll with fixed headers
2. Feature card component
   - Status-appropriate styling (color coding per column)
   - Category badge, size badge (XS-XL), priority dot
   - Feature ID display (F001 format)
   - Click to open feature detail
3. Kanban toolbar
   - Project selector dropdown
   - Filter by category, priority, size
   - Search by title/ID
   - View toggle (kanban/list)
4. Empty states
   - No project selected
   - No features in a column
   - No features at all
5. Loading skeletons for board and cards

TECH CONSTRAINTS:
- Use @dnd-kit for drag-and-drop (NOT react-beautiful-dnd)
- Drag-drop calls updateFeatureStatus via oRPC mutation
- Optimistic updates on drag-drop
- Use shadcn/ui: Card, Badge, ScrollArea, Select, Button
- Tailwind CSS 4

ACCEPTANCE CRITERIA:
- Board displays features in correct status columns
- Drag-and-drop moves features between columns (calls API, validates state machine)
- Feature cards show title, category, size, priority, ID
- Project selector switches active project
- Filters work (category, priority, size, search)
- Empty states display correctly
- Loading skeletons while data fetches
- Optimistic UI updates
```

### Spec 004 — Feature Detail & Editor

```
Build the feature detail view and editor for NOMOS AI.

CONTEXT:
- Kanban board exists (from spec 003) with clickable feature cards
- oRPC API exists for CRUD on features
- Feature schema has 38 columns including acceptanceCriteria (JSON array),
  dependencies (JSON array), model, thinkingLevel, planningMode

WHAT TO BUILD:
1. Feature detail panel (slide-over or modal, opens when clicking a card)
   - Header: title, status badge, category, priority, feature ID
   - Tabs: Overview, Acceptance Criteria, Dependencies, Configuration, History
   - Overview tab: description, size, phase, estimated effort
   - Acceptance criteria tab: checklist view, add/edit/remove criteria
   - Dependencies tab: list dependent features with status indicators
   - Configuration tab: model selector, thinking level, planning mode
   - History tab: status change timeline
2. Feature editor (inline editing in the detail view)
   - Edit title, description, category, priority, size
   - Edit acceptance criteria (add/remove/reorder)
   - Edit dependencies (search and add features)
   - Edit AI configuration (model, thinking level)
3. Create feature dialog
   - Title, description, category (dropdown), priority, size
   - Auto-generate feature ID (next available F### format)
4. Delete feature with confirmation dialog
5. Status action buttons (Start, Complete, Approve, Reject — based on current status)

TECH CONSTRAINTS:
- Use shadcn/ui Dialog/Sheet, Tabs, Select, Badge, Button
- Use TanStack Form for edit forms with Zod validation
- Mutations via oRPC + TanStack Query (optimistic updates)
- Feature status actions must respect the state machine

ACCEPTANCE CRITERIA:
- Click card → detail panel opens with all feature data
- All fields are editable inline
- Create new feature works with validation
- Delete with confirmation dialog
- Status actions only show valid transitions
- Optimistic UI updates on mutations
```

### Spec 005 — WebSocket Real-Time Infrastructure

```
Build the WebSocket infrastructure for real-time agent output streaming.

CONTEXT:
- Hono server at apps/server/
- React frontend at apps/web/ with data layer
- Will be used for: agent output streaming, status change notifications, auto-mode events

WHAT TO BUILD:
1. WebSocket server on Hono (apps/server/)
   - Connection management (connect, disconnect, reconnect)
   - Room-based channels: project:{id}, feature:{id}, agent:{sessionId}
   - Message types: agent_output, status_change, phase_event, error
   - Authentication (validate session before WS upgrade)
2. WebSocket client hook (apps/web/src/hooks/useWebSocket.ts)
   - Auto-connect on mount, auto-reconnect with backoff
   - Subscribe/unsubscribe to channels
   - Parse typed messages
3. Agent output stream component
   - Terminal-like output display (styled pre/code blocks)
   - Auto-scroll with scroll-lock on user scroll
   - Tool call display (collapsible sections)
   - Thinking indicator
4. Real-time Kanban updates
   - Feature status changes push to all connected clients
   - Cards animate to new columns on status change
5. Event store (Zustand) for WebSocket events

TECH CONSTRAINTS:
- Use Hono's WebSocket support (hono/ws)
- Use native WebSocket API on client (no socket.io)
- Messages are JSON with type discriminator
- Reconnect with exponential backoff (1s, 2s, 4s, max 30s)

ACCEPTANCE CRITERIA:
- WebSocket connects on page load, reconnects on disconnect
- Agent output streams in real-time to UI
- Feature status changes update all connected Kanban boards
- Connection state indicator in UI (connected/reconnecting/disconnected)
```

### Spec 006 — Agent Execution Engine + Git Worktrees

```
Build the Claude Agent SDK execution engine and git worktree management for NOMOS AI.
(Combines original specs 005 and 006 — these are tightly coupled.)

CONTEXT:
- Server at apps/server/, DB at packages/db/, types at packages/types/
- WebSocket infrastructure exists (from spec 005)
- Features have model, thinkingLevel, planningMode configuration
- agent_session table + SessionRepository exist in DB
- Reference: .nomos/inspiration/autoclaude/agent-sdk-integration.md

WHAT TO BUILD:
1. Git service (apps/server/src/services/git-service.ts)
   - createWorktree(projectPath, featureId) → worktree path
   - deleteWorktree(projectPath, featureId)
   - getWorktreeStatus(projectPath, featureId) → changed files, branch info
   - commitChanges(worktreePath, featureId, message)
   - mergeToMain(projectPath, featureId) → merge result
   - getDiff(worktreePath) → unified diff
   - cleanupWorktree(projectPath, featureId) → remove worktree + branch
   - Branch naming: nomos/{feature-id}, Commit format: feat({feature-id}): {summary}
   - Worktrees at: {projectPath}/.nomos/worktrees/{featureId}/

2. Agent execution service (apps/server/src/services/agent-executor.ts)
   - Create Claude SDK client with project-specific configuration
   - Execute agent session for a given feature
   - Stream output via WebSocket
   - Handle tool calls (Read, Write, Edit, Bash, Glob, Grep)
   - Security: restrict bash commands, restrict file paths to worktree
   - Capture session result (success/failure/error)

3. Agent prompt generation (apps/server/src/services/prompt-generator.ts)
   - Generate implementation prompt from feature spec
   - Include acceptance criteria as checklist
   - Include project context (codebase structure, patterns)
   - Include learning context (patterns from previous features)

4. Session management
   - Create session record in DB before execution
   - Update session with output, status, duration on completion
   - Handle session interruption (user cancel, timeout, error)

5. oRPC procedures for agent control
   - Start agent session for a feature
   - Stop/cancel running session
   - Get session status and output

6. Feature execution flow
   - Validate feature is in correct status (backlog → in_progress)
   - Create git worktree for feature
   - Generate prompt → Execute agent in worktree
   - On success: run quality gates, update status
   - On failure: capture error, keep in_progress

7. Git diff viewer component (frontend)
   - Show changed files list
   - Unified diff view with syntax highlighting

TECH CONSTRAINTS:
- Use @anthropic-ai/claude-agent-sdk (TypeScript SDK)
- Use Bun.spawn for git commands (not a git library)
- Agent runs in isolated git worktree
- All agent output streamed via WebSocket
- Bash commands validated against allowlist
- File operations restricted to worktree directory
- Extended thinking tokens configurable per feature (16k-64k)
- Validate all paths (no traversal outside project)

ACCEPTANCE CRITERIA:
- Can start an agent session for a feature from the UI
- Worktree created automatically when feature starts
- Agent output streams in real-time to WebSocket
- Agent can read/write files in worktree only
- Agent can run validated bash commands
- Session recorded in DB with full output
- Feature status transitions correctly on success/failure
- Can cancel a running session
- Diff viewer shows all changes
- Worktree cleaned up after merge
```

### Spec 007 — Quality Gates + Auto-Mode

```
Build the quality gates pipeline and auto-mode orchestrator for NOMOS AI.
(Combines original specs 007 and 008 — auto-mode depends on quality gates.)

CONTEXT:
- Agent execution engine exists (from spec 006)
- Git worktree management exists (from spec 006)
- Features have priority ordering and dependency declarations
- Constitution: auto-mode pauses after 3 consecutive failures

WHAT TO BUILD:
1. Quality gate runner (apps/server/src/services/quality-gates.ts)
   - Run gate commands in worktree context
   - Sequential: typecheck → lint → test → build
   - Capture stdout/stderr per gate
   - Pass/fail with detailed output
   - Each gate has timeout (60s typecheck/lint, 120s test, 180s build)

2. Gate results UI
   - Quality gate panel in feature detail
   - Pass/fail badge per gate with expandable output
   - Re-run button for individual gates
   - Gate progress streams via WebSocket

3. Integration with execution flow
   - After agent completes → auto-run quality gates
   - All pass → status to waiting_approval
   - Any fail → keep in_progress, show failures

4. Auto-mode orchestrator (apps/server/src/services/auto-mode.ts)
   - Start/stop auto-mode for a project
   - Pick next feature: highest priority in backlog with dependencies met
   - Execute feature (create worktree → agent → quality gates)
   - On success: move to waiting_approval, pick next
   - On 3 consecutive failures: pause auto-mode, notify user

5. Feature queue management
   - Queue by priority (critical > high > medium > low)
   - Dependency checking (skip features with unmet deps)
   - Skip blocked features

6. Auto-mode control UI
   - Start/stop button
   - Current feature indicator
   - Queue preview (next 5 features)
   - Failure counter, pause reason

7. Learning capture
   - After each feature: extract patterns, gotchas, duration, files changed
   - Store in learnings table
   - Feed learnings into next feature's prompt context

8. Auto-mode status via WebSocket

TECH CONSTRAINTS:
- Run commands via Bun.spawn in worktree directory
- Auto-mode runs server-side (not in browser)
- One feature at a time (serial execution)
- 3-failure pause resets on any success

ACCEPTANCE CRITERIA:
- Quality gates auto-run after agent session completes
- Each gate shows pass/fail with output
- All gates must pass for waiting_approval
- Auto-mode picks and executes features autonomously
- Features execute in priority order respecting dependencies
- Pauses after 3 consecutive failures
- Shows current feature and queue in UI
- Learning captured after each feature
- Can be started/stopped from UI
```

### Spec 008 — Terminal Integration + Desktop

```
Build xterm.js terminal integration and Tauri desktop wrapper.

CONTEXT:
- Agent execution streams output via WebSocket
- Users need to see agent activity in real-time
- All web features are complete — ready for desktop packaging

WHAT TO BUILD:
1. Terminal component (apps/web/src/components/terminal/)
   - xterm.js 6 with WebGL renderer
   - Fit addon (auto-resize), Web links addon (clickable URLs)
   - ANSI color support for agent output
2. Agent output formatter
   - Tool calls as collapsible sections
   - Syntax highlight code blocks
   - Color-code: thinking (dim), tool calls (yellow), output (green), errors (red)
3. Terminal panel in feature detail
   - Agent output for current/latest session
   - Auto-scroll with scroll-lock, copy to clipboard, clear
4. Multi-terminal layout (for auto-mode)
   - Split view: active terminal + queue sidebar

5. Tauri app scaffold (apps/desktop/)
   - Tauri 2 with Rust backend
   - Embed web frontend, start Hono server as sidecar process
6. System tray integration
   - Tray icon with status, quick actions (start/stop auto-mode)
7. Native notifications (feature completed, auto-mode paused, quality gate results)
8. File system access (native file picker for project selection)
9. Build configuration: macOS .dmg, Linux AppImage + .deb

TECH CONSTRAINTS:
- Use @xterm/xterm 6 + addons
- Terminal is read-only (display only), buffer limit 10,000 lines
- Tauri 2 (NOT Electron)
- Server runs as sidecar (Bun process)
- Auto-update via Tauri updater

ACCEPTANCE CRITERIA:
- Terminal displays agent output with ANSI colors
- Auto-scrolls, user can scroll up without fighting
- Tool calls formatted with collapsible detail
- App launches as native desktop app
- Server starts automatically as sidecar
- System tray works with status indicator
- Native notifications for key events
- Builds for macOS and Linux
```

---

## Execution Order

```
Spec 001: Complete API Routers       ← finish the last 2-3 routers (ALMOST DONE)
Spec 002: Frontend Data Layer        ← wire oRPC client, layout, stores, routes
Spec 003: Kanban Board UI            ← first visible feature
Spec 004: Feature Detail & Editor    ← complete the UI story
Spec 005: WebSocket Infrastructure   ← needed before agents
Spec 006: Agent Engine + Git         ← the CORE of NOMOS
Spec 007: Quality Gates + Auto-Mode  ← autonomous loop
Spec 008: Terminal + Desktop         ← monitoring UX + native app
```

**Spec 001** can likely be done in a single session since it's following an established pattern.
**Specs 002-004** are the frontend buildout — the first time users see NOMOS working.
**Specs 005-007** are the autonomous engine — what makes NOMOS special.
**Spec 008** is polish and packaging.

---

## Quick Start: Resume Building

To pick up where we left off, the immediate next actions are:

1. **Verify F016** (health check) — approve the waiting feature
2. **Complete F018** (features oRPC router) — currently in progress
3. **Build F019** (sessions oRPC router) — follows same pattern as F017
4. **Build learnings router** — follows same pattern
5. **Move to Spec 002** — frontend data layer

Each router follows the exact same pattern as `packages/api/src/routers/project.ts`:

```typescript
// 1. Import procedure + repo + schemas
import { protectedProcedure } from "../index";
import { FeatureRepository } from "@nomos-ai/db";
import { createFeatureSchema, updateFeatureSchema } from "@nomos-ai/types";
import { z } from "zod/v4";

// 2. Define router with input validation
export const featureRouter = {
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .handler(async ({ input }) => {
      return input.projectId
        ? FeatureRepository.getByProjectId(input.projectId)
        : FeatureRepository.getAll();
    }),
  // ... get, create, update, delete, updateStatus
};
```

---

## After Core 8 — Additional Specs

Once the core 8 specs are complete, create follow-up specs for:

| Spec | Features |
|------|----------|
| 009 | Theme system (dark/light, custom themes) |
| 010 | Settings & configuration UI |
| 011 | Notification system |
| 012 | GitHub integration (issues, PRs) |
| 013 | Security hardening (command allowlists, path validation) |
| 014 | Learning dashboard (patterns, metrics, insights) |
| 015 | Keyboard shortcuts & accessibility |
| 016 | Multi-project support (project switcher, isolation) |
| 017 | Session recovery & error handling |
| 018 | Performance optimization & caching |

---

*Updated strategy for building NOMOS AI — reflecting 16 verified features and established patterns.*
