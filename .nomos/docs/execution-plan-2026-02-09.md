# NOMOS Execution Plan — 2026-02-09

**Decision:** Docker Postgres (with Redis caching planned for later)
**Goal:** Close the self-building loop — NOMOS builds itself from the dashboard
**Source:** strategic-review-2026-02-09.md (4-agent analysis)
**Last updated:** 2026-02-09T14:30Z

---

## Progress Tracker

| Batch | Stream | Status | Commit | Notes |
|-------|--------|--------|--------|-------|
| 1 | A: Cleanup & Hygiene | DONE | cb6aec6 | 607MB freed, 5 agents deleted, skills updated |
| 1 | B: Postgres Migration | DONE | cb6aec6 | 30+ files, 11 schema files, FKs, seed script |
| 1 | E: CI/Testing | DONE | cb6aec6 | CI fixed, postgres in CI, test skeleton |
| 2 | C: Pipeline Unification | DONE | 2ed32cf | DB source of truth, API-first, Intent Box wired |
| 2 | D: SDK Modernization | DONE | 2ed32cf | SDK query() replaces CLI, typed events, resume |
| 3 | F: Self-Building Validation | IN PROGRESS | — | F2/F3 done, F1/F4 in progress |
| 3 | G: Production Hardening | DONE | — | G1-G6 all complete, 1006 tests passing |
| 3 | H: Strategic Cleanup | IN PROGRESS | — | Feature triage, learning loop, project.json |
| 4 | I: Learning DB Migration | READY | — | Migrate learnings to DB tables (after H) |

**Commits:**
- `cb6aec6` — Batch 1: Postgres migration, cleanup, CI fixes
- `2ed32cf` — Batch 2: Pipeline unification, SDK modernization, test fixes (929 tests, 0 failures)

---

## Batch 1 — DONE (cb6aec6)

### Stream A: Cleanup & Hygiene — DONE
- [x] A1-A10: All complete. 607MB freed, 5 deprecated agents deleted, skills updated, features.json cleaned.

### Stream B: Postgres Migration — DONE
- [x] B1-B17 + bonuses: All complete. 665 tests pass.

### Stream E: CI/Testing — DONE
- [x] E1-E7: All complete (E4 coverage deferred).

---

## Batch 2 — DONE (2ed32cf)

### Stream C: Pipeline Unification — DONE
- [x] C1: CLI pipeline Phase 1 reads features from REST API (fallback to features.json)
- [x] C2: Intent Box → AutoModeService wired end-to-end ("Create & Start" button)
- [x] C3: Auth context normalized (AuthenticatedUser type, both auth methods)
- [x] C4: 16 integration tests (pipeline lifecycle, auth, feature export)
- [x] C5: features.json export endpoint (DB is source of truth)
- [ ] C6: Self-building loop manual test — NEEDS MANUAL TESTING

### Stream D: SDK Modernization — DONE
- [x] D1: Cost extraction with proper SDK types (SDKResultMessage, extractCostData)
- [x] D2-D3: Deprecated agent refs updated (done in Batch 1 Stream A)
- [x] D4: V2 Session API evaluated → use V1 query() (see v2-session-api-evaluation.md)
- [x] D5: CLI subprocess replaced with SDK query() in AutoModeService
- [x] D6: Typed EventPayloadMap, EventService.emit() overloads
- [x] D7: Session resume (POST /api/sessions/:id/resume, findResumable)

---

## Batch 3 — IN PROGRESS (3 agents running in parallel)

### Stream F: Self-Building Validation — DONE (validation-agent, F1 needs manual testing)
- [x] F2: Cost tracking validated — 34 tests (extractCostData, toProviderMessage, classifyError, MockProvider, cost flow)
- [x] F3: Crash recovery tested — 21 tests (startup cleanup, resumeSession, findResumable, full recovery flow)
- [x] F4: Self-building loop validated — 22 tests (feature creation, startFeature triggers pipeline, PipelineService checkpoint reading, EventService typed events + subscriber isolation, session state transitions PENDING→RUNNING→COMPLETED/FAILED→RUNNING, full create→start→complete flow)
- [ ] F1: NEEDS MANUAL TESTING — Run from dashboard with live server + Docker Postgres

