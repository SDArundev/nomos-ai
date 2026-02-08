# Team Compositions

Agent roles, models, and spawn configurations per swarm mode.

---

## Audit Mode

| Agent | Name | subagent_type | Model | Role |
|-------|------|---------------|-------|------|
| Explorer | `explorer` | `explore-codebase` | haiku | Maps implementation vs AC claims. First to examine each feature. |
| Skeptic | `skeptic` | `general-purpose` | sonnet | Challenges findings, traces code paths end-to-end. Second in chain. |
| Tester | `tester` | `qa-smoke-tester` | sonnet | Starts dev server, exercises features via Playwright. Provides runtime proof. |

**Quick mode (`-q`):** Skip Tester. Only Explorer + Skeptic.

**Flow:** Explorer → Skeptic → Tester → Lead collects

---

## Research Mode

| Agent | Name | subagent_type | Model | Role |
|-------|------|---------------|-------|------|
| Researcher | `researcher` | `general-purpose` | sonnet | Deep codebase analysis, pattern mapping, architecture review. |
| Librarian | `librarian` | `explore-codebase` | haiku | External docs via Context7, prior art, library examples. |

**Flow:** Researcher + Librarian work in parallel → cross-reference → Lead synthesizes

---

## Discuss Mode

| Agent | Name | subagent_type | Model | Role |
|-------|------|---------------|-------|------|
| Advocate | `advocate` | `general-purpose` | sonnet | Argues FOR the proposed position with evidence. |
| Critic | `critic` | `general-purpose` | sonnet | Argues AGAINST, proposes alternatives with evidence. |
| Pragmatist | `pragmatist` | `explore-codebase` | haiku | Evaluates both positions against codebase reality. Tie-breaker. |

**Flow:** Advocate + Critic (Round 1, parallel) → Exchange + Counter (Round 2) → Pragmatist assessment → Lead synthesizes

---

## Learn Mode

| Agent | Name | subagent_type | Model | Role |
|-------|------|---------------|-------|------|
| Auditor | `auditor` | `explore-codebase` | haiku | Reads all learning files, finds inconsistencies and staleness. |
| Analyst | `analyst` | `general-purpose` | sonnet | Cross-references learning entries against actual codebase state. |

**Flow:** Auditor scans → DMs Analyst → Analyst verifies → Lead produces improvement plan

---

## Model Selection Rationale

- **haiku** for exploration/scanning tasks (high volume, low complexity): explorer, librarian, pragmatist, auditor
- **sonnet** for analysis/reasoning tasks (deep thinking, nuanced judgment): skeptic, tester, researcher, advocate, critic, analyst
- Lead (orchestrator) runs at whatever model the user's session uses

---

## Token Cost Estimates

| Mode | Agents | Models | Relative Cost |
|------|--------|--------|---------------|
| audit | 3 | 1 haiku + 2 sonnet | ~3x per batch |
| audit -q | 2 | 1 haiku + 1 sonnet | ~2x per batch |
| research | 2 | 1 haiku + 1 sonnet | ~2x |
| discuss | 3 | 1 haiku + 2 sonnet | ~3x per round |
| learn | 2 | 1 haiku + 1 sonnet | ~2x (one-time) |

All agents are **READ-ONLY** on source files. Only the lead applies changes in Phase 4.
