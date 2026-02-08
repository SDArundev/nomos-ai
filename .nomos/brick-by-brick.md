# Brick-by-Brick: Automaker to NOMOS AI

## Progress Tracker

| Topic | Status | Features | Done | Sessions |
|-------|--------|----------|------|----------|
| T01 Foundation Fixes | **DONE** | 25 | **25/25** | **3/3** |
| T02 Security & Auth | PENDING | 11 | 0/11 | 0/2 |
| T03 Testing Infra | PENDING | 14 | 0/14 | 0/2 |
| T04 Code Health & DB | PENDING | 16 | 0/16 | 0/2 |
| T05 Agent Tools | PENDING | 12 | 0/12 | 0/2 |
| T06 Agent Intelligence | PENDING | 10 | 0/10 | 0/2 |
| T07 Kanban Enhancements | PENDING | 20 | 0/20 | 0/3 |
| T08 Git & Worktree | PENDING | 14 | 0/14 | 0/2 |
| T09 Terminal System | PENDING | 10 | 0/10 | 0/2 |
| T10 Auto-Mode | PENDING | 9 | 0/9 | 0/2 |
| T11 Settings & Config | PENDING | 7 | 0/7 | 0/1 |
| T12 Memory, Spec & Deps | PENDING | 17 | 0/17 | 0/2 |
| T13 Notifications & Obs | PENDING | 18 | 0/18 | 0/2 |
| T14 Theming | PENDING | 7 | 0/7 | 0/1 |
| T15 DX & Productivity | PENDING | 14 | 0/14 | 0/2 |
| T16 Project, GitHub, API | PENDING | 12 | 0/12 | 0/2 |
| T17 Desktop (Tauri) | PENDING | 7 | 0/7 | 0/1 |
| **TOTAL** | | **223** | **25/223** | **3/31** |

## Verified Features: 66 total (41 foundation + 25 T01)

## T01 Session Log

### Session 1.1 (F221-F231) — Completed
- **F221**: Cleaned up old UUID `createId()`, renamed to `createUUID()`, branded ID generators (F###/P###/S###/L###) confirmed working
- **F222**: Already done — `bulkUpdateStatus` uses `db.transaction()`
- **F223**: Already done — projects table has `status` column
- **F224**: Already done — all entities have `userId` column, routers check ownership
- **F225**: Already done — rate limiter in server (100 req/min, 429 response)
- **F226**: Added error classification (auth/rate_limit/network/timeout/server/validation/unknown), exponential backoff retry (3 attempts), 5min connection timeout to ClaudeProvider
- **F227**: Added input validation (name length, content length, empty checks), concurrent session limit (max 5), conflict detection for double-sends
- **F228**: Already done — full streaming pipeline (AgentService → EventService → EventBroadcaster → WebSocket → useAgentStream hook)
- **F229**: Added `backupDatabase()` and `rollbackDatabase()` functions to migrate.ts, auto-backup before migrations
- **F230**: Already done — tsconfig.json has project references for all packages
- **F231**: Already done — `bulkUpdateStatus` throws on missing IDs

### Session 1.2 (F232-F240) — Completed
- **F232**: Already done — settings table uses key-value pairs, compatible with Zod
- **F233**: Already done — `FEATURE_VALID_TRANSITIONS` defined once in types/status.ts, imported everywhere
- **F234**: Added Content-Security-Policy and Strict-Transport-Security headers
- **F235**: Already done — cookie config uses sameSite="strict" in prod, "lax" in dev, secure=production
- **F236**: Enhanced `handleRepositoryError` to sanitize messages in production, log internal details server-side
- **F237**: Replaced hardcoded type assertions with `EstimatedSize` type import, used `FEATURE_PHASES[0]` constant for defaults
- **F238**: Already done — `handleRepositoryError` used in all 14+ catch blocks across 4 routers
- **F239**: Moved ID generation to repository layer (db/lib/id-generation.ts), repositories auto-generate IDs, removed manual ID generation from all routers
- **F240**: Extracted `FEATURE_STATUS_COLORS`, `FEATURE_STATUS_TEXT_COLORS`, `FEATURE_STATUS_LABELS`, `SESSION_STATUS_COLORS` to shared `apps/web/src/lib/status-display.ts`, replaced duplicates in 5 files

### Session 1.3 (F241-F245) — Completed (all pre-existing)
- **F241**: Already done — Tailwind 4 theme tokens in index.css (`:root` + `.dark` + `@theme inline`)
- **F242**: Already done — learning repository with full CRUD in db/repositories/learning.ts
- **F243**: Already done — learning oRPC router in api/routers/learning.ts
- **F244**: Already done — project status column in schema/projects.ts
- **F245**: Already done — branded F001-F999 IDs via generateFeatureId()

## Next: T02 Security & Auth (Wave 2)
