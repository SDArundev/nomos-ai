# NOMOS Swarm Report — AUDIT

**Date:** 2026-02-08T23:17:58Z
**Duration:** 24 minutes
**Team:** explorer (haiku), skeptic (sonnet), tester (sonnet)
**Scope:** All verified/waiting_approval features (65 total)

## Executive Summary

The audit examined 65 verified features across the NOMOS AI codebase. Of these, **53 features (82%) are SOUND** — genuinely working as intended. However, the audit uncovered **4 BROKEN features** and **7 FRAGILE features** with real issues requiring attention.

The most critical finding is a **path traversal vulnerability** in the Spec router (SW-001) that allows arbitrary file read/write via unvalidated projectPath. Several routers also lack ownership checks, creating IDOR vulnerabilities where any authenticated user can access other users' data (learning entries, terminal sessions, notifications, auto-mode).

A significant wiring issue was found in the terminal WebSocket (SW-002): the server and client use different message type strings and payload structures, meaning terminal output never reaches the UI despite both sides being "implemented."

## Findings by Severity

### Critical (1)

| ID | Feature | Description |
|----|---------|-------------|
| SW-001 | F262 | **Path traversal in SpecService** — accepts arbitrary projectPath without validation. FSService has validatePath() but SpecService doesn't use it. Can read/write files anywhere. |

### High (3)

| ID | Feature | Description |
|----|---------|-------------|
| SW-002 | F035 | **Terminal WebSocket protocol mismatch** — server sends `{ type: 'output', data }` but client expects `{ type: 'terminal:output', payload: { data } }`. Terminal output never displays. |
| SW-003 | F261 | **Terminal router missing user isolation** — all terminal ops (create, write, kill, list) have no ownership checks. Any user can access any terminal session. |
| SW-004 | F243 | **Learning router missing ownership** — list/get/update/delete accept any ID without user verification. Classic IDOR vulnerability. |

### Medium (4)

| ID | Feature | Description |
|----|---------|-------------|
| SW-005 | F265 | Auto-mode endpoints missing ownership checks. Singleton design supports one user only. |
| SW-006 | F262 | Notification markRead/dismiss lack ownership, inconsistent with other endpoints in same router. |
| SW-007 | F018 | bulkCreate/bulkDelete use sequential loops without transaction wrapping, partial failures unrecoverable. |
| SW-008 | F033 | Session listing fetches ALL then filters by user — inefficient and temporarily exposes data. |

### Low (5)

| ID | Feature | Description |
|----|---------|-------------|
| SW-009 | F006 | AC states .nomos/data/ but actual DB path is apps/server/data/nomos.db — AC wording mismatch. |
| SW-010 | F025 | Kanban board missing 'failed' status column — failed features disappear from view. |
| SW-011 | F020 | TanStack Router + React Query devtools rendered unconditionally in production. |
| SW-012 | F221 | ID generation padStart(3) overflows at 1000+ entries, breaking F### pattern. |
| SW-013 | F262 | Global settings readable/writable by any user — acceptable for desktop app. |

## Feature Status

| Feature | Current | Classification | Action |
|---------|---------|---------------|--------|
| F262 | verified | BROKEN | **fail** (path traversal) |
| F035 | verified | BROKEN | **fail** (WS mismatch) |
| F261 | verified | BROKEN | **fail** (no user isolation) |
| F243 | verified | BROKEN | **fail** (no ownership) |
| F265 | verified | FRAGILE | backlog |
| F262 | verified | FRAGILE | backlog (notifications) |
| F018 | verified | FRAGILE | backlog |
| F033 | verified | FRAGILE | backlog |
| F025 | verified | PARTIAL | backlog |
| F020 | verified | FRAGILE | backlog |
| F221 | verified | FRAGILE | note |
| F006 | verified | FRAGILE | note |
| *53 others* | verified | SOUND | — |

## Recommended Actions

### State Transitions (4)
1. **F262** → fail: path traversal vulnerability in SpecService
2. **F035** → fail: terminal WebSocket protocol mismatch
3. **F261** → fail: terminal router missing user isolation
4. **F243** → fail: learning router missing ownership checks

### New Backlog Items (10)
1. Fix SpecService path traversal (P1, security)
2. Fix terminal WebSocket protocol mismatch (P1)
3. Fix terminal router user isolation (P1, security)
4. Fix learning router ownership checks (P1, security)
5. Fix auto-mode endpoint ownership (P2, security)
6. Fix notification markRead/dismiss ownership (P2, security)
7. Fix bulkCreate/bulkDelete transaction wrapping (P3)
8. Fix kanban board missing 'failed' column (P3)
9. Fix devtools unconditional rendering (P3)
10. Fix session list global fetch pattern (P3)

### Learning Updates
3 new antipatterns identified:
- `websocket_protocol_mismatch` — server/client use different message formats
- `inconsistent_authorization_checks` — some endpoints check ownership, others don't
- `global_fetch_then_filter` — fetch all records then filter instead of query-level WHERE

## Agent Contributions

| Agent | Findings | Key Insight |
|-------|----------|-------------|
| explorer | 65 features mapped across 13 batches | Identified DB path mismatch, mapped all implementations |
| skeptic | 12 deep-dive findings | Found path traversal, WebSocket mismatch, 4 auth gaps |
| tester | 2 screenshots, runtime verification | Confirmed devtools visible in production, app behind auth wall |

## Runtime Notes

The tester confirmed the application runs (backend health check passes, frontend serves login page). However, the auth wall prevented deep runtime testing of most features. The login/signup page is functional, and TanStack Router devtools are visibly rendered at the bottom of the page.
