# Auto-Claude Build Strategy for NOMOS AI

> Detailed prompt strategy for using Auto-Claude to build the NOMOS application.

---

## How Auto-Claude Works (for context)

Auto-Claude expects **individual specs**, not "build my app". You create specs via the Kanban board or CLI:

```bash
cd /path/to/nomos-ai
python spec_runner.py --task "description here"
```

Each spec runs through: complexity assessment → discovery → requirements → spec → critique → plan → code → QA.

You need **two things**:
1. A solid `CLAUDE.md` at the project root (Auto-Claude reads this first)
2. A sequence of spec prompts, each covering a functional chunk

---

## Step 1: Project CLAUDE.md for Auto-Claude

Your existing CLAUDE.md is designed for Claude Code. For Auto-Claude's agents, you'd want to **append** or **replace** with something like this (save as `CLAUDE.md` in the nomos-ai root when running under Auto-Claude):

```markdown
# NOMOS AI - Auto-Claude Project Guide

## What This Project Is
NOMOS AI is an autonomous AI development studio. Users manage features on a Kanban board,
and Claude agents implement them autonomously with human oversight at strategic points.

## Current State
- **Phase 1 Foundation**: 11/65 features complete (types, DB schemas, migrations)
- **What exists**: Monorepo (Bun/Turborepo), branded types, Zod schemas, Drizzle ORM,
  SQLite DB with 5 tables (users, projects, features, agentSessions, learnings),
  migrations, React web app scaffold, Hono server scaffold
- **What's missing**: oRPC API routes, frontend UI, agent execution, WebSocket, git ops

## Stack (MANDATORY - do not deviate)
| Layer | Technology | Notes |
|-------|------------|-------|
| Runtime | Bun 1.3+ | NOT Node.js |
| Monorepo | Turborepo | Workspaces in apps/ and packages/ |
| Frontend | React 19 + TanStack Router + Zustand + Tailwind 4 | Use shadcn/ui components |
| Backend | Hono + oRPC | Type-safe RPC, NOT REST |
| Database | Drizzle ORM + SQLite (libSQL) | Schema in packages/db/src/schema/ |
| Auth | better-auth | Already scaffolded in packages/auth/ |
| Validation | Zod | Schemas in packages/types/src/schemas/ |
| AI | Claude Agent SDK (@anthropic-ai/claude-agent-sdk) | TypeScript SDK |
| Desktop | Tauri (Phase 4) | NOT Electron |
| Linting | Biome | NOT ESLint |
| Testing | Vitest | NOT Jest |

## Critical Patterns (READ THESE)
1. **Branded types** - Use `FeatureId`, `ProjectId`, `SessionId` from `@nomos-ai/types`
2. **Zod-first** - Define Zod schemas, infer TypeScript types with `z.infer<>`
3. **oRPC procedures** - All API is oRPC, not REST endpoints
4. **Drizzle queries** - Use Drizzle's query builder, not raw SQL
5. **Biome, not ESLint** - Run `bunx biome check . --write --unsafe` to fix
6. **TanStack Router** - File-based routing in `apps/web/src/routes/`
7. **Zustand stores** - State in `apps/web/src/stores/` (NOT Redux, NOT Context)

## Project Structure
\```
apps/
  web/          → React frontend (TanStack Router, Zustand, Tailwind 4)
  server/       → Hono backend (oRPC, WebSocket, agent execution)
packages/
  types/        → Branded types + Zod schemas (FeatureId, ProjectId, etc.)
  db/           → Drizzle ORM + SQLite (5 tables: users, projects, features, sessions, learnings)
  auth/         → better-auth setup
  api/          → oRPC router + procedures (NOT YET IMPLEMENTED)
  env/          → Environment variable validation
  config/       → Configuration management
\```

## Database Schema (Already Exists)
- `projects` - id, name, path, description, settings, status
- `features` - id, projectId, title, description, status, phase, priority, category,
  size, model, thinkingLevel, acceptanceCriteria, dependencies, etc. (38 columns)
- `agentSessions` - id, featureId, projectId, status, model, startedAt, output, etc.
- `learnings` - id, featureId, type, content, context, confidence
- `users` - better-auth managed

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
bun run check-types    # TypeScript
bun run check          # Biome lint
bun run test           # Vitest
bun run build          # Production build
\```

## Reference Documentation
See `.nomos/inspiration/` for architecture patterns from reference implementations.
See `.nomos/app_spec.json` for complete application specification.
See `.nomos/features.json` for the 220-feature backlog with acceptance criteria.
```

