# Session 8.5 Prompt: Bugfix Sprint — Pre-Session 9 Cleanup

Copy-paste this into a new Claude Code session.

---

```
Fix 7 bugs on branch `feature/automaker-mirror` before proceeding to Session 9 features. These were found during end-to-end verification of Sessions 1-8.

## Current State

- **Branch**: `feature/automaker-mirror` (29 commits, 141 files, 12k+ LOC)
- **`bun run check-types`**: PASSES (zero errors)
- **Dev server**: `bun run dev` starts both Vite (port 3001) and Hono (port 3008)
- **What works**: Auth, projects CRUD, features CRUD, kanban board, dashboard with real stats, settings with 12 themes, auto-mode dashboard, terminal/spec/agent page shells

## Rules
1. **Branch**: `feature/automaker-mirror` (already checked out)
2. **No NOMOS pipeline**: Direct implementation only
3. **Validation**: `bun run check-types` after each fix, fix all errors
4. **Commits**: One commit per bug fix (or group tightly related fixes)
5. **No over-engineering**: Fix exactly what's broken, don't refactor surroundings

---

## Bug 1 (P0): Agent session creation returns 500

**Symptom**: Clicking "+" in Agent page → "Internal server error" toast. `POST /rpc/agent/createSession` returns 500.

**Root cause**: `packages/api/src/services/agent-service.ts` line 184 passes `projectId` as `featureId`:
```typescript
featureId: input.projectId, // re-use featureId FK for project context
```
But `packages/db/src/schema/sessions.ts` has `featureId` with a NOT NULL FK constraint to the `feature` table:
```typescript
featureId: text("feature_id")
    .notNull()
    .references(() => feature.id, { onDelete: "cascade" }),
```
When `projectId: "P001"` is passed, the FK constraint fails because "P001" doesn't exist in the `feature` table.

**Fix approach**:
1. Change the `agent_session` schema to add a `projectId` column (nullable text, no FK) for project context
2. Make `featureId` nullable (agent chat sessions don't always belong to a feature)
3. Update `agent-service.ts` to use `projectId` for the new column, pass `null` for `featureId` when it's a chat session
4. Generate a new migration: `bun run db:generate`
5. Test: creating a session from the Agent page should succeed

**Files**:
- `packages/db/src/schema/sessions.ts` — add `projectId` column, make `featureId` nullable
- `packages/api/src/services/agent-service.ts` — fix `createSession` to use correct columns
- `packages/db/src/repositories/session.ts` — update types if needed
- Run `bun run db:generate` for migration

**AC**: Agent page → click "+" → session created without error → session appears in sidebar

---

## Bug 2 (P1): Sidebar project selector always shows "No projects"

**Symptom**: Sidebar dropdown "Select Project" always shows "No projects" even when projects exist.

**Root cause**: `apps/web/src/components/project-selector.tsx` reads from Zustand store:
```typescript
const projects = useAppStore((s) => s.projects);
```
But `setProjects()` is **never called in production code** — only in tests. The store initializes with `projects: []` and is never hydrated from the API.

**Fix approach**: The project selector should fetch projects from the oRPC API, not rely on the Zustand store being manually populated. Two options:
- **Option A** (simpler): Use TanStack Query directly in `project-selector.tsx` via `orpc.projects.list.queryOptions()`
- **Option B**: Add a `useEffect` in the root layout that fetches projects and calls `setProjects()`

Prefer Option A — it's self-contained and doesn't add coupling.

**Files**:
- `apps/web/src/components/project-selector.tsx` — replace `useAppStore((s) => s.projects)` with `useQuery(orpc.projects.list.queryOptions())`

**AC**: Sidebar shows created projects in dropdown → selecting a project updates the selector label

---

## Bug 3 (P1): `/features/F001` route renders empty content

**Symptom**: Navigating to `/features/F001` directly shows the layout but the `<main>` area is completely empty — no content, no "Feature not found" fallback, no loading skeleton.

**Root cause**: The `features.$featureId.tsx` route component exists and has full logic. The issue is likely that the `orpc.features.get` query silently fails (the endpoint may require `projectId` or has a different input shape), and without an error boundary the component crashes silently, rendering nothing inside `<main>`.

**Fix approach**:
1. Check what `orpc.features.get` expects vs what the route passes (`{ id: featureId }`)
2. Verify the `features.get` router procedure exists and accepts `{ id: string }`
3. Add error handling — if the query errors, show the "Feature not found" UI instead of blank
4. Wrap the query in a try/catch or check `feature.isError` state

**Files**:
- `packages/api/src/routers/feature.ts` — verify `get` procedure exists and its input schema
- `apps/web/src/routes/features.$featureId.tsx` — add `feature.isError` handling

**AC**: `/features/F001` shows feature detail with description, AC, status → unknown feature IDs show "Feature not found"

---

## Bug 4 (P2): Theme doesn't apply to main content area

**Symptom**: Selecting "Dracula" theme in Settings → sidebar turns dark, but Kanban columns, Dashboard cards, and main content area stay light/white.

**Root cause**: Two theme systems conflict:
1. `next-themes` controls the `dark` class on `<html>` (Tailwind's dark mode)
2. `applyTheme()` in `apps/web/src/lib/themes/index.ts` sets CSS custom properties on `document.documentElement`

The `applyTheme()` sets `--background`, `--card`, etc. to dark values, but it always reads `theme.dark` colors and **never tells next-themes to switch to dark mode**. Components using Tailwind's `dark:` variants don't pick up the change. The sidebar works because it uses `--sidebar` CSS variables directly.

**Fix approach**:
1. When a dark theme is applied (Dracula, Nord, etc.), also call next-themes' `setTheme("dark")` to ensure the `dark` class is on `<html>`
2. When "Default" is selected, call `resetTheme()` and let next-themes handle light/dark via system preference
3. Make `applyTheme` and `setTheme` work together — either in `general-tab.tsx` where theme buttons are clicked, or create a unified `useThemeManager` hook

**Files**:
- `apps/web/src/components/settings/general-tab.tsx` — after `applyTheme(themeId)`, also call `setTheme("dark")` for non-default themes
- OR create `apps/web/src/hooks/use-theme-manager.ts` — unified hook combining both systems

**AC**: Selecting Dracula → entire app goes dark (sidebar + content) → selecting Default → reverts to system preference

---

## Bug 5 (P2): Port configuration mismatch in `.env` files

**Symptom**: Root `.env` says `PORT=3001` but server runs on 3008. `.env.example` says `PORT=3008`. Confusing for new setup.

**Root cause**: Multiple `.env` files with conflicting values:
- Root `.env`: `PORT=3001`, `BETTER_AUTH_URL=http://localhost:3001`
- Root `.env.example`: `PORT=3008`, `BETTER_AUTH_URL=http://localhost:3008`
- `apps/web/.env`: `VITE_SERVER_URL=http://localhost:3008`, `VITE_PORT=3001`

