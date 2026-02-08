# Automaker Mirror — Execution Runbook

> Instructions for Claude Code agents implementing F258-F265 on `feature/automaker-mirror` branch.

---

## Rules

1. **Branch**: All work happens on `feature/automaker-mirror`. Never touch `main`.
2. **No NOMOS**: Do not use `/nomos` or the NOMOS pipeline. Direct implementation only.
3. **Reference docs**: Read the relevant docs in this directory before writing code.
4. **Validation**: After implementation, run `bun run check-types` and fix all errors.
5. **Commits**: Commit after each feature is complete with a descriptive message.
6. **No over-engineering**: Implement exactly what the AC requires. No extras.

---

## Reference Docs

| Doc | Read when implementing |
|-----|----------------------|
| `architecture-map.md` | All features — stack decisions, package structure, target directories |
| `data-models.md` | F258 — exact Zod schemas, Drizzle tables, repository interfaces |
| `implementation-patterns.md` | F259-F262 — code patterns for every service |
| `feature-dependency-graph.md` | All features — file lists, ACs, dependencies |

---

## Session Plan

### Session 1: F258 + F259 (Backend Foundation)

**F258: Types + DB Layer**
- Read: `data-models.md` (primary), `architecture-map.md` (package structure)
- Create 8 new type modules in `packages/types/src/`
- Extend `feature.ts`, `session.ts`, `ids.ts`, `agent.ts`, `index.ts`
- Create 5 new Drizzle schemas in `packages/db/src/schema/`
- Extend `features.ts`, `sessions.ts` schemas with new columns
- Create 5 new repositories in `packages/db/src/repositories/`
- Validate: `bun run check-types`, `bun run db:generate`

**F259: Agent Engine + WebSocket**
- Read: `implementation-patterns.md` sections 1-4, `architecture-map.md`
- Create `claude-provider.ts`, `sdk-options.ts`, `event-service.ts`, `event-broadcaster.ts`
- Create agent + events oRPC routers
- Create WebSocket upgrade handler in `apps/server/src/lib/websocket.ts`
- Rewrite `agent-service.ts` for full session management + SDK streaming
- Wire into `apps/server/src/index.ts`
- Validate: server starts, WebSocket connects

### Session 2: F260 + F261 + F262 (Backend Services)

**F260: Autonomous Loop** (depends on F258 + F259)
- Read: `implementation-patterns.md` sections 5-6
- Create `worktree-service.ts`, `prompt-builder.ts`, `pipeline-service.ts`, `auto-mode-service.ts`
- Create `git-utils.ts`, auto-mode/worktree/pipeline routers
- Validate: auto-mode starts/stops, pipeline steps execute

**F261: Terminal Service** (depends on F258)
- Read: `implementation-patterns.md` section 7
- Create `terminal-service.ts` + terminal router
- Add `/ws/terminal` WebSocket channel
- Validate: terminal session creates, I/O streams

**F262: Settings + Notifications + GitHub + FS** (depends on F258)
- Read: `implementation-patterns.md` sections 8-9, 12-13
- Create `settings-service.ts`, `notification-service.ts`, `github-service.ts`, `fs-service.ts`
- Create settings/notifications/github/fs/models routers
- Validate: settings save/load, notifications emit, fs validates paths

### Session 3: F263 + F264 + F265 (Frontend)

**F263: WebSocket Client + Agent View** (depends on F258, F259, F260)
- Create WS client with auto-reconnect + hooks + agent store
- Build agent chat view with message list, tool calls, streaming indicator
- Validate: agent view renders, streams real-time

**F264: Terminal + Diff + Enhanced Kanban** (depends on F258, F261, F262)
- Install: `@xterm/xterm`, `@dnd-kit/core`, `react-diff-viewer-continued`
- Build terminal view + diff viewer + kanban with drag-and-drop
- Validate: terminal renders, kanban drag works

**F265: Settings + Dashboard + Notifications + Themes** (depends on F258, F260, F262)
- Build settings pages, auto-mode dashboard, notification bell, theme system
- Validate: settings persist, themes switch

---

## Validation Checklist (per session)

```bash
# After Session 1
bun run check-types          # Zero errors
bun run db:generate          # Migrations created

# After Session 2
bun run check-types          # Zero errors
cd apps/server && bun run dev  # Server starts

# After Session 3
bun run check-types          # Zero errors
cd apps/web && bun run dev   # Web app builds
```

---

## Existing Codebase Context

```
packages/types/src/     → feature.ts, session.ts, ids.ts, agent.ts, project.ts, status.ts
packages/db/src/schema/ → features.ts, sessions.ts, projects.ts, learnings.ts, auth.ts
packages/db/src/repositories/ → feature.ts, session.ts, project.ts, learning.ts
packages/api/src/services/    → agent-service.ts (to rewrite)
packages/api/src/routers/     → feature.ts, session.ts, project.ts, learning.ts
apps/server/src/              → index.ts (Hono entry point)
apps/web/src/                 → routes/, components/, store/, hooks/
```
