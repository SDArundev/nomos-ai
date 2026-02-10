# NOMOS — Next Session Plan

> Pick up from commit `46a519d` on main. Phases 1-3 of PLAN.md are complete.

---

## Context

- **App is functional**: boots with `docker compose up -d postgres redis && bun run dev`
- **Account exists**: admin@nomos.dev / NoMos12@@
- **Project exists**: "NOMOS AI" with 139 imported features on Kanban
- **5 bugs fixed** this session, 4 remain open (see below)
- **.nomos/ cleaned**: 233 → 126 tracked files, all docs accurate (PostgreSQL, not SQLite)
- **PLAN.md** at repo root has the full strategic plan

---

## Remaining Work (Priority Order)

### Phase A: Fix Core Feature Bugs

#### BUG-6: Terminal Not Functional
- **Symptom**: Terminal page renders an empty textarea — no shell, no PTY, no interactivity
- **Screenshot**: See nomos-login-page.png (sidebar shows Terminal nav item)
- **Investigation targets**:
  - `apps/web/src/routes/terminal.tsx` — frontend terminal component
  - `apps/server/src/` or `packages/api/src/` — look for terminal/PTY WebSocket endpoint
  - Check if node-pty or similar is a dependency, or if this was never wired
- **Likely issue**: Frontend renders a textarea placeholder but no PTY backend exists, or the WebSocket channel for terminal data was never connected
- **Decision needed**: Is a web terminal essential for v1, or should this be deferred? (It's useful for watching agent output but not strictly needed for the core loop)

#### BUG-7: Intent Box Doesn't Submit
- **Symptom**: Dashboard "Intent Box" — the text field where you describe a feature and AI generates a spec — button doesn't work
- **This is the CORE feature of NOMOS** — describe what you want → AI generates it
- **Investigation targets**:
  - `apps/web/src/routes/dashboard.tsx` or `apps/web/src/components/dashboard/` — Intent Box component
  - Look for the submit handler — is it calling an API endpoint? Is the endpoint wired?
  - `packages/api/src/routers/` — look for intent/spec/generation endpoint
  - Check if Claude Agent SDK integration exists or is stubbed
- **Likely issue**: The submit handler is either missing, calls a non-existent endpoint, or the AI generation backend was never implemented

#### BUG-8: Agent Chat is IN-MEMORY Only
- Sessions stored in server memory, lost on restart
- Lower priority but fragile — investigate if worth persisting to DB

#### BUG-9: Activity Feed Drops Non-Feature Events
- Filter at `events.ts:18-20` silently drops events that aren't feature-related
- Low priority — cosmetic

### Phase B: UI/UX Redesign

Use `/frontend-design` skill for this phase. The app works but looks like stock shadcn.

**Goals**:
- Custom color palette (not grayscale) — something that feels like a dev tool, not a template
- Logo/wordmark on login page with tagline
- Sidebar: group 11 nav items into logical sections (Core, Tools, System)
- Dashboard: meaningful empty state with onboarding guidance
- Kanban: improve card design with visual status indicators
- Agent Chat: replace raw UUIDs with meaningful session names
- Dark mode should be the primary theme (dev tool aesthetic)

**Approach**: Run `/frontend-design` with the app running, iterate on components one by one.

### Phase C: Feature Triage (139 Features)

The 139 features in the DB need review:
- **72 "verified"** — many were "verified" by AI self-review, not by running the app. Re-validate.
- **66 "backlog"** — prioritize what enables the core loop (describe → build → watch → ship)
- **45 are CAT-FIX** — batch-generated bug fixes, many may be obsolete after this session's fixes
- **Decision**: Archive/remove obsolete features, re-prioritize the rest

### Phase D: Remaining .nomos/ Cleanup

- **P2 Learning Sync**: Move JSON files to seed-data/, make DB the single source of truth, add API endpoints for agents to read learning data
- **P3 Skill Consistency**: Update v3 step files and agent prompts to use DB/API instead of reading JSON files directly

---

## Session Prompt (Copy-Paste Ready)

```
We're continuing NOMOS development. Read PLAN.md for full context.

Phases 1-3 are DONE (commit 46a519d):
- 5 bugs fixed (PNaN, project persist, SQLite docs, import IDs, WebSocket)
- .nomos/ cleaned (233→126 tracked files)
- All docs accurate

Remaining open bugs:
- BUG-6: Terminal page is non-functional (empty textarea, no PTY)
- BUG-7: Intent Box on Dashboard doesn't submit (core feature — describe → AI generates spec)
- BUG-8: Agent chat sessions are in-memory only (lost on restart)
- BUG-9: Activity feed drops non-feature events

Priority for this session:
1. Fix BUG-7 (Intent Box) — this is THE core feature of NOMOS
2. Fix BUG-6 (Terminal) — or decide to defer if it needs node-pty
3. Then UI/UX redesign with /frontend-design

Start by booting the app:
  docker compose up -d postgres redis
  bun run dev

Then investigate BUG-7 first — trace from the Dashboard Intent Box component through to the API. The submit handler likely calls a non-existent or unimplemented endpoint.
```

---

## Key Files Reference

| Area | Files |
|------|-------|
| Dashboard / Intent Box | `apps/web/src/routes/dashboard.tsx`, `apps/web/src/components/dashboard/` |
| Terminal | `apps/web/src/routes/terminal.tsx` |
| Agent Chat | `apps/web/src/routes/agent.tsx`, `apps/web/src/components/agent/` |
| Activity Feed | `apps/web/src/routes/activity.tsx`, events service |
| Store | `apps/web/src/store/` (now with persist middleware) |
| API Routes | `packages/api/src/routers/` |
| DB Schema | `packages/db/src/schema/` |
| WebSocket | `apps/server/src/websocket.ts`, `apps/web/src/lib/websocket.ts` |

---

*Generated: 2026-02-10 | From commit 46a519d on main*
