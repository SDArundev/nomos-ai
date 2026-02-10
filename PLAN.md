# NOMOS Strategic Execution Plan

> AI-readable plan for transforming NOMOS from "passing tests" to "usable product"

---

## Current State (2026-02-10)

| Metric | Value |
|--------|-------|
| Tests passing | 636 (all mock DB, 0 hit real infrastructure) |
| App booted in browser | 1 time (this session) |
| Known bugs from live use | 5 |
| Features in DB | 139 (72 verified, 66 backlog, 1 pending) |
| .nomos/ tracked files | 233 (138 are runtime artifacts) |
| .nomos/ total size | 7.7 MB |
| UI customization | 0 (stock shadcn grayscale) |
| Docs accuracy | ~60% (CLAUDE.md says SQLite, SETUP.md outdated) |

---

## Phase 1: Bug Fixes (Priority: Critical)

Fix the 5 bugs found from actually using the app. These block the happy path.

### BUG-1: Project ID `PNaN`
- **Symptom**: Project detail link generates `/projects/PNaN`
- **Root cause**: Project ID from API is likely a string or UUID, but the frontend parses it as a number with `parseInt()` or `Number()`
- **Files to investigate**:
  - `apps/web/src/routes/projects/` — route params
  - `apps/web/src/components/projects/` — link generation
  - `packages/api/src/routes/projects.ts` — API response shape
- **Fix**: Use string IDs throughout, remove any `parseInt`/`Number` casting on project IDs
- **Validation**: Navigate to project detail → URL should be `/projects/<valid-id>`

### BUG-2: Project Selection Resets on Reload
- **Symptom**: Selected project in sidebar resets to "Select Project" after page reload
- **Root cause**: Zustand store uses in-memory state, not persisted to localStorage
- **Files to investigate**:
  - `apps/web/src/stores/` — project store
  - Zustand `persist` middleware not applied
- **Fix**: Add `persist` middleware to the project store, or store selection in URL params
- **Validation**: Select project → reload page → project still selected

### BUG-3: CLAUDE.md Says SQLite (Should Be PostgreSQL)
- **Symptom**: CLAUDE.md, docs/README.md, docs/SETUP.md all reference SQLite
- **Files to update**:
  - `/CLAUDE.md` — Stack table: SQLite → PostgreSQL
  - `/docs/README.md` — Stack table: SQLite → PostgreSQL
  - `/docs/SETUP.md` — Add Docker prerequisite, PostgreSQL setup
  - `.nomos/docs/SYSTEM_ARCHITECTURE.md` — verify DB references
- **Fix**: Find-and-replace SQLite → PostgreSQL, add Docker/postgres setup instructions
- **Validation**: `grep -r "SQLite" docs/ CLAUDE.md` returns 0 results

### BUG-4: Features Imported With Wrong IDs
- **Symptom**: Import creates IDs F298-F436 instead of preserving F001-F139
- **Root cause**: Import endpoint auto-generates sequential IDs from DB auto-increment instead of reading the `id` field from the JSON
- **Files to investigate**:
  - `packages/api/src/routes/features.ts` — bulkCreate handler
  - `packages/api/src/services/feature-service.ts` — insert logic
  - `packages/db/src/schema/` — features table schema (is `id` auto-increment?)
- **Fix**: Allow explicit ID on import, or use the feature's `id` field as the `featureId` column
- **Validation**: Delete all features → re-import → IDs match F001-F139

### BUG-5: WebSocket "Disconnected" Intermittently
- **Symptom**: Status indicator flickers between Connected/Disconnected after navigation
- **Root cause**: Likely WebSocket connection not surviving TanStack Router navigation (component unmount/remount)
- **Files to investigate**:
  - `apps/web/src/hooks/` — WebSocket hook
  - `apps/web/src/components/layout/` — status indicator placement
