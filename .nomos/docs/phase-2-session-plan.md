# NOMOS Phase 2 — Post-UI/UX Sessions

> Execute in 2 sessions max, using parallel agent swarms.
> Prerequisite: BUG-6/7 fixed, UI/UX redesign applied.

---

## Session 1: Feature Triage + Data Consolidation

### Goal
Clean the feature list and kill dual-storage. After this session, the DB is the single source of truth for everything.

### Prompt

```
Read PLAN.md and .nomos/docs/phase-2-session-plan.md for full context.

Boot the app: docker compose up -d postgres redis && bun run dev

Spawn a 3-agent team to work in parallel:

AGENT 1 — "feature-triager" (Opus)
Review all 139 features in the DB against the running app.
- Open the Kanban at localhost:3001/kanban
- For each "verified" feature (72): check if it actually works in the app. Mark as truly verified or demote to backlog.
- For each CAT-FIX feature (45): check if the bug still exists or was fixed in batches/our fixes. Archive obsolete ones.
- For remaining backlog (66): prioritize by core loop relevance (describe → build → watch → ship)
- Output: a triage report with keep/archive/reprioritize recommendations
- Do NOT delete features — just produce the report for user review

AGENT 2 — "learning-consolidator" (Sonnet)
Kill dual-storage (JSON files + DB).
- Move .nomos/learning/*.json to .nomos/seed-data/ (rename dir)
- Add a seed/import endpoint that loads seed-data/ into the DB learning tables
- Update all skill files and agent prompts that read .nomos/learning/ directly — point them to the API instead
- Files to check: .claude/skills/*/SKILL.md, .claude/agents/*.md, any code that does fs.readFile on learning/
- Verify the DB learning tables exist and have the right schema for patterns, antipatterns, metrics
- Test: after seeding, the Learnings page in the UI should show real data

AGENT 3 — "skill-updater" (Sonnet)
Fix v3/v4 inconsistency in .nomos/ system files.
- Find all files that say "features.json is source of truth" — update to say DB is source of truth
- Find all agent prompts that reference reading .nomos/features.json directly — update to use API
- Check .nomos/docs/SYSTEM_ARCHITECTURE.md is accurate post-cleanup
- Verify .nomos/project.json and .nomos/stack.json are still referenced by code, delete if orphaned
- Create .nomos/context/ directory if context-loader.ts expects it

After all 3 agents finish:
- Review the feature triage report
- Commit everything
- Push
```

---

## Session 2: E2E Test + Self-Hosting + Agent Chat Persistence

### Goal
Add real infrastructure tests, persist agent chat, and start dogfooding NOMOS on itself.

### Prompt

```
Read PLAN.md and .nomos/docs/phase-2-session-plan.md for full context.

Boot the app: docker compose up -d postgres redis && bun run dev

Spawn a 3-agent team to work in parallel:

AGENT 1 — "e2e-builder" (Sonnet)
Create ONE real E2E test that proves the app works end-to-end.
- Test boots the actual server (not a mock Hono instance)
- Connects to real PostgreSQL
- Creates a user account
- Creates a project
- Imports features from .nomos/features.json
- Verifies features appear with correct IDs
- Verifies project selection persists (localStorage)
- Verifies WebSocket connects
- Use Playwright or direct HTTP calls — whatever is simplest
- This single test replaces the false confidence of 636 mock-only tests
- Put it in a new test file: apps/server/src/__tests__/e2e-smoke.test.ts or similar
- Must be runnable with: bun test --filter e2e

AGENT 2 — "chat-persister" (Sonnet)
Fix BUG-8: Agent chat sessions are in-memory only.
- Find the in-memory session store (likely in apps/server/ or packages/api/)
- Check if a DB table for chat sessions/messages already exists in packages/db/src/schema/
- If yes: wire the existing store to use DB instead of memory
- If no: create a simple sessions + messages table, migrate, wire it up
- Verify: restart the server, chat sessions should survive
- Also fix Activity feed (BUG-9) if quick — events.ts:18-20 drops non-feature events

AGENT 3 — "brownfield-detector" (Opus)
Implement brownfield project detection for the "Create Project" flow.
- When user creates a project and provides a path:
  1. Check if path/.nomos/ exists
  2. If yes: read app_spec.json, features.json, project.json — auto-populate project fields and offer to import features
  3. If no: analyze the codebase (package.json, tsconfig, go.mod, etc.) and generate a basic .nomos/ structure with AI
- This is the "smart project creation" feature
- Modify: the Create Project dialog/form in the frontend + a new API endpoint for path analysis
- For the AI generation part (option 3): stub it with a TODO if Claude Agent SDK isn't wired yet, but make option 2 (auto-detect existing .nomos/) fully functional

After all 3 agents finish:
- Run the new E2E test to verify
- Test chat persistence by restarting the server
- Test brownfield detection by creating a new project pointing to this repo
- Commit everything
- Push
```

---

## Success Criteria After Both Sessions

- [ ] Feature list triaged — obsolete features archived, rest prioritized
- [ ] DB is single source of truth — no more JSON file reads by skills/agents
- [ ] v3/v4 inconsistencies resolved in .nomos/ system files
- [ ] 1 real E2E test that boots server + hits Postgres
- [ ] Agent chat persists across server restarts
- [ ] Brownfield detection: creating project at this repo auto-detects .nomos/
- [ ] .nomos/ is clean, organized, no orphans

---

*Generated: 2026-02-10 | Continues from commit ab81981 (or later after UI/UX session)*
