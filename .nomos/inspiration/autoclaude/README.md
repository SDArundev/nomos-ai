# Auto-Claude Reference Documentation

> Comprehensive documentation of Auto-Claude's architecture for building autonomous multi-agent coding systems.

**Source:** [github.com/AndyMik90/Auto-Claude](https://github.com/AndyMik90/Auto-Claude)

---

## Overview

Auto-Claude is an autonomous multi-agent coding framework that plans, builds, and validates software autonomously. Users describe a goal and AI agents handle planning, implementation, and QA validation. All work happens in isolated git worktrees so the main branch stays safe.

### Core Philosophy

```
"Describe your goal. Agents handle planning, implementation, and validation."
```

Users create tasks via a Kanban board or CLI. A multi-agent pipeline (Planner, Coder, QA Reviewer, QA Fixer) autonomously builds features end-to-end with self-validating quality assurance loops.

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Stars | 10,700+ |
| Forks | 1,500+ |
| Version | v2.7.5 (stable) |
| License | AGPL-3.0 |
| Backend | Python 3.12+ (Claude Agent SDK) |
| Frontend | Electron 40 + React 19 + TypeScript 5.9 |
| Agent SDK | claude-agent-sdk >= 0.1.19 |
| Agent Terminals | Up to 12 parallel |
| Zustand Stores | 24+ |
| IPC Handler Modules | 40+ |
| Backend Python Modules | 400+ files |
| Frontend TS/TSX Files | 700+ files |
| Test Files | 100+ (pytest + Vitest + Playwright) |

---

## Documentation Index

### Architecture & Implementation

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture and codebase structure |
| [agent-sdk-integration.md](./agent-sdk-integration.md) | Claude Agent SDK Python integration patterns |
| [frontend-ui.md](./frontend-ui.md) | Electron + React UI architecture |
| [backend-agents.md](./backend-agents.md) | Python agent system (Planner, Coder, QA) |
| [data-models.md](./data-models.md) | Data structures, specs, and schemas |
| [security.md](./security.md) | Three-layer security architecture |

### Features & Workflows

| Document | Description |
|----------|-------------|
| [features-catalog.md](./features-catalog.md) | Complete feature inventory by category |
| [workflow-patterns.md](./workflow-patterns.md) | Autonomous pipeline and QA loop patterns |
| [multi-agent-patterns.md](./multi-agent-patterns.md) | Multi-agent coordination and merge strategies |
| [prompts-library.md](./prompts-library.md) | Agent prompt engineering patterns |
| [memory-system.md](./memory-system.md) | Graphiti knowledge graph memory |
| [merge-system.md](./merge-system.md) | Intent-aware semantic merge for parallel agents |

### Operations & Deployment

| Document | Description |
|----------|-------------|
| [deployment.md](./deployment.md) | Cross-platform packaging and CI/CD |
| [configuration.md](./configuration.md) | Settings, profiles, and environment |
| [testing.md](./testing.md) | Backend pytest, frontend Vitest, E2E Playwright |
| [integrations.md](./integrations.md) | GitHub, GitLab, Linear, Graphiti integrations |

---

## Core Workflow

```
1. CREATE TASK         -> Describe goal (text, images, screenshots)
        |
2. SPEC PIPELINE       -> AI assesses complexity, writes specification
        |
3. PLANNER AGENT       -> Creates subtask-based implementation plan
        |
4. CODER AGENT         -> Implements subtasks (can spawn parallel subagents)
        |
5. QA REVIEWER         -> Validates implementation against spec
        |
6. QA FIXER            -> Fixes issues found by reviewer
        |
7. QA LOOP             -> Repeat review/fix until approved (max 50 iterations)
        |
8. USER REVIEWS        -> Human reviews diff, merges to main
```

---

## Key Differentiators vs Automaker

### 1. Python Backend (vs TypeScript)
Auto-Claude's entire agent logic is Python-based, using `claude-agent-sdk` Python package directly. Automaker uses a TypeScript/Node.js backend with the JS SDK.

### 2. Spec-Driven Pipeline
Before coding begins, a multi-phase spec creation pipeline (discovery, requirements, spec writing, critique) produces a formal specification. Automaker uses simpler planning levels.

### 3. Self-Validating QA Loop
Built-in QA reviewer + QA fixer loop runs up to 50 iterations until the implementation passes validation. Automaker has pipeline steps but not a dedicated QA loop.

### 4. Intent-Aware Semantic Merge
Dedicated merge system with semantic analysis, auto-merger strategies, and AI conflict resolution for parallel agent work. Automaker relies on standard git merge.

### 5. Graphiti Knowledge Graph Memory
Uses Graphiti (graph-based semantic memory with LadybugDB) for cross-session knowledge retention. Automaker uses file-based memory only.

### 6. Multi-Account Profile Swapping
Multiple Claude accounts with automatic rate-limit-based switching. When one account hits limits, Auto-Claude automatically uses the next available.

### 7. Three-Layer Security Model
OS sandbox + filesystem restrictions + dynamic command allowlist based on detected project stack. Automaker uses path validation + env filtering.

---

## Technology Stack

**Backend (Python):**
- Python 3.12+
- claude-agent-sdk >= 0.1.19
- Graphiti (knowledge graph memory)
- LadybugDB (embedded graph database)
- Pydantic (structured output)
- Sentry (error tracking)

**Frontend (Electron + React):**
- Electron 40, electron-vite 5
- React 19, TypeScript 5.9
- Zustand 5 (24+ stores)
- Tailwind CSS 4, Radix UI
- xterm.js 6 (PTY terminal)
- Biome 2 (linting)
- Vitest 4, Playwright

**Cross-Platform:**
- macOS (DMG), Windows (NSIS), Linux (AppImage, DEB, Flatpak)
- Bundled Python runtime for desktop app
- Platform abstraction layer (paths, executables, shell detection)

---

## Implementation Priority for NOMOS

### Phase 1: Agent Pipeline
1. Python-to-TypeScript agent architecture translation
2. Spec creation pipeline (discovery -> requirements -> spec -> critique)
3. Planner agent (subtask-based implementation plans)
4. Coder agent with autonomous loop

### Phase 2: Quality Assurance
1. QA reviewer agent
2. QA fixer agent
3. Self-validating QA loop (review -> fix -> re-review)
4. Human feedback integration (QA_FIX_REQUEST.md)

### Phase 3: Advanced Systems
1. Intent-aware semantic merge for parallel agents
2. Graphiti-style memory system
3. Multi-profile credential management
4. Dynamic command allowlisting (security)

### Phase 4: Integrations
1. GitHub/GitLab issue import and PR review
2. Linear task sync
3. Ideation (codebase analysis for improvements)
4. Roadmap generation

---

*Reference documentation compiled from Auto-Claude v2.7.5*
