# Session 9-10 Prompt: Runtime Hardening, Activity Log, Production Build, and Desktop

Copy-paste this into a new Claude Code session.

---

```
Implement Sessions 9-10 of the Automaker Mirror plan on branch `feature/automaker-mirror`. These sessions close the last gaps: runtime hardening, activity log, bulk operations, production build, CI/CD, and Tauri desktop integration.

## Current State

- **Branch**: `feature/automaker-mirror` (29+ commits ahead of main, 160+ files, 13k+ LOC)
- **PR**: #6 — https://github.com/SDArundev/nomos-ai/pull/6
- **`bun run check-types`**: PASSES (zero errors)
- **Sessions 1-8 completed**: F258-F285 (28 features)
  - Sessions 1-3: Backend foundation + frontend scaffolding (F258-F265)
  - Sessions 4-6: Wire integration + Docker dev + feature parity (F266-F277)
  - Sessions 7-8: Auth guards, data isolation, CRUD UI, auto-mode dashboard, chat polish, spec import (F278-F285)
- **What works**: Full backend (types/DB/services/routers/WS), full frontend (routes/stores/hooks/components), auth enforced, data isolated by user, feature CRUD from UI, auto-mode dashboard wired, chat with markdown + tool calls, spec import flow
- **What's missing**: No activity/event history UI, no bulk operations, no production build, no CI pipeline, no Tauri desktop, no keyboard shortcuts

## Rules
1. **Branch**: `feature/automaker-mirror` (already checked out)
2. **No NOMOS pipeline**: Direct implementation only
3. **Reference docs**: `.nomos/inspiration/automaker-mirror/` for patterns
4. **Validation**: `bun run check-types` after each feature, fix all errors
5. **Commits**: One commit per feature with descriptive message
6. **No over-engineering**: Implement exactly what the AC requires

---

## Session 9: Runtime Hardening & Missing Links (F286-F289)

### F286: Global Error Boundary + Toast System

**Problem**: No centralized error handling. API failures silently swallowed. No user-visible feedback for background operations (auto-mode events, WebSocket disconnects).

**Create** `apps/web/src/components/error-boundary.tsx`:
- React error boundary wrapping `<Outlet />`in root layout
- Fallback UI: "Something went wrong" with reload button and error details (collapsible)
- Log error to console for debugging

**Create** `apps/web/src/components/toast-provider.tsx`:
- Toast notification system using `sonner` (already common in shadcn/ui stacks) or a lightweight alternative
- Toast types: success, error, warning, info
- Auto-dismiss after 5s, manually dismissable
- Position: bottom-right

**Modify** `apps/web/src/routes/__root.tsx`:
- Wrap outlet with `<ErrorBoundary>` and `<ToastProvider>`
- Add global `onError` handler for unhandled promise rejections → toast

**Modify** `apps/web/src/hooks/use-agent-stream.ts`:
- Replace `console.error` calls with toast notifications
- Show toast on WebSocket disconnect with "Reconnecting..." message

**Modify** `apps/web/src/hooks/use-websocket.ts`:
- Show toast on connection lost / reconnecting / reconnected
- Show toast on max retries exceeded

**AC**: Unhandled errors show error boundary → API failures show toast → WS disconnect shows reconnecting toast → `check-types` passes

---

### F287: Activity Log & Event History UI

**Problem**: Events are emitted and persisted in DB but there's no UI to browse them. Users can't see what happened in their project over time.

**Create** `apps/web/src/routes/activity.tsx`:
- Route with `beforeLoad` auth guard
- Paginated list of events from `orpc.events.recent` (already exists in events router)
- Filter by event type (agent, feature, auto-mode, worktree)
- Each event shows: icon by type, timestamp (relative), description, payload preview (collapsible)
- Auto-refresh via WebSocket events (new events prepend to list)

**Create** `apps/web/src/components/activity/activity-feed.tsx`:
- Reusable feed component (also embeddable in dashboard)
- Event type → icon mapping (agent: bot, feature: puzzle, auto-mode: play, worktree: git-branch)
- Infinite scroll with `orpc.events.recent` pagination

**Create** `apps/web/src/components/activity/event-card.tsx`:
- Single event display with type badge, relative time, description
- Expandable JSON payload viewer

**Modify** `apps/web/src/components/app-sidebar.tsx`:
- Add "Activity" link in sidebar navigation between "Agent" and "Settings"

**Modify** `apps/web/src/routes/dashboard.tsx`:
- Replace static "recent activity" section with embedded `<ActivityFeed limit={10} />` component

**AC**: Activity page renders at `/activity` → events filterable by type → paginated → auto-updates via WS → dashboard shows last 10 events → `check-types` passes

---

### F288: Feature Bulk Operations + Search/Filter

**Problem**: Managing many features (100+) requires bulk status updates, search, and filtering. Current kanban only shows all features.

**Modify** `apps/web/src/routes/kanban.tsx`:
- Add search bar: filters features by title (client-side, debounced 300ms)
- Add category filter dropdown (from distinct categories in feature list)
- Add phase filter dropdown (from distinct phases)
- Add "Select All" checkbox → multi-select features with checkboxes on cards
- Bulk action bar (appears when features selected): "Move to..." dropdown (status), "Delete" button with confirmation

**Modify** `apps/web/src/routes/features.$featureId.tsx`:
- Add inline edit for title, description, category, phase
- Edit mode toggled by pencil icon button
- Save calls `orpc.features.update`, cancel reverts

**Create** `apps/web/src/routes/features.import.tsx`:
- Route for importing features from JSON file
- File upload input accepting `.json`
- Preview parsed features in table before import
- "Import All" button → calls `orpc.features.create` for each
- Show progress: "Importing 15/30..."
- Validate JSON structure before import

**Modify** `packages/api/src/routers/feature.ts`:
- Add `bulkCreate` procedure: accepts array of feature inputs, creates all in transaction
- Add `bulkDelete` procedure: accepts array of feature IDs, deletes all in transaction

**Modify** `apps/web/src/components/app-sidebar.tsx`:
- Add "Import Features" link under features section (or as submenu)

**AC**: Search filters features instantly → category/phase dropdowns work → multi-select + bulk status change works → inline editing saves → JSON import flow works → `check-types` passes

---

### F289: WebSocket Health + Reconnection Indicators

**Problem**: WebSocket disconnects are invisible. Auto-mode runs silently in background. Users don't know if the system is connected.

**Create** `apps/web/src/components/connection-status.tsx`:
- Small indicator in header (or bottom bar): green dot "Connected", yellow dot "Reconnecting...", red dot "Disconnected"
- Shows WebSocket connection state from `use-websocket` hook
- Clicking when disconnected triggers manual reconnect

**Modify** `apps/web/src/components/header.tsx`:
- Add `<ConnectionStatus />` next to notification bell
- Add auto-mode status indicator: "Auto-mode: Running (2 features)" or "Stopped"

**Create** `apps/web/src/hooks/use-auto-mode-status.ts`:
- Hook that subscribes to `auto-mode:*` WebSocket events
- Tracks: isRunning, activeFeatureCount, lastEvent
- Provides current auto-mode status for display

**Modify** `apps/web/src/components/agent/agent-chat.tsx`:
- Show "Disconnected" overlay when WebSocket is down
- Disable send button when WS not connected
- Show "Reconnected — you may have missed messages" banner after reconnection

**AC**: Header shows connection status dot → auto-mode status visible → chat disabled when disconnected → reconnection triggers banner → `check-types` passes

---

### Session 9 Execution Order
```
F286 (error boundary + toast) → F287 (activity log) → F288 (bulk ops) → F289 (WS health)
```

### Session 9 Validation
```bash
bun run check-types                    # Zero errors
bun run dev                            # Start server + web
# Disconnect WiFi → see "Disconnected" indicator
# Reconnect → see "Reconnected" banner
# Visit /activity → see event history
# Go to kanban → search features → bulk select → change status
# Import features from JSON file
```

---

## Session 10: Production Build + CI/CD + Desktop (F290-F293)

### F290: Production Dockerfile + Build Pipeline

**Problem**: Only `Dockerfile.dev` exists. No production build. No optimized images.

**Create** `Dockerfile`:
- Multi-stage build:
  1. `builder`: Bun install + build web (Vite) + build server (Bun compile or bundle)
  2. `runner`: Minimal image with Bun runtime, copy built artifacts only
- Web: static files served by server (or separate nginx stage)
- Server: single Bun binary or bundled JS
- Health check: `HEALTHCHECK CMD curl -f http://localhost:3001/health`
- Non-root user, security best practices

