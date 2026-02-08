# Skeptic Independent Findings Report

## Summary

Comprehensive code-path tracing of the NOMOS AI codebase. Findings organized by severity.

### Stats
- **Total findings:** 14 (4 CRITICAL, 4 HIGH, 5 MEDIUM, 1 LOW)
- **Explorer batches cross-referenced:** 5/11 (batches 1-5, F001-F030)
- **Agreements with Explorer:** 27 features confirmed
- **Disagreements with Explorer:** 1 (F019 session router should be FRAGILE not SOUND)
- **Explorer findings confirmed by runtime test:** 1 (F004 broken project tests)
- **Independent findings not in Explorer batches:** 8 (auth gaps across 6 routers, WS anonymous, SDK bypass, event broadcast leak, auto-mode userId, test runner mismatch, session repo missing findByUser, rate limiter issues)

---

## CRITICAL: Authorization Gaps (userId not checked)

### Session Router (`packages/api/src/routers/session.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `session.list` | 68 | Returns ALL sessions for ALL users. No userId filter. |
| `session.get` | 80 | No userId ownership check. Any authenticated user can read any session. |
| `session.update` | 108 | No userId ownership check. Any authenticated user can modify any session. |
| `session.delete` | 121 | No userId ownership check. Any authenticated user can delete any session. |
| `session.updateStatus` | 135 | No userId ownership check. |
| `session.appendOutput` | 156 | No userId ownership check. |
| `session.getDuration` | 174 | No userId ownership check. |
| `session.listActive` | 129 | Returns ALL active sessions across all users. |

**Evidence:** Session router destructures `{ input }` without `context` in list/get/update/delete/updateStatus/appendOutput/getDuration. Only `create` and `createAgentSession` use `context.session.user.id`.

### Agent Router (`packages/api/src/routers/agent.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `agent.sendMessage` | 54 | No session ownership check. Any authenticated user can send messages to any agent session. |
| `agent.getHistory` | 91 | No session ownership check. Any authenticated user can read any session's history. |
| `agent.clearHistory` | 98 | No session ownership check. Any authenticated user can clear any session's history. |
| `agent.listSessions` | 84 | Returns ALL sessions across all users. |

**Good:** `agent.stop` (line 65-82) DOES properly verify `session.userId !== context.session.user.id`. `agent.createSession` (line 39-44) DOES set userId from context.

### Learning Router (`packages/api/src/routers/learning.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `learning.list` | 60 | Returns ALL learnings. No userId filter. |
| `learning.get` | 72 | No userId ownership check. |
| `learning.update` | 97 | No userId ownership check. |
| `learning.delete` | 107 | No userId ownership check. |

**Good:** `learning.create` (line 84-92) DOES use `context.session.user.id`.

### Settings Router (`packages/api/src/routers/settings.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `settings.get` | 22 | No userId scoping. Any user can read any settings. |
| `settings.set` | 37 | No userId scoping. Any user can overwrite any settings. |
| `settings.getAll` | 50 | No userId scoping. |

### Notifications Router (`packages/api/src/routers/notifications.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `notifications.list` | 23 | Filters by projectId only, not userId. |
| `notifications.countUnread` | 30 | Same — no userId. |
| `notifications.markRead` | 38 | No userId ownership check. |
| `notifications.markAllRead` | 45 | No userId scoping. |
| `notifications.dismiss` | 54 | No userId ownership check. |

### Worktree Router (`packages/api/src/routers/worktree.ts`)

| Endpoint | Line | Issue |
|----------|------|-------|
| `worktree.list` | 6 | Returns ALL worktrees. No userId filter. |
| `worktree.getByFeature` | 12 | No userId check. |
| `worktree.create` | 27 | No userId check — any user can create worktrees. |
| `worktree.remove` | 39 | No userId check — any user can remove worktrees. |

---

## CONFIRMED GOOD: Properly Protected Routers

