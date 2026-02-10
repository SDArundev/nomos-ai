# NOMOS Product Blueprint

> The single source of truth for building NOMOS as a self-sufficient product.
> Every session reads this. Every session updates STATE.md.
> **This directory is PORTABLE. Drop it into the fresh repo as-is.**

## What Is This?

This directory contains everything needed to rebuild NOMOS from scratch:
- **Specifications** — what to build (vision, architecture, plans)
- **Schemas** — data contracts (JSON Schema, language-agnostic)
- **Workflows** — step-by-step processes (onboarding, pipeline, lifecycle)
- **Prompts** — agent prompt templates (interpolated at runtime)
- **Templates** — generation rules (stack detection, CLAUDE.md, greenfield/brownfield)
- **Patterns** — transferable rules (error handling, concurrency, events)
- **Internal system** — CLI agents/skills for building the product
- **Environment** — Docker, CI/CD, env vars

**Important:** This contains INSTRUCTIONS, not code. Agents in the new repo write the code.

## How To Use

**Starting a session?** Read in order:
1. `STATE.md` — Where we are (update every session)
2. `VISION.md` — What we're building and why
3. `GREENFIELD-STRATEGY.md` — Boundaries, anti-patterns, what to carry forward
4. `REBUILD-PLAN.md` — Sprint plan with test gates

**Building a feature?** Read the relevant spec:
5. `ARCHITECTURE.md` — System design
6. `FRONTEND-DESIGN-BRIEF.md` — UI surfaces, components, interaction patterns
7. `AGENT-ENGINE.md` — SDK integration
8. `PIPELINE-ENGINE.md` — Pipeline design
9. `TEAM-ORCHESTRATOR.md` — Multi-agent coordination
10. `LEARNING-ENGINE.md` — Self-learning system design

**Implementing a schema?** Read:
8. `schemas/*.schema.json` — Data contracts (agent reads, generates Zod + Drizzle)

**Implementing a workflow?** Read:
9. `workflows/*.md` — Step-by-step process specs

**Writing agent integration?** Read:
10. `prompts/*.md` — Prompt templates with interpolation vars

**Setting up environment?** Read:
11. `environment/SETUP.md` — Step-by-step setup guide

## The Two Systems

```
INTERNAL NOMOS (how we build)          PRODUCT NOMOS (what we build)
─────────────────────────────          ─────────────────────────────
.claude/skills/*.md                    Server-side AgentEngine
.claude/agents/*.md                    Typed agent configs (from schemas)
Claude Code CLI + Task tool            Claude SDK direct calls
Filesystem checkpoints                 PostgreSQL JSONB checkpoints
IDE/CLI only                           Web UI + API
```

We use Internal NOMOS to build Product NOMOS. The features we implement
*through* the internal pipeline become the product that others use.

## Directory Map

