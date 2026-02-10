# NOMOS Deep Analysis Session — The Meta Problem

> Run this session IN PARALLEL with the bug-fix session.
> This is a READ-ONLY analysis — no code changes, only output.

---

## The Observation

Every session so far — 10 batches, 2 swarm analyses, bug fixes, cleanup, planning — was executed OUTSIDE of NOMOS's own workflow. We used raw Claude Code sessions with ad-hoc agent swarms.

Meanwhile, NOMOS has:
- A 6-phase pipeline (UNDERSTAND → PLAN → EXECUTE → REVIEW → SHIP → LEARN)
- A feature state machine (backlog → pending → in_progress → waiting_approval → verified)
- 11 agents in .claude/agents/
- 5 skills (nomos, nomos-verify, nomos-refactor, nomos-improve, nomos-swarm)
- A learning system (patterns, antipatterns, metrics)
- A runner for parallel Docker execution
- An app with Kanban, Import, Agent Chat, Intent Box, Activity Feed

None of it was used. The tool that's supposed to orchestrate development was never used to orchestrate its own development.

**Why?** That's what this analysis must answer — and what it takes to close that gap.

---

## Prompt

```
This is a deep analysis session. READ-ONLY — no code changes.

Read these files first:
- PLAN.md (strategic plan)
- CLAUDE.md (project config)
- .nomos/docs/next-session-plan.md
- .nomos/docs/phase-2-session-plan.md
- .nomos/docs/phase-3-onwards-plan.md

Boot the app: docker compose up -d postgres redis && bun run dev
Open localhost:3001 and log in (admin@nomos.dev / NoMos12@@)

Spawn a 4-agent swarm team. All agents are READ-ONLY researchers.
They must communicate findings to each other via team messages.

AGENT 1 — "system-archaeologist" (Opus)
Role: Understand the NOMOS system as it exists in .claude/ and .nomos/

Deep-read every file in:
- .claude/skills/nomos/ (the core pipeline)
- .claude/skills/nomos-verify/
- .claude/skills/nomos-refactor/
- .claude/skills/nomos-improve/
- .claude/skills/nomos-swarm/
- .claude/agents/ (all 11+ agent definitions)
- .nomos/learning/ (patterns, antipatterns, metrics)
- .nomos/schemas/ (feature and app_spec schemas)
- .nomos/app_spec.json
- .nomos/features.json (the 139 features)

Answer these questions:
1. What is the NOMOS pipeline SUPPOSED to do, step by step?
2. What agents exist and what are their roles?
3. How does the learning system work? What feeds it? What reads it?
4. What's the gap between the DESIGNED system and what ACTUALLY runs?
5. Which parts of the system are functional and which are aspirational?
6. What would it take to run `/nomos F001` and have it actually work end-to-end?

Output: A comprehensive system map with functional vs aspirational annotations.

AGENT 2 — "app-auditor" (Sonnet)
Role: Audit the running app — every page, every feature, every API endpoint

Walk through the running app at localhost:3001 systematically:
- Dashboard: Intent Box, Auto-Mode, Feature Queue, Event Feed
- Projects: create, edit, detail, delete
- Kanban: drag-drop, filters, pagination, feature cards
- Agent: chat sessions, message history, session management
- Activity: event feed, filters
- Learnings: patterns, metrics display
- Terminal: functionality status
- Spec: what does this page do?
- Import: JSON import flow
- Settings: all settings panels

For each page:
- Does it render?
- Does it load real data from the DB?
- Do all buttons/forms work?
- What's broken or stubbed?
- What API endpoints does it call?

Also check: the 9 orphaned API endpoints (apiKeys, qualityGate, fs, github, etc.)
— do any of them now have consumers, or are they still dead code?

Output: A page-by-page audit with status (working/partial/broken/stub).

AGENT 3 — "pipeline-analyst" (Opus)
Role: Trace the NOMOS pipeline code and determine what's real vs vapor

The core question: If I type `/nomos F001` right now, what happens?

Trace the execution:
- Phase 0 ROUTE: How does the skill dispatch work? Read the SKILL.md.
- Phase 1 UNDERSTAND: What does the scout agent actually do? Does it read from DB or files?
- Phase 2 PLAN: What does the architect agent produce? Where does it save output?
- Phase 3 EXECUTE: code-writer + qa-reviewer loop — does this actually work?
- Phase 4 REVIEW: Gate A (bash) + Gate B (agents) + Gate C (agent) — are these real?
- Phase 5 SHIP: Git operations, PR creation — functional?
- Phase 6 LEARN: historian agent — does it actually extract and save learnings?

For each phase, determine:
- Is the code real and executable, or is it a prompt/spec that was never implemented?
- Does it depend on infrastructure that exists (DB tables, API endpoints, file paths)?
- What would break if you ran it right now?

Also analyze:
- The checkpoint system (cp-01.json through cp-06.json) — does it work?
- The feature state machine — does `/nomos` actually transition states?
- The worktree system — does it create/manage git worktrees?

Output: A phase-by-phase reality assessment with "works / partially works / not implemented" for each.

AGENT 4 — "strategic-synthesizer" (Opus)
Role: Wait for agents 1-3, then synthesize a unified plan

Wait for findings from all 3 agents. Then produce:

1. THE GAP ANALYSIS
   - What NOMOS was designed to be vs what it actually is today
   - What the app can do vs what the pipeline can do
   - Where the IDE-side (.claude/) and app-side (localhost:3001) overlap, diverge, or contradict

2. THE CONVERGENCE PLAN
   How to make NOMOS-the-system and NOMOS-the-app work together:
   - Can the app trigger /nomos pipeline runs?
   - Can pipeline output feed back into the app (features, learnings, activity)?
   - What's the minimal wiring needed to close the loop?

3. THE ROADMAP
   Concrete sessions (max 5 more) to reach: "NOMOS manages its own development"
   Each session must have:
   - Clear goal
   - Agent team composition
   - Success criteria
   - What NOMOS features it uses (not bypasses)

4. THE ANTI-PATTERNS
   What went wrong with the batch approach and how to avoid repeating it:
   - When to use /nomos pipeline vs raw Claude Code sessions
   - When to use the app vs the CLI
   - How to ensure the learning system actually learns

Output: A single document titled "NOMOS-CONVERGENCE-PLAN.md" saved to .nomos/docs/

This is the ONLY file this session creates. Everything else is read-only.
```

---

## Expected Output

A single file: `.nomos/docs/NOMOS-CONVERGENCE-PLAN.md` containing:
- System map (what exists, what's real, what's vapor)
- App audit (page-by-page status)
- Pipeline reality assessment (phase-by-phase)
- Gap analysis (designed vs actual)
- Convergence roadmap (5 sessions to self-hosting)
- Anti-patterns guide (how to avoid the batch trap)

This document becomes the master reference for all future sessions.

---

*Generated: 2026-02-10 | The session that asks: why aren't we using the thing we're building?*
