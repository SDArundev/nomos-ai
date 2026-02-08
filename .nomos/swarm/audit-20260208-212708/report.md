# NOMOS Swarm Report — AUDIT

**Date:** 2026-02-08
**Duration:** ~18 minutes
**Team:** explorer (haiku), skeptic (sonnet), tester (sonnet)
**Scope:** 72 verified features (F001-F265)

## Executive Summary

The swarm audit examined all 72 verified features across the NOMOS AI codebase using three collaborating agents: an explorer scanning code against acceptance criteria, a skeptic tracing end-to-end code paths with a security focus, and a tester exercising the application at runtime.

**The codebase is structurally sound.** 59 of 72 features (82%) are genuinely well-implemented with proper patterns, type safety, and test coverage. The monorepo scaffold, database layer, API routers (feature + project), frontend UI components, and Kanban board are all solid.

**However, the audit uncovered a systemic authorization gap.** Feature F224 ("Fix: No userId/ownerId column") was marked as verified, but the fix only covers 2 of 9 API routers. Six routers (session, agent, learning, settings, notifications, worktree) allow any authenticated user to access, modify, or delete any other user's data. This is the most critical finding — it affects multiple features and creates a false sense of security.

**The multi-agent approach proved its value.** The explorer classified F019 (Session router) and F034 (WebSocket) as SOUND based on AC matching, but the skeptic correctly identified the authorization and authentication gaps through end-to-end code path tracing. The tester found a runtime bug (CSP blocking API reference) that code review alone missed. This is exactly the kind of "verified but broken" detection the swarm was designed for.

## Findings by Severity

### Critical (1)

| ID | Feature | Description |
|----|---------|-------------|
| SW-002 | F224 | **userId authorization incomplete** — only 2/9 routers enforce ownership checks. Session, agent, learning, settings, notifications, worktree routers are unprotected. |

### High (6)

| ID | Feature | Description |
|----|---------|-------------|
| SW-001 | F004 | Project test fixtures use wrong ID format (`proj-001` vs `P[0-9]{3}`), 14+ tests broken |
| SW-003 | F034 | WebSocket accepts anonymous connections, broadcasts all events to all clients |
| SW-009 | F031 | ClaudeProvider hardcodes `bypassPermissions:true`, overrides user config |
| SW-010 | F019 | Session router: 8/10 endpoints lack userId authorization |
| SW-011 | F032 | Agent sendMessage has no session ownership check |
| SW-012 | F260 | Auto-mode uses hardcoded `userId: "auto-mode"` |

### Medium (5)

| ID | Feature | Description |
|----|---------|-------------|
| SW-004 | F225 | Rate limiter in-memory, no cleanup, WebSocket bypass |
| SW-005 | F221 | ID generation MAX(id) race condition under concurrency |
| SW-006 | F262 | FS router has no per-user file scoping |
| SW-008 | F234 | CSP blocks Scalar API reference CDN (confirmed at runtime) |
| SW-013 | F260 | Auto-mode operates on all features regardless of userId |
| SW-014 | F004 | Test runner mismatch — bun:test invisible to vitest |

### Low (1)

| ID | Feature | Description |
|----|---------|-------------|
| SW-007 | F230 | `apps/web` missing from root tsconfig references |

## Feature Status

| Feature | Current | Classification | Action |
|---------|---------|---------------|--------|
| F004 | verified | BROKEN | fail |
| F019 | verified | FRAGILE | fail |
| F031 | verified | FRAGILE | fail |
| F032 | verified | FRAGILE | fail |
| F034 | verified | FRAGILE | fail |
| F224 | verified | PARTIAL | fail |
| F260 | verified | FRAGILE | fail |
| F221 | verified | FRAGILE | — (backlog item) |
| F225 | verified | FRAGILE | — (backlog item) |
| F230 | verified | PARTIAL | — (backlog item) |
| F234 | verified | PARTIAL | — (backlog item) |
| F262 | verified | FRAGILE | — (backlog item) |
| All others (59) | verified | SOUND | — |

## Recommended Actions