The server actually runs on port from the server's env (3008), and web dev server on 3001. The root `.env` values are stale/wrong.

**Fix approach**:
1. Update root `.env` to match reality: `PORT=3008`, `BETTER_AUTH_URL=http://localhost:3008`
2. Update root `.env.example` comments to explain the port layout:
   - Web dev (Vite): 3001
   - API server (Hono): 3008
3. Ensure `CORS_ORIGIN` in root `.env` includes `http://localhost:3001`

**Files**:
- Root `.env` — fix `PORT`, `BETTER_AUTH_URL`, `CORS_ORIGIN`
- Root `.env.example` — add port layout comments, fix defaults

**AC**: `bun run dev` → server on 3008, web on 3001 → no CORS errors → auth works end-to-end

---

## Bug 6 (P2): Missing favicon

**Symptom**: `GET /favicon.ico` returns 404 on every page load.

**Fix**: Add a simple favicon to `apps/web/public/favicon.ico` (or `favicon.svg`). Can be a simple SVG with the NOMOS "N" letter or a generic icon.

**Files**:
- `apps/web/public/favicon.svg` (or `.ico`) — create minimal favicon
- `apps/web/index.html` — add `<link rel="icon" href="/favicon.svg" />` if not auto-discovered

**AC**: No 404 for favicon in browser console

---

## Bug 7 (P3): features.json status never updated

**Symptom**: `.nomos/features.json` still shows F258-F265 as `pending`/`backlog` even though all are implemented.

**Fix**: Update the status of F258-F285 to `verified` (or `waiting_approval`) in `.nomos/features.json` to reflect actual implementation state.

**Files**:
- `.nomos/features.json` — update status fields for F258-F285

**AC**: Feature statuses in `.nomos/features.json` match implementation reality

---

## Execution Order

```
Bug 1 (agent session FK)  →  highest impact, blocks agent chat
Bug 2 (project selector)  →  quick fix, high visibility
Bug 3 (feature detail)    →  investigate + fix
Bug 4 (theme propagation) →  needs both theme systems aligned
Bug 5 (env ports)         →  config fix
Bug 6 (favicon)           →  trivial
Bug 7 (features.json)     →  data fix
```

## Validation

```bash
bun run check-types                    # Zero errors
bun run dev                            # Start server + web

# Bug 1: Go to Agent page → click "+" → session creates successfully
# Bug 2: Sidebar "Select Project" dropdown shows created projects
# Bug 3: Navigate to /features/F001 → shows feature detail
# Bug 4: Settings → select Dracula → entire app goes dark
# Bug 5: No CORS errors in console, auth works
# Bug 6: No favicon 404 in console
# Bug 7: cat .nomos/features.json | jq '.features[] | select(.id | test("F2[5-8]")) | {id, status}'
```
```
