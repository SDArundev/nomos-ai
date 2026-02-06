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
│   ├── nomos/             # Core: feature implementation (7-step)
│   ├── nomos-verify/      # Verification & analysis (5-step)
│   ├── nomos-refactor/    # Safe refactoring (9-step)
│   └── nomos-improve/     # System self-improvement (5-step)
└── agents/                # 14 shared agent definitions
```

---

## NOMOS Ecosystem

| Command | Purpose |
|---------|---------|
| `/nomos -s` | Session dashboard — run at start of session |
| `/nomos F031` | Implement feature (7-step pipeline) |
| `/nomos -a -t -pr F031` | Full auto: implement + test + PR |
| `/nomos verify F031` | Verify feature (5-step pipeline) |
| `/nomos verify --audit` | Full codebase health audit |
| `/nomos refactor -t rename X Y` | Safe codebase refactoring (9-step) |
| `/nomos improve` | NOMOS system self-improvement |
| `nomos.sh ingest [--dry-run]` | Ingest verification findings into features |

---

## State Machine

```
backlog → pending → in_progress → waiting_approval → verified
                        ↓                                ↑
                      failed ──── retry ─────────────────┘
```

States: `backlog` (not scheduled) | `pending` (ready) | `in_progress` | `waiting_approval` | `verified` (terminal) | `failed` (with reason, retryable)

---

## Workflow Steps (7-step pipeline)

```
00-init → 01-context → 02-plan → 03-execute → 04-verify → 05-merge → 06-finish
          (3 agents)             (loop x3)    (3 tracks)             (2 tracks)
```

---

*NOMOS AI v2.0*
