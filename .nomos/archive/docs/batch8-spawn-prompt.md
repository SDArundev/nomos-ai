# Batch 8 — Auth Completion + DX Polish + State Fixes

## Context

Batch 7 added quality gate services, git operations, and improved test quality. Batch 8 makes the app **user-ready** by completing authentication flows, fixing architectural issues (Zustand duplication, state machine bypasses), finishing DX features (keyboard shortcuts, command palette), wiring frontend pagination, and adding the extended thinking display.

**Branch:** Create `batch-8/auth-dx-polish` from `main` (after Batch 7 is merged)
**Baseline:** Post-Batch 7 (tests TBD, 0 type errors expected)
**Review:** `.nomos/docs/strategic-review-v3-2026-02-09.md` (FE-005, SW-002)

---

## Pre-Execution Steps

```
1. git checkout main && git pull origin main
2. git checkout -b batch-8/auth-dx-polish
3. bun test (verify baseline)
4. bun run check-types (verify 0 type errors)
```

---

## What Already Exists

### Authentication (F061-F063) — ~60% Done
- **better-auth library configured:** `packages/auth/src/index.ts` (SameSite=Strict cookies, CSRF)
- **Auth schema in DB:** `packages/db/src/schema/auth.ts` (user, session, account, verification tables)
- **Sign-in/sign-up forms:** `apps/web/src/components/sign-in-form.tsx`, `sign-up-form.tsx`
- **Login route exists:** `apps/web/src/routes/login.tsx` — basic toggle between sign-in/sign-up
- **Root layout auth check:** `apps/web/src/routes/__root.tsx:57-60` — checks `isAuthenticated`, shows shell or login
- **Auth client:** `apps/web/src/lib/auth-client.ts` — `authClient.useSession()` used in root
- **MISSING:** No redirect-to-login for unauthenticated users (just shows centered Outlet). No return URL preservation. No `beforeLoad` guards on individual routes. No proper session refresh handling.

### Settings (F069-F070) — ~90% Done
- **Settings schema:** `packages/db/src/schema/settings.ts` — key-value store with (key, scope, scopeId) composite unique
- **Settings router:** `packages/api/src/routers/settings.ts` — get, set, getAll with project ownership verification
- **Settings service:** `packages/api/src/services/settings-service.ts` — full CRUD
- **Settings hook:** `apps/web/src/hooks/use-settings.ts` — useQuery + useMutation + Zustand sync
- **Settings page (6 tabs):** `apps/web/src/routes/settings.tsx` — General, Model, Auto-Mode, Terminal, Integrations, Dashboard
- **MISSING:** Settings aren't wired to keyboard shortcuts customization. No "Reset to defaults" button. No change events emitted.

### Keyboard Shortcuts (F101) — ~40% Done
- **Hook exists:** `apps/web/src/hooks/use-keyboard-shortcuts.ts` — Cmd+K (palette), g+key vim-style navigation (7 routes)
- **Integrated in root:** `apps/web/src/routes/__root.tsx:64` — `useKeyboardShortcuts(openPalette)`
- **MISSING:** No shortcut customization (hard-coded routes map). No cheat sheet/help modal (`?` key). No conflict detection. No action shortcuts (only navigation).

### Command Palette (F102) — ~60% Done
- **Component exists:** `apps/web/src/components/command-palette.tsx` — uses `cmdk` library
- **Features working:** Cmd+K opens, fuzzy search, 10 navigation items, 2 action items, keyboard nav
- **MISSING:** No recent actions history. No feature search. No dynamic actions from context. Actions are navigation-only (no real mutations).

### State Machine (SW-002) — Bypass Exists
- **Transitions defined:** `packages/types/src/status.ts:76-93` — FEATURE_VALID_TRANSITIONS map
- **Router enforces:** `packages/api/src/routers/feature.ts:197-202` — validates transitions in updateStatus endpoint
- **Pipeline BYPASSES:** `packages/api/src/services/pipeline-service.ts:291,310,318` — directly sets status to `waiting_approval`, `verified`, `failed` WITHOUT checking FEATURE_VALID_TRANSITIONS
- **Auto-mode likely bypasses too:** services that call `featureRepository.update()` directly instead of going through the router

