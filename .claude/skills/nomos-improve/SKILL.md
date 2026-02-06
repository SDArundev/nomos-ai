---
name: nomos-improve
description: >
  Structured improvement of the NOMOS autonomous development system.
  Use when asked to improve, fix, audit, update, optimize, or refactor any part of the NOMOS pipeline:
  steps, agents, templates, scripts, references, learning files, schemas, or the SKILL.md itself.
  Triggers: "/nomos improve", "nomos improve", "improve nomos", "update nomos", "fix nomos",
  "nomos pipeline", "nomos agents", "nomos steps", "nomos templates", "nomos scripts",
  "nomos learning", "audit nomos", "refactor nomos", "optimize nomos", "nomos system", "nomos quality".
---

# NOMOS Improver

Systematically improve NOMOS while maintaining cross-file consistency.

## Quick Start

```
"audit nomos agents"      # Audit specific component
"improve step-04-verify"  # Improve specific file
"audit entire nomos"      # Full system audit
```

## Pipeline

```
00-init → 01-audit → 02-plan → 03-execute → 04-validate
```

**FIRST ACTION:** Load `steps/step-00-init.md`

## Execution Rules

- Load one step at a time (progressive loading)
- Follow `next_step` directive at end of each step
- Always read before edit
- Consult `references/component-map.md` for dependency graph

**CRITICAL:** Every NOMOS change can cascade. Check impact table in step-02 before edits.

## Agents

This skill uses the orchestrator model directly (no subagent launches). All auditing, planning, execution, and validation happen in the main conversation. External agents referenced for context only:

| Agent | When |
|-------|------|
| `load-learnings` | Step 01 — optional learning context |
| `explore-codebase` | Step 01 — codebase exploration if needed |

## References

| File | When |
|------|------|
| `references/component-map.md` | Step 01 — file inventory + dependencies |
| `references/audit-checklist.md` | Step 01 — per-component checklists |
| `references/improvement-patterns.md` | Step 02 — proven improvement recipes |
