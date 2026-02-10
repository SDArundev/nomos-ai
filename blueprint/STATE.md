# NOMOS Session State

> **IMPORTANT: Update this file at the end of every session.**

## Current Status: STRATEGY COMPLETE, READY TO SCAFFOLD

**Last Updated:** 2026-02-10 (session 3)
**Phase:** Pre-rebuild (strategy validated, blueprint enhanced, frontend designed)
**Next Action:** Scaffold fresh project from better-t-stack, begin Sprint 1

---

## What Was Done This Session

### Frontend Design Brief
- Created `FRONTEND-DESIGN-BRIEF.md` — comprehensive greenfield UI specification
- 10 sections covering: product identity, information architecture, 9 core surfaces, component design language, real-time patterns, sprint-by-sprint UI deliverables, interaction patterns, data flow, constraints, open questions
- Designed from blueprint specs only — zero reference to existing `apps/web/` code
- Updated `README.md` index with new document

### Key Design Decisions
1. Dark-first, developer-tool aesthetic (Linear/Vercel/Railway reference)
2. 12 routes organized under project scoping (`/projects/:projectId/...`)
3. Sidebar + command palette (Cmd+K) navigation model
4. Three-layer component architecture: atoms → molecules → organisms
5. Real-time via single WebSocket connection with per-view subscriptions
6. State: TanStack Query (fetch/mutate) + WebSocket (push) + Zustand (UI state)
7. Progressive disclosure: collapse-by-default for tool calls, thinking blocks, phase output
8. Sprint-aligned delivery: each sprint has explicit pages + components + state slices

### Previous Session: 4-Agent Strategy Analysis (Opus swarm)
Spawned 4 specialized agents to analyze the blueprint, brownfield, and reference architecture in parallel:

1. **Auditor** — Inventoried 28 services, 16 schemas, 20 routers. Found 9 issues (2 critical, 3 high, 4 medium).
2. **Researcher** — Read all 22 Automaker reference docs (~250KB). Key finding: Automaker has ZERO learning system. Our moat is intelligence.
3. **Architect** — Designed complete self-learning system: extraction, storage, injection, feedback loop, cross-project transfer, cold start.
4. **Analyst** — Classified every file/directory as CORE/TEMPLATE/RUNTIME/EPHEMERAL. Defined greenfield packaging strategy.

### New Blueprint Documents
- `GREENFIELD-STRATEGY.md` — Synthesized strategy: what to carry forward, what to delete, anti-patterns, directory convention, moat analysis
- `LEARNING-ENGINE.md` — Complete self-learning system design: 4-stage loop, relevance scoring, confidence formula, feedback evaluation

### Key Decisions Made
1. Blueprint is a recipe book, not a migration guide. Zero references to old code.
2. Feature table to be SPLIT into `feature` (definition) + `pipeline_run` (execution state).
3. New `learning_application` table for feedback loop (tracks injection outcomes).
4. Pattern/antipattern tables get `project_id`, `stack_tags`, `scope`, injection stats.
5. Agent prompts for product = TypeScript functions in `src/agents/prompts/`, not `.md` files.
6. Seed learnings are curated best practices defined in code, not migrated files.
7. Patterns to apply: error classification, SDK options factory, feature locking, env sanitization, failure detection.

---

## What Exists Today

### Working
- PostgreSQL DB with 18 tables (auth, projects, features, sessions, messages, learnings, events, etc.)
- 110+ API endpoints via oRPC (CRUD for all entities, auth, WebSocket)
- Web UI with dashboard, kanban, agent chat, activity feed, settings
- Auth system (better-auth, session + API key auth)
- Intent Box (feature expansion from natural language)
- Internal NOMOS pipeline (13 agents, 18 skills, 6-phase pipeline)

