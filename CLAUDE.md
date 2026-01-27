# NOMOS AI - Project Context

> **N**avigation · **O**rchestration · **M**emory · **O**bservation · **S**hipping

Autonomous AI Development Studio - Watch AI agents implement features while you focus on what matters.

---

## Status: Fresh Start

**Repo:** `nomos-ai`
**State:** Ready for scaffold

---

## Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Monorepo** | Turborepo |
| **Frontend** | React 19 + TanStack Router + Zustand + Tailwind 4 |
| **Backend** | Hono + oRPC + Drizzle |
| **Database** | SQLite |
| **Auth** | better-auth |
| **Desktop** | Tauri |
| **AI** | Claude Agent SDK |
| **Validation** | Zod |
| **Linting** | Biome + Ultracite |

---

## Next Steps

1. Generate `app_spec.json` from Automaker reference
2. Generate `features.json` from Automaker catalog (158 features)
3. Scaffold: `bun create better-t-stack@latest`
4. Build features via NOMOS system

---

## Key Directories

```
.nomos/
├── schemas/           # JSON schemas (source of truth)
│   ├── app_spec.schema.json
│   └── feature.schema.json
├── inspiration/       # Reference documentation
│   ├── autonomous/    # Automaker reference (158 features)
│   └── nomos-v3/      # NOMOS v3 reference
├── app_spec.json      # Project specification
└── features.json      # Feature backlog

.claude/
├── skills/
│   └── nomos/         # NOMOS skill system
└── agents/            # Subagent definitions
```

---

## Usage

```bash
/nomos -a F001        # Autonomous feature run
/nomos -s             # Status overview
/nomos -v F001        # Verify feature
```

---

## State Machine

```
backlog → in_progress → waiting_approval → verified
```

---

## Workflow Steps

00-init → 01-context → 02-analyze → 03-plan → 04-execute → 05-validate → 06-review → 07-test → 08-merge → 09-learn → 10-ship

---

*NOMOS AI v1.0*
