# NOMOS AI - Setup Instructions

> Reference for continuing setup in a new session.

---

## Current State

- **Repo:** https://github.com/SDArundev/nomos-ai
- **Branch:** `main`
- **Commits:** 2 (initial + spec files)

### What's Done

- [x] New repo created and pushed to GitHub
- [x] `.nomos/schemas/` - JSON schemas (app_spec, feature)
- [x] `.nomos/inspiration/` - Automaker + NOMOS v3 reference docs
- [x] `.nomos/app_spec.json` - Project specification
- [x] `.nomos/features.json` - 120 features across 17 categories
- [x] `.claude/skills/` - NOMOS skill system (16 skills)
- [x] `.claude/agents/` - Subagent definitions (9 agents)

### What's NOT Done

- [ ] Project scaffold (apps, packages, configs)
- [ ] Dependencies installed
- [ ] Database migrations
- [ ] Any code implementation

---

## Next Step: Scaffold Project

Run this command in the project root:

```bash
bun create better-t-stack@latest . \
  --frontend tanstack-router \
  --backend hono \
  --runtime bun \
  --api orpc \
  --auth better-auth \
  --database sqlite \
  --orm drizzle \
  --addons biome husky ruler tauri turborepo ultracite \
  --examples none \
  --git \
  --install
```

**Note:** The `.` tells it to scaffold in the current directory. It should merge with existing files.

---

## After Scaffold

1. **Verify structure:**
   ```bash
   ls -la apps packages
   ```

2. **Install deps (if not done):**
   ```bash
   bun install
   ```

3. **Run dev:**
   ```bash
   bun dev
   ```

4. **Start building features:**
   ```bash
   /nomos -s          # Check status
   /nomos -a F025     # Start with shared types package
   ```

---

## Stack Reference

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Monorepo | Turborepo |
| Frontend | React 19 + TanStack Router + Zustand + Tailwind 4 |
| Backend | Hono + oRPC + Drizzle |
| Database | SQLite |
| Auth | better-auth |
| Desktop | Tauri |
| AI | Claude Agent SDK |
| Linting | Biome + Ultracite |

---

## Key Files

| File | Purpose |
|------|---------|
| `.nomos/app_spec.json` | Project specification |
| `.nomos/features.json` | Feature backlog (120 features) |
| `.nomos/schemas/*.json` | JSON schemas |
| `CLAUDE.md` | Project context for Claude |

---

## Phase 1 Features (Foundation)

Start with these in order:

1. **F025** - Shared types package
2. **F026** - Database schema and migrations
3. **F027** - API routes setup
4. **F028** - Health check endpoint
5. **F001** - Multi-project support
6. **F009** - Kanban board view
7. **F010** - Feature status transitions
8. **F012** - Feature CRUD operations

---

## Commands

```bash
/nomos -a F001     # Autonomous run on feature
/nomos -s          # Status overview
/nomos -v F001     # Verify feature
```

---

*Created: 2026-01-27*