### Broken / Incomplete
- Bun `--hot` kills agent child processes via SIGTERM after ~60s (BLOCKING for pipeline)
- Pipeline is CLI-driven, not server-driven
- Agent engine is subprocess-based (Claude Code CLI), not in-process (SDK)
- Feature state not synchronized between features.json and DB
- `.nomos/stack.json` says SQLite/Turso while actual DB is PostgreSQL (CRITICAL stale data)
- ~100 learning JSON files on filesystem not mirrored in DB
- Feature table overloaded (40+ columns mixing definition + execution + git + errors)
- Event and notification tables lack userId columns
- Compiled .js files alongside .tsx sources (40 duplicate files)

---

## Session Log

### 2026-02-10 Session 3 — Frontend Design Brief
- Created FRONTEND-DESIGN-BRIEF.md (14th blueprint doc)
- Covers all UI surfaces across 6 sprints: auth, dashboard, project home, kanban, feature detail, agent chat, team view, learning browser, settings
- Defines component taxonomy (atoms/molecules/organisms), real-time patterns, data flow architecture
- Updated README.md index

### 2026-02-10 Session 2 — Greenfield Strategy
- Ran 4-agent Opus swarm: auditor, researcher, architect, analyst
- Created GREENFIELD-STRATEGY.md (synthesis of all findings)
- Created LEARNING-ENGINE.md (complete self-learning system design)
- Updated README.md (added new docs to reading order)
- **Key insight:** Automaker has NO learning system. NOMOS's moat is intelligence.
- **Key finding:** Feature table needs splitting, learning system needs `learning_application` table for feedback loop

### 2026-02-10 Session 1 — Blueprint Creation
- Created `blueprint/` directory with 11 documents
- Ran 4-agent exploration: DB schema, API surface, Automaker patterns, agent/skill inventory
- Defined 6-sprint rebuild plan with test gates
- Defined blog+admin test project spec
- **Decision:** Rebuild as in-process system, use internal NOMOS to build it

---

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| No fresh scaffold yet | Can't start Sprint 1 | Run better-t-stack generator |
| Existing learning data not migrated | 40+ patterns stuck in JSON files | Write migration script in Sprint 1 |

---

## Sprint Progress

| Sprint | Status | Key Deliverable |
|--------|--------|-----------------|
| 0. Strategy | COMPLETE | GREENFIELD-STRATEGY.md + LEARNING-ENGINE.md |
| 1. Foundation | NOT STARTED | CRUD projects/features, auth, basic UI |
| 2. Single Agent | NOT STARTED | Agent chat with streaming, tool execution |
| 3. Pipeline | NOT STARTED | Automated 6-phase feature implementation |
| 4. Multi-Agent | NOT STARTED | Team coordination, swarm patterns |
| 5. Learning | NOT STARTED | Pattern extraction and application |
| 6. Dogfood | NOT STARTED | NOMOS implements feature on blog project |

---

## Blueprint Documents (14 total)

| Document | Purpose | Status |
|----------|---------|--------|
| README.md | Index, how to use | Updated |
| VISION.md | Product vision, two-brain solution | Complete |
| ARCHITECTURE.md | In-process system design | Complete |
| STATE.md | Living tracker | Updated this session |
| REBUILD-PLAN.md | 6 sprints with test gates | Complete |
| GREENFIELD-STRATEGY.md | Packaging, anti-patterns, moat | Complete |
| LEARNING-ENGINE.md | Self-learning system design | Complete |
| FRONTEND-DESIGN-BRIEF.md | UI surfaces, components, interactions | NEW this session |
| AGENT-ENGINE.md | Claude SDK integration | Complete |
| PIPELINE-ENGINE.md | Server-side pipeline | Complete |
| TEAM-ORCHESTRATOR.md | Multi-agent coordination | Complete |
| CURRENT-SYSTEM.md | v4 inventory | Complete |
| AUTOMAKER-ANALYSIS.md | Competitive patterns | Complete |
| TEST-PROJECT.md | Blog+admin test spec | Complete |
