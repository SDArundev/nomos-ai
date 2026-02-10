# NOMOS — Next Session Plan

> Pick up from commit `13de31c` on main. Phases 1-3 + Phase A (bugs) are complete.

---

## Context

- **App is functional**: boots with `docker compose up -d postgres redis && bun run dev`
- **Account exists**: admin@nomos.dev / NoMos12@@
- **Project exists**: "NOMOS AI" with 139+ imported features on Kanban
- **9 bugs fixed** across two sessions, 2 remain open (see below)
- **.nomos/ cleaned**: 233 → 126 tracked files, all docs accurate (PostgreSQL, not SQLite)
- **PLAN.md** at repo root has the full strategic plan
- **Mock mode**: Set `NOMOS_MOCK_AGENT=true` in .env for AI features without Claude CLI auth

---

## Completed This Session (2026-02-10b)

### Phase A: Core Bug Fixes — DONE

#### BUG-6: Terminal — FIXED (commit 9acc485)
- **Root cause**: WebSocket message format mismatch + missing error handling
- **Fix**: Backend sent `{type:"output",data}` but frontend expected `{type:"terminal:output",payload:{data}}`. Fixed backend to match. Added try-catch around xterm.js dynamic imports with toast error.
- **Finding**: Terminal was 95% complete — full PTY backend (node-pty), xterm.js frontend, WebSocket streaming, auth, all existed. Just a 1-line message format bug.
- **Dependencies**: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links` — all installed via workspace symlinks in `apps/web/node_modules/@xterm/`

#### BUG-7: Intent Box — FIXED (commit 9acc485)
- **Root cause**: Claude CLI not authenticated (`~/.claude/.credentials.json` missing) AND MockProvider returned invalid JSON for expansion use case
- **Fix**: MockProvider now detects expansion requests and returns valid `ExpandedFeature` JSON incorporating the user's input. ExpansionService catches auth errors and returns actionable message ("run `claude login`" or "set `NOMOS_MOCK_AGENT=true`").
- **Finding**: Entire feature was fully implemented — Claude Agent SDK integration, expansion agent prompt, Zod validation, DecompositionPreview UI — all existed. Just needed auth OR working mock.
- **Verified**: `curl` test with mock mode returned structured feature spec with title, description, category, acceptance criteria.

#### BUG-8: Agent Chat Persistence — CLOSED (not a bug)
- **Finding**: Sessions ARE persisted to PostgreSQL via Drizzle ORM. DB tables `agent_session` + `message` exist with full CRUD. The only in-memory state is `Map<string, AbortController>` for stream cancellation — not session storage.
- **Service chain**: `AgentService.sendMessage()` → persists user message to DB → streams via Claude SDK → persists assistant message to DB → emits `agent:complete` event.

#### BUG-9: Activity Feed — FIXED (commit 13de31c)
- **Root cause**: TWO layers — (1) events were never persisted to DB (emitted in-memory only), (2) filter dropped all non-feature events
- **Fix**: Created `event-persister.ts` that subscribes to EventService and writes events to PostgreSQL (skips high-volume `agent:stream` and `terminal:output`). Fixed events router filter to handle feature-scoped, project-scoped, AND user-scoped events via payload.userId check.
- **Verified**: `agent:complete` event persisted to DB and returned by events API with correct user ownership filtering.

---

## Remaining Work (Priority Order)

### Remaining Open Bugs

#### BUG-10: PNaN Project ID
- **Symptom**: Project link goes to `/projects/PNaN` — stored project has ID "PNaN"
- **Root cause**: ID generation bug was fixed (NaN guard added) but the existing project record still has the bad ID
- **Fix**: Either update the project ID in DB directly, or delete and recreate the project
- **Effort**: 5 minutes

#### BUG-11: Settings Page Crash
- **Symptom**: Settings page crashes on first load (cascade from previous Terminal crash)
- **Investigation needed**: Check `apps/web/src/routes/settings.tsx` for error handling
- **Effort**: 15-30 minutes

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

### Phase E: Convergence (Close the Loop)

See `.nomos/docs/NOMOS-CONVERGENCE-PLAN.md` for full analysis.

1. Port mismatch: 3000→3008 in phase files (30 min)
2. Feature ID reconciliation: F-prefix ↔ DB numeric (1 hr)
3. Branch name standardization: `nomos/` everywhere (15 min)
4. State sync: DB becomes authoritative, pipeline reads/writes via API (2 hrs)
5. Learning unification: agents read/write via API, not JSON (2 hrs)
6. Pipeline trigger from app: CLI invocation + WebSocket streaming (3 hrs)

---

## Session Prompt (Copy-Paste Ready)

```
We're continuing NOMOS development. Read PLAN.md and .nomos/docs/next-session-plan.md for full context.

Phase A (all bugs) is DONE (commit 13de31c):
- BUG-6 Terminal: fixed WS message format mismatch
- BUG-7 Intent Box: fixed MockProvider + auth error handling
- BUG-8 Agent Chat: closed as not-a-bug (sessions ARE in PostgreSQL)
- BUG-9 Activity Feed: added event persistence + fixed ownership filter

Remaining quick fixes:
- BUG-10: PNaN project ID (5 min — update or recreate project)
- BUG-11: Settings page crash (15-30 min)

Priority for this session:
1. Fix BUG-10 + BUG-11 (quick)
2. UI/UX redesign with /frontend-design
3. Feature triage (139 features)

Start by booting the app:
  docker compose up -d postgres redis
  bun run dev

Mock AI mode (no Claude CLI needed):
  NOMOS_MOCK_AGENT=true bun run dev
```

---

## Key Files Reference

| Area | Files |
|------|-------|
| Dashboard / Intent Box | `apps/web/src/components/intent-box.tsx`, `apps/web/src/components/decomposition-preview.tsx` |
| Terminal | `apps/web/src/routes/terminal.tsx`, `apps/web/src/hooks/use-terminal.ts` |
| Agent Chat | `apps/web/src/routes/agent.tsx`, `apps/web/src/components/agent/` |
| Activity Feed | `apps/web/src/routes/activity.tsx`, `packages/api/src/services/event-persister.ts` |
| Mock Provider | `packages/api/src/services/mock-provider.ts` |
| Expansion Service | `packages/api/src/services/expansion-service.ts` |
| Events Router | `packages/api/src/routers/events.ts` |
| Store | `apps/web/src/store/` (now with persist middleware) |
| API Routes | `packages/api/src/routers/` |
| DB Schema | `packages/db/src/schema/` |
| WebSocket | `apps/server/src/lib/websocket.ts`, `apps/web/src/lib/websocket.ts` |
| Server Entry | `apps/server/src/index.ts` |

---

## Commits This Session

| Hash | Description |
|------|-------------|
| `9acc485` | fix: BUG-6 Terminal + BUG-7 Intent Box — wire both core features |
| `13de31c` | fix: BUG-9 Activity feed — add event persistence + fix ownership filter |

---

*Updated: 2026-02-10 | From commit 13de31c on main*
