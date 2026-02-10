# NOMOS AI Setup Guide

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Bun | 1.3+ | `bun --version` |
| Git | 2.30+ | `git --version` |
| Node.js | 22+ | `node --version` |
| Docker | 24+ | `docker --version` |

---

## New Session Setup

### 1. Verify System State

```bash
# Check NOMOS status
/nomos -s
```

This shows:
- Feature counts by status (backlog, in_progress, verified)
- Phase progress
- Any pending work

### 2. Start or Resume Feature

**New Feature:**
```bash
/nomos F001           # Interactive mode
/nomos -a F001        # Autonomous mode
```

**Resume Previous:**
```bash
/nomos -r F001        # Resume from saved state
```

### 3. Check Git Status

```bash
git status
git branch -a
```

---

## First Time Setup

### Step 1: Clone Repository

```bash
git clone <repo-url> nomos-ai
cd nomos-ai
```

### Step 2: Environment Setup

```bash
# Copy environment variables
cp .env.example .env

# Start database and cache
docker compose up -d postgres redis
```

### Step 3: Verify NOMOS System

```bash
# Check all components present
ls -la .nomos/
ls -la .claude/skills/nomos/
ls -la .claude/agents/
```

### Step 4: Start Foundation (F001)

```bash
# This scaffolds the entire monorepo
/nomos F001
```

F001 creates:
- Turborepo configuration
- App workspaces (web, server, desktop)
- Package workspaces (types, db, utils)
- TypeScript project references
- Development scripts

---

## Project Structure After F001

```
nomos-ai/
├── turbo.json           # Turborepo config
├── package.json         # Root workspace
├── apps/
│   ├── web/             # React frontend
│   ├── server/          # Hono backend
│   └── desktop/         # Tauri app
├── packages/
│   ├── types/           # @nomos/types
│   ├── db/              # @nomos/db
│   └── utils/           # @nomos/utils
└── ...
```

---

## Development Commands (After Scaffold)

```bash
# Start all apps
bun run dev

# Build all
bun run build

# Type check
bun run check-types

# Lint/format
bun run check

# Run tests
bun run test
```

---

## NOMOS Workflow

### State Machine

```
backlog → in_progress → waiting_approval → verified
```

### Typical Flow

1. `/nomos -a F001` - Start feature in auto mode
2. NOMOS creates worktree at `.nomos/worktrees/F001/`
3. Steps execute: init → context → analyze → plan → execute
4. Validation runs: smoke → validate → qa → review
5. Merge to main with `--no-ff`
6. Learn patterns, create PR if `-pr` flag

### Output Location

All outputs saved to `.nomos/output/{feature_id}/`:
- `00-context.md` - Configuration
- `02-analyze.md` - Analysis findings
- `03-plan.md` - Implementation plan
- `06-review.md` - Review results
- etc.

---

## Troubleshooting

### Feature Stuck in `in_progress`

```bash
# Check what step it's on
cat .nomos/output/F001/00-context.md

# Resume from that point
/nomos -r F001
```

### Worktree Issues

```bash
# List worktrees
git worktree list

# Clean up orphaned worktree
git worktree remove .nomos/worktrees/F001 --force
```

### Reset Feature State

Edit `.nomos/features.json`:
```json
{
  "id": "F001",
  "status": "backlog",  // Reset to backlog
  "passes": false
}
```

---

## Verification

After implementing features, verify they work:

```bash
# Quick smoke test
/verify -q F001

# Full verification
/verify F001

# Deep verification (includes security)
/verify -d F001

# Regression test all verified features
/verify -s verified
```

---

## Git Workflow

### During NOMOS (steps 00-10)
Use NOMOS git operations only (automatic).

### Outside NOMOS
```bash
/git-commit           # Quick commit + push
/git-create-pr        # Create PR
/git-fix-pr-comments  # Fix review feedback
/git-merge <branch>   # Smart merge
```

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Validation Report | `.nomos/docs/VALIDATION_REPORT.md` | System validation |
| Architecture | `.nomos/docs/SYSTEM_ARCHITECTURE.md` | Full architecture |
| Git Guide | `.nomos/docs/GIT_WORKFLOW_GUIDE.md` | Git operations |
| App Spec | `.nomos/app_spec.json` | Project specification |
| Features | `.nomos/features.json` | Feature backlog |

---

*Ready to build? Run `/nomos F001` to start.*