### Zustand Store Duplication (FE-005) — Active Problem
- **4 Zustand slices:** `apps/web/src/store/slices/` — features, sessions, projects, ui
- **Features slice:** stores `features[]`, `selectedFeatureId`, `featureStatusFilter`
- **Sessions slice:** stores `sessions[]`, `selectedSessionId`
- **Projects slice:** stores `projects[]`, `selectedProjectId`
- **React Query already fetches** features, sessions, projects via oRPC hooks (29 files use useQuery)
- **20 files reference** useAppStore to read/write the same data
- **Problem:** Two sources of truth → stale data, sync bugs, unnecessary complexity
- **Solution:** Keep UI-only state in Zustand (sidebar collapsed, palette open, filters, selections), remove data arrays (features[], sessions[], projects[]) — let React Query be sole data cache

### Frontend Pagination — Not Wired
- **Backend has:** `findPaginated()` on feature, session, pattern, antipattern, insight repos
- **Backend has:** `listPaginated` endpoints on learning router
- **Frontend uses:** No components call paginated endpoints (0 matches for findPaginated/listPaginated in web app)
- **All lists fetch full arrays** and render everything

### Extended Thinking (F038) — ~20% Done
- **Claude SDK supports:** extended thinking tokens in responses
- **Agent chat exists:** `apps/web/src/components/agent/agent-chat.tsx`
- **MISSING:** No thinking token display component. No collapsible thinking section. No token count or timing.

---

## Team: `batch-8-auth-dx` (3 agents, bypassPermissions mode)

### Agent 1: `auth-state-agent` (code-writer)

**Owns:** Auth completion (F061-F063), state machine fix (SW-002), Zustand cleanup (FE-005)

#### AUTH-1 — Complete Auth Flow (F061) [2h]
- **File:** `apps/web/src/routes/__root.tsx`
- **Fix the root layout:**
  1. When `!isAuthenticated && !isPending && !isLoginRoute` → redirect to `/login?returnTo={currentPath}`
  2. Use TanStack Router's `redirect()` in `beforeLoad` of the root route
  3. Add session refresh on window focus (use `authClient.useSession()` with `refetchOnWindowFocus`)
- **File:** `apps/web/src/routes/login.tsx`
  1. Read `returnTo` query param
  2. After successful sign-in, redirect to `returnTo || "/dashboard"`
  3. If already authenticated, redirect away from login page
- **Verify:** better-auth session/cookie flow works end-to-end

#### AUTH-2 — Protected Route Guards (F063) [2h]
- **Create:** `apps/web/src/lib/auth-guard.ts`
  ```typescript
  // Reusable beforeLoad guard for TanStack Router
  export function requireAuth({ context, location }: BeforeLoadContext) {
    if (!context.session) {
      throw redirect({ to: '/login', search: { returnTo: location.href } })
    }
  }
  ```
- **Apply to routes** that need protection:
  - `dashboard.tsx`, `kanban.tsx`, `features.$featureId.tsx`, `settings.tsx`, `agent.tsx`, `terminal.tsx`, `spec.tsx`, `activity.tsx`, `learnings.tsx`, `projects.*`
- **Keep public:** `login.tsx`, `index.tsx` (landing)
- **Pattern:** Add `beforeLoad: requireAuth` to each route's `createFileRoute` config

#### AUTH-3 — Fix State Machine Bypasses (SW-002) [3h]
- **Create:** `packages/api/src/lib/feature-state-machine.ts`
  ```typescript
  import { FEATURE_VALID_TRANSITIONS, type FeatureStatus } from "@nomos-ai/types";
  import { featureRepository } from "@nomos-ai/db";

  export async function transitionFeatureStatus(
    featureId: string,
    newStatus: FeatureStatus,
    userId?: string
  ): Promise<Feature> {
    const feature = await featureRepository.findById(featureId);
    if (!feature) throw new Error(`Feature not found: ${featureId}`);

    const allowed = FEATURE_VALID_TRANSITIONS[feature.status as FeatureStatus];
    if (!allowed?.includes(newStatus)) {
      throw new Error(`Invalid transition: ${feature.status} → ${newStatus}`);
    }

    return featureRepository.update(featureId, { status: newStatus });
  }
  ```
- **Refactor `packages/api/src/services/pipeline-service.ts`:**
  - Replace direct `update.status = "waiting_approval"` (line ~291) with `transitionFeatureStatus()`
  - Replace direct `update.status = "verified"` (line ~310) with `transitionFeatureStatus()`
  - Replace direct `update.status = "failed"` (line ~318) with `transitionFeatureStatus()`
- **Refactor `packages/api/src/routers/feature.ts`:**
  - `updateStatus` handler should use `transitionFeatureStatus()` instead of inline validation
  - `bulkUpdateStatusWithValidation` should use the same function
