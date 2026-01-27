# NOMOS v3 - Reference Documentation

> Comprehensive documentation for building NOMOS v3, inspired by Automaker patterns adapted for NOMOS's technology stack.

**Inspiration Source:** [Automaker](https://github.com/AutoMaker-Org/automaker)

---

## Overview

NOMOS v3 is an autonomous AI development framework that transforms software development by enabling developers to describe features on a Kanban board and watch AI agents implement them automatically.

### Core Philosophy

```
"Stop typing code. Start directing AI agents."
```

Developers become **architects** directing AI agents rather than manual coders. The platform leverages the Claude Agent SDK to give AI agents full codebase access within isolated git worktrees.

---

## Technology Stack Comparison

| Component | Automaker | NOMOS v3 |
|-----------|-----------|----------|
| **Runtime** | Node.js 22 | Bun 1.3+ |
| **Backend Framework** | Express 5 | Hono |
| **Frontend Framework** | React 19 | React 19 |
| **State Management** | Zustand | Zustand |
| **Router** | TanStack Router | TanStack Router |
| **Data Fetching** | React Query | TanStack Query |
| **Build Tool** | Vite 7 | Vite 6 |
| **Database** | File-based JSON | SQLite + Drizzle ORM |
| **Styling** | Tailwind CSS 4 | Tailwind CSS 4 |
| **UI Components** | Radix UI | shadcn + Radix UI |
| **RPC** | REST + WebSocket | tRPC + WebSocket |
| **Monorepo** | Turborepo | Turborepo |
| **Linting** | ESLint + Prettier | Biome |
| **Testing** | Vitest + Playwright | Vitest + Playwright |
| **AI SDK** | Claude Agent SDK | Claude Agent SDK |

---

## Key Statistics

| Metric | Target |
|--------|--------|
| Frontend | React 19 + TanStack + Zustand + Tailwind CSS 4 |
| Backend | Hono + Bun 1.3+ |
| Agent SDK | @anthropic-ai/claude-agent-sdk |
| Database | SQLite + Drizzle ORM |
| API Endpoints | ~50 across tRPC routers |
| Services | 12+ service classes |
| Shared Packages | 5 (types, api, db, env, config) |

---

## Documentation Index

### Architecture & Implementation

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture and codebase structure |
| [agent-sdk-integration.md](./agent-sdk-integration.md) | Claude Agent SDK implementation patterns |
| [frontend-ui.md](./frontend-ui.md) | UI/Frontend architecture and components |
| [backend-api.md](./backend-api.md) | Backend services and API endpoints |
| [data-models.md](./data-models.md) | Data structures and Zod schemas |
| [security.md](./security.md) | Security architecture and patterns |

### Features & Workflows

| Document | Description |
|----------|-------------|
| [workflow-patterns.md](./workflow-patterns.md) | Automation and pipeline patterns |
| [multi-agent-patterns.md](./multi-agent-patterns.md) | Multi-agent coordination strategies |
| [prompts-library.md](./prompts-library.md) | Prompt engineering patterns |

### Operations & Deployment

| Document | Description |
|----------|-------------|
| [docker.md](./docker.md) | Docker setup, compose, and container isolation |
| [environment-variables.md](./environment-variables.md) | Complete .env reference |

### Specifications

| Document | Description |
|----------|-------------|
| [app_spec_v3.json](./app_spec_v3.json) | Project specification |
| [features_v3.json](./features_v3.json) | Feature backlog with 150+ features |

---

## Core Workflow

```
1. ADD FEATURES      -> Describe with text, images, screenshots
        |
2. MOVE TO PROGRESS  -> System assigns AI agent automatically
        |
3. WATCH IT BUILD    -> Real-time streaming of agent activity
        |
4. REVIEW & VERIFY   -> Examine changes, run tests
        |
5. SHIP FASTER       -> Complete applications in days, not weeks
```

---

## Key Differentiators

### 1. Git Worktree Isolation
Each feature executes in an isolated git worktree, protecting the main branch from experimental changes.

### 2. Multi-Model Support
Supports Claude (Opus/Sonnet/Haiku) with phase-based model selection.

### 3. Extended Thinking
Configurable thinking budgets: none -> medium (16K) -> deep (32K) -> ultra (64K)

### 4. Planning Levels
Four planning modes (skip, lite, spec, full) with optional human approval workflow.

### 5. Real-Time Streaming
WebSocket-based streaming of agent activity, tool usage, and terminal output.

### 6. SQLite + Drizzle ORM
Type-safe database operations with migrations, unlike Automaker's file-based storage.

### 7. Container Isolation (ADR-001)
Agents execute in isolated Docker containers with resource limits and network restrictions.

---

## Implementation Priority

### Phase 1: Foundation & Security
1. **F163**: Feature ID Validation
2. **F096**: Security Headers
3. **F098**: Structured Logging
4. **F164**: Authentication Middleware
5. **F165**: Authorization Layer

### Phase 2: Agent Foundation
1. **F061**: Claude Agent SDK Integration
2. **F085**: TypeScript Quality Gate
3. **F062**: Agent Execution Service
4. **F086-F091**: Quality Gate Chain
5. **F063**: Agent Concurrency

### Phase 3: Container Isolation (ADR-001)
1. **F173**: Agent Base Docker Image
2. **F174**: Docker Compose Orchestration
3. **F175**: Secure Directory Boundaries
4. **F176**: Agent Spawn Service API
5. **F177**: Agent Communication Protocol
6. **F178**: Agent Cleanup Service
7. **F179**: gVisor Integration (optional)
8. **F180**: Container Secret Management

### Phase 4: UI/UX Polish
1. Real-time agent streaming
2. Terminal integration
3. Git diff viewer
4. Theme system

---

## Quick Reference Commands

```bash
# Development
bun dev              # Start all services (Turbo)
bun dev:web          # Web only (port 3001)
bun dev:server       # Server only (port 3008)

# Database
bun db:push          # Push schema changes
bun db:studio        # Open Drizzle Studio
bun db:generate      # Generate migrations
bun db:migrate       # Run migrations

# Quality
bun check            # Biome lint + format
bun check-types      # TypeScript check
bun test             # Run tests
bun test:ci          # CI mode tests

# NOMOS
/nomos -a F017       # Autonomous run
/nomos -s            # Status
/verify F017         # Verify feature
```

---

## State Machine

```
backlog -> in_progress -> waiting_approval -> verified
```

---

## Project Structure

```
nomos/
+-- apps/
|   +-- web/                    # React + Vite frontend
|   |   +-- src/
|   |   |   +-- routes/         # TanStack Router files
|   |   |   +-- components/     # UI components (shadcn)
|   |   |   +-- stores/         # Zustand stores
|   |   |   +-- hooks/          # Custom React hooks
|   |   |   +-- lib/            # Utilities
|   |   |   +-- styles/         # Tailwind CSS
|   |   +-- vite.config.ts
|   |
|   +-- server/                 # Hono backend
|       +-- src/
|           +-- routes/         # Hono route handlers
|           +-- services/       # Business logic services
|           +-- providers/      # Claude provider abstraction
|           +-- lib/            # SDK options, security
|           +-- middleware/     # Auth, validation, CORS
|
+-- packages/                   # Shared packages (monorepo)
|   +-- types/                  # Zod schemas + TypeScript types
|   +-- api/                    # tRPC routers
|   +-- db/                     # Drizzle ORM + SQLite
|   +-- env/                    # Environment validation
|   +-- config/                 # Shared build configs
|
+-- docker/                     # Docker configurations
+-- .nomos/                     # NOMOS system
|   +-- features.json           # Feature backlog
|   +-- app_spec.json           # Project specification
|   +-- state.json              # Runtime state
|   +-- learning/               # Patterns, metrics
|   +-- output/{id}/            # Step outputs
|   +-- worktrees/{id}/         # Git worktrees
|
+-- docs/                       # Documentation
+-- test/                       # E2E Playwright tests
```

---

*NOMOS v3 Reference Documentation - Inspired by Automaker v0.13.0+*