**Create** `docker-compose.yml` (production):
- Single service running the production image
- SQLite volume mount for persistence
- Environment variables for production config
- Optional: reverse proxy (Caddy/nginx) service for HTTPS

**Modify** `apps/server/src/index.ts`:
- If `NODE_ENV=production`, serve `apps/web/dist/` as static files from Hono
- This avoids needing a separate web server in production

**Modify** `package.json` (root):
- Add `build` script: `turbo run build`
- Add `start` script: `cd apps/server && bun run src/index.ts`

**Modify** `apps/web/package.json`:
- Ensure `build` script produces optimized output in `dist/`
- Verify Vite config has proper base path

**AC**: `bun run build` succeeds → `docker build -t nomos-ai .` succeeds → container starts and serves app at port 3001 → health check passes → `check-types` passes

---

### F291: GitHub Actions CI Pipeline

**Problem**: No automated checks. Code merges without validation.

**Create** `.github/workflows/ci.yml`:
- Triggers: push to `main`, PR to `main`
- Jobs (parallel where possible):
  1. **typecheck**: `bun install && bun run check-types`
  2. **lint**: `bun run lint` (if biome configured)
  3. **build**: `bun run build` (verify production build works)
  4. **docker**: Build Docker image (don't push, just verify it builds)
- Bun setup: `oven-sh/setup-bun@v2`
- Cache: `actions/cache` for `node_modules` and `.turbo`
- Timeout: 10 minutes per job
- Concurrency: cancel in-progress on same branch

**Modify** `package.json` (root):
- Ensure `lint` script exists (biome check or similar)
- Ensure `check-types` script exists (already does)

**AC**: Push to branch → CI runs → all 4 jobs pass → PR shows green checks → `check-types` passes locally

---

### F292: Keyboard Shortcuts + Command Palette

**Problem**: No keyboard navigation. Power users need fast access to routes and actions.

**Create** `apps/web/src/components/command-palette.tsx`:
- Modal opened by `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- Search input with fuzzy matching
- Sections: Navigation (routes), Actions (create feature, start auto-mode), Recent (last visited)
- Navigation items: Dashboard, Kanban, Agent, Terminal, Activity, Settings, Spec
- Action items: New Feature, New Project, Start Auto-Mode, Stop Auto-Mode
- Arrow keys to navigate, Enter to select, Escape to close
- Use `cmdk` package (popular command palette lib) or build minimal version

**Create** `apps/web/src/hooks/use-keyboard-shortcuts.ts`:
- Global keyboard shortcut registry
- Shortcuts:
  - `Cmd+K`: Command palette
  - `Cmd+/`: Toggle sidebar
  - `g d`: Go to dashboard (vim-style two-key)
  - `g k`: Go to kanban
  - `g a`: Go to agent
  - `g t`: Go to terminal
  - `g s`: Go to settings
  - `Escape`: Close any open modal/sheet

**Modify** `apps/web/src/routes/__root.tsx`:
- Mount `<CommandPalette />` at root level
- Mount keyboard shortcuts hook

**AC**: `Cmd+K` opens command palette → search works → navigation shortcuts work → `g k` goes to kanban → `Escape` closes modals → `check-types` passes

---

### F293: Tauri Desktop Shell

**Problem**: App runs as web-only. Need desktop wrapper for native file access and always-on experience.

**Create** `apps/desktop/` directory:
- Initialize with `bun create tauri-app` or manual setup
- `src-tauri/tauri.conf.json`: window config, app name "NOMOS AI", icon
- `src-tauri/src/main.rs`: default Tauri entry (no custom Rust needed initially)
- `src-tauri/Cargo.toml`: Tauri deps

**Create** `apps/desktop/src-tauri/tauri.conf.json`:
- Dev server URL: `http://localhost:3000` (proxies to Vite)
- Build: point to `../../web/dist` for production
- Window: 1280x800 default, resizable, title "NOMOS AI"
- Security: `dangerousRemoteAccess` disabled
- Permissions: filesystem read for project directories

**Modify** `turbo.json`:
- Add `desktop` app to pipeline
- `desktop#dev` depends on `web#dev`

**Modify** `package.json` (root):
- Add `dev:desktop` script: `turbo run dev --filter=desktop`

**AC**: `bun run dev:desktop` opens native window → loads web app → window title shows "NOMOS AI" → native file dialogs work → `check-types` passes

---

### Session 10 Execution Order
```
F290 (production build) → F291 (CI pipeline) → F292 (keyboard shortcuts) → F293 (Tauri desktop)
```

### Session 10 Validation
```bash
bun run check-types                    # Zero errors
bun run build                          # Production build succeeds
docker build -t nomos-ai .             # Docker image builds
bun run dev                            # Web app running
# Press Cmd+K → command palette opens → type "kanban" → navigate
# Press g then d → goes to dashboard
bun run dev:desktop                    # Tauri window opens (requires Rust toolchain)
```

---

## Key Files Reference (most relevant to these sessions)

### Error Handling & UX
- `apps/web/src/routes/__root.tsx` — root layout (mount error boundary, toast, command palette)
- `apps/web/src/hooks/use-websocket.ts` — WS client (add toast on disconnect)
- `apps/web/src/hooks/use-agent-stream.ts` — agent events (toast on errors)
- `apps/web/src/components/header.tsx` — header (add connection status, auto-mode indicator)

### Activity & Events
- `packages/api/src/routers/events.ts` — events router (already has `recent`, `byType`)
- `packages/api/src/services/event-service.ts` — event pub-sub + persistence
- `apps/web/src/routes/dashboard.tsx` — dashboard (embed activity feed)

### Feature Management
- `apps/web/src/routes/kanban.tsx` — kanban board (add search, filters, bulk ops)
- `apps/web/src/routes/features.$featureId.tsx` — feature detail (add inline edit)
- `packages/api/src/routers/feature.ts` — feature CRUD (add bulk create/delete)

### Build & CI
- `Dockerfile.dev` — existing dev Dockerfile (reference for production)
- `docker-compose.dev.yml` — existing dev compose (reference for production)
- `package.json` (root) — scripts
- `turbo.json` — pipeline config

### Desktop
- `apps/web/` — web app (Tauri wraps this)
- `apps/server/src/index.ts` — server (serve static in production)

## Dependency Graph (F286-F293)

```
F286 (error boundary) → F287 (activity log)
F286 → F289 (WS health indicators)
F287 → F288 (bulk ops — uses toast for feedback)
F290 (production build) → F291 (CI pipeline — builds in CI)
F290 → F293 (Tauri — needs build output)
F286 → F292 (keyboard shortcuts — uses root layout)
```

## Summary

| Session | Features | Focus |
|---------|----------|-------|
| 9 | F286-F289 | Error handling, activity log, bulk ops, WS health |
| 10 | F290-F293 | Production build, CI/CD, keyboard shortcuts, Tauri desktop |
| **Total** | **8 features** | **Production-ready + desktop** |
```
