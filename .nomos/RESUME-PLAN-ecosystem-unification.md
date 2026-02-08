# NOMOS Ecosystem Unification - Resume Plan

**Date Started:** 2026-02-09
**Branch:** `main` (⚠️ Need to create feature branch)
**Team:** `nomos-ecosystem-unification`
**Status:** Phase 1.1 Complete (1/18 tasks done)

---

## Quick Resume Steps

1. **Create feature branch:**
   ```bash
   git checkout -b feature/ecosystem-unification
   git add .
   git commit -m "feat: Phase 1.1 - REST adapter for oRPC endpoints"
   ```

2. **Check team status:**
   ```bash
   # Team files at: ~/.claude/teams/nomos-ecosystem-unification/
   # Task list at: ~/.claude/tasks/nomos-ecosystem-unification/
   ```

3. **Continue implementation:**
   - Use: `/nomos` or direct task work
   - Next task: **Task #2 - State Transition API**

---

## Project Overview

**Goal:** Transform NOMOS from file-based system to unified ecosystem with:
- 🔌 REST API for external integration
- 📡 Webhooks for event-driven automation
- 🤖 n8n workflows for approvals, retries, notifications
- 💾 Database for scalable state management
- 🔄 Bi-directional sync (DB ↔ features.json)
- 📚 Complete documentation

**Backward Compatibility:** ✅ 100% - All existing workflows continue working

---

## ✅ Completed (1/18 tasks)

### Task #1: Phase 1.1 - REST Wrapper for oRPC ✅

**Files Created:**
- `packages/api/src/rest-adapter.ts` - REST translation layer

**Files Modified:**
- `apps/server/src/index.ts` - Integrated REST adapter

**How It Works:**
- REST requests at `/api/*` → Translated to RPC format → RPCHandler → Response
- Reuses all existing oRPC business logic (zero duplication)
- Type-safe, validated, consistent with RPC endpoints

**Available REST Endpoints:**
```
GET    /api/features                        # List (supports ?status=&phase=)
GET    /api/features/:id                    # Get single
POST   /api/features                        # Create
PATCH  /api/features/:id                    # Update
DELETE /api/features/:id                    # Delete
POST   /api/features/:id/status             # Update status
POST   /api/features/bulk-status            # Bulk update
GET    /api/features/dependencies/:projectId # Dependencies
```

**Testing:**
- ✅ TypeScript compiles
- ✅ Server starts (port 3008)
- ✅ Health check works
- ⚠️ Manual API testing pending

**Test Commands:**
```bash
# Start server
bun dev:server

# Test endpoints
curl http://localhost:3008/api/features
curl http://localhost:3008/health
```

---

## 🔄 In Progress (0/18 tasks)

None currently.

---

## 📋 Pending Tasks (17/18)

### **Phase 1: API Foundation** (2 tasks remaining)

#### Task #2: State Transition API
**File:** `packages/api/src/routers/state-router.ts` (NEW)

**Endpoints:**
```
POST /api/state/:featureId/:action
Actions: claim | start | complete | verify | fail | retry | reset
Body: { reason?: string }
```

**Implementation:**
- Wrap `nomos.sh state` commands
- Validate state transitions (use FEATURE_VALID_TRANSITIONS)
- Handle file locking
- Emit events on state change
- Return updated feature state

**Dependencies:** Task #1 ✅

---

#### Task #3: Checkpoint Query API
**File:** `packages/api/src/routers/checkpoint-router.ts` (NEW)

**Endpoints:**
```
GET /api/checkpoints/:featureId
GET /api/checkpoints/:featureId/:phase
GET /api/checkpoints/:featureId/latest
```

**Implementation:**
- Read checkpoint files from `.nomos/worktrees/*/checkpoints/`
- Parse JSON safely (handle errors)
- Return 404 if not found
- Cache responses (short TTL)
- Support phase filtering (cp-01 through cp-06)

**Dependencies:** Task #1 ✅

---

### **Phase 2: Webhook System** (3 tasks)

#### Task #4: Webhook Registry Service
**File:** `packages/api/src/services/webhook-service.ts` (NEW)

- CRUD webhooks in SQLite
- Filter by event type
- Generate HMAC secrets
- Enable/disable webhooks

**Dependencies:** Tasks #1, #2, #3

---

#### Task #5: Event Dispatcher with Retry Logic
**File:** `packages/api/src/services/event-dispatcher.ts` (NEW)

