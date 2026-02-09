# NOMOS Swarm Discussion — Strategic Direction Shift

**Date:** 2026-02-09
**Mode:** discuss (2 rounds + feasibility assessment)
**Topic:** Should NOMOS strip its web app to a monitoring dashboard, adopt CLI-first identity with intent-first UI, cut scope, converge pipelines, and refactor the ecosystem?
**Team:** Advocate (sonnet), Critic (sonnet), Pragmatist (haiku)
**Duration:** ~10 minutes (2 debate rounds + codebase mapping + assessment)

---

## Executive Summary

**Verdict: Accept the Advocate's direction, apply the Critic's caution on timing.**

The Pragmatist scored the Advocate 8/10 and the Critic 4/10 on feasibility (revised after claim-by-claim verification). The codebase evidence is decisive: the CLI/skill system is 2.2x larger than the entire web app (35,700 vs 16,400 lines), the app pipeline is 3% of the real pipeline (124 vs 1,190+ lines), and 74% of features are empty backlog entries. The direction shift is not a pivot — it is an alignment of stated identity with demonstrated reality.

However, the Critic raised legitimate concerns about timing (intent-first is unproven), data accuracy (23/61 verified features are bug fixes), and infrastructure value (EventService, DI, REST adapter exist in the web app). The Pragmatist's key insight resolved the convergence debate: **keep AutoModeService as the orchestration body (circuit breaker, dependency resolution, abort handling, retry) but have it invoke the CLI skill pipeline instead of PipelineService. The Critic's body gets the Advocate's brain.**

The synthesis: **move in the Advocate's direction, preserve the Critic's orchestration infrastructure, apply the Critic's pace.**

---

## Key Debate Resolutions

| Decision | Resolution | Score |
|----------|-----------|-------|
| CLI-first identity | **YES** — codebase already IS CLI-first (2.2x ratio) | 9/10 feasibility |
| Strip web to dashboard | **YES** — redirect investment, don't delete code | 9/10 feasibility |
| Intent-first UI | **YES, but Phase 2** — new functionality, 3-5 features of work | 6/10 feasibility |
| Cut to ~30 features | **YES** — trivial labeling exercise, zero code change | 10/10 feasibility |
| Converge dual pipeline | **YES** — PipelineService becomes checkpoint reader | 7/10 feasibility |
| Security P0 fixes | **YES, Week 1** — confirmed in code, trivial fixes | 8/10 feasibility |
| Learning as moat | **YES** — 54 patterns, 20 antipatterns, real and unique | Agreed by all |
| Desktop/Tauri | **MOOT** — no code exists, never built | N/A |

---

## Areas of Consensus (Both Sides Agreed)

1. The dual pipeline must converge (disagreed on direction → resolved: app reads CLI checkpoints)
2. Intent-first is strategically valuable (disagreed on timing → resolved: Phase 2 after core loop)
3. Learning system is the primary moat (disagreed on storage → resolved: JSON fine for v1, revisit at scale)
4. "Use NOMOS to build NOMOS" is compelling (disagreed on prerequisites → resolved: after pipeline convergence)
5. Desktop/Tauri decision is moot (no code exists)
6. Auto-mode dashboard should be the homepage (both explicitly agreed)

---

## Advocate's Strongest Arguments (Confirmed by Pragmatist)

1. **The skill pipeline IS the product.** 1,190 lines of phase definitions + 11 specialized agents + 5 quality gates + 54 patterns vs 124-line generic step executor. The numbers are not close.

2. **63% of frontend contradicts autonomous identity.** Feature creation forms (457L), Kanban DnD (435L), start/stop dialogs (214L), spec management (256L) — all assume manual management of what should be autonomous.

3. **Stripping is zero-risk.** The transformation is a route swap (30 min) + redirect investment. No code deletion needed.

4. **285 features is a labeling problem, not an engineering one.** 212 are empty JSON entries. Mark 30 as v1-target with `jq`. Done.

5. **Security P0s are trivially fixable.** FS traversal, rate limiter, projectRoot — each is a 1-10 line fix. Total: ~15 lines across 4 files.

---

## Critic's Strongest Arguments (Accepted as Refinements)

1. **Intent-first is genuinely new work.** The expansion agent doesn't exist. Need: new agent definition (~120L), Intent Box component (~200L), Decomposition Preview (~350L), batch-create API. This is 3-5 features, not a weekend.

2. **Feature count is inflated.** 23 of 61 verified features are bug fixes (CAT-FIX). Real new features: ~38. Overall success rate: 85% (61/72), not 100%. The "never fails" narrative needs correction.

3. **The web pipeline was never tried.** PipelineService.executeFeature() has zero production invocations. It's untested, not proven bad. Selection bias, not evidence.

4. **App infrastructure has real value.** EventService (pub/sub + WebSocket bridge), REST adapter (7 endpoints), better-auth (multi-user), DI patterns — these should be preserved, not discarded.

5. **"Converge Upward" has merit for v2.** Long-term, the app's TypeScript services with DI, error handling, and database integration are superior infrastructure. The skill pipeline's orchestration logic should eventually live there. But for v1, the skill pipeline works and the app pipeline doesn't.

---

## Pragmatist's Recommended Action Plan

### Week 1: Zero-Risk Wins (3 features)
| # | Action | Size | Files |
|---|--------|------|-------|
| 1 | Security P0 fixes (FS, rate limiter, projectRoot) | XS | 4 files, ~15 lines |
| 2 | Promote auto-mode dashboard to homepage | XS | 3 files, ~50 lines |
| 3 | Label 30 backlog features as v1-target | — | features.json, 30 min |