---

## Step 2: Spec Sequence (10 Specs to Build NOMOS)

Create these specs **in order**. Each one is a coherent chunk:

### Spec 001 — Backend API Layer

```
Build the oRPC API layer for NOMOS AI.

CONTEXT:
- Monorepo with Bun/Turborepo already scaffolded
- Database exists: packages/db/ has Drizzle schemas for projects, features,
  agentSessions, learnings tables with full migrations
- Types exist: packages/types/ has branded types (FeatureId, ProjectId, SessionId)
  and Zod schemas
- packages/api/ exists but is empty — this is where the oRPC router goes
- Server app exists at apps/server/ with Hono — needs to mount the oRPC router

WHAT TO BUILD:
1. oRPC router setup in packages/api/ using @orpc/server
2. Project procedures: list, get, create, update, delete
3. Feature procedures: list (with filtering/sorting), get, create, update,
   updateStatus (state machine transitions), bulkUpdateStatus
4. Session procedures: list (by feature), get, create, updateStatus
5. Learning procedures: list (by feature), create, getPatterns
6. Mount oRPC router on Hono server at apps/server/
7. Create oRPC client in packages/api/ for frontend consumption
8. Input validation using existing Zod schemas from @nomos-ai/types

TECH CONSTRAINTS:
- Use oRPC (@orpc/server + @orpc/client), NOT tRPC, NOT REST
- Use Drizzle ORM for all DB queries (schema already exists)
- Validate all inputs with Zod
- Use branded types (FeatureId etc.) from @nomos-ai/types
- Feature status transitions must follow the state machine:
  backlog → in_progress → waiting_approval → verified
  (with cancel, reject, reset, reopen transitions)

ACCEPTANCE CRITERIA:
- All CRUD operations work for projects, features, sessions, learnings
- Feature status transitions are validated (invalid transitions rejected)
- Input validation errors return structured error responses
- oRPC client can be imported by the web app
- All procedures are type-safe end-to-end
```

### Spec 002 — Kanban Board UI

```
Build the Kanban board frontend for NOMOS AI feature management.

CONTEXT:
- React 19 app at apps/web/ with TanStack Router (file-based routing)
- API layer exists via oRPC (from spec 001) — import client from @nomos-ai/api
- Tailwind CSS 4 configured, use shadcn/ui components
- State management with Zustand (stores in apps/web/src/stores/)
- Features have status: backlog | in_progress | waiting_approval | verified

WHAT TO BUILD:
1. Zustand store for features (apps/web/src/stores/feature-store.ts)
   - Feature list, active project, loading states
   - TanStack Query integration for data fetching via oRPC
2. Zustand store for projects (apps/web/src/stores/project-store.ts)
   - Active project selection, project list
3. Kanban board page at route /kanban
   - 4 columns: Backlog, In Progress, Waiting Approval, Verified
   - Feature cards with: title, category badge, size badge, priority indicator
   - Drag-and-drop between columns (use @dnd-kit)
   - Card count per column
4. Feature card component with status-appropriate styling
5. Sidebar with project selector
6. Top bar with project name and feature count
7. Empty state when no features exist

TECH CONSTRAINTS:
- Use TanStack Router for routing (file-based in src/routes/)
- Use TanStack Query for server state (via oRPC client)
- Use Zustand for client state
- Use shadcn/ui components (Button, Card, Badge, ScrollArea, etc.)
- Use @dnd-kit for drag-and-drop (NOT react-beautiful-dnd)
- Tailwind CSS 4 for styling
- Mobile-responsive (but desktop-first)

ACCEPTANCE CRITERIA:
- Board displays features in correct status columns
- Drag-and-drop moves features between columns (calls API)
- Feature cards show title, category, size, priority
- Project selector switches active project
- Empty states for columns and no-project state
- Loading skeletons while data fetches
```

### Spec 003 — Feature Detail & Editor