### Feature Router (`packages/api/src/routers/feature.ts`)
- All endpoints use `context.session.user.id` for filtering and ownership checks
- `list` filters by userId (line 75)
- `get` checks `feat.userId !== context.session.user.id` (line 97)
- `update` checks ownership (line 133)
- `delete` checks ownership (line 150)
- `updateStatus` checks ownership (line 169)
- `bulkDelete` verifies all features belong to user (line 236-239)
- `bulkUpdateStatus` verifies all features belong to user (line 258-262)
- Status transition validation uses `FEATURE_VALID_TRANSITIONS` (line 173-178)

### Project Router (`packages/api/src/routers/project.ts`)
- All endpoints properly use userId
- `list` filters by userId (line 58)
- `get` checks ownership (line 70)
- `create` sets userId from context (line 87)
- `update` checks ownership (line 102)
- `delete` checks ownership (line 119)
- Duplicate path detection on create (line 79-83)

### Auth Middleware (`packages/api/src/index.ts`)
- `requireAuth` middleware correctly checks `context.session?.user` (line 8-11)
- All routers except `healthCheck` use `protectedProcedure`

---

## HIGH: ID Generation Race Condition

**File:** `packages/db/src/lib/id-generation.ts`

The `getNextId` function (lines 8-46) uses `MAX(id)` to generate sequential IDs. While it has retry logic for constraint violations (lines 34-41), the transaction isolation in SQLite's default mode may not prevent concurrent ID collisions under load. The retry catches UNIQUE constraint violations but only retries 3 times with 10ms*attempt delay.

**Risk:** Under concurrent bulk operations, multiple requests could get the same MAX(id) and collide.

---

## HIGH: WebSocket Authentication

**File:** `apps/server/src/index.ts` (lines 94-101)

WebSocket upgrade extracts userId via `extractWsUserId()` which calls `auth.api.getSession({ headers: req.headers })`. If session extraction fails, it defaults to `"anonymous"` (line 99). This means:
- Unauthenticated users CAN establish WebSocket connections
- They receive events for the "events" channel (all events broadcast to all clients)
- They can connect to terminal WebSocket sessions

**File:** `apps/server/src/lib/websocket.ts`
- No per-message authentication
- No userId-based filtering of events — ALL connected clients receive ALL events
- Terminal WebSocket: any connected client can write to any terminal session if they know the sessionId

---

## MEDIUM: FS Router Path Scope

**File:** `packages/api/src/routers/fs.ts` (line 9)
- `FSService` root defaults to `process.cwd()`
- Path traversal IS protected via `validatePath()` in `packages/api/src/services/fs-service.ts` (lines 7-14)
- However, this means any authenticated user can read/write ANY file under the server's CWD
- No per-user, per-project file scoping

---

## MEDIUM: Rate Limiter Issues

**File:** `apps/server/src/index.ts` (lines 33-54)
1. In-memory store — does not persist across server restarts
2. No cleanup mechanism — `rateLimitStore` Map grows unboundedly
3. Uses `x-forwarded-for` header which can be spoofed if not behind a trusted proxy
4. WebSocket connections bypass rate limiting (separate upgrade path)

---

## MEDIUM: Missing `apps/web` in Root TS References

**File:** `tsconfig.json`
- Root references include: types, db, auth, api, env, server
- Missing: `apps/web` — this means root-level `tsc --build` won't check the web app

---

## LOW: bulkUpdateStatus Transaction Pattern

**File:** `packages/db/src/repositories/feature.ts` (lines 114-156)
- `bulkUpdateStatusWithValidation` properly uses a transaction
- But the router-level code in `packages/api/src/routers/feature.ts` (line 253-273) first fetches ALL user features to check authorization, THEN calls the repository method which fetches again inside a transaction
- This double-fetch is inefficient but functionally correct

---

## HIGH: Agent SDK Security — bypassPermissions

**File:** `packages/api/src/services/claude-provider.ts` (lines 83-84)

The Claude SDK provider hardcodes `permissionMode: "bypassPermissions"` and `allowDangerouslySkipPermissions: true`. This means the Claude agent can:
- Execute arbitrary shell commands without user approval
- Write to any file in the working directory
- Make network requests

While the `createAgentSession` input accepts a `permissionMode` parameter, the `ClaudeProvider.executeQuery()` overrides it to always use `bypassPermissions` (line 83).

