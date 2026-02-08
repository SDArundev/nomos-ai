# Session 7-8 Prompt: Auth Hardening, Data Isolation, and Runtime Fixes

Copy-paste this into a new Claude Code session.

---

```
Implement Sessions 7-8 of the Automaker Mirror plan on branch `feature/automaker-mirror`. These sessions close the remaining gaps to make the app actually runnable end-to-end — auth guards, data isolation, WebSocket auth, and runtime fixes.

## Current State

- **Branch**: `feature/automaker-mirror` (21 commits ahead of main, 131 files, 10.6k LOC)
- **PR**: #6 — https://github.com/SDArundev/nomos-ai/pull/6
- **`bun run check-types`**: PASSES (zero errors)
- **What works**: Full backend scaffolding (types, DB, services, routers, events, WebSocket), full frontend scaffolding (routes, stores, hooks, components), Docker dev environment, mock agent mode
- **What's broken**: Auth not enforced at root layout, no data isolation by userId, WebSocket hardcoded anonymous, sidebar shows placeholder user, dashboard is a stub

## Rules
1. **Branch**: `feature/automaker-mirror` (already checked out)
2. **No NOMOS pipeline**: Direct implementation only
3. **Reference docs**: `.nomos/inspiration/automaker-mirror/` for patterns
4. **Validation**: `bun run check-types` after each feature, fix all errors
5. **Commits**: One commit per feature with descriptive message
6. **No over-engineering**: Implement exactly what the AC requires

---

## Session 7: Auth & Data Isolation (F278-F281)

### F278: Root Layout Auth Guard

**Problem**: `__root.tsx` renders `AppSidebar` + `Header` + `Outlet` for ALL users including unauthenticated. Individual routes have `beforeLoad` guards, but the shell is exposed.

**Modify** `apps/web/src/routes/__root.tsx`:
- Add auth check: if user is NOT on `/login` route, check `authClient.getSession()`
- If no session, render ONLY `<Outlet />` (no sidebar/header) — login route handles its own layout
- If session exists, render full shell (sidebar + header + outlet)
- This avoids a `beforeLoad` redirect loop — let individual routes handle their own redirects

**Modify** `apps/web/src/routes/index.tsx`:
- Add `beforeLoad` guard like dashboard has
- Redirect authenticated users to `/dashboard`
- Redirect unauthenticated users to `/login`

**AC**: Unauthenticated users see ONLY the login page, no sidebar/header leaking → authenticated users see full shell → `check-types` passes

---

### F279: User Data Isolation

**Problem**: `featureRepository.findAll()`, `projectRepository.findAll()` return ALL records. No per-user filtering.

**Modify** `packages/api/src/routers/feature.ts`:
- All query handlers (`list`, `get`, `create`, `update`, `delete`, `updateStatus`, `bulkUpdateStatus`, `getDependencyOrder`) must scope by `context.session.user.id`
- `list`: filter by userId from context (add to existing filters)
- `create`: already uses `context.session.user.id` ✓
- `get`, `update`, `delete`, `updateStatus`: verify feature belongs to user before operating

**Modify** `packages/api/src/routers/project.ts`:
- Same pattern: scope all queries by `context.session.user.id`

**Modify** `packages/db/src/repositories/feature.ts`:
- Add `findByUser(userId)`, `findByUserAndStatus(userId, status)`, `findByUserAndProject(userId, projectId)`

**Modify** `packages/db/src/repositories/project.ts`:
- Add `findByUser(userId)` method

**AC**: User A cannot see/modify User B's features or projects → all CRUD operations scoped by userId → `check-types` passes

---

### F280: WebSocket Auth + Sidebar User

**Problem**: WebSocket upgrade hardcodes `userId: "anonymous"`. Sidebar shows "User" / "user@example.com".

**Modify** `apps/server/src/index.ts`:
- WebSocket `/ws/events` upgrade: extract session from cookie/header via better-auth, pass real `userId` into WSData
- Fallback to "anonymous" if no session (dev mode tolerance)

**Modify** `apps/web/src/components/app-sidebar.tsx`:
- Import `authClient` and use `useSession()` hook
- Replace hardcoded "User" / "user@example.com" with actual `session.data.user.name` / `.email`
- Show sign-out button that calls `authClient.signOut()` and redirects to `/login`

**AC**: WebSocket carries real userId → sidebar shows actual user name/email → sign-out works → `check-types` passes

---

### F281: Dashboard & Project Onboarding

**Problem**: Dashboard is a stub showing "Welcome {name}" and an API test. New users have no projects and no way to create one easily.

**Modify** `apps/web/src/routes/dashboard.tsx`:
- Show: active projects count, features by status (backlog/pending/in_progress/verified/failed), recent activity
- If no projects exist, show onboarding CTA: "Create your first project"
- Use existing `orpc.projects.list` and `orpc.features.list` queries

**Modify** `apps/web/src/routes/projects.index.tsx`:
- Add "New Project" button/dialog that calls `orpc.projects.create`
- Ensure the create form has: name, description, optional path

**Modify** `packages/api/src/routers/project.ts`:
- Ensure `create` procedure accepts `{ name, description, path? }` and uses `context.session.user.id`

**AC**: Dashboard shows real stats → empty state shows onboarding → user can create first project → `check-types` passes

---

### Session 7 Execution Order
```
F278 (auth guard) → F279 (data isolation) → F280 (WS auth + sidebar) → F281 (dashboard)
```

### Session 7 Validation
```bash
bun run check-types                    # Zero errors
bun run dev                            # Start server + web
# Visit http://localhost:3000 → redirects to /login
# Sign up → redirected to /dashboard → see empty state
# Create project → appears in sidebar
# Open another browser (incognito) → cannot see first user's data
```

---

## Session 8: Polish & Integration Testing (F282-F285)

### F282: Feature CRUD UI

**Problem**: Feature list exists on kanban but creating features from the UI is incomplete.

**Modify** `apps/web/src/routes/kanban.tsx`:
- Add "New Feature" button → opens dialog with form
- Form: title, description, category, phase, acceptance criteria (multi-line input)
- Submit calls `orpc.features.create`
- Drag-and-drop status changes call `orpc.features.updateStatus`

**Modify** `apps/web/src/routes/features.$featureId.tsx`:
- Show full feature detail with edit capability
- Show dependency graph (call `orpc.features.getDependencyOrder`)
- Show pipeline progress if in_progress

**AC**: Create/edit/view features from UI → status transitions work → `check-types` passes

---

### F283: Auto-Mode Dashboard Wiring

**Problem**: Auto-mode dashboard component exists but isn't wired to real endpoints.

**Modify** `apps/web/src/components/auto-mode/auto-mode-dashboard.tsx` (or create if stub):
- Wire start/stop buttons to `orpc.autoMode.start` / `orpc.autoMode.stop`
- Show running features from `orpc.autoMode.status`
- Show config from `orpc.autoMode.getConfig`
- Config panel to set concurrency + max retries via `orpc.autoMode.setConfig`
- Real-time updates via WebSocket `auto-mode:*` events
- Retry button per failed feature via `orpc.autoMode.retryFeature`

**AC**: Start/stop auto-mode from UI → see running features → config changes persist → `check-types` passes

---

### F284: Agent Chat Polish

**Problem**: Chat works but needs quality-of-life improvements.

**Modify** `apps/web/src/components/agent/agent-chat.tsx`:
- Auto-scroll to bottom on new messages
- Show session model name in header
- Add "Clear History" button
- Refetch history after stream completes (to get persisted messages from DB)

**Modify** `apps/web/src/components/agent/message-bubble.tsx`:
- Render markdown in assistant messages (install `react-markdown` if not present)
- Syntax highlighting for code blocks (install `react-syntax-highlighter` or use `shiki`)
- Proper thinking content display (collapsible)

**Modify** `apps/web/src/components/agent/tool-call-display.tsx`:
- Show tool name, input (collapsible JSON), result (collapsible)
- Visual distinction between pending and completed tool calls

**AC**: Messages render with markdown → code blocks highlighted → tool calls display cleanly → auto-scroll works → `check-types` passes

---

### F285: Spec Import Flow

**Problem**: Spec management system exists in backend but no UI.

**Create** `apps/web/src/routes/spec.tsx`:
- Route with `beforeLoad` auth guard
- Load spec via `orpc.spec.getSpec`
- Show spec metadata (name, version, description)
- "Extract Features" button → calls `orpc.spec.extractFeatures` with `createInDb: true`
- Show extraction results (count of features created)
- Validation errors displayed inline

**Modify** `apps/web/src/components/app-sidebar.tsx`:
- Add "Spec" link in sidebar navigation

**AC**: Load spec from disk → see metadata → extract features into DB → features appear in kanban → `check-types` passes

---

### Session 8 Execution Order
```
F282 (feature CRUD) → F283 (auto-mode dashboard) → F284 (chat polish) → F285 (spec import)
```

### Session 8 Validation
```bash
bun run check-types                    # Zero errors
bun run dev                            # Full app running
# Create project → create features → see on kanban
# Start auto-mode → see features executing → retry failed
# Send chat message → see markdown + tool calls
# Load spec → extract features → appear on kanban
```

---

## Key Files Reference (most relevant to these sessions)

### Auth & Layout
- `apps/web/src/routes/__root.tsx` — root layout (NO auth guard currently)
- `apps/web/src/routes/login.tsx` — login page with sign-in + sign-up forms
- `apps/web/src/routes/dashboard.tsx` — stub dashboard with `beforeLoad` guard
- `apps/web/src/lib/auth-client.ts` — better-auth client (authClient)
- `packages/auth/src/index.ts` — better-auth server config

### Data Layer
- `packages/api/src/routers/feature.ts` — feature CRUD (NO user scoping)
- `packages/api/src/routers/project.ts` — project CRUD (NO user scoping)
- `packages/db/src/repositories/feature.ts` — feature repo (no findByUser)
- `packages/db/src/repositories/project.ts` — project repo (no findByUser)
- `packages/api/src/context.ts` — auth context extraction

### WebSocket
- `apps/server/src/index.ts` — WS upgrade (hardcoded anonymous userId)
- `apps/server/src/lib/websocket.ts` — WS handlers

### Frontend Components
- `apps/web/src/components/app-sidebar.tsx` — sidebar (hardcoded user)
- `apps/web/src/components/agent/agent-chat.tsx` — chat (wired to sendMessage)
- `apps/web/src/store/agent-store.ts` — agent state (has isSending)
- `apps/web/src/hooks/use-agent-stream.ts` — WebSocket event listener

### Services (backend, all working)
- `packages/api/src/services/agent-service.ts` — session + streaming
- `packages/api/src/services/auto-mode-service.ts` — dependency-aware auto-mode
- `packages/api/src/services/claude-provider.ts` — SDK wrapper + factory
- `packages/api/src/services/mock-provider.ts` — fake responses for dev
- `packages/api/src/services/pipeline-service.ts` — 7-step with checkpointing
- `packages/api/src/services/spec-service.ts` — spec CRUD + feature extraction
- `packages/api/src/lib/dependency-resolver.ts` — Kahn's toposort
- `packages/api/src/lib/context-loader.ts` — CLAUDE.md loader

## Dependency Graph (F278-F285)

```
F278 (auth guard) → F279 (data isolation) → F281 (dashboard)
F278 → F280 (WS auth + sidebar)
F279 → F282 (feature CRUD UI)
F282 → F283 (auto-mode dashboard)
F278 → F284 (chat polish)
F279 → F285 (spec import)
```

## Summary

| Session | Features | Focus |
|---------|----------|-------|
| 7 | F278-F281 | Auth guards, data isolation, onboarding |
| 8 | F282-F285 | Feature CRUD UI, auto-mode wiring, chat polish, spec import |
| **Total** | **8 features** | **Make it actually usable** |
```