```
Build the feature detail view and editor for NOMOS AI.

CONTEXT:
- Kanban board exists (from spec 002) with feature cards
- oRPC API exists for CRUD on features
- Feature schema has 38 columns including acceptanceCriteria (JSON array),
  dependencies (JSON array), model, thinkingLevel, planningMode

WHAT TO BUILD:
1. Feature detail modal/panel (opens when clicking a card)
   - Header: title, status badge, category, priority
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
   - Auto-generate feature ID
4. Delete feature with confirmation dialog
5. Status action buttons (Start, Complete, Approve, Reject based on current status)

TECH CONSTRAINTS:
- Use shadcn/ui Dialog, Tabs, Select, Badge, Button
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

### Spec 004 — WebSocket Real-Time Infrastructure

```
Build the WebSocket infrastructure for real-time agent output streaming.

CONTEXT:
- Hono server at apps/server/
- React frontend at apps/web/
- Will be used for: agent output streaming, status change notifications,
  auto-mode events

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

### Spec 005 — Agent Execution Engine

```
Build the Claude Agent SDK execution engine for NOMOS AI.

CONTEXT:
- This is the CORE of NOMOS — where AI agents actually run
- Server at apps/server/, DB at packages/db/, types at packages/types/
- WebSocket infrastructure exists (from spec 004)
- Features have model, thinkingLevel, planningMode configuration
- agentSessions table exists in DB
- Reference: .nomos/inspiration/autoclaude/agent-sdk-integration.md
  and .nomos/inspiration/autonomous/agent-sdk-integration.md

WHAT TO BUILD:
1. Agent execution service (apps/server/src/services/agent-executor.ts)
   - Create Claude SDK client with project-specific configuration
   - Execute agent session for a given feature
   - Stream output via WebSocket
   - Handle tool calls (Read, Write, Edit, Bash, Glob, Grep)
   - Security: restrict bash commands, restrict file paths to worktree
   - Capture session result (success/failure/error)
2. Session management
   - Create session record in DB before execution
   - Update session with output, status, duration on completion
   - Handle session interruption (user cancel, timeout, error)
3. Agent prompt generation (apps/server/src/services/prompt-generator.ts)
   - Generate implementation prompt from feature spec
   - Include acceptance criteria as checklist
   - Include project context (codebase structure, patterns)
   - Include learning context (patterns, gotchas from previous features)
4. oRPC procedures for agent control
   - Start agent session for a feature
   - Stop/cancel running session
   - Get session status and output
5. Feature execution flow
   - Validate feature is in correct status (backlog → in_progress)
   - Create git worktree for feature
   - Generate prompt
   - Execute agent in worktree
   - On success: run quality gates, update status
   - On failure: capture error, keep in_progress

TECH CONSTRAINTS:
- Use @anthropic-ai/claude-agent-sdk (TypeScript SDK)
- Agent runs in isolated git worktree
- All agent output streamed via WebSocket
- Bash commands validated against allowlist
- File operations restricted to worktree directory
- Extended thinking tokens configurable per feature (16k-64k)

ACCEPTANCE CRITERIA:
- Can start an agent session for a feature from the UI
- Agent output streams in real-time to WebSocket
- Agent can read/write files in worktree
- Agent can run bash commands (validated)
- Session recorded in DB with full output
- Feature status transitions correctly on success/failure
- Can cancel a running session
```

### Spec 006 — Git Worktree Operations

```
Build git worktree management for isolated feature development.

CONTEXT:
- Agent execution engine exists (from spec 005)
- Each feature MUST be developed in its own worktree (Constitution ART-004)
- Branch naming: nomos/{feature-id} (e.g., nomos/F012)
- Commit format: feat({feature-id}): {summary}

WHAT TO BUILD:
1. Git service (apps/server/src/services/git-service.ts)
   - createWorktree(projectPath, featureId) → worktree path
   - deleteWorktree(projectPath, featureId)
   - getWorktreeStatus(projectPath, featureId) → changed files, branch info
   - commitChanges(worktreePath, featureId, message)
   - mergeToMain(projectPath, featureId) → merge result
   - getDiff(worktreePath) → unified diff
   - getLog(worktreePath) → commit log
   - cleanupWorktree(projectPath, featureId) → remove worktree + branch
2. Worktree lifecycle integration
   - Auto-create worktree when feature starts (status → in_progress)
   - Auto-cleanup worktree after merge (status → verified)
   - Handle orphaned worktrees (detect and offer cleanup)
3. Git diff viewer component (frontend)
   - Show changed files list
   - Unified diff view with syntax highlighting
   - File-by-file navigation
4. Merge flow
   - Show diff before merge
   - Merge to main with feature commit message
   - Handle merge conflicts (display to user)
   - Post-merge cleanup

TECH CONSTRAINTS:
- Use child_process/Bun.spawn for git commands (not a git library)
- Worktrees at: {projectPath}/.nomos/worktrees/{featureId}/
- Validate all paths (no traversal outside project)
- Git operations are async

ACCEPTANCE CRITERIA:
- Worktree created automatically when feature starts
- Agent writes code in worktree (not main branch)
- Diff viewer shows all changes
- Merge to main works with proper commit message
- Worktree cleaned up after merge
- Handles merge conflicts gracefully
```

