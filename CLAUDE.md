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
| **Database** | PostgreSQL |
| **Auth** | better-auth |
| **Desktop** | Tauri |
| **AI** | Claude Agent SDK |
| **Validation** | Zod |
| **Linting** | Biome + Ultracite |

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
│   ├── nomos/             # Core: feature implementation (v4 6-phase pipeline)
│   ├── nomos-verify/      # Verification & analysis (5-step)
│   ├── nomos-refactor/    # Safe refactoring (9-step)
│   ├── nomos-improve/     # System self-improvement (5-step)
│   ├── nomos-swarm/       # Multi-agent collaborative sessions (4-phase)
│   └── nomos-runner/      # Headless Docker runner for parallel features
└── agents/                # 11 active agents (+ 5 deprecated v3 agents)
```

---

## NOMOS Ecosystem

| Command | Purpose |
|---------|---------|
| `/nomos -s` | Session dashboard — run at start of session |
| `/nomos F031` | Implement feature (v4 6-phase pipeline) |
| `/nomos -a -t -m F031` | Full auto: implement + test + merge |
| `/nomos verify F031` | Verify feature (5-step pipeline) |
| `/nomos verify --audit` | Full codebase health audit |
| `/nomos refactor -t rename X Y` | Safe codebase refactoring (9-step) |
| `/nomos improve` | NOMOS system self-improvement |
| `/nomos swarm audit` | Multi-agent collaborative feature audit |
| `/nomos swarm fix` | Execute remediation for audit findings |
| `/nomos swarm research F045` | Deep research before implementing |
| `/nomos swarm discuss "topic"` | Multi-perspective architecture debate |
| `/nomos swarm learn` | Learning system audit and improvement |
| `/runner --auto 3` | Run 3 features in parallel Docker containers |
| `/runner F276 F277` | Run specific features in Docker containers |
| `/runner --status` | Show running/stopped containers |
| `nomos.sh ingest [--dry-run]` | Ingest verification findings into features |
| `nomos.sh tmux <action>` | tmux session management |

---

## State Machine

```
backlog → pending → in_progress → waiting_approval → verified
                        ↓                                ↑
                      failed ──── retry ─────────────────┘
```

States: `backlog` (not scheduled) | `pending` (ready) | `in_progress` | `waiting_approval` | `verified` (terminal) | `failed` (with reason, retryable)

---

## Pipeline (v4 — 6 phases with JSON checkpoints)

```
Phase 0: ROUTE       → sub-command dispatch
Phase 1: UNDERSTAND  → init + scout (Task, haiku)           → cp-01.json → CLEAR
Phase 2: PLAN        → architect (Task, opus)                → cp-02.json → CLEAR
Phase 3: EXECUTE     → code-writer + qa-reviewer loop        → cp-03.json → CLEAR
Phase 4: REVIEW      → Gate A (bash) + Gate B (2 Tasks) + Gate C (Task)
                                                             → cp-04.json → CLEAR
Phase 5: SHIP        → git ops, PR, no agents               → cp-05.json → CLEAR
Phase 6: LEARN       → historian (Task, haiku, conditional)  → cp-06.json → DONE
```

**Context clearing:** Each phase reads ONLY the previous checkpoint JSON. Agents get fresh context windows via Task tool.

---

*NOMOS AI v4.0*
