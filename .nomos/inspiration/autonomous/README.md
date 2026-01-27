# Automaker Reference Documentation

> Comprehensive documentation of Automaker's architecture for building autonomous AI development systems.

**Source:** [github.com/AutoMaker-Org/automaker](https://github.com/AutoMaker-Org/automaker)

---

## Overview

Automaker is an autonomous AI development studio that transforms software development by enabling developers to describe features on a Kanban board and watch AI agents implement them automatically.

### Core Philosophy

```
"Stop typing code. Start directing AI agents."
```

Developers become **architects** directing AI agents rather than manual coders. The platform leverages the Claude Agent SDK to give AI agents full codebase access within isolated git worktrees.

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Frontend | React 19 + TanStack + Zustand + Tailwind CSS 4 |
| Backend | Express 5 + Node.js 22+ |
| Agent SDK | @anthropic-ai/claude-agent-sdk v0.1.76 |
| Themes | 50+ (20 dark, 20 light, 10+ specialty) |
| API Endpoints | 100+ across 29 route modules |
| Services | 18 service classes (~171KB business logic) |
| Shared Libraries | 7 packages |

---

## Documentation Index

### Architecture & Implementation

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture and codebase structure |
| [agent-sdk-integration.md](./agent-sdk-integration.md) | Claude Agent SDK implementation patterns |
| [frontend-ui.md](./frontend-ui.md) | UI/Frontend architecture and components |
| [backend-api.md](./backend-api.md) | Backend services and API endpoints |
| [data-models.md](./data-models.md) | Data structures and schemas |
| [security.md](./security.md) | Security architecture and patterns |

### Features & Workflows

| Document | Description |
|----------|-------------|
| [features-catalog.md](./features-catalog.md) | Complete feature inventory by category |
| [workflow-patterns.md](./workflow-patterns.md) | Automation and pipeline patterns |
| [multi-agent-patterns.md](./multi-agent-patterns.md) | Multi-agent coordination strategies |
| [prompts-library.md](./prompts-library.md) | Prompt engineering patterns |

### Operations & Deployment

| Document | Description |
|----------|-------------|
| [docker.md](./docker.md) | Docker setup, compose, and container patterns |
| [environment-variables.md](./environment-variables.md) | Complete .env reference for all environments |
| [deployment.md](./deployment.md) | Production deployment, CI/CD, and scaling |
| [configuration.md](./configuration.md) | All settings with defaults and descriptions |

### User Guides

| Document | Description |
|----------|-------------|
| [installation.md](./installation.md) | Step-by-step setup and prerequisites |
| [usage.md](./usage.md) | CLI commands, keyboard shortcuts, workflows |
| [testing.md](./testing.md) | E2E, unit testing, and mock mode setup |
| [troubleshooting.md](./troubleshooting.md) | Common issues and solutions |
| [migration.md](./migration.md) | Version upgrade paths and breaking changes |

---

## Core Workflow

```
1. ADD FEATURES      → Describe with text, images, screenshots
        ↓
2. MOVE TO PROGRESS  → System assigns AI agent automatically
        ↓
3. WATCH IT BUILD    → Real-time streaming of agent activity
        ↓
4. REVIEW & VERIFY   → Examine changes, run tests
        ↓
5. SHIP FASTER       → Complete applications in days, not weeks
```

---

## Key Differentiators

### 1. Git Worktree Isolation
Each feature executes in an isolated git worktree, protecting the main branch from experimental changes.

### 2. Multi-Model Support
Supports Claude (Opus/Sonnet/Haiku), Codex, Cursor, and OpenCode providers with phase-based model selection.

### 3. Extended Thinking
Configurable thinking budgets from 1K to 32K tokens for complex reasoning tasks.

### 4. Planning Levels
Four planning modes (skip, lite, spec, full) with optional human approval workflow.

### 5. Real-Time Streaming
WebSocket-based streaming of agent activity, tool usage, and terminal output.

---

## Quick Reference

### Technology Stack

**Frontend:**
- React 19, Vite 7, Electron 39
- TanStack Router, Zustand
- Tailwind CSS 4, Radix UI
- dnd-kit, xterm.js, CodeMirror

**Backend:**
- Node.js 22+, Express 5
- Claude Agent SDK
- node-pty for terminals
- WebSocket for streaming

**Shared:**
- TypeScript 5.9
- Vitest, Playwright
- ESLint 9, Prettier 3

---

## Implementation Priority for NOMOS

### Phase 1: Foundation
1. Agent SDK integration pattern
2. Provider abstraction layer
3. Git worktree isolation
4. Session management

### Phase 2: Automation
1. Auto-mode loop
2. Planning system
3. Pipeline execution
4. Failure recovery

### Phase 3: UI/UX
1. Real-time streaming
2. Terminal integration
3. Feature management
4. Progress visualization

---

*Reference documentation compiled from Automaker v0.13.0+*