### Spec 007 — Quality Gates Pipeline

```
Build the automated quality gates pipeline for NOMOS AI.

CONTEXT:
- Agent execution produces code in worktrees
- After coding completes, quality gates must pass before merge
- Gates: TypeScript check, Biome lint, Vitest tests, production build
- Reference: .nomos/app_spec.json "quality" section

WHAT TO BUILD:
1. Quality gate runner (apps/server/src/services/quality-gates.ts)
   - Run gate commands in worktree context
   - Sequential execution: typecheck → lint → test → build
   - Capture stdout/stderr for each gate
   - Pass/fail status per gate with detailed output
   - Overall pass = all gates pass
2. Gate result storage
   - Store gate results per feature execution in DB
   - Show gate history in feature detail
3. Gate results UI
   - Quality gate panel in feature detail
   - Pass/fail badge per gate
   - Expandable output log per gate
   - Re-run button for individual gates
4. Integration with execution flow
   - After agent completes → auto-run quality gates
   - If all pass → update status to waiting_approval
   - If any fail → keep in_progress, show failures
   - Stream gate progress via WebSocket

TECH CONSTRAINTS:
- Run commands via Bun.spawn in worktree directory
- Each gate has a timeout (60s for typecheck/lint, 120s for test, 180s for build)
- Gates run in the worktree, not main branch
- Parse exit code for pass/fail

ACCEPTANCE CRITERIA:
- Quality gates auto-run after agent session completes
- Each gate shows pass/fail with output log
- All gates must pass for feature to reach waiting_approval
- Failed gates show clear error messages
- Can manually re-run gates
- Gate progress streams via WebSocket
```

### Spec 008 — Auto-Mode Orchestrator

```
Build the auto-mode autonomous execution loop for NOMOS AI.

CONTEXT:
- Agent execution engine exists (spec 005)
- Git worktree management exists (spec 006)
- Quality gates exist (spec 007)
- Features have priority ordering and dependency declarations
- Constitution: auto-mode pauses after 3 consecutive failures

WHAT TO BUILD:
1. Auto-mode orchestrator (apps/server/src/services/auto-mode.ts)
   - Start/stop auto-mode for a project
   - Pick next feature: highest priority in backlog with dependencies met
   - Execute feature (create worktree → agent → quality gates)
   - On success: move to waiting_approval, pick next
   - On failure: increment failure counter
   - On 3 consecutive failures: pause auto-mode, notify user
   - Resume after human intervention
2. Feature queue management
   - Queue ordering by priority (critical > high > medium > low)
   - Dependency checking (skip features with unmet dependencies)
   - Skip features marked as blocked
3. Auto-mode control UI
   - Start/stop button
   - Current feature indicator
   - Queue preview (next 5 features)
   - Failure counter display
   - Pause reason display
4. Learning capture
   - After each feature (success or failure), extract learnings
   - Store in learnings table: patterns, gotchas, duration, files changed
   - Feed learnings back into next feature's prompt context
5. Auto-mode status via WebSocket
   - Stream: current feature, queue position, success/failure events

TECH CONSTRAINTS:
- Auto-mode runs server-side (not in browser)
- One feature at a time (serial execution)
- 3-failure pause is absolute (resets on any success)
- Learning extraction runs after every merge

ACCEPTANCE CRITERIA:
- Auto-mode picks and executes features autonomously
- Features execute in priority order respecting dependencies
- Pauses after 3 consecutive failures
- Shows current feature and queue in UI
- Learning captured and fed into subsequent features
- Can be started/stopped from UI
```

### Spec 009 — Terminal Integration