- **Grep for all other direct `.update(id, { status: ... })` calls** and route through state machine
- **Add `failed → pending` transition** (retry support — documented in CLAUDE.md state machine)

#### AUTH-4 — Fix Zustand Store Duplication (FE-005) [4h]
- **Strategy:** Remove data arrays from Zustand, keep only UI state + selections
- **Refactor `apps/web/src/store/slices/features.ts`:**
  ```typescript
  // BEFORE: features[], selectedFeatureId, featureStatusFilter, setFeatures
  // AFTER: selectedFeatureId, featureStatusFilter (remove features[] and setFeatures)
  export interface FeaturesSlice {
    selectedFeatureId: string | null;
    featureStatusFilter: FeatureStatus | null;
    setSelectedFeature: (id: string | null) => void;
    setFeatureStatusFilter: (status: FeatureStatus | null) => void;
  }
  ```
- **Refactor `apps/web/src/store/slices/sessions.ts`:**
  - Remove `sessions[]` and `setSessions` — keep only `selectedSessionId`
- **Refactor `apps/web/src/store/slices/projects.ts`:**
  - Remove `projects[]` and `setProjects` — keep only `selectedProjectId`
- **Update all 20 consumers** that use `useAppStore`:
  - Replace `useAppStore(s => s.features)` → use React Query `useQuery(orpc.feature.list...)`
  - Replace `useAppStore(s => s.sessions)` → use React Query `useQuery(orpc.session.list...)`
  - Replace `useAppStore(s => s.projects)` → use React Query `useQuery(orpc.project.list...)`
  - Keep `useAppStore(s => s.selectedFeatureId)` — this is UI state, belongs in Zustand
- **Key files to update (20 files):**
  - `components/auto-mode/auto-mode-dashboard.tsx` — uses setFeatures
  - `components/app-sidebar.tsx` — uses projects/features from store
  - `components/kanban/kanban-column.tsx` — uses features from store
  - `routes/kanban.tsx` — uses setFeatures, features
  - `routes/spec.tsx` — uses setFeatures
  - `routes/features.import.tsx` — uses setFeatures
  - `components/project-selector.tsx` — uses setProjects, projects
  - `components/intent-box.tsx` — uses features
  - `components/agent/agent-chat.tsx` — uses features
  - (etc. — grep for `useAppStore` to find all)
- **Create shared hooks** if needed:
  - `hooks/use-features.ts` — wraps `useQuery(orpc.feature.list...)`
  - `hooks/use-sessions.ts` — wraps `useQuery(orpc.session.list...)`
  - `hooks/use-projects.ts` — wraps `useQuery(orpc.project.list...)`

---

### Agent 2: `dx-polish-agent` (code-writer)

**Owns:** Keyboard shortcuts (F101), command palette (F102), extended thinking (F038)

#### DX-1 — Keyboard Shortcuts Cheat Sheet (F101) [3h]
- **New file:** `apps/web/src/components/keyboard-shortcuts-help.tsx`
  ```tsx
  // Modal triggered by pressing "?" key
  // Shows all available shortcuts in a nice grid layout
  // Groups: Navigation, Actions, General
  // Each entry: key combo + description
  ```
- **Update:** `apps/web/src/hooks/use-keyboard-shortcuts.ts`
  1. Add `?` key → opens cheat sheet modal
  2. Add action shortcuts:
     - `n` → new feature (navigate to kanban + open form)
     - `s` → start auto-mode (navigate to dashboard + trigger)
     - `/` → focus search (in command palette)
  3. Extract shortcut definitions to a `SHORTCUTS` constant:
     ```typescript
     export const SHORTCUTS = [
       { keys: ["⌘", "K"], description: "Command palette", group: "General" },
       { keys: ["?"], description: "Keyboard shortcuts", group: "General" },
       { keys: ["g", "d"], description: "Go to Dashboard", group: "Navigation" },
       // ...etc
     ] as const;
     ```
  4. Use the `SHORTCUTS` constant in both the hook and the cheat sheet modal

#### DX-2 — Enhance Command Palette (F102) [3h]
- **File:** `apps/web/src/components/command-palette.tsx`
- **Add feature search group:**
  1. Query features via React Query (`orpc.feature.list`)
  2. Show matching features in a "Features" group
  3. Select → navigate to `/features/{featureId}`
- **Add recent actions:**
  1. Track last 5 actions in localStorage
  2. Show "Recent" group at the top when no search query