- **Fix**: Move WebSocket connection to app-level provider (outside router), add reconnection logic
- **Validation**: Navigate between routes 10 times → status stays "Connected"

---

## Phase 2: .nomos/ Cleanup (Priority: High)

Transform .nomos/ from 233 tracked files (7.7 MB) to a clean, organized system folder.

### Step 2.1: Safe Deletes (P0 — Zero Risk)
Files with zero code references, safe to delete immediately.

```
DELETE:
  .nomos/nomos.db                              # 208KB leftover SQLite file
  .nomos/locks/                                # Empty directory
  .nomos/stabilization.json                    # 4.9KB, no code refs
  .nomos/brick-by-brick.md                     # 4KB, old planning doc
  .nomos/DEEP-ANALYSIS-2026-02-09.md           # 41KB, one-time analysis
  .nomos/RESUME-PLAN-ecosystem-unification.md  # 11KB, old plan
  .nomos/feature-graph.html                    # 56KB, visualization artifact
  .nomos/scripts/                              # 12KB, old shell scripts
  .nomos/prompts/                              # 40KB, old prompt templates
  .nomos/templates/                            # 4KB, old templates
  .nomos/qa-evidence/                          # 240KB, old QA screenshots
  .nomos/learning/code/                        # Subdirectory with code snippets
  .nomos/learning/f031-extraction-report.md    # One-time report
  .nomos/learning/patterns-archive.json        # 413B, superseded by patterns.json
  .nomos/learning/regression-log.json          # 1.2KB, old log

ESTIMATED SAVINGS: ~580KB, ~20 files
```

### Step 2.2: Git Untrack Runtime Artifacts (P1)
These exist in .gitignore but were committed before the gitignore entries existed.

```
GIT RM --CACHED (keep on disk, untrack from git):
  .nomos/output/        # 1.7MB, 44 files — per-feature run outputs
  .nomos/verify/        # 1.3MB, 45 files — verification run outputs
  .nomos/swarm/         # 2.0MB, 44 files — swarm session outputs
  .nomos/runner-logs/   # 56KB — Docker runner logs

VERIFY .gitignore has:
  .nomos/output/
  .nomos/verify/
  .nomos/swarm/
  .nomos/runner-logs/
  .nomos/locks/
  .nomos/worktrees/

ESTIMATED SAVINGS: ~5.1MB untracked, 133 files removed from git
```

### Step 2.3: Docs Cleanup (P1)
The .nomos/docs/ folder has 19 tracked files, most are old batch spawn prompts.

```
ARCHIVE (move to .nomos/archive/docs/):
  .nomos/docs/batch5-execution-plan.md
  .nomos/docs/batch5a-spawn-prompt.md
  .nomos/docs/batch5b-spawn-prompt.md
  .nomos/docs/batch5c-spawn-prompt.md
  .nomos/docs/batch6-spawn-prompt.md
  .nomos/docs/batch7-spawn-prompt.md
  .nomos/docs/batch8-spawn-prompt.md
  .nomos/docs/batch9-spawn-prompt.md
  .nomos/docs/batch10-spawn-prompt.md
  .nomos/docs/execution-plan-2026-02-09.md
  .nomos/docs/next-session-prompt.md
  .nomos/docs/strategic-review-2026-02-09.md
  .nomos/docs/strategic-review-v2-2026-02-09.md
  .nomos/docs/strategic-review-v3-2026-02-09.md
  .nomos/docs/strategic-review-v4-2026-02-10.md
  .nomos/docs/v2-session-api-evaluation.md

KEEP:
  .nomos/docs/GIT_WORKFLOW_GUIDE.md        # Active reference
  .nomos/docs/SYSTEM_ARCHITECTURE.md       # Active reference (needs update)
  .nomos/docs/VALIDATION_REPORT.md         # Active reference
```

### Step 2.4: Learning Data Consolidation (P2)
Currently dual-storage: JSON files for agents/skills, DB for UI.