---

## HIGH: Event Broadcasting Leaks Data Across Users

**File:** `packages/api/src/services/event-broadcaster.ts`

The complete streaming flow:
1. `AgentService.sendMessage()` emits `agent:stream` events via `EventService`
2. `EventBroadcaster` subscribes to `EventService` and broadcasts to ALL connected WebSocket clients (line 23-34)
3. No filtering by userId, sessionId, or projectId

This means:
- User A's agent output is broadcast to User B in real-time
- Even anonymous WebSocket clients (which are allowed, see WebSocket auth finding) receive all events
- Agent error events (`agent:error`) also leak across users

---

## MEDIUM: Agent Session — No Ownership Verification on sendMessage

**File:** `packages/api/src/services/agent-service.ts` (line 253)

The `sendMessage()` method in AgentService verifies the session exists and is not already running, but does NOT check that the calling user owns the session. Combined with the router-level gap (agent router doesn't pass userId to sendMessage), any authenticated user can:
1. Send messages to another user's agent session
2. Trigger Claude SDK execution on another user's behalf
3. The response would be stored in that user's session

---

## MEDIUM: Session Repository Missing findByUser

**File:** `packages/db/src/repositories/session.ts`

Unlike the feature repository which has `findByUser()`, `findByUserAndStatus()`, `findByUserAndProject()`, the session repository has NO user-filtering methods. Only:
- `findAll()` — returns everything
- `findById()` — no user check
- `findByFeature()` — no user check
- `findByStatus()` — no user check
- `findActive()` — no user check

This is the ROOT CAUSE of all session-related authorization gaps. Even if the router wanted to filter by user, the repository doesn't support it.

---

## MEDIUM: Test Runner Mismatch (bun:test vs vitest)

**Root package.json:39:** `"test": "bunx vitest run"`
**Type tests:** `import { describe, expect, it } from "bun:test"`

When vitest runs these tests, it fails with "Cannot find package 'bun:test'". The tests must be run with `bun test` directly. This means the CI pipeline (if configured to use `bun run test` / `bunx vitest run`) never actually runs the type package tests, explaining how the F004 broken test was never caught.

---

## MEDIUM: Auto-Mode Uses Hardcoded userId

**File:** `packages/api/src/services/auto-mode-service.ts` (line 144)

Auto-mode creates agent sessions with `userId: "auto-mode"` — a hardcoded string, not a real user ID. This means:
- Auto-mode sessions are not tied to any authenticated user
- `featureRepository.findByProject(projectId)` at line 63 operates on ALL features in a project regardless of who created them
- Combined with the session router auth gaps, any authenticated user can see/modify auto-mode sessions

---

## LOW: Migration Rollback

**File:** `packages/db/src/migrate.ts`
- `rollbackDatabase()` (lines 44-57) uses file copy (`copyFileSync`) — simple but effective for SQLite
- Backup created before each migration run (line 73)
- No automatic rollback on migration failure — backup is left for manual recovery

---

## VERIFICATION SUMMARY

| Area | Status | Notes |
|------|--------|-------|
| Auth middleware | PASS | All routers use protectedProcedure |
| Feature router authorization | PASS | Full userId checks on all endpoints |
| Project router authorization | PASS | Full userId checks on all endpoints |
| Session router authorization | FAIL | No userId checks on 8/10 endpoints |
| Agent router authorization | PARTIAL | 2/6 endpoints check userId |
| Learning router authorization | FAIL | No userId checks on 4/5 endpoints |
| Settings router authorization | FAIL | No userId scoping at all |
| Notifications router auth | FAIL | No userId scoping at all |
| Worktree router authorization | FAIL | No userId scoping at all |
| FS router path security | PASS | Path traversal protected |
| ID generation | CAUTION | Race condition under concurrency |
| WebSocket auth | FAIL | Anonymous allowed, no per-user filtering |
| Rate limiting | CAUTION | Memory-only, no cleanup, spoofable |
| DB migrations | PASS | Backup + rollback support |
| Monorepo setup | PASS | Turborepo + workspaces + TS refs |
| State machine validation | PASS | Feature + session transition validation |
