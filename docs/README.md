# NOMOS AI Documentation

> Autonomous AI Development Studio

---

## Quick Start

```bash
# Start first feature (scaffolds the monorepo)
/nomos F001

# Full autonomous pipeline
/nomos -a -t -pr F001

# Check status
/nomos -s
```

---

## Documentation Index

### Project Documentation (`/docs/`)

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | This file - documentation index |
| [SETUP.md](./SETUP.md) | Project setup instructions |

### NOMOS System Documentation (`.nomos/docs/`)

| Document | Description |
|----------|-------------|
| [VALIDATION_REPORT.md](../.nomos/docs/VALIDATION_REPORT.md) | System validation and pre-flight checklist |
| [SYSTEM_ARCHITECTURE.md](../.nomos/docs/SYSTEM_ARCHITECTURE.md) | Complete architecture documentation |
| [GIT_WORKFLOW_GUIDE.md](../.nomos/docs/GIT_WORKFLOW_GUIDE.md) | Git workflow quick reference |

### NOMOS Specifications (`.nomos/`)

| File | Description |
|------|-------------|
| [app_spec.json](../.nomos/app_spec.json) | Application specification |
| [features.json](../.nomos/features.json) | Feature backlog (220 features) |

---

## Stack

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
| Validation | Zod |
| Linting | Biome + Ultracite |

---

## Project Structure (After Scaffold)

```
nomos-ai/
├── apps/
│   ├── web/              # React frontend
│   ├── server/           # Hono backend
│   └── desktop/          # Tauri desktop app
├── packages/
│   ├── types/            # Shared types
│   ├── db/               # Database (Drizzle + SQLite)
│   └── utils/            # Shared utilities
├── docs/                 # Project documentation
├── .nomos/               # NOMOS system
│   ├── docs/             # System documentation
│   ├── features.json     # Feature backlog
│   ├── app_spec.json     # App specification
│   ├── schemas/          # JSON schemas
│   ├── inspiration/      # Reference docs
│   ├── output/           # Feature outputs (created per feature)
│   ├── worktrees/        # Git worktrees (created per feature)
│   └── learning/         # Learned patterns (created after first merge)
├── .claude/              # Claude Code configuration
│   ├── skills/           # Skills (nomos, git-*, etc.)
│   └── agents/           # Agent definitions
└── CLAUDE.md             # Project memory
```

---

## Commands

### NOMOS Commands

```bash
/nomos F001           # Start feature F001
/nomos -a F001        # Autonomous mode
/nomos -t F001        # Enable tests
/nomos -pr F001       # Create PR at end
/nomos -a -t -pr F001 # Full pipeline
/nomos -r F001        # Resume feature
/nomos -p F001        # Plan only
/nomos -v F001        # Verify only
/nomos -l             # Learn from history
/nomos -s             # Status overview
```

### Git Commands

```bash
/git-commit           # Quick commit + push
/git-create-pr        # Create pull request
/git-fix-pr-comments  # Fix review feedback
/git-merge <branch>   # Smart merge
```

### Verification

```bash
/verify F001          # Verify single feature
/verify -s verified   # Regression test all verified
/verify -d F001       # Deep verification
```

---

## Feature Phases

| Phase | Features | Focus |
|-------|----------|-------|
| Phase-1 | 65 | Foundation (scaffold, types, database, auth) |
| Phase-2 | 75 | Agent Integration (AI, git, terminal) |
| Phase-3 | 45 | Auto-Mode (autonomous execution, learning) |
| Phase-4 | 35 | Desktop & Polish (Tauri, themes, notifications) |

---

## Getting Help

- View system status: `/nomos -s`
- Read system docs: `.nomos/docs/`
- Check feature details: `.nomos/features.json`
- Review app spec: `.nomos/app_spec.json`

---

*NOMOS AI - Watch AI agents implement features while you focus on what matters.*