```
Build xterm.js terminal integration for live agent monitoring.

CONTEXT:
- Agent execution streams output via WebSocket
- Users need to see agent activity in real-time
- Terminal should show: tool calls, file operations, thinking, output

WHAT TO BUILD:
1. Terminal component (apps/web/src/components/terminal/)
   - xterm.js 6 with WebGL renderer
   - Fit addon (auto-resize)
   - Web links addon (clickable URLs)
   - ANSI color support for agent output
2. Agent output formatter
   - Format tool calls as collapsible sections
   - Syntax highlight code blocks
   - Color-code: thinking (dim), tool calls (yellow), output (green), errors (red)
3. Terminal panel in feature detail
   - Show agent output for current/latest session
   - Auto-scroll with scroll-lock
   - Copy output to clipboard
   - Clear terminal
4. Multi-terminal layout (for auto-mode)
   - Split view: active terminal + queue sidebar
   - Terminal history for completed features

TECH CONSTRAINTS:
- Use @xterm/xterm 6 + @xterm/addon-fit + @xterm/addon-webgl + @xterm/addon-web-links
- WebSocket feeds data to terminal
- Terminal is read-only (display only, no input)
- Buffer limit: 10,000 lines

ACCEPTANCE CRITERIA:
- Terminal displays agent output with ANSI colors
- Auto-scrolls during execution
- User can scroll up without auto-scroll fighting
- Tool calls formatted with collapsible detail
- Terminal resizes with window
- Copy to clipboard works
```

### Spec 010 — Tauri Desktop Wrapper

```
Wrap NOMOS AI as a native desktop app using Tauri.

CONTEXT:
- Web frontend at apps/web/ (React, fully functional)
- Server at apps/server/ (Hono, all APIs)
- Both run as processes; Tauri wraps them

WHAT TO BUILD:
1. Tauri app scaffold (apps/desktop/)
   - Tauri 2 with Rust backend
   - Embed web frontend
   - Start Hono server as sidecar process
2. System tray integration
   - Tray icon with status indicator
   - Quick actions: start/stop auto-mode, open app
   - Notification badge for completed features
3. Native notifications
   - Feature completed
   - Auto-mode paused (failure)
   - Quality gate results
4. File system access
   - Native file picker for project selection
   - Worktree directory access
5. Auto-updates
   - Check for updates on startup
   - Download and install in background
6. Build configuration
   - macOS: .dmg (Apple Silicon + Intel)
   - Linux: AppImage + .deb

TECH CONSTRAINTS:
- Tauri 2 (NOT Electron)
- Server runs as sidecar (Bun process)
- Frontend loaded from local build (not dev server)
- Auto-update via Tauri updater

ACCEPTANCE CRITERIA:
- App launches and shows Kanban board
- Server starts automatically as sidecar
- System tray works with status indicator
- Native notifications for key events
- File picker for project selection
- Builds for macOS and Linux
```

---

## Step 3: Execution Order

```
Spec 001: Backend API Layer        ← foundation for everything
Spec 002: Kanban Board UI          ← first visible feature
Spec 003: Feature Detail & Editor  ← complete the UI story
Spec 004: WebSocket Infrastructure ← needed before agents
Spec 005: Agent Execution Engine   ← the core of NOMOS
Spec 006: Git Worktree Operations  ← agent isolation
Spec 007: Quality Gates Pipeline   ← automated validation
Spec 008: Auto-Mode Orchestrator   ← autonomous loop
Spec 009: Terminal Integration     ← monitoring UX
Spec 010: Tauri Desktop Wrapper    ← native app
```

Each spec maps to roughly 15-25 features from the 220 backlog, and each should take Auto-Claude 1-3 sessions to complete. Run them sequentially — each depends on the previous.

The remaining ~100 features (themes, notifications, settings, GitHub integration, security hardening, etc.) would be additional specs you create after the core 10 are done.

---

## Step 4: After Core 10 — Additional Specs

Once the core 10 specs are complete, create follow-up specs for:

| Spec | Features |
|------|----------|
| 011 | Theme system (dark/light, custom themes) |
| 012 | Settings & configuration UI |
| 013 | Notification system |
| 014 | GitHub integration (issues, PRs) |
| 015 | Security hardening (command allowlists, path validation) |
| 016 | Learning dashboard (patterns, metrics, insights) |
| 017 | Keyboard shortcuts & accessibility |
| 018 | Multi-project support (project switcher, isolation) |
| 019 | Session recovery & error handling |
| 020 | Performance optimization & caching |

---

*Strategy document for building NOMOS AI with Auto-Claude v2.7.5*