### State Transitions (7 features → failed)
- **F004**: verified → failed (test fixtures broken)
- **F019**: verified → failed (session router auth gap)
- **F031**: verified → failed (bypassPermissions hardcoded)
- **F032**: verified → failed (agent sendMessage no ownership)
- **F034**: verified → failed (WebSocket anonymous access)
- **F224**: verified → failed (auth fix incomplete — 2/9 routers)
- **F260**: verified → failed (auto-mode fake userId)

### New Backlog Items (10)
1. **[P1]** Fix userId authorization in 7 remaining API routers
2. **[P1]** Fix WebSocket authentication — reject anonymous connections
3. **[P2]** Fix ClaudeProvider bypassPermissions override
4. **[P2]** Fix agent sendMessage ownership check
5. **[P3]** Fix auto-mode userId to use actual user context
6. **[P3]** Fix F004 project test fixtures
7. **[P5]** Fix CSP header for Scalar CDN
8. **[P5]** Align test runner (bun:test vs vitest)
9. **[P8]** Upgrade rate limiter for production
10. **[P10]** Add apps/web to root tsconfig references

### Learning Updates
4 new antipatterns identified:
- `partial_auth_fix` — applying auth fixes to some routers but not others
- `anonymous_websocket_fallback` — WS auth that defaults to anonymous on failure
- `hardcoded_permission_bypass` — provider code overriding user permission config
- `test_runner_mismatch` — tests written for wrong test framework

## Agent Contributions

| Agent | Role | Key Findings | Value |
|-------|------|-------------|-------|
| Explorer | AC scanner (haiku) | 72 features mapped, F004 BROKEN identified, detailed per-AC evidence | Systematic coverage at low cost |
| Skeptic | Security tracer (sonnet) | 14 independent findings, 6/9 router auth gap, 3 explorer disagreements | Highest-impact findings from cross-cutting analysis |
| Tester | Runtime verifier (sonnet) | 12 route tests, CSP bug confirmed, UX observations, 10 screenshots | Runtime proof the code analysis missed |

## Runtime Smoke Test Results

The tester agent ran the application and exercised all frontend routes via Playwright:

| Test Area | Result |
|-----------|--------|
| Backend health endpoints (3) | 3/3 PASS |
| Frontend routes (12) | 12/12 PASS (zero console errors) |
| WebSocket connectivity | PASS (auto-reconnect works) |
| Auth guard on API | PASS (401 on unauthenticated requests) |
| API Reference page | FAIL (CSP blocks Scalar CDN) |

**Runtime bug found:** BUG-001 — API Reference page blank due to CSP (see SW-008).
**UX observation:** No loading indicators during initial data fetch (1-4 second empty states).

Full runtime report: `runtime-test-report.md`
Screenshots: `screenshots/` directory (10 screenshots captured)

## What's Working Well

Despite the authorization gaps, the codebase has strong foundations:

- **Feature + Project routers** have exemplary userId authorization on every endpoint
- **Monorepo architecture** with Turborepo, workspaces, and TS project references is solid
- **Database layer** with Drizzle ORM, migrations, branded ID generation, and 9 repositories
- **Frontend** renders 12+ routes without console errors, responsive layout
- **WebSocket subsystem** auto-reconnects reliably with exponential backoff
- **State machine** with valid transition enforcement works correctly
- **Security headers** (CSP, HSTS, X-Frame-Options, etc.) are present
- **Streaming architecture** with AsyncGenerator and EventService pub/sub is properly designed
- **Auth middleware** correctly gates all API routes behind `protectedProcedure`
- **Kanban board** with drag-and-drop (dnd-kit), filters, search, detail panel
- **Agent session UI** with streaming output, tool call visualization, session sidebar

## Key Insight

**The most valuable finding came from disagreement.** Explorer classified F019 and F034 as SOUND because the code matched its acceptance criteria. Skeptic challenged these classifications by tracing code paths beyond AC scope, revealing the systemic authorization gap. This demonstrates that AC-focused verification is necessary but insufficient — cross-cutting security analysis catches what feature-by-feature review misses.