- Hook into EventService.emit()
- POST to webhook URLs
- Retry logic: 3 attempts, exponential backoff (1s, 4s, 16s)
- HMAC signature: `X-NOMOS-Signature: sha256=...`
- Dead letter queue + circuit breaker

**Dependencies:** Task #4

---

#### Task #6: Webhook Admin UI
**File:** `apps/web/src/pages/webhooks.tsx` (NEW)

- List/create/delete webhooks
- Test delivery button
- View delivery logs
- Event type multi-select

**Dependencies:** Tasks #4, #5

---

### **Phase 3: n8n Integration** (3 tasks)

#### Task #7: n8n Workflow Templates
**Directory:** `.nomos/n8n-workflows/` (NEW)

Create 5 workflows:
1. `github-issue-to-feature.json`
2. `approval-gate.json`
3. `auto-retry.json`
4. `health-monitor.json`
5. `pr-auto-merge.json`

**Dependencies:** Tasks #4, #5

---

#### Task #8: n8n Integration Guide
**File:** `.nomos/n8n-workflows/README.md` (NEW)

- Setup instructions
- Environment variables
- Webhook configuration
- Testing steps
- Troubleshooting

**Dependencies:** Task #7

---

#### Task #9: Docker Compose for n8n
**File:** `docker-compose.n8n.yml` (NEW)

- n8n service setup
- Volume mounts
- Network config
- Health checks

**Dependencies:** Task #7

---

### **Phase 4: Database Migration** (3 tasks)

#### Task #10: Database Schema
**File:** `packages/db/src/schema/features.sql` (NEW)

```sql
CREATE TABLE features (...);
CREATE TABLE webhooks (...);
CREATE INDEX idx_features_status ON features(status);
```

**Dependencies:** None (can start in parallel)

---

#### Task #11: Migration Script
**File:** `packages/db/src/migrations/001-features-to-db.ts` (NEW)

- Import features.json → SQLite
- Batch insert (100 at a time)
- Verify integrity
- Backup creation

**Dependencies:** Task #10

---

#### Task #12: Bi-directional Sync Service
**File:** `packages/api/src/services/feature-sync-service.ts` (NEW)

- DB change → export to features.json
- File change → import to DB
- Real-time watcher (chokidar)
- Conflict resolution

**Dependencies:** Tasks #10, #11

---

### **Phase 5: CLI + API Convergence** (3 tasks)

#### Task #13: API Client for CLI
**Package:** `packages/api-client/` (NEW)

```typescript
class NomosClient {
  async getFeature(id: string): Promise<Feature>
  async updateStatus(id, status): Promise<void>
  async listCheckpoints(id): Promise<Checkpoint[]>
}
```

**Dependencies:** Tasks #1, #2, #3

---

#### Task #14: Update nomos.sh for API
**File:** `.claude/skills/nomos/scripts/nomos.sh`

- Detect API availability
- Use API if available
- Fallback to file ops

**Dependencies:** Task #13

---

#### Task #15: Environment Detection Module
**File:** `.claude/skills/nomos/scripts/lib/env.sh` (NEW)

Functions:
- `is_claude_code()`
- `is_docker_container()`
- `is_standalone()`
- `api_available()`
- `get_execution_mode()`

**Dependencies:** Task #13

---

### **Phase 6: Documentation** (3 tasks)

#### Task #16: Architecture Documentation
**File:** `.nomos/docs/architecture.md` (NEW)

- Execution modes comparison
- API endpoints reference
- Webhook event catalog
- State machine diagrams
- Data flow diagrams

**Dependencies:** All Phase 1-5 tasks

---

#### Task #17: n8n Cookbook
**File:** `.nomos/docs/n8n-cookbook.md` (NEW)

- 10+ workflow recipes
- Common patterns
- Troubleshooting guide
- Best practices

**Dependencies:** Tasks #7, #8, #9

---

#### Task #18: Integration Examples
**Directory:** `.nomos/examples/` (NEW)

- `python-automation.py`
- `slack-bot.js`
- `github-action.yml`
- `webhook-handler.ts`
- `rest-api-client.sh`

**Dependencies:** Tasks #1-5

---

## Task Dependencies Graph

