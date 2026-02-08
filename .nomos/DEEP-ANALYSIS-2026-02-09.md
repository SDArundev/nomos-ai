# NOMOS AI — Deep Multi-Agent Analysis

**Date:** 2026-02-09
**Branch:** `feature/ecosystem-unification`
**Team:** 4 specialized analysts (architecture, competitive, product, frontend)
**Method:** 4 parallel reports + 3 rounds of cross-team debate + final synthesis
**Duration:** ~15 minutes parallel analysis + debate

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Analysis](#1-architecture-analysis)
3. [Competitive Landscape](#2-competitive-landscape)
4. [Product & Strategy](#3-product--strategy)
5. [Frontend & UX](#4-frontend--ux)
6. [Cross-Team Debate](#5-cross-team-debate)
7. [Final Synthesis & Recommendations](#6-final-synthesis--recommendations)

---

## Executive Summary

NOMOS AI is a **well-architected but incomplete** autonomous AI development studio with a genuinely differentiated learning system and a battle-tested 6-phase CLI pipeline. The codebase has strong foundations (modern stack, clean separation, type safety) but suffers from a **split identity** between its sophisticated CLI pipeline and its thinner web app pipeline. The competitive landscape is moving fast — Automaker, Auto-Claude, Vibe Kanban, and Devin 2.0 all have working products today.

**The single most important decision:** NOMOS must commit to being a **CLI-native system with a web monitoring dashboard**, not a GUI-first app. The CLI skill pipeline is 10x more sophisticated than the web app's PipelineService and is the actual product.

**The single most important feature to build:** An **intent-first feature creation flow** ("describe what you want" -> AI generates specs -> human approves -> pipeline executes) that replaces manual spec writing while preserving the constitution's rigor.

**The single strongest moat:** The **learning system** (patterns, antipatterns, historian agent). No competitor except Auto-Claude has persistent cross-session learning, and NOMOS's approach is simpler and more portable than Auto-Claude's Graphiti knowledge graph.

---

# 1. Architecture Analysis

*By: arch-analyst (Opus model)*

## 1.1 System Diagram

```
+-------------------------------------------------------------+
|                    apps/server (Bun)                         |
|  +-------------------------------------------------------+  |
|  |  Hono HTTP Server (index.ts)                          |  |
|  |  +-- Rate Limiter (in-memory sliding window)          |  |
|  |  +-- CORS + Security Headers                         |  |
|  |  +-- better-auth (/api/auth/*)                       |  |
|  |  +-- REST Adapter (/api/* -> RPC translation)        |  |
|  |  +-- RPC Handler (/rpc/* -- oRPC)                    |  |
|  |  +-- OpenAPI Handler (/api-reference/*)              |  |
|  |  +-- WebSocket (/ws/events, /ws/terminal)            |  |
|  |  +-- Health + Readiness checks                       |  |
|  |  +-- SPA static fallback (production)                |  |
|  +-------------------------------------------------------+  |
+---------------------------+----------------------------------+
                            |
        +-------------------+-------------------+
        v                   v                   v
+---------------+  +---------------+  +-------------------+
| @nomos-ai/api |  |@nomos-ai/auth |  |  @nomos-ai/db     |
|  16 routers   |  | better-auth   |  |  Drizzle+SQLite   |
|  8 services   |  | email+pass    |  |  10 tables        |
|  oRPC procs   |  | cookie-based  |  |  10 repos         |
+-------+-------+  +---------------+  |  8 migrations     |
        |                              +-------------------+
        v
+------------------+    +------------------+
| @nomos-ai/types  |    | @nomos-ai/env    |
| Zod schemas      |    | T3 env validation|
| Status machines   |    | 12 server vars   |
+------------------+    +------------------+
```

### Monorepo Structure (Turborepo + Bun Workspaces)

**Apps:**
- `apps/server` -- Hono HTTP server (Bun runtime, hot-reload dev)
- `apps/web` -- React 19 frontend (TanStack Router, Zustand, Tailwind 4)

**Packages (6):**
- `@nomos-ai/api` -- 16 routers, 8+ services, oRPC procedures
- `@nomos-ai/auth` -- better-auth with Drizzle adapter (SQLite)
- `@nomos-ai/db` -- Drizzle ORM, 10 schema tables, 10 repositories, 8 migrations
- `@nomos-ai/env` -- T3 env validation (12 server vars)
- `@nomos-ai/types` -- Zod schemas, status machines, feature/session types
- `@nomos-ai/config` -- Shared TSConfig base

**Dependency Graph:**
```
server -> api -> auth -> db -> env -> types
  +-- db --+     +-- db --+
web -> api (client types only)
```

## 1.2 Strengths

### Clean Layered Architecture
The monorepo has clear separation of concerns. The server is thin (293 lines) -- it wires together middleware, routes, and WebSocket handlers. Business logic lives in `@nomos-ai/api` services. Database access is fully encapsulated in `@nomos-ai/db` repositories.

**Evidence:** `apps/server/src/index.ts` -- the server file imports from packages and does pure wiring.

### Type-Safe RPC Layer (oRPC + Zod)
- All inputs validated with Zod schemas (`packages/api/src/routers/feature.ts:18-68`)
- Protected procedures enforce auth via middleware (`packages/api/src/index.ts:8-17`)
- Status transitions validated against a transition map (`packages/api/src/routers/feature.ts:173-178`)
- Consistent error handling with `ORPCError` codes

### Claude Agent SDK Integration
The `ClaudeProvider` (`packages/api/src/services/claude-provider.ts`) features:
- Error classification into 7 categories (auth, rate_limit, network, timeout, server, validation, unknown)
- Exponential backoff with jitter for retryable errors
- Connection timeout (5 min)
- Mock provider for testing via environment variable
- Model alias resolution (haiku/sonnet/opus -> full model IDs)
- AbortController integration for cancellation

### Authorization Model
Every router consistently enforces ownership:
- `verifySessionOwnership()` pattern in agent, session, terminal routers
- Feature router checks `feat.userId !== context.session.user.id` on all mutations
- WebSocket connections authenticated via session cookie extraction
- Terminal sessions filtered by userId

### Feature Pipeline with Checkpoint Resume
The `AutoModeService` (`packages/api/src/services/auto-mode-service.ts`) has:
- Dependency-aware feature ordering (topological sort -- Kahn's algorithm)
- Checkpoint resume (stores `lastCompletedStep`, resumes after failure)
- Exponential backoff retry (30s, 60s, 120s)
- Consecutive failure circuit breaker (stops after 3)
- Feature locking to prevent concurrent execution

### Real-time Event Architecture
- `EventService` -- in-process pub/sub with subscriber isolation
- `EventBroadcaster` -- bridges events to WebSocket clients with backpressure detection
- User-scoped event filtering -- events with `userId` only go to matching clients

### Security Headers
Comprehensive set on every response (`apps/server/src/index.ts:87-101`):
CSP, X-Frame-Options, HSTS (production), Referrer-Policy, Permissions-Policy

## 1.3 Weaknesses & Technical Debt

### CRITICAL: FSService Path Traversal Insufficient
**File:** `packages/api/src/services/fs-service.ts:7-14`

The `validatePath()` checks `rel.startsWith("..")` but the FS router initializes FSService with `process.cwd()` as root. `ALLOWED_ROOT_DIRECTORY` env var exists but is **never used**. Additionally, `writeFile` has no content size limit, no file extension restrictions, and no audit logging.

### CRITICAL: Singleton Service Anti-Pattern
Multiple routers use module-level singleton factories (`packages/api/src/routers/agent.ts:10-26`, `auto-mode.ts:11-40`, `terminal.ts:7-14`, `fs.ts:6-12`). This makes testing difficult (no DI), creates hidden coupling, and prevents multiple instances.

### Rate Limiter Uses Spoofable Header
**File:** `apps/server/src/index.ts:39-40`

Rate limiter extracts IP from `x-forwarded-for` header, trivially spoofable without trusted proxy configuration.

### Two Separate Session Systems
Two session creation paths overlap:
- `sessionRouter.createAgentSession` calls standalone `createAgentSession()` function
- `agentRouter.createSession` calls `AgentService.createSession()` class method

Different code paths, same database table, different fields populated.

### No Pagination on List Endpoints
`PaginationParams` and `PaginatedResult` types exist in `@nomos-ai/types` but are **never used** in any router or repository. All list operations return full result sets.

### Auto-Mode Retry Timer Not Cancelable
**File:** `packages/api/src/services/auto-mode-service.ts:256-261`

`setTimeout` for retry resets feature status after delay, but timer reference is not stored. If `stop()` is called, timer still fires.

## 1.4 The Critical Finding: Dual Pipeline Problem

| Dimension | Web App PipelineService | NOMOS Skill Pipeline |
|---|---|---|
| Steps | 7 linear (generic) | 6 phases (specialized) |
| Agents | 1 model, 1 call per step | 11 agents (haiku/opus/sonnet by role) |
| Context | Polluted (no clearing) | Fresh windows per phase (checkpoint JSON) |
| Quality gates | Zero | 5 layers (3 iterations + 3 gates) |
| Learning | None | Loads patterns/antipatterns |
| Battle-tested | Never used in production | 24 features, 100% success |
| Lines of orchestration | ~125 | ~500+ |

**The skill pipeline dispatches haiku for scouting (cheap, fast), opus for architecture (expensive, smart), sonnet for coding (balanced). The web app pipeline fires the same model for every step.**

### Convergence Recommendation
1. **Short term:** PipelineService becomes a checkpoint reader/progress monitor
2. **Medium term:** App watches cp-01.json through cp-06.json and emits WebSocket events
3. **Long term:** App absorbs skill pipeline logic once it supports multi-agent dispatch, structured output validation, and conditional gate execution

## 1.5 Security Assessment

### Docker Runner: 4-Layer Security Model (Already Exists)
- Container isolation (Docker namespaces, separate filesystem)
- Non-root execution (gosu with configurable UID/GID)
- Read-only bind mounts (copy-to-writable pattern)
- Budget caps + execution timeouts

### Interactive/App Path: Security Gaps

| Issue | Severity | Location |
|-------|----------|----------|
| FS service root not configurable in practice | HIGH | `fs.ts:9` uses `process.cwd()` |
| Rate limiter spoofable via X-Forwarded-For | MEDIUM | `index.ts:39-40` |
| No file size limit on FS write | MEDIUM | `fs-service.ts:21` |
| `bypassPermissions` default for agent sessions | NOTABLE | `agent-service.ts:163` |
| Auto-mode `projectRoot` from client input | MEDIUM | `auto-mode.ts:50-53` |
| No budget enforcement in app AgentService | MEDIUM | Accepts `maxBudgetUsd` but never checks |

## 1.6 API Design: REST Adapter Pattern

The REST adapter (`packages/api/src/rest-adapter.ts`) translates REST HTTP requests into internal RPC calls via synthetic Request objects. Zero business logic duplication.

**Pro:** Enables external integrations without maintaining separate endpoints
**Con:** Only covers 7 endpoints on the features router (1 of 16 routers)

### REST Coverage

| Router | REST Coverage | External Integration Priority |
|--------|--------------|-------------------------------|
| features | YES (7 endpoints) | CRITICAL |
| projects | NO | HIGH |
| sessions | NO | HIGH |
| autoMode | NO | HIGH |
| learnings | NO | MEDIUM |
| pipeline | NO | MEDIUM |
| agent | NO | MEDIUM |
| github | NO | MEDIUM |
| 8 others | NO | LOW |

## 1.7 Architecture Recommendations (Ranked)

### P0 -- Security Fixes
1. Wire up `ALLOWED_ROOT_DIRECTORY` for FS service, add file size limits
2. Validate `projectRoot` inputs against allowed list
3. Fix rate limiter IP extraction (remove x-forwarded-for trust or add proxy config)
4. Delegate auto-mode to Docker runner instead of in-process execution

### P1 -- Architecture Improvements
5. Unify dual pipeline (PipelineService -> checkpoint reader)
6. Introduce ServiceRegistry (replace singleton factories)
7. Consolidate session creation paths
8. Make DB the single source of truth (CLI reads via REST API)

### P2 -- Operational
9. Add token/cost tracking per session and feature
10. Wire up pagination types to list endpoints
11. Add request correlation IDs
12. Store retry timers for cancellation

### P3 -- Future
13. API versioning (`/api/v1/` prefix)
14. Expand REST adapter to 4 critical routers
15. Structured logging (replace `console.error`)
16. Pipeline profiles (vibe/standard/critical)

---

# 2. Competitive Landscape

*By: competitive-analyst (Opus model)*

## 2.1 Market Tiers

**Tier 1 -- Platform Players (massive adoption):**
- Cursor (1M+ users, 360K paying) -- IDE-first, agent mode
- Claude Code / Codex -- CLI/cloud agents from Anthropic/OpenAI
- Devin 2.0 -- Cloud-hosted AI engineer, price dropped to $20/mo

**Tier 2 -- Kanban+Agent Orchestrators (direct NOMOS competitors):**
- Automaker -- Most similar, Electron + multi-provider, 158+ features
- Auto-Claude -- Python backend, 10.7K stars, QA loop (50 iterations)
- Vibe Kanban -- Open-source, 9.4K stars, agent-agnostic orchestration

**Tier 3 -- Research/Open-source:**
- SWE-Agent (Princeton) -- issue-to-fix, 65% SWE-bench
- OpenHands -- Open platform, 50%+ real GitHub issues solved
- Aider -- Terminal pair programming, 100+ language support

## 2.2 Detailed Competitor Profiles

### Automaker (Direct Competitor #1)
- **Stack:** Electron 39 + React 19 + Express 5, multi-provider (Claude, Codex, Cursor, OpenCode)
- **Features:** 158 features across 17 categories, 100+ API endpoints, 50+ themes
- **Architecture:** Single agent, multi-phase prompts, JSON files (no database)
- **Planning:** Levels: skip/lite/spec/full with optional human approval
- **Strengths:** Mature UI, multi-provider flexibility, large feature set
- **Weaknesses:** No database, no learning system, Electron binary size

### Auto-Claude (Direct Competitor #2)
- **Stack:** Electron 40 + React 19 + Python 3.12 backend
- **Features:** 10,700+ GitHub stars, AGPL-3.0
- **Architecture:** 4 agents (Planner, Coder, QA Reviewer, QA Fixer), up to 50 QA iterations
- **Memory:** Graphiti knowledge graph with LadybugDB
- **Security:** Three-layer model (OS sandbox + filesystem + dynamic command allowlist)
- **Unique:** Intent-aware semantic merge for parallel agent work
- **Strengths:** Strongest QA system, knowledge graph, semantic merge, security
- **Weaknesses:** Python+Electron = large binary, two language ecosystems, complex

### Vibe Kanban (Emerging Competitor)
- **Stack:** CLI + Web UI, agent-agnostic (8+ agents supported)
- **Features:** 9.4K stars, free and open-source
- **Architecture:** Pure orchestration layer, git worktree isolation
- **Strengths:** Maximum flexibility, no vendor lock-in, simple, growing fast
- **Weaknesses:** No quality gates, no learning, no spec pipeline

### Devin 2.0 (Cognition AI)
- **Pricing:** $20/mo minimum, $500/mo Team
- **Architecture:** Fully cloud-hosted, no local installation
- **Features:** Devin Wiki (auto-docs), multiple parallel Devins
- **Performance:** 67% PR merge rate, 83% improvement v2 vs v1
- **Strengths:** Zero setup, cloud scalability, enterprise features
- **Weaknesses:** Cloud dependency, opaque pricing at scale, no learning

### Claude Code (The Platform NOMOS Runs On)
- **Available:** Terminal CLI, VS Code extension, JetBrains, web, GitHub agent
- **Architecture:** Sub-agent system (5 types), CLAUDE.md memory
- **NOMOS relationship:** Meta-layer -- NOMOS orchestrates Claude Code sessions

### OpenAI Codex
- **Stack:** Cloud + macOS desktop, GPT-5.3-Codex
- **Features:** Skills (Figma, Linear), Automations (CI/CD, issue triage)
- **Unique:** Up to 30 min autonomous, mid-task direction changes

## 2.3 Comparison Matrix

| Dimension | NOMOS | Automaker | Auto-Claude | Vibe Kanban | Devin 2.0 |
|---|---|---|---|---|---|
| **Architecture** | Multi-agent 6-phase | Multi-provider 4-step | Multi-agent spec-driven | Agent-agnostic | Cloud single-agent |
| **Agents** | 11 specialized | 1 (multi-phase) | 4 (Planner/Coder/QA/Fixer) | External (any) | Proprietary |
| **Quality Gates** | 5 layers (3 iter + 3 gates) | Configurable steps | 50-iter QA loop | None | Cloud tests |
| **Learning** | patterns.json + historian | None | Graphiti knowledge graph | None | Devin Wiki |
| **Git** | Worktrees + auto-PR | Worktrees + auto-branch | Worktrees + semantic merge | Worktrees + auto-PR | Cloud git |
| **Desktop** | Tauri (planned) | Electron (mature) | Electron (mature) | CLI + Web | Cloud only |
| **Database** | SQLite (Drizzle) | JSON files | Pydantic + JSON + graph DB | None | Cloud |
| **Pricing** | Self-hosted (API costs) | Commercial | AGPL-3.0 | Free OSS | $20-500+/mo |
| **Model Support** | Claude-only | 4 providers | Claude-only | Any agent | GPT |

## 2.4 NOMOS Competitive Advantages

1. **Learning System (Strongest Differentiator)** -- Persistent patterns/antipatterns + historian agent. Evidence: 100% success rate, F018 completed in 5 min via pattern reuse from F017.
2. **6-Phase Pipeline with Context Clearing** -- Checkpoint-based inter-phase communication prevents context pollution. No competitor does this.
3. **Multi-Agent Swarm (11 Agents)** -- Most specialized roster: scout/haiku, architect/opus, historian, code-writer, code-reviewer, qa-reviewer, security-reviewer, qa-functional-tester, qa-smoke-tester, swarm-analyst, swarm-tester.
4. **Modern Stack** -- Bun + Hono + oRPC + Drizzle + Tauri is lighter and faster than Express/Electron.
5. **Constitutional Governance** -- 7 articles enforced programmatically. Unique.
6. **Resume & Recovery** -- Checkpoint system enables mid-pipeline recovery.
7. **Self-Hosted / Local-First** -- No data leaves the machine.

## 2.5 NOMOS Competitive Gaps

1. **UI Maturity (CRITICAL)** -- Competitors have 100+ working UI components
2. **QA Iteration Depth** -- 2 fix cycles vs Auto-Claude's 50 (NOMOS has 5 total layers though)
3. **Multi-Provider** -- Claude-only vs Automaker's 4, Vibe Kanban's 8+
4. **Semantic Merge** -- Standard git vs Auto-Claude's AI conflict resolution
5. **GitHub/Integration Depth** -- Basic `gh` CLI vs deep PR/issue processing
6. **Security Model** -- No app-path sandbox vs Auto-Claude's 3-layer model

## 2.6 Moat Analysis

| Moat | Strength | Defensibility |
|---|---|---|
| **Learning System** | HIGH | STRONG -- accumulated patterns are unique per-project knowledge. Switching costs increase over time. |
| **6-Phase Pipeline** | MEDIUM | MODERATE -- can be copied but requires significant engineering. Context-clearing is non-obvious. |
| **Ecosystem APIs** (potential) | HIGH | STRONG -- REST+webhooks create integration surface with network effects. |
| **Intent-First UX** (potential) | HIGH | STRONG -- no competitor has "describe intent -> AI decomposes -> autonomous execution." |
| **Constitutional Governance** | LOW | WEAK -- easy to implement, value is in the concept. |

## 2.7 Pricing Analysis: NOMOS vs Devin

| Dimension | Devin ($500/mo Team) | NOMOS (self-hosted, ~$500 API) |
|---|---|---|
| Features/month | ~10-25 | ~50-100 |
| Learning | None | Persistent patterns/antipatterns |
| Control | Cloud-only, opaque | Full control, local-first |
| Security | Code goes to cloud | Code stays local |
| Quality | 67% PR merge rate | 100% success rate (24/24 features) |
| Vendor lock-in | HIGH | MEDIUM (Claude API, switchable) |

**Positioning:**
- vs Devin: "Own your AI team, don't rent one"
- vs Vibe Kanban: "Start simple, scale to autonomous"
- vs Auto-Claude: "Same power, enterprise-friendly license"
- vs Automaker: "Lighter, faster, learns your codebase"

---

# 3. Product & Strategy

*By: product-analyst (Opus model)*

## 3.1 Vision Verdict

**Is the vision compelling?** Yes. "Autonomous AI Development Studio" addresses a real pain point -- batch-processing features with quality gates rather than interactive pair-programming.

**Is it achievable?** Partially within current scope. Evidence: 24 features completed with 100% success rate, avg 22.5 min/feature. But success metrics are aspirational -- only tested on XS/S features.

**The 7-Article Constitution** is well-crafted. ART-001 (Specification First) and ART-002 (Quality Gate Imperative) are sound. ART-003 (Human Approval Required) is the right safety valve. ART-004 (Worktree Isolation) is a critical differentiator. ART-007 (Fail-Safe Auto-Mode) prevents runaway costs.

**Non-goals assessment:**
- "No cloud deployment" -- smart constraint for MVP
- "No real-time collaboration" -- appropriate for solo-first
- "No external PM tool integration" -- risky omission (users have existing workflows)

## 3.2 Ecosystem Unification Plan Review

### What's Right
- Phase 1 (REST API) -- correct starting point
- REST adapter pattern (zero business logic duplication) -- elegant
- Phase 4 (Database Migration) -- JSON files are a scalability bottleneck
- Backward compatibility -- all existing workflows continue

### What's Over-Engineered
- **n8n Integration (Phase 3, Tasks #7-9):** Three tasks for n8n-specific content is premature. Webhook system alone enables ANY automation tool.
- **API Client package (Task #13):** Over-abstraction. CLI can use `curl` + REST adapter.
- **Environment Detection Module (Task #15):** 5 lines of bash, not a separate module.
- **Bi-directional sync (Task #12):** Race conditions and conflict resolution complexity. One-way migration sufficient.

### What's Missing
- Authentication for REST API (API keys / Bearer tokens)
- API versioning (`/api/v1/`)
- OpenAPI/Swagger spec auto-generation
- Error handling standardization

### Timing Issues
- Database migration should be Phase 1 or 2, not Phase 4
- CLI convergence before DB migration means doing it twice

## 3.3 User Personas

**Primary: "The Solo AI-Curious Developer"**
- Uses Claude Code/Cursor regularly, has personal projects
- Frustrated by repetitive feature implementation
- Technical enough for local Bun/SQLite setup

**Secondary: "The Technical Team Lead"**
- Manages 2-5 developers, wants to parallelize AI agent work
- Interested in learning system for institutional knowledge

**Key friction point:** Writing formal acceptance criteria. Most developers think in tasks, not formal specifications.

## 3.4 Recommended Roadmap

### Phase 0: Foundation Fixes (Week 1)
- Security P0s, dual pipeline resolution, ServiceRegistry

### Phase 1: Core Loop (Weeks 2-4)
- E2E: feature -> CLI pipeline -> checkpoint streaming -> web dashboard -> review
- Promote auto-mode dashboard to homepage

### Phase 2: Intent-First (Weeks 5-6)
- ART-001a expansion agent + Intent Box UI + Decomposition Preview

### Phase 3: Ecosystem APIs (Weeks 7-9)
- REST for 4 routers + auth + versioning + webhooks

### Phase 4: Polish (Weeks 10-12)
- Metrics tracking, E2E tests, git integration panel, cost tracking

## 3.5 Bold Recommendations

### 1. Kill the Desktop App (for v1), Ship CLI-First
The real power users run `nomos.sh F031 --auto --merge` from terminal. Web UI is a monitoring dashboard. Halves frontend surface area.

### 2. Make Features AI-Generated, Not Human-Written (ART-001a)
Biggest adoption barrier is writing formal specs. Let the user describe a feature in natural language, have AI expand it into a full spec with ACs for approval.

**Proposed constitutional article:**
```
ART-001a: Intent Expansion
Principle: Natural language feature descriptions may be expanded into
           complete specifications by an AI agent before ART-001 applies.
Enforcement: If a feature lacks acceptanceCriteria, an expansion agent
             MUST generate them for human approval before pipeline entry.
```

### 3. Open Source the Learning System as Standalone
The pattern/antipattern capture system is genuinely novel. Extract into a standalone library for community flywheel.

### 4. Abandon the 300-Feature Target
285 features for v1 is pathological. Notion launched with ~30, Linear with ~15. Cut to 30 core, 50 enhancement, rest to community wishlist.

### 5. Add a "NOMOS Score"
Surface success metrics publicly: "NOMOS Score: 97.3% -- 24/24 features completed first-try." Trust signal for adoption.

## 3.6 Top 5 Strategic Risks

1. **Scope Creep (CRITICAL)** -- 285 features, growing faster than implementation velocity
2. **Claude API Dependency (HIGH)** -- Single vendor, no abstraction layer
3. **The "Meta" Problem (HIGH)** -- AI building AI tooling creates bootstrap paradox
4. **Maintenance Burden (MEDIUM)** -- 16 routers, 11 agents, 6 packages, 285 features tracked
5. **Security Surface (MEDIUM)** -- Documented antipatterns (ANTI-015 through ANTI-019)

## 3.7 Business Model

**Recommended: Apache 2.0 Open Core**
- **Apache 2.0:** Pipeline engine, CLI, web dashboard, agents, quality gates
- **Commercial add-on:** Curated pattern libraries, enterprise learning analytics, hosted marketplace
- NOT AGPL (kills enterprise adoption)
- NOT full MIT (learning system IP exposed)

**Monetization paths (ranked):**
1. Pro CLI/Desktop License ($29-49/mo) -- auto-mode scheduling, advanced analytics, multi-repo
2. Pattern Marketplace -- community-contributed pattern libraries
3. Enterprise Self-Hosted ($499/mo) -- LDAP/SAML, team collaboration, audit trails
4. Agent-as-a-Service API -- "Describe a feature, get a PR"

---

# 4. Frontend & UX

*By: frontend-analyst (Opus model)*

## 4.1 Frontend Architecture Score: 7.5/10

Well-structured with modern tooling (React 19, TanStack Router, Zustand, Tailwind 4, oRPC). Clean component organization, proper state slicing, solid WebSocket integration. Weaknesses: no tests, duplicated state patterns, limited accessibility, UX flows functional but not polished.

## 4.2 Component Quality Assessment

### HIGH Quality
- **Kanban Board** -- @dnd-kit with PointerSensor + KeyboardSensor, clean DragOverlay, state transition validation
- **WebSocket Infrastructure** -- Robust singleton with exponential backoff (1s->30s), clean pub/sub
- **Agent Stream Hook** -- Well-structured stream state management, handles text/tool_use/tool_result
- **Theme System** -- 12 themes in oklch color space, clean CSS custom property mechanism
- **Error Boundary** -- Class component with expandable details and recovery options

### MEDIUM Quality
- **Feature Detail Panel** -- Functional but IIFE pattern is awkward, raw status text
- **Agent Chat** -- Clean layout but hardcoded `projectId: "default"`, no session naming
- **Auto-Mode Dashboard** -- Comprehensive but config doesn't sync from server

### LOW Quality
- **Command Palette** -- Custom modal instead of shadcn Dialog, limited to navigation
- **Login Flow** -- Minimal, no password recovery or social auth

## 4.3 The Identity Crisis

**The codebase is 63% primary-interface code, 25% monitoring, 12% shared.**

### Primary Interface Components (~1,400 lines)
Kanban board (435L), Feature detail page (282L), Feature detail panel (369L), Start execution dialog (214L), Feature import (196L), Spec page (256L)

### Monitoring Components (~550 lines)
Auto-mode dashboard (212L), Event feed (111L), Feature queue (122L), Activity page (59L), Activity feed (52L)

**The Kanban board is the most developed feature, but it solves the wrong problem for an autonomous tool.** If NOMOS is autonomous, users shouldn't need to manually drag features between columns or manually configure model/thinking/planning per feature.

**The auto-mode dashboard -- the component that represents the autonomous workflow -- is tucked inside Settings > Dashboard tab.** This is exactly backwards.

## 4.4 Design System

### Strengths
- 13 shadcn/ui primitives, Tailwind 4 with CSS custom properties
- oklch color space throughout, 12 theme variants
- Dark-first design (appropriate for developers)

### Weaknesses
- No light mode for custom themes
- No Storybook or component documentation
- No design tokens beyond colors
- No brand identity (default favicon, no logo)
- Missing components: Tooltip, Popover, Tabs, Progress, Slider, Switch, Avatar, Breadcrumb, Alert, Table

## 4.5 Real-time Experience

### Strengths
- Single event channel with type-based routing
- Reconnection with exponential backoff
- Connection status indicator with disconnection banner
- Clean `useEventSubscription` hook

### Issues
- No message queuing (lost on disconnect)
- No heartbeat/ping mechanism
- No HTTP polling fallback
- Event backpressure caps at 200 but no throttling

## 4.6 Accessibility Audit

### Good
- Keyboard shortcuts with vim-style navigation
- Cmd+K command palette
- DnD kit has KeyboardSensor
- Form inputs with proper labels

### Issues
- No skip-to-content link
- Color-only status indicators (no text alternatives)
- No aria-live regions for streaming content
- Kanban columns lack proper ARIA semantics
- No keyboard shortcut help dialog

## 4.7 Missing Features (Critical UX Gaps)

1. **No real-time progress visualization per feature** -- spinner only, no percentage/progress bar
2. **No multi-feature monitoring view** -- must switch between sessions one at a time
3. **No git integration UI** -- no branch viewer, PR status, commit history
4. **No code review/approval workflow UI** -- `waiting_approval` state has no review interface
5. **No file/code explorer** -- can't see what files agent changed
6. **No onboarding wizard** -- blank dashboard, no guidance
7. **No cost tracking** -- no token/API cost visibility
8. **No dependency graph visualization** -- features have deps but no visual DAG

## 4.8 If Dashboard-First: What to Cut

### KEEP (monitoring value)
Auto-Mode Dashboard (promote to homepage), Activity Feed, Connection Status, Feature Queue, Event Feed, Agent Output Viewer (read-only), Dashboard stats, Notification Bell

### SIMPLIFY (read-only)
Kanban Board (remove DnD, bulk ops, create dialog), Feature Detail Panel (remove editing), Agent Chat (remove input, keep output viewer)

### REMOVE (no monitoring value)
Feature Creation Dialog, Feature Import Page, Spec Management Page, Feature Edit Page, Start/Stop Execution Dialogs, Terminal page (xterm.js), Tauri desktop wrapper

**Impact:** ~2,000 lines of component code removed, 6 npm dependencies eliminated (@dnd-kit x3, @xterm x3)

## 4.9 Intent-First Feature Creation UX Design

### The 4-Step Flow

**Step 1: Intent Box** -- Single large textarea replacing all feature creation UI
```
+------------------------------------------------------------------+
|  What do you want to build?                                       |
|                                                                    |
|  "Add a settings page where users can change their email,         |
|   password, and notification preferences."                         |
|                                                                    |
|  [Generate Plan]                              [Advanced Options v] |
+------------------------------------------------------------------+
```

**Step 2: AI Decomposition Preview** -- Editable feature plan with dependency tree
```
Based on your intent, here's the plan:

Feature 1: Settings Page Layout & Navigation          [S] [Edit]
  AC: Settings page renders with sidebar navigation
  AC: Tab switching works between sections
  Deps: none

Feature 2: Email Change with Verification             [M] [Edit]
  AC: User can update email address
  AC: Verification email sent on change
  Deps: Feature 1

[Modify Intent]  [Edit Features]  [Start All]  [Start Sequential]
```

**Step 3: Execution Monitor** -- Live progress bars with embedded agent output
```
Intent: "Add settings page..."
Progress: 2/4 features completed                    [Stop All]

[===== Feature 1: Complete =====]  2m 34s  [View Diff] [PR #42]
[===== Feature 2: EXECUTE ======]  1m 12s  [Watch]     [---]
[---- Feature 3: Waiting -------]  --      [---]       [---]
```

**Step 4: Review & Ship** -- Consolidated diffs, PR links, merge controls
```
Intent Complete: 4/4 features verified              [Ship All]
Summary: + 6 new files, ~ 3 modified, + 847 lines

[Review All Diffs]  [Run Tests]  [Merge All]  [Merge Selected]
```

These 4 components replace 6+ routes and 10+ components. Frontend gets simpler, product gets more powerful.

## 4.10 Top 10 UX Improvements

1. **Multi-Agent Activity Dashboard** -- unified view of all running agents
2. **Feature Progress Timeline** -- visual pipeline stepper on Kanban cards
3. **Git Integration Panel** -- branch, PR, commit, diff in feature detail
4. **Onboarding Flow** -- project creation wizard from dashboard
5. **Command Palette Enhancement** -- search features, quick-launch execution
6. **Polished Status Transitions** -- human-friendly labels, confirmation dialogs
7. **Agent Output Improvements** -- syntax highlighting, file tree, token counter
8. **Notification Enhancement** -- desktop notifications, sound alerts
9. **Responsive Mobile Layout** -- monitoring-focused mobile view
10. **Accessibility Overhaul** -- skip links, aria-live, keyboard help

---

# 5. Cross-Team Debate

## 5.1 Debate: QA Depth -- 2 Cycles vs 50

**competitive-analyst:** Auto-Claude's 50-iteration QA loop is a significant gap. NOMOS should increase to 5-10.

**product-analyst:** The 2-cycle limit prevents runaway API costs. It's a feature, not a bug.

**arch-analyst:** The skill pipeline actually has 5 total layers (3 Phase 3 iterations + 2 Phase 4 fix cycles). The app pipeline has zero. The risk is in the app, not the skill pipeline.

**Resolution:** Increase from 2 to **5 max fix cycles** with smart safeguards:
- Cycles 1-2: Standard review+fix
- Cycle 3: Extended review with full re-test
- Cycles 4-5: Targeted fix with failure history context
- >5: Fail and escalate
- Add: recurring issue detection (3x same -> escalate), iteration history, human feedback injection
- Cost: ~$3-9 additional per feature vs $10-20 wasted on failed features. ROI positive.

## 5.2 Debate: GUI-First vs CLI-First

**product-analyst:** CLI-first. Same model as GitHub Actions / Kubernetes.

**arch-analyst:** App monitors, skill executes. PipelineService becomes checkpoint reader.

**frontend-analyst:** Codebase is 63% primary-interface, but monitoring is where product value lies. The Kanban "solves the wrong problem for an autonomous tool."

**Resolution:** **CLI-first, web as monitoring dashboard, with intent-first as the single active input surface.** The Intent Box replaces all feature creation UI. Everything else is monitoring/review.

## 5.3 Debate: Desktop -- Kill or Keep?

**product-analyst:** Kill Tauri. Web app at localhost is sufficient.

**competitive-analyst:** ALL major competitors have desktop apps (Automaker=Electron, Auto-Claude=Electron, Codex=macOS).

**frontend-analyst:** Tauri adds "very little value currently" -- no native features used, CSP set to null.

**product-analyst (revised):** Ship web-only for v1.0 (early adopters are terminal-comfortable). Add Tauri wrapper at v1.5 (2-3 week project once web is polished). Don't bundle backend in desktop -- Tauri connects to local server.

**Resolution:** **Freeze Tauri, don't kill.** Keep in repo, no investment until v1.5. Desktop is table-stakes long-term but not the v1 bottleneck.

## 5.4 Debate: Claude-Only vs Multi-Provider

**competitive-analyst:** LOW priority -- Claude is best-in-class.

**product-analyst:** HIGH risk -- single vendor dependency.

**Resolution:** **Claude-only for v1.** The skill pipeline's strength is its agent specialization (haiku/opus/sonnet by role). Multi-provider would require re-tuning all agent prompts. Add `AgentProvider` interface as v2 goal for risk mitigation.

## 5.5 Debate: Database vs JSON Files

**competitive-analyst:** Automaker survives on JSON with 100+ endpoints.

**arch-analyst:** NOMOS has BOTH stores (SQLite + features.json) unsynchronized. Bi-directional sync is a bandaid.

**arch-analyst (revised):** DB wins. CLI should read from DB via REST API. JSON becomes a derived export.

**Resolution:** **DB = single source of truth.** Make `nomos.sh` read via REST API (elevate Task #14 to Phase 1). Generate features.json as read-only export for backward compatibility. Delete bi-directional sync from the plan.

## 5.6 Debate: Learning System as Moat

**competitive-analyst:** #1 differentiator, but Auto-Claude has Graphiti knowledge graph.

**product-analyst:** Strongest moat, but must be measurable to be defensible.

**competitive-analyst (detailed):** NOMOS metrics already show the flywheel working:
- F013 completed in 4 min (pattern reuse from F012)
- F018 completed in 5 min (pattern reuse from F017)
- 100% success rate across 24 features

**Resolution:** **Learning IS the moat, but only if made visible.** Surface improvement curves, quantify pattern reuse, publish NOMOS Score. File-based storage is fine for now -- simplicity and portability beat graph DB complexity.

## 5.7 Debate: Pipeline Complexity vs Vibe Kanban Simplicity

**competitive-analyst:** Vibe Kanban (9.4K stars) grows fastest with no quality gates, no learning, no spec pipeline.

**arch-analyst:** Not over-engineering -- the pipeline is the differentiator. But needs a "fast path."

**Resolution:** Add **pipeline profiles** (`pipelineProfile` field on features):
- **Vibe mode:** Skip to EXECUTE, no gates (Vibe Kanban speed when you want it)
- **Standard mode:** Current 6-phase pipeline (default)
- **Critical mode:** Standard + extra security audit + manual approval

This gives users Vibe Kanban speed for quick tasks and NOMOS quality for important ones.

---

# 6. Final Synthesis & Recommendations

## 6.1 Revised Roadmap

### Phase 0: Foundation Fixes (Week 1)
1. Fix security P0s (FS traversal, projectRoot validation, rate limiter)
2. Resolve dual pipeline: PipelineService -> checkpoint reader
3. Introduce ServiceRegistry (replace singleton anti-pattern)
4. Consolidate dual session creation paths

### Phase 1: Core Loop (Weeks 2-4)
5. Ship E2E: feature -> CLI pipeline -> checkpoint events -> web dashboard -> review
6. Promote auto-mode dashboard to homepage
7. Add pipeline phase visualization on Kanban cards
8. Add multi-agent monitoring view

### Phase 2: Intent-First (Weeks 5-6)
9. Build expansion agent (haiku-class, generates specs from natural language)
10. Build Intent Box UI (replaces feature creation forms)
11. Build Decomposition Preview (editable AI-generated feature plan)
12. Implement ART-001a in the constitution

### Phase 3: Ecosystem APIs (Weeks 7-9)
13. REST adapter for 4 critical routers (features, projects, learnings, state transitions)
14. API versioning (`/api/v1/`)
15. REST API authentication (API keys / Bearer tokens)
16. Webhook system (registry + event dispatcher with retry)
17. Increase max fix cycles from 2 to 5

### Phase 4: Polish & Differentiation (Weeks 10-12)
18. Success metric tracking and public NOMOS Score
19. E2E smoke tests for critical flows
20. Git integration panel in feature detail
21. Cost/token tracking per feature
22. Command palette enhancement

### Cut from v1
- n8n-specific templates (provide webhook docs instead)
- API client package (curl + REST is sufficient)
- Environment detection module (5 lines of bash)
- Bi-directional DB<->JSON sync (one-way export sufficient)
- Tauri native features (freeze investment)
- 212 backlog features (declare as v2 ideas)

## 6.2 Top 10 Actions (Prioritized)

| # | Action | Impact | Effort | Timeline |
|---|---|---|---|---|
| 1 | Fix security P0s (FS, projectRoot, rate limiter) | CRITICAL | Low | Week 1 |
| 2 | Resolve dual pipeline (PipelineService -> checkpoint reader) | CRITICAL | Medium | Week 1 |
| 3 | Ship E2E core loop (feature -> pipeline -> stream -> review) | CRITICAL | High | Weeks 2-4 |
| 4 | Promote auto-mode dashboard to homepage | HIGH | Low | Week 2 |
| 5 | Build intent-first flow (ART-001a + expansion agent + UI) | HIGH | Medium | Weeks 5-6 |
| 6 | REST API for 4 routers + auth + versioning | HIGH | Medium | Weeks 7-8 |
| 7 | Increase QA fix cycles from 2 to 5 | HIGH | Trivial | Week 1 |
| 8 | Add pipeline phase visualization on Kanban cards | MEDIUM | Low | Week 3 |
| 9 | Add success metric tracking (NOMOS Score) | MEDIUM | Low | Week 4 |
| 10 | Add E2E smoke tests for critical flows | MEDIUM | Medium | Week 4 |

## 6.3 The Moat Strategy

**"The autonomous coding platform that gets smarter with every feature it builds."**

| Moat | Action |
|---|---|
| **Learning system** | Make measurable: track improvement, publish NOMOS Score |
| **6-phase pipeline** | Converge app + skill pipelines, add pipeline profiles |
| **Ecosystem APIs** | REST + webhooks create integration surface with network effects |
| **Intent-first UX** | "Describe intent -> AI decomposes -> autonomous execution" |

The defensible combination: **Learning + Intent-first + Pipeline.** User describes intent, NOMOS decomposes using learned patterns, executes through battle-tested pipeline, captures new patterns. Flywheel that no competitor currently matches.

## 6.4 Key Debate Resolutions

| Debate | Resolution |
|---|---|
| GUI-first vs CLI-first? | **CLI-first, web as dashboard** |
| 285 features vs simplicity? | **Cut to 30 core** |
| 2 QA cycles vs 50? | **Increase to 5 with smart safeguards** |
| Desktop: kill or keep? | **Freeze, don't kill** |
| Claude-only vs multi-provider? | **Claude-only for v1, interface for v2** |
| Learning as moat? | **Yes, but make it measurable** |
| REST scope: 4 vs 16 routers? | **4 external + oRPC internal** |
| Constitution: amend or extend? | **Extend with ART-001a** |
| DB vs JSON files? | **DB = single source, JSON = derived export** |
| Pipeline complexity? | **Add vibe/standard/critical profiles** |

## 6.5 Licensing Recommendation

**Apache 2.0 Open Core:**
- Core (pipeline, CLI, dashboard, agents, quality gates): Apache 2.0
- Premium (curated pattern libraries, enterprise learning analytics, marketplace): Commercial
- Rationale: Maximizes adoption while protecting learning system IP. Enterprise-friendly unlike AGPL.

---

*Analysis performed by 4 specialized agents (architecture, competitive, product, frontend) with 3 rounds of cross-team debate. Total output: ~25,000 words of analysis across reports and debate responses.*