### Stream G: Production Hardening — DONE (hardening-agent)
- [x] G1: Redis EventService — ioredis, docker-compose redis enabled, REDIS_URL in env, RedisEventService with pub/sub, fallback to in-memory
- [x] G2: Pino structured logging — replaced all console.log/error/warn, LOG_LEVEL config, JSON/pretty modes, child loggers per service
- [x] G3: Health check — /health (liveness, always 200) and /ready (DB + Redis + WebSocket checks)
- [x] G4: Prometheus metrics — prom-client, /metrics endpoint, request duration, feature/session/cost counters, default Node.js metrics
- [x] G5: E2E Playwright tests — playwright.config.ts, smoke tests (login, dashboard, health/ready endpoints), .e2e.ts convention
- [x] G6: CD pipeline — .github/workflows/cd.yml, GHCR push on main, sha+latest tags, health check against built image

### Stream H: Strategic Cleanup — IN PROGRESS (cleanup-agent)
- [ ] H1: Triage 11 waiting_approval features — IN PROGRESS (cleanup-agent)
  - F004, F019, F031, F032, F034, F035, F224, F243, F260, F261, F262
  - F034/F035 likely superseded by F259/F263
- [ ] H2: Collapse features from 285 → ~80 active (blocked by H1)
  - Archive aspirational phase-3/4 to .nomos/archive/features-aspirational.json
  - Archive bulk granular micro-features to .nomos/archive/features-bulk-granular.json
  - Merge micro-features into epics (terminal→1, git→1, auto-mode→1, themes→1)
- [ ] H3: Close learning feedback loop
  - Phase 1 scout reads relevant patterns (confidence >= 0.7)
  - Phase 2 architect receives antipattern warnings
  - Fix data integrity: duplicate PAT-017, unknown categories, inconsistent IDs
  - Normalize 25+ categories → 8 (typescript, frontend, server, database, testing, infra, security, websocket)
- [ ] H4: Replace app_spec.json with minimal project.json (~50 lines)
  - Merge stack.json into project.json
  - Update SpecService
  - Archive app_spec.json and stack.json

---

## Batch 4 — READY (after Batch 3 commits)

### Stream I: Learning DB Migration
- [ ] I1: Create DB tables: patterns, antipatterns, feature_insights, feature_metrics
- [ ] I2: Migration script: JSON files → DB tables
- [ ] I3: Update Phase 6 historian to write to DB (POST /api/learnings/patterns)
- [ ] I4: CLI fallback: write to .nomos/learning/pending.json when server is down
- [ ] I5: Add /api/learnings/relevant endpoint for Phase 1/2 queries
- [ ] I6: Add pattern curation automation (prune low-confidence, promote high-reuse)
- [ ] I7: Dashboard learnings tab (pattern catalog, antipattern warnings, insights timeline)

---

## Resume Instructions

If resuming in a new session:

1. **Read this file first:** `.nomos/docs/execution-plan-2026-02-09.md`
2. **Check git log:** `git log --oneline -5` to see latest commits
3. **Check git status:** `git diff --stat HEAD` to see uncommitted changes
4. **Check Progress Tracker** table above for current state

### If Batch 3 agents were interrupted:

**Check what completed:**
```bash
# Check test count (should be growing)
bun test 2>&1 | tail -5

# Check type errors
bun run check-types 2>&1 | tail -5

# Check what files changed
git diff --stat HEAD
```

**Resume by task:**
- If F tasks incomplete → spawn validation-agent for remaining F tasks
- If G tasks incomplete → spawn hardening-agent for remaining G tasks
- If H tasks incomplete → spawn cleanup-agent for remaining H tasks
- If all Batch 3 done → commit, push, start Batch 4

### Key decisions already made:
- Docker Postgres (not SQLite, not Neon)
- DB as single source of truth (not features.json)
- V1 SDK query() (V2 too unstable — @alpha)
- Redis via ioredis with in-memory fallback
- features.json → seed-only file, DB is source of truth
- app_spec.json → replaced by minimal project.json
- Learning system: JSON → DB migration (Batch 4)
- Pattern categories normalized to 8 (from 25+)
- Feature list: 285 → ~80 active (aspirational/bulk archived)

### Architecture post-Batch 2:
- AutoModeService uses SDK query() (not CLI subprocess)
- Typed EventPayloadMap with EventService.emit() overloads
- AuthenticatedUser type normalizes API key + session auth
- Session resume: POST /api/sessions/:id/resume
- Cost tracking: SDKResultMessage → extractCostData() → SessionService → DB

### Test baseline:
- Batch 1: 665 tests → Batch 2: 929 tests → Batch 3: growing (F2 +34, F3 +21 so far)
- 0 type errors, 0 lint errors throughout
