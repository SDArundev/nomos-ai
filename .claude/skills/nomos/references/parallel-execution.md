# Parallel Execution Reference

Architecture for parallel agent/track execution across NOMOS pipeline steps.

---

## Step 01: Context (3 parallel agents)

| Agent | Purpose | Always? |
|-------|---------|---------|
| load-learnings | Patterns, metrics, risk, code knowledge | Yes |
| explore-codebase | Find files, patterns, utilities | Yes |
| explore-docs | Library docs via Context7 MCP | If unfamiliar libs |

---

## Step 03: Execute-Verify Loop (max 3 iterations)

| Agent | Purpose | Mode |
|-------|---------|------|
| code-writer | Implement plan or fix QA issues | INITIAL_IMPLEMENTATION / FIX_ISSUES |
| qa-reviewer | Review changes against plan/ACs (read-only) | Review only |

**Loop:** Code Writer -> QA Reviewer -> PASS? done : next iteration. Max 3 iterations, then escalate.

---

## Step 04: Verify (3 parallel tracks)

| Track | Purpose | Server needed? |
|-------|---------|----------------|
| A: Static | typecheck + lint + unit tests | No |
| B: Runtime | start servers ONCE -> smoke -> QA -> stop | Yes |
| C: Review | security + quality + coverage agents | No |

**Gate:** ALL tracks must pass. Failed tracks use classify->fix->re-verify loop (up to 5 cycles). Track C uses 3-phase structure: read-only review -> conditional fix -> conditional re-review.

---

## Step 06: Finish (2 parallel tracks)

| Track | Purpose | Always? |
|-------|---------|---------|
| A: Learnings | metrics, patterns, retrospective | Yes |
| B: Ship | push + create PR | If -pr flag |

---

## Rules

- Always launch parallel agents/tracks in a SINGLE message
- Never start servers except in Track B of step-04
- Servers started ONCE and stopped within the same track
- Failed tracks retried individually, not all tracks

---

## Appendix: Parallel Features Design (--parallel N)

**Status:** Design only -- not yet implemented.

**Concept:** Run N features simultaneously, each in its own worktree with unique ports.

```
/nomos -n 3        # Run next 3 available features in parallel
/nomos -n 2 -a     # Run 2 features autonomously in parallel
```

**Architecture:**
1. Orchestrator selects N features (using `state next` N times)
2. Each feature gets its own worktree + unique ports (already supported)
3. Features run the full pipeline independently
4. Learning extraction happens AFTER ALL features complete (not per-feature)
5. Orchestrator tracks progress and reports aggregate status

**Port allocation:** Already handled -- each feature gets `base + (feature_num * 10)`.

**Merge order:** Features merge in dependency order. If F002 depends on F001, F001 merges first.

**Learning aggregation:** Patterns from all N features collected, then deduplicated and scored together.

**Limitations:**
- Each feature runs in a separate Claude Code session (not parallel within one session)
- Database conflicts possible if features modify same tables
- Max N = 4 (practical limit for port ranges and system resources)