```
Phase 1: API Foundation
  #1 (REST) ✅
    ├─> #2 (State API)
    └─> #3 (Checkpoints)

Phase 2: Webhooks
  #1, #2, #3 ─> #4 (Registry) ─> #5 (Dispatcher) ─> #6 (Admin UI)

Phase 3: n8n
  #4, #5 ─> #7 (Workflows) ─> #8 (Guide)
                            └─> #9 (Docker)

Phase 4: Database
  #10 (Schema) ─> #11 (Migration) ─> #12 (Sync)

Phase 5: CLI
  #1, #2, #3 ─> #13 (Client) ─> #14 (nomos.sh)
                              └─> #15 (env.sh)

Phase 6: Docs
  (All tasks) ─> #16 (Architecture)
  #7, #8, #9 ─> #17 (Cookbook)
  #1-#5 ─> #18 (Examples)
```

---

## Files Changed (Not Yet Committed)

```
M  .claude/settings.json
M  .envrc
M  apps/server/src/index.ts
A  packages/api/src/rest-adapter.ts
?? f039-login-page.png
```

---

## How to Resume

### Option 1: Continue with Task #2 (Recommended)

```bash
# Create feature branch and commit Task #1
git checkout -b feature/ecosystem-unification
git add apps/server/src/index.ts packages/api/src/rest-adapter.ts
git commit -m "feat: Phase 1.1 - REST adapter for oRPC endpoints

Implements REST translation layer at /api/* that wraps existing oRPC
endpoints. Provides external integration points for n8n, Zapier, etc.

- Created: packages/api/src/rest-adapter.ts
- Modified: apps/server/src/index.ts
- Endpoints: GET/POST/PATCH/DELETE /api/features/*
- Status: TypeScript compiles, server starts, health check OK"

# Start Task #2
# Tell Claude: "Continue with Task #2: State Transition API"
```

### Option 2: Test REST API First

```bash
# Start server
bun dev:server

# In another terminal, test endpoints
curl http://localhost:3008/health
curl http://localhost:3008/api/features?status=pending
curl -X POST http://localhost:3008/api/features -H "Content-Type: application/json" -d '{...}'

# Then continue with Task #2
```

### Option 3: Parallel Development

The following tasks can be worked in parallel:
- **Group A:** Tasks #2, #3 (API endpoints)
- **Group B:** Task #10 (Database schema - no dependencies)
- **Group C:** Tasks #7, #8, #9 (n8n - blocked until #4, #5)

---

## Team Context

**Team Name:** `nomos-ecosystem-unification`
**Team Lead:** `team-lead@nomos-ecosystem-unification`
**Team Config:** `~/.claude/teams/nomos-ecosystem-unification/config.json`
**Task List:** `~/.claude/tasks/nomos-ecosystem-unification/`

**View Tasks:**
```bash
# In Claude Code session
/tasks
```

---

## Key Decisions Made

1. **REST Translation Layer:** Instead of duplicating business logic, we translate REST → RPC internally and reuse the existing RPCHandler
2. **Type Safety:** Used `any` for RPCHandler type to avoid complex type gymnastics
3. **Branch:** Working on `main` → Need to create `feature/ecosystem-unification` branch
4. **Backward Compatibility:** All existing workflows continue working (no breaking changes)

---

## Testing Checklist (Phase 1.1)

- [x] TypeScript compilation
- [x] Server starts without errors
- [x] Health check endpoint works
- [ ] Manual REST API testing
- [ ] Authentication/authorization checks
- [ ] Error handling validation
- [ ] Rate limiting verification

---

## Next Session Prompt

```
Continue NOMOS ecosystem unification from Task #2: State Transition API.

Context:
- Team: nomos-ecosystem-unification
- Branch: main (need to create feature/ecosystem-unification)
- Task #1 (REST adapter) completed
- Resume plan: .nomos/RESUME-PLAN-ecosystem-unification.md

Please:
1. Create feature branch and commit Task #1
2. Implement Task #2: State Transition API
3. Update task status as you go
```

---

## Resources

**Plan Document:** `/Users/sda/Workspace/nomos-ai/.nomos/RESUME-PLAN-ecosystem-unification.md` (this file)
**Original Plan:** In conversation transcript
**Team Config:** `~/.claude/teams/nomos-ecosystem-unification/`
**NOMOS Context:** `/Users/sda/Workspace/nomos-ai/CLAUDE.md`

---

**Last Updated:** 2026-02-09
**Total Progress:** 1/18 tasks (5.6%)
**Estimated Time Remaining:** ~5-6 weeks (original plan: 6 weeks)