```
CURRENT STATE:
  .nomos/learning/patterns.json              # 68KB — read by skills/agents
  .nomos/learning/antipatterns.json          # 16KB — read by skills/agents
  .nomos/learning/metrics.json               # 23KB — read by skills/agents
  .nomos/learning/verification-patterns.json # 12KB — read by skills/agents
  .nomos/learning/insights/                  # 5 files — read by skills/agents

TARGET STATE:
  .nomos/seed-data/patterns.json             # Seed data for DB import
  .nomos/seed-data/antipatterns.json         # Seed data for DB import
  .nomos/seed-data/metrics.json              # Seed data for DB import
  DB becomes single source of truth
  Add API endpoints for agents to read learning data from DB
  Skills/agents updated to call API instead of reading JSON

This is a larger refactor — defer until after bugs + cleanup are done.
```

### Step 2.5: Target .nomos/ Structure
After cleanup, .nomos/ should look like:

```
.nomos/
├── .gitkeep
├── app_spec.json          # Project specification (keep)
├── features.json          # Feature backlog (keep until DB is authoritative)
├── project.json           # Project config (keep)
├── stack.json             # Stack definition (keep)
├── archive/               # Old docs, specs, plans
│   ├── app_spec.json
│   ├── features-aspirational.json
│   ├── features-bulk-granular.json
│   ├── stack.json
│   └── docs/              # Archived batch prompts, old reviews
├── docs/                  # Active documentation only
│   ├── GIT_WORKFLOW_GUIDE.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── VALIDATION_REPORT.md
├── inspiration/           # Reference docs (keep as-is, 840KB)
│   ├── autonomous/
│   └── nomos-v3/
├── learning/              # Learning data (or seed-data/ after P2)
│   ├── patterns.json
│   ├── antipatterns.json
│   ├── metrics.json
│   ├── verification-patterns.json
│   └── insights/
├── schemas/               # JSON schemas (keep)
├── output/                # .gitignored — runtime feature outputs
├── verify/                # .gitignored — runtime verification outputs
├── swarm/                 # .gitignored — runtime swarm outputs
├── runner-logs/           # .gitignored — runtime Docker logs
├── worktrees/             # .gitignored — git worktrees
└── locks/                 # .gitignored — runtime locks
```

**Result**: ~80 tracked files (down from 233), ~2.5MB (down from 7.7MB)

---

## Phase 3: Documentation Accuracy

### Step 3.1: Update CLAUDE.md
- Database: SQLite → PostgreSQL
- Add Docker prerequisite
- Update `.nomos/` structure to reflect reality
- Remove references to v3 pipeline steps

### Step 3.2: Update docs/README.md
- Database: SQLite → PostgreSQL
- Feature count: 220 → 139
- Add Docker prerequisite
- Update project structure diagram

### Step 3.3: Update docs/SETUP.md
- Add Docker + docker compose prerequisite
- Add `docker compose up -d postgres redis` step
- Add `.env` setup from `.env.example`
- Remove references to SQLite
- Update development commands

### Step 3.4: Update .nomos/docs/SYSTEM_ARCHITECTURE.md
- Verify all references match PostgreSQL reality
- Update component diagrams if needed

---

## Phase 4: UI/UX Redesign (Priority: Medium-High)

Apply custom design using /frontend-design expert. Goal: distinctive, non-AI-looking interface.

### Step 4.1: Design System Foundation
- Custom color palette (not shadcn grayscale)
- Typography system
- Component token overrides in Tailwind config
- Dark/light mode with personality

### Step 4.2: Core Layout
- Sidebar: Group 11 nav items into logical sections
- Header: Add logo/wordmark, refine status indicators
- Dashboard: Onboarding state when empty, useful when populated

### Step 4.3: Key Screens
- Login/Signup: Logo, tagline, illustration or distinctive design
- Kanban: Improve card design, add visual status indicators
- Feature Detail: Clean layout for viewing/editing features
- Agent Chat: Replace raw UUIDs with meaningful session names
- Import: Streamline the workflow

