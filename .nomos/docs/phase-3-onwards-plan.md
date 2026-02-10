# NOMOS Phase 3+ — From Product to Daily Driver

> After Phase 2 completes, NOMOS is a usable product. These sessions transition from "building NOMOS" to "using NOMOS to build things."

---

## Prerequisites

- Phase 1-3 done (bugs, cleanup, docs) — commit 8aabb6b
- Phase A done (BUG-6/7 fixed, UI/UX redesign applied)
- Phase 2 done (triage, consolidation, E2E, brownfield)

---

## Session 3: Dogfooding — NOMOS Builds Itself

### Goal
Use the NOMOS UI to create and implement a feature on itself. First real product cycle.

### Prompt

```
Read .nomos/docs/phase-3-onwards-plan.md for context.

Boot the app: docker compose up -d postgres redis && bun run dev
Open localhost:3001, log in as admin@nomos.dev

This session is different — we're USING NOMOS, not building it.

1. Open the Dashboard, use the Intent Box to describe a real feature:
   "Add a feature detail page that shows full spec, acceptance criteria,
   and implementation status with a timeline of state transitions"

2. Watch the AI generate the spec. If anything breaks, fix it inline.

3. Move the feature through the pipeline:
   backlog → pending → in_progress → waiting_approval → verified

4. Every bug or friction point you encounter is a real finding.
   Fix bugs that block the flow immediately.
   Note UX friction for later improvement.

5. At the end, the feature should be implemented, merged, and visible in the app.

This proves the core loop works: describe → build → watch → ship.

If the Intent Box or agent pipeline has gaps, wire them up.
The goal is NOT perfection — it's completing one full cycle end-to-end.
```

---

## Session 4: Desktop App + Distribution

### Goal
Package NOMOS as a standalone Tauri desktop app. No terminal needed.

### Prompt

```
Read .nomos/docs/phase-3-onwards-plan.md for context.

NOMOS has a Tauri desktop app stub at apps/desktop/ that was never built.

Spawn a 2-agent team:

AGENT 1 — "tauri-builder" (Sonnet)
- Check apps/desktop/ — what exists? Tauri config, Rust src, etc.
- Wire it to serve the web frontend (apps/web/ build output)
- Embed the server (apps/server/) as a sidecar or in-process
- Handle PostgreSQL: either bundle SQLite for desktop mode (simpler)
  or require Docker (less user-friendly)
- Goal: `bun run build:desktop` produces a .dmg/.app for macOS

AGENT 2 — "installer-polisher" (Sonnet)
- App icon and branding (use the design from UI/UX session)
- macOS code signing setup (or document the steps)
- First-run experience: auto-setup DB, create default user
- Menu bar integration if quick, otherwise skip
- README update with desktop installation instructions

After both finish:
- Build the desktop app
- Test: open .app, verify full functionality without terminal
- Push
```

---

## Session 5: Multi-Project + General Purpose

### Goal
Prove NOMOS works beyond itself. Onboard 2-3 different projects.

### Prompt

```
Read .nomos/docs/phase-3-onwards-plan.md for context.

Boot the app. We're testing NOMOS as a general-purpose tool.

1. Create a new project pointing to a Go codebase in your workspace.
   - Brownfield detection should generate .nomos/ from codebase analysis
   - Verify: app_spec.json generated with correct stack detection
   - Verify: features can be created and managed

2. Create another project pointing to a different TypeScript repo.
   - Same brownfield flow
   - Verify stack detection identifies the right framework

3. Test multi-project switching:
   - Switch between projects in the sidebar
   - Kanban should show different features per project
   - Agent sessions should be project-scoped

4. Fix any bugs found. Focus on:
   - Stack detection accuracy (Go vs TS vs Python vs Rust)
   - Project isolation (features, agents, settings don't leak)
   - Import/export between projects

This session validates NOMOS as a tool you'd use for ANY project,
not just for building itself.
```

---

## After These Sessions: The Shift

### What you have
- A working product with custom UI
- Desktop app (no terminal needed)
- Multi-project support with smart onboarding
- One real E2E test proving the stack works
- DB as single source of truth
- Clean .nomos/ system

### What changes
- **No more batches.** Features come from using the app, not from AI reviewing AI.
- **No more 139-feature backlog.** The triaged list reflects real needs.
- **NOMOS is your daily driver.** Point it at any project, describe what you want, watch it build.

### Ongoing work (as-needed, not planned sessions)
- **Performance**: optimize if kanban gets slow with 500+ features
- **Collaboration**: multi-user support if you work with others
- **Plugins**: MCP server integration for external tools
- **Mobile**: responsive UI or companion app
- **Learning system maturity**: patterns improve as more features complete

These come from real usage, not from a pre-planned roadmap.

---

*Generated: 2026-02-10 | The final plan — after this, NOMOS drives itself.*
