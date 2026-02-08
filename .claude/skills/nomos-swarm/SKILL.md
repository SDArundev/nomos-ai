---
name: nomos-swarm
description: >
  Multi-agent collaborative skill for NOMOS. Spawns agent teams that audit features,
  research topics, debate decisions, and improve the learning system through peer-to-peer
  collaboration. Uses Claude Code's agent teams (TeamCreate, SendMessage, Task with team_name).
  Triggers: "/nomos swarm", "swarm audit", "swarm research", "swarm discuss", "swarm learn".
---

# NOMOS Swarm

Multi-agent collaborative sessions using Claude Code's agent teams. Agents communicate via SendMessage, share task lists, and produce structured findings.

## Modes

| Mode | Purpose | Team Size | Key Value |
|------|---------|-----------|-----------|
| `audit` | Re-examine verified features, find real bugs | 3 agents | Fresh eyes on "verified but broken" features |
| `research` | Deep research before implementing complex features | 2 agents | Better context for architect in Phase 2 |
| `discuss` | Multi-perspective debate on architecture/priorities | 3 agents | Structured decision-making with tradeoffs |
| `learn` | Audit and improve the learning system itself | 2 agents | Better patterns/antipatterns for future work |

## Quick Start

```bash
/nomos swarm audit                        # Audit all verified features
/nomos swarm audit F025-F040              # Audit specific range
/nomos swarm audit -q                     # Quick: 2 agents (skip tester)
/nomos swarm audit -a -f                  # Auto-apply + create fix tasks
/nomos swarm research F045                # Research before implementing
/nomos swarm discuss "State machine extraction?"
/nomos swarm learn                        # Full learning system audit
/nomos swarm learn --prune                # Audit + remove stale entries
```

## Pipeline (4 phases)

```
Phase 0: ROUTE      → Parse mode + flags, create output dir
Phase 1: ASSEMBLE   → TeamCreate, spawn agents, create tasks
Phase 2: EXECUTE    → Mode-specific orchestration
Phase 3: REPORT     → Synthesize findings into structured output
Phase 4: CLEANUP    → Shutdown team, apply actions, TeamDelete
```

**FIRST ACTION:** Load `steps/phase-00-router.md`

## Output Structure

```
.nomos/swarm/{mode}-{timestamp}/
├── session.json      # Mode, scope, flags, team config
├── findings.json     # Categorized issues with evidence
├── report.md         # Human-readable summary
└── actions.json      # Recommended state transitions + learning updates
```

## Agents

All agents are **READ-ONLY** on source files. Only the lead applies changes in Phase 4.

| Mode | Agent | Model | Role |
|------|-------|-------|------|
| audit | Explorer | haiku | Maps implementation vs AC claims |
| audit | Skeptic | sonnet | Challenges findings, traces code paths |
| audit | Tester | sonnet | Exercises features via Playwright |
| research | Researcher | sonnet | Deep codebase + pattern analysis |
| research | Librarian | haiku | External docs via Context7, prior art |
| discuss | Advocate | sonnet | Argues FOR the primary position |
| discuss | Critic | sonnet | Argues AGAINST, proposes alternatives |
| discuss | Pragmatist | haiku | Evaluates feasibility against codebase |
| learn | Auditor | haiku | Reads learning files, finds issues |
| learn | Analyst | sonnet | Cross-references learning vs codebase |

## References

| File | When |
|------|------|
| `references/team-compositions.md` | Agent roles, models, prompts per mode |
| `references/agent-prompts.md` | Prompt templates for each role |
| `references/output-schemas.md` | JSON schemas for findings, actions, reports |
| `references/integration-guide.md` | How findings flow back into NOMOS |