- **Add context-aware actions:**
  1. If on feature detail page → show "Start Build", "View Diff", "Run Quality Gates"
  2. If on kanban → show "Filter by status" actions
  3. Use `useMatchRoute()` to detect current page
- **Show keyboard shortcuts** in command items:
  ```tsx
  <Command.Item>
    <span>Dashboard</span>
    <kbd>g d</kbd>  {/* Show shortcut hint */}
  </Command.Item>
  ```

#### DX-3 — Extended Thinking Display (F038) [3h]
- **New file:** `apps/web/src/components/agent/thinking-block.tsx`
  ```tsx
  interface ThinkingBlockProps {
    content: string;      // thinking text
    tokenCount: number;
    durationMs: number;
    defaultExpanded?: boolean;
  }

  // Renders as a collapsible section with:
  // - Header: "Thinking..." + token count + duration
  // - Body: formatted thinking text (markdown-rendered)
  // - Uses shadcn Collapsible component
  // - Subtle background color to distinguish from regular output
  ```
- **Update:** `apps/web/src/components/agent/agent-chat.tsx`
  1. Check message content for thinking blocks (Claude SDK returns these with `type: "thinking"`)
  2. Render `<ThinkingBlock>` for thinking content blocks
  3. Show summary extraction (first sentence or line of thinking)
- **Check:** How the Claude SDK returns thinking tokens — look at `packages/api/src/services/claude-provider.ts` for the response format, specifically `toProviderMessage()` to understand what fields are available

#### DX-4 — Keyboard Shortcuts Customization [2h]
- **Update:** `apps/web/src/routes/settings.tsx` (or settings tab components)
  1. Add "Shortcuts" section to the General tab (or create a dedicated Shortcuts tab)
  2. List all shortcuts with current key bindings
  3. Click to change binding → capture next keystroke(s)
  4. Save to settings via `useSettings().updateSetting("shortcuts.{id}", newKeys)`
- **Update:** `apps/web/src/hooks/use-keyboard-shortcuts.ts`
  1. Load custom shortcuts from settings on mount
  2. Merge with defaults (custom overrides default)
  3. Use `useSettings()` hook to read persisted shortcuts

---

### Agent 3: `pagination-polish-agent` (code-writer)

**Owns:** Frontend pagination wiring, list component improvements

#### PAG-1 — Create Pagination Component [2h]
- **New file:** `apps/web/src/components/ui/pagination-controls.tsx`
  ```tsx
  interface PaginationControlsProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  }

  // Uses shadcn Button components
  // Shows: "Showing 1-20 of 139" + Previous/Next + page size selector
  // Handles edge cases (first page, last page, single page)
  ```

#### PAG-2 — Wire Features List Pagination [3h]
- **File:** `apps/web/src/routes/kanban.tsx`
  1. Replace `feature.list` query with paginated variant
  2. Add `page` and `pageSize` state (URL search params preferred for shareable URLs)
  3. Wire `<PaginationControls>` at bottom of feature list
  4. Add status filter that works with pagination (server-side filtering)
- **File:** `apps/web/src/components/kanban/kanban-column.tsx`
  - Adapt to work with paginated data instead of full arrays
- **Check:** Does `packages/api/src/routers/feature.ts` have a `listPaginated` endpoint? If not, add one following the pattern from learning router.

#### PAG-3 — Wire Sessions List Pagination [2h]
- **File:** `apps/web/src/routes/dashboard.tsx` (or wherever sessions are listed)
  1. Find where sessions are displayed
  2. Replace with paginated query
  3. Add `<PaginationControls>`
- **Check:** `packages/api/src/routers/session.ts` for `listPaginated` endpoint availability

#### PAG-4 — Wire Learnings Pagination [2h]
- **File:** `apps/web/src/routes/learnings.tsx`
  1. The learnings page has 3 tabs (patterns, antipatterns, insights)
  2. Each tab should use paginated queries
  3. Add `<PaginationControls>` to each tab
  4. The backend `listPaginated` endpoints already exist on learning router

#### PAG-5 — Feature List Endpoint (if missing) [2h]
- **Check first:** Does `feature.listPaginated` exist?
- **If not, create:** Add `listPaginated` to `packages/api/src/routers/feature.ts`:
  ```typescript
  listPaginated: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      status: FeatureStatusSchema.optional(),
      projectId: z.string().optional(),
    }))
    .handler(async ({ input, context }) => {
      return featureRepository.findPaginated({
        userId: context.session.user.id,
        projectId: input.projectId,
        status: input.status,
        page: input.page,
        pageSize: input.pageSize,
      });
    }),
  ```