### Step 4.4: Polish
- Loading states with branded skeletons
- Error states with personality
- Empty states with guidance
- Transitions and micro-interactions

---

## Phase 5: Feature Triage (Priority: Medium)

The 139 features need review before building more.

### Current Distribution
| Status | Count | Action |
|--------|-------|--------|
| verified | 72 | Review — many were "verified" by AI self-review, not by running the app |
| backlog | 66 | Triage — prioritize what matters for the product |
| pending | 1 | Check status |

### Category Distribution (Top 5)
| Category | Count | Notes |
|----------|-------|-------|
| CAT-FIX | 45 | Bug fixes — many generated by batch reviews |
| CAT-KAN | 15 | Kanban features |
| CAT-AGT | 14 | Agent features |
| CAT-DBS | 12 | Database features |
| CAT-API | 9 | API features |

### Triage Strategy
1. Review the 72 "verified" features — test each in the running app
2. Review the 45 CAT-FIX features — many may be obsolete (fixed in batches or no longer relevant)
3. Prioritize features that make the core loop work: describe → build → watch → ship
4. Deprioritize features that add polish to unfinished foundations

---

## Phase 6: Future — Brownfield Detection

When creating a project pointing to an existing codebase:
1. Check if `.nomos/` directory exists
2. If yes: auto-detect and populate project from existing data (features.json, app_spec.json, etc.)
3. If no: generate `.nomos/` structure from codebase analysis + AI

This eliminates the manual import step and makes NOMOS immediately useful for any project.

---

## Execution Order

```
Phase 1 (Bugs)     ──→ Unblocks daily usage
  ├── BUG-1: PNaN          [~30min]
  ├── BUG-2: Project reset  [~20min]
  ├── BUG-3: Doc SQLite     [~15min]
  ├── BUG-4: Import IDs     [~45min]
  └── BUG-5: WebSocket      [~30min]

Phase 2 (Cleanup)  ──→ Clean .nomos/ system
  ├── Step 2.1: Safe deletes      [~10min]
  ├── Step 2.2: Git untrack       [~15min]
  ├── Step 2.3: Docs cleanup      [~10min]
  └── Step 2.4: Learning (defer)  [later]

Phase 3 (Docs)     ──→ Accurate documentation
  ├── Step 3.1: CLAUDE.md    [~15min]
  ├── Step 3.2: README.md    [~10min]
  ├── Step 3.3: SETUP.md     [~15min]
  └── Step 3.4: Architecture [~10min]

Phase 4 (Design)   ──→ Custom UI/UX (separate session with /frontend-design)

Phase 5 (Triage)   ──→ Feature cleanup (separate session)

Phase 6 (Future)   ──→ Brownfield detection (after core is stable)
```

### Parallelization
- Phase 1 bugs are independent — can run up to 3 in parallel via agent team
- Phase 2 steps are mostly sequential (delete → untrack → archive)
- Phase 3 can run in parallel with Phase 2
- Phase 4 requires Phase 1 complete (need working app to design against)

---

## Success Criteria

After Phases 1-3:
- [ ] App boots with `docker compose up -d && bun run dev`
- [ ] Sign up → Create project → Import features → Kanban shows correct IDs
- [ ] Project selection persists across page reloads
- [ ] WebSocket stays connected during navigation
- [ ] All docs reference PostgreSQL, include Docker setup
- [ ] .nomos/ has ~80 tracked files (down from 233)
- [ ] No orphan files, no runtime artifacts in git

After Phase 4:
- [ ] Custom color palette, not stock grayscale
- [ ] Logo and branding on login page
- [ ] Sidebar nav grouped logically
- [ ] Empty states guide the user
- [ ] Looks like a product, not a template

---

*Plan generated: 2026-02-10 | Based on 2 swarm analyses + live app testing*