### Weeks 2-3: Pipeline Convergence (2-3 features)
| # | Action | Size | Files |
|---|--------|------|-------|
| 4 | Rewrite PipelineService as checkpoint reader | M | pipeline-service.ts + new watcher |
| 5 | AutoModeService invokes CLI skill | S | auto-mode-service.ts |
| 6 | Session consolidation | XS | 3 files, ~50 lines |

### Weeks 4-6: Intent-First (3-5 features)
| # | Action | Size | Files |
|---|--------|------|-------|
| 7 | Build expansion agent (ART-001a) | M | NEW: expansion.md |
| 8 | Intent Box UI component | S | NEW: intent-box.tsx |
| 9 | Decomposition Preview + batch create | M | NEW: decomposition-preview.tsx + API |

### Weeks 7-9: REST Expansion (2-3 features)
| # | Action | Size | Files |
|---|--------|------|-------|
| 10 | REST adapter for projects, sessions, learnings | S×2 | rest-adapter.ts expansion |
| 11 | API auth (Bearer tokens) | S | NEW: api-auth middleware |

**Total: ~12-16 features over 9 weeks**

### What NOT to Do
- Do NOT delete the Kanban board (works, users might like it, no reward for removing)
- Do NOT build multi-provider for v1 (Claude is sufficient, wrong timing)
- Do NOT build ServiceRegistry before pipeline convergence (creates churn)
- Do NOT build Tauri desktop (nothing exists to work on)
- Do NOT increase QA fix cycles until pipeline convergence is done (two moving targets)

---

## Strategic Framing

**Before:** "Autonomous AI Development Studio" with a split identity — sophisticated CLI pipeline + thin web CRUD app pretending to be the product.

**After:** "Autonomous AI Development Studio" with a unified identity — battle-tested CLI pipeline as execution engine + focused web dashboard as mission control + intent box as the only active input surface.

**The moat:** Learning system (54 patterns, 20 antipatterns) + 6-phase pipeline with context clearing + intent-first UX. This combination — "describe what you want, AI builds it using accumulated project knowledge, with 5-layer quality gates" — is unique in the market.

**The tagline:** "The autonomous coding platform that gets smarter with every feature it builds."

---

## Pragmatist Claim Verification (Revised Assessment)

The Pragmatist fact-checked specific technical claims from both sides against the actual codebase:

### Critic Claims Verified
| Claim | Verdict |
|-------|---------|
| AgentService has MODEL_MAP with haiku/sonnet/opus | **TRUE but MISLEADING** — having a constant is not role-based dispatch. App uses same model for all steps; skill pipeline dispatches different models for different roles. |
| AutoModeService has exponential backoff, circuit breaker, abort | **TRUE** — confirmed at `auto-mode-service.ts:17-19,118-126,273-274`. Genuinely valuable infrastructure the skill pipeline lacks. |
| REST adapter proves convergence is 70% built | **TRUE for REST, WRONG FRAMING** — REST translation ≠ pipeline convergence. Different problems. |
| Security P0s are localhost-irrelevant | **DANGEROUS** — `process.cwd()` as FS root + `bypassPermissions:true` = unrestricted filesystem access. Supply chain attack vector. |
| "Port skill brain into app body" | **QUANTIFIED: 15-25 features, 6-10 weeks** — would require rewriting 7,500+ lines of battle-tested orchestration into untested TypeScript. |

### Advocate Claims Verified
| Claim | Verdict |
|-------|---------|
| PipelineService → ~50 line checkpoint reader | **UNDERSIZED** — realistic estimate is 100-150 lines (polling, parsing, DB mapping, events). Still far simpler than 7,500-line rewrite. |
| Cutting ~1,800 lines + 6 dependencies simplifies | **TRUE** — @dnd-kit x3 + @xterm x3 eliminated from active dependency management. |
| 61 verified features, 100% built via CLI | **TRUE** — app PipelineService has zero production invocations. |
| Desktop/Tauri is moot | **TRUE** — no `apps/desktop/` directory exists. |

### The Critical Convergence Insight

The Pragmatist resolved the core disagreement with a synthesis neither side proposed:

> **Keep AutoModeService as the orchestration layer (dependency resolution, circuit breaker, abort, retry). Change WHAT it orchestrates: invoke CLI skill pipeline instead of PipelineService.executeFeature(). PipelineService becomes a checkpoint reader + event emitter.**

This preserves:
- Critic's infrastructure: circuit breaker, abort controller, exponential backoff, dependency resolver
- Advocate's execution engine: 11 agents, 5 quality gates, context clearing, learning system
- Both: zero rewrite of battle-tested code

### Constraints Neither Side Considered
1. `fs.watch` on macOS is unreliable for recursive watching — checkpoint reader needs polling
2. At 500+ patterns, loading full JSON into context is ~17K tokens — add `relevance_score` field + top-N loading (~20 lines)
3. 11 failed features (F031-F035 SDK issues) would block any "self-build sprint" immediately
4. 856 test files (155K lines) — quality/pass rate unknown, needs triage before refactoring
5. Skill pipeline's 2,844 lines of bash assume macOS/Linux with jq/git/tmux — portability concern for v2

---

## Feasibility Scores (Revised)

| Position | Score | Confidence |
|----------|-------|------------|
| Advocate (full shift) | **8/10** | HIGH |
| Critic (preserve & evolve) | **4/10** | HIGH |
| **Synthesis (Advocate direction + Critic body + phased execution)** | **9/10** | **HIGH** |

---

*Discussion conducted by 3 agents across 2 rounds of structured debate + codebase reality mapping + claim-by-claim verification. The Advocate won on direction; the Critic's AutoModeService infrastructure was preserved; the Pragmatist's convergence insight unified both positions.*