- **Similarly check:** session.listPaginated — add if missing

---

## Execution Timeline

```
TIME    auth-state-agent          dx-polish-agent           pagination-polish-agent
----    ----------------          ---------------           -----------------------
 0h     AUTH-1 (Auth flow)        DX-1 (Shortcuts cheat)    PAG-1 (Pagination component)
 2h     AUTH-2 (Route guards)     DX-2 (Command palette)    PAG-5 (Paginated endpoints)
 4h     AUTH-3 (State machine)    DX-3 (Thinking display)   PAG-2 (Features pagination)
 6h     AUTH-4 (Zustand cleanup)  DX-4 (Shortcuts config)   PAG-3 (Sessions pagination)
 8h     AUTH-4 (continued)                                  PAG-4 (Learnings pagination)
 9h     [DONE]                    [DONE]                    [DONE]
```

**File conflict avoidance:**
- auth-state-agent: owns `__root.tsx`, `login.tsx`, store slices, `feature-state-machine.ts` (new), `pipeline-service.ts` (state machine refactor), all 20 store consumer files
- dx-polish-agent: owns `use-keyboard-shortcuts.ts`, `command-palette.tsx`, `keyboard-shortcuts-help.tsx` (new), `thinking-block.tsx` (new), `agent-chat.tsx` (thinking integration), settings shortcuts section
- pagination-polish-agent: owns `pagination-controls.tsx` (new), `kanban.tsx` (pagination wiring), `dashboard.tsx` (sessions pagination), `learnings.tsx` (pagination wiring), paginated endpoints if missing

**Potential conflict on `kanban.tsx`:** auth-state-agent (Zustand cleanup in kanban) and pagination-polish-agent (pagination wiring in kanban). **Resolution:** auth-state-agent does Zustand cleanup first. pagination-polish-agent reads fresh and adds pagination on top.

**Potential conflict on `apps/web/src/routes/settings.tsx`:** dx-polish-agent adds shortcuts tab. auth-state-agent might touch it for Zustand. **Resolution:** dx-polish-agent owns settings changes. auth-state-agent avoids settings.tsx.

---

## Verification

```bash
bun test
bun run check-types

# Manual checks:
# 1. Unauthenticated user → redirected to /login with returnTo param
# 2. After login → redirected back to original page
# 3. Protected routes all require auth
# 4. Login page redirects away if already authenticated
# 5. State machine: pipeline can't skip states (e.g., backlog → verified)
# 6. State machine: failed → pending works (retry support)
# 7. Zustand store: features/sessions/projects removed from store
# 8. React Query: all list pages fetch via useQuery (no stale Zustand data)
# 9. Keyboard shortcuts "?" opens cheat sheet
# 10. Command palette shows feature search results
# 11. Command palette shows recent actions
# 12. Extended thinking blocks display in agent chat (collapsible)
# 13. Pagination controls on features, sessions, learnings pages
# 14. Page navigation preserves URL params (shareable)
# 15. Page size selector works
```

## Commit

```
feat: Batch 8 — Auth completion + DX polish + state fixes

- Complete auth flow with login redirect and return URL preservation
- Add protected route guards using TanStack Router beforeLoad
- Fix state machine bypasses in pipeline service (SW-002)
- Extract transitionFeatureStatus() for centralized state validation
- Remove Zustand data arrays, use React Query as sole data cache (FE-005)
- Add keyboard shortcuts cheat sheet modal (? key)
- Enhance command palette with feature search and recent actions
- Add extended thinking display component for agent chat
- Add keyboard shortcuts customization in settings
- Create reusable pagination controls component
- Wire pagination to features, sessions, and learnings pages
- Add paginated list endpoints where missing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Post-Batch 8: What Comes Next

### Batch 9: Pipeline End-to-End (~20h)
- Wire QualityGateService into Phase 4 Gate A (replace bash commands)
- Wire GitCommitService/GitMergeService into Phase 5 SHIP
- End-to-end test: implement a simple feature through full pipeline
- Fix MockProvider to produce checkpoint files for testing
- Wire PipelineMonitor into feature detail page
- Fix auto-mode-dashboard "." projectRoot bug (SW-001)

### Batch 10: Polish + Production (~20h)
- Multi-user session isolation (BA-013)
- WebSocket auth for real-time updates
- CSP nonces (if deploying beyond localhost)
- Error recovery UX (retry buttons, graceful degradation)
- Performance profiling + React.memo optimization
- Production Docker image optimization
