# Runtime Smoke Test Report

**Date:** 2026-02-08
**Tester:** QA Smoke Test Agent
**Session:** audit-20260208-212708

## Environment

| Component | Port | Status |
|-----------|------|--------|
| Backend (Hono) | 3008 | Running |
| Frontend (Vite) | 3001 | Running |
| Database (SQLite) | — | Connected |
| WebSocket (/ws/events) | 3008 | Connected |
| WebSocket (/ws/terminal) | 3008 | Available |

## Health Endpoints

| Endpoint | Response | Status |
|----------|----------|--------|
| GET /health | `{"status":"ok","version":"0.1.0","database":"connected"}` | PASS |
| GET /ready | `{"ready":true,"checks":{"db":true,"websocket":true}}` | PASS |
| POST /rpc/healthCheck | `{"json":"OK"}` | PASS |
| POST /rpc/projects/list (unauth) | `401 UNAUTHORIZED` | PASS (correct) |

## Frontend Routes

| Route | Status | Console Errors | Load Time | Notes |
|-------|--------|---------------|-----------|-------|
| / (home) | PASS | 0 | Instant | Redirects to /dashboard |
| /dashboard | PASS | 0 | ~2s | Stats cards, status chart, projects |
| /kanban | PASS | 0 | ~3s | 5 columns, feature cards, search/filters |
| /agent | PASS | 0 | ~3s | 5 sessions, session sidebar |
| /activity | PASS | 0 | ~1s | Filter tabs (All, Agent, Feature, Auto-Mode, Worktree) |
| /terminal | PASS | 0 | ~1s | Terminal selector, empty state |
| /spec | PASS | 0 | ~1s | Path input, reload button |
| /features/import | PASS | 0 | ~1s | JSON upload UI |
| /settings | PASS | 0 | ~1s | 6 tabs, 12 themes, sidebar toggle |
| /projects | PASS | 0 | ~4s | Project list (loads after auth) |
| /projects/P001 | PASS | 0 | ~3s | Project detail with features list |
| /features/F001 | PASS | 0 | ~3s | Feature detail with description, AC |

## Bugs Found

### BUG-001: API Reference Page Broken by CSP [MEDIUM]

**Route:** http://localhost:3008/api-reference
**Symptom:** Blank white page
**Console Errors:**
1. CSP violation: `script-src 'self' 'unsafe-inline'` blocks `https://cdn.jsdelivr.net/npm/@scalar/api-reference`
2. `ReferenceError: Scalar is not defined`
3. 404 on favicon.ico (minor)

**Root Cause:** CSP header at `/Users/sda/Workspace/nomos-ai/apps/server/src/index.ts:77-78` does not whitelist cdn.jsdelivr.net.

**Fix:** Add `https://cdn.jsdelivr.net` to `script-src` directive in the CSP header.

**Screenshot:** `screenshots/api-reference-broken.png`

## UX Observations

### OBS-001: No Loading Indicators During Initial Data Fetch [LOW]

All data-dependent pages (kanban, projects, features, agent sessions) show empty main area for 1-4 seconds after navigation. This is because:
1. WebSocket connection needs to establish
2. Auth session needs to verify
3. Data queries are gated behind auth

During this period, the header shows "Disconnected" briefly, then switches to "Connected". No loading spinners or skeletons are shown. Users may perceive the app as broken during this window.

**Recommendation:** Add skeleton loaders or loading spinners to data-dependent pages.

### OBS-002: WebSocket Reconnection Warning [COSMETIC]

Navigating between pages triggers a brief WebSocket disconnect/reconnect. A console warning is logged:
```
WebSocket connection to 'ws://localhost:3001/ws/events' failed: WebSocket is closed before the connection is established.
```
The connection recovers automatically and a "Reconnected to server" toast appears. This is benign but could be improved by maintaining a persistent connection.

## Screenshots

| File | Description |
|------|-------------|
| `dashboard-baseline.png` | Dashboard with stats cards |
| `dashboard-connected.png` | Dashboard after WS connected |
| `kanban-baseline.png` | Kanban board first load |
| `kanban-loaded.png` | Kanban board fully rendered |
| `agent-baseline.png` | Agent sessions list |
| `feature-detail-F001.png` | Feature F001 detail page |
| `project-detail-P001.png` | Project P001 detail page |
| `projects-list-loaded.png` | Projects list with card |
| `settings-general.png` | Settings theme picker |
| `api-reference-broken.png` | Broken API reference (CSP bug) |

## Overall Verdict

**PASS** — The application starts cleanly, all frontend routes render without console errors, all API endpoints respond correctly, and the WebSocket subsystem functions properly. One medium-severity bug found (CSP blocking API Reference). One low-severity UX issue noted (missing loading states).