```
blueprint/
│
├── README.md                    ← You are here
│
├── ─── SPECIFICATIONS ────────────────────────────────
├── VISION.md                    ← Product vision, two-brain solution
├── ARCHITECTURE.md              ← In-process system design
├── STATE.md                     ← Living tracker (UPDATE EVERY SESSION)
├── REBUILD-PLAN.md              ← 6 sprints with test gates
├── GREENFIELD-STRATEGY.md       ← Greenfield packaging, anti-patterns, moat
├── LEARNING-ENGINE.md           ← Self-learning system (extract/inject/feedback)
├── AGENT-ENGINE.md              ← Claude SDK integration design
├── PIPELINE-ENGINE.md           ← Server-side pipeline design
├── TEAM-ORCHESTRATOR.md         ← Multi-agent coordination
├── CURRENT-SYSTEM.md            ← Lessons from v4 (what to keep/skip)
├── AUTOMAKER-ANALYSIS.md        ← Competitive patterns
├── TEST-PROJECT.md              ← Blog+admin validation project
├── FRONTEND-DESIGN-BRIEF.md    ← UI surfaces, components, interaction patterns
│
├── ─── SCHEMAS (JSON Schema) ─────────────────────────
├── schemas/
│   ├── project.schema.json      ← Project + stack detection
│   ├── feature.schema.json      ← Feature spec + config (NOT execution)
│   ├── feature-execution.schema.json ← Pipeline run + phase checkpoints
│   ├── agent-config.schema.json ← Agent role/model/tools/constraints
│   ├── pipeline-config.schema.json  ← Data-driven pipeline definition
│   ├── tool-definition.schema.json  ← Tool registry + categories
│   ├── team-config.schema.json  ← Multi-agent team presets
│   └── learning-record.schema.json  ← Pattern/antipattern records
│
├── ─── WORKFLOWS ─────────────────────────────────────
├── workflows/
│   ├── feature-lifecycle.md     ← State machine + transitions
│   ├── pipeline-execution.md    ← Phase-by-phase execution flow
│   └── onboarding.md            ← Project creation (greenfield/brownfield)
│
├── ─── AGENT PROMPTS ─────────────────────────────────
├── prompts/
│   ├── scout.md                 ← Phase 1: context gathering
│   ├── architect.md             ← Phase 2: implementation planning
│   ├── code-writer.md           ← Phase 3: implementation
│   ├── code-reviewer.md         ← Phase 3+4: quality review
│   └── historian.md             ← Phase 6: learning extraction
│
├── ─── GENERATION TEMPLATES ──────────────────────────
├── templates/
│   ├── stack-detection-rules.md ← How to detect project tech stack
│   ├── claude-md-template.md    ← CLAUDE.md generation template
│   └── greenfield-vs-brownfield.md ← Behavior adaptation by project type
│
├── ─── TRANSFERABLE PATTERNS ─────────────────────────
├── patterns/
│   ├── README.md                ← Index + core principles
│   ├── state-machine.md         ← Status transitions + locking
│   ├── checkpoint-system.md     ← Inter-phase JSON communication
│   ├── error-handling.md        ← Error classification + retry
│   ├── cost-tracking.md         ← Token/USD tracking + budgets
│   ├── concurrency.md           ← Auto-mode + parallel features
│   └── event-streaming.md       ← Pub/sub → WebSocket → UI
│
├── ─── INTERNAL NOMOS (CLI) ──────────────────────────
├── internal/
│   ├── README.md                ← How internal system works
│   ├── agents/
│   │   ├── scout.md             ← Context gatherer (haiku)
│   │   ├── architect.md         ← Planner (opus)
│   │   ├── code-writer.md       ← Implementer (sonnet)
│   │   ├── code-reviewer.md     ← Quality checker (sonnet)
│   │   └── historian.md         ← Learning extractor (haiku)
│   └── skills/
│       └── SKILL.md             ← 6-phase pipeline orchestrator
│
├── ─── ENVIRONMENT ───────────────────────────────────
└── environment/
    ├── SETUP.md                 ← Step-by-step setup (run ONCE)
    ├── docker-compose.yml       ← PostgreSQL + Redis services
    ├── ci-cd.md                 ← GitHub Actions requirements
    └── env-vars.md              ← All environment variables
```

## Living Documents

- `STATE.md` — **MUST be updated every session** with progress, blockers, next steps
- `REBUILD-PLAN.md` — Sprint checkboxes updated as items complete
- All other docs updated when architecture decisions change

## Session 1 Checklist

Before writing any product code:
1. [ ] Scaffold fresh project (`bunx create-better-t-stack`)
2. [ ] Copy `blueprint/` into new repo
3. [ ] Copy `blueprint/internal/` into `.claude/`
4. [ ] Set up Docker services (`environment/docker-compose.yml`)
5. [ ] Configure env vars (`environment/env-vars.md`)
6. [ ] Set up CI/CD (`environment/ci-cd.md`)
7. [ ] Run ALL validation checks (`environment/SETUP.md`)
8. [ ] Only then: start Sprint 1
