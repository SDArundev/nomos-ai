# Integration Guide

How swarm findings flow back into the NOMOS ecosystem.

---

## State Transitions

Swarm audit findings can trigger state changes in features.json via `nomos.sh state`:

```bash
# Fail a verified feature that was found to be broken
bash .claude/skills/nomos/scripts/nomos.sh state fail {feature_id} "swarm_audit: {reason}"
```

The `fail` action has **no status guard** — it works from any state, including `verified`. This is intentional: swarm audits are specifically designed to catch features that passed the pipeline but are actually broken.

### State Flow

```
verified ──[swarm audit: BROKEN]──→ failed
verified ──[swarm audit: PARTIAL]──→ failed (with fix task in backlog)
verified ──[no issues found]──→ verified (unchanged)
```

---

## Features.json Updates

### New Backlog Items

When the `-f` (fix) flag is used, broken features generate new fix tasks:

```json
{
  "id": "F{next_id}",
  "title": "Fix {original_id} {issue_summary}",
  "description": "{detailed_description_from_findings}",
  "status": "backlog",
  "priority": 1,
  "category": "fix",
  "tags": ["swarm-audit", "fix:{original_id}", "swarm-session:{session_id}"],
  "acceptanceCriteria": [],
  "createdAt": "{timestamp}"
}
```

Fix tasks go to **backlog** (not pending), consistent with the `ingest` command convention.

### Tag Convention

Swarm-related tags:
- `swarm-audit` — created by a swarm audit session
- `fix:{feature_id}` — this task fixes issues found in the specified feature
- `swarm-session:{session_id}` — links to the specific swarm session

---

## Learning System Updates

### New Antipatterns

Appended to `.nomos/learning/antipatterns.json` (`.antipatterns[]` array):

```json
{
  "name": "{antipattern_name}",
  "description": "{description}",
  "example": "{code_example_or_file_reference}",
  "impact": "{what_goes_wrong}",
  "confidence": 0.5,
  "source": "swarm_audit",
  "added": "{ISO_timestamp}"
}
```

Initial confidence is 0.5 (moderate). Future swarm audits that find the same antipattern can increase confidence.

### New Patterns

Same structure, appended to `.nomos/learning/patterns.json` (`.patterns[]` array).

### Stale Entry Removal

Only applied when `--prune` flag is used (learn mode):

1. Read the learning file
2. Remove entries flagged as stale by the Auditor + Analyst
3. Write updated file
4. Log removals in the session report

Without `--prune`, stale entries are only reported, not removed.

---

## Research Brief Integration

Research mode output can feed into the NOMOS feature pipeline:

1. Run: `/nomos swarm research F045`
2. Output: `.nomos/swarm/research-{timestamp}/findings.json` contains `research_brief`
3. When implementing: `/nomos F045` — the scout agent (Phase 1) can read the research brief
4. The architect (Phase 2) gets richer context from the brief

### How to Reference

The research brief is stored at a known path. To feed it into Phase 2:

```bash
# In Phase 1, scout can check for existing research:
ls .nomos/swarm/research-*/findings.json | grep F045
```

The checkpoint (cp-01.json) can include a `research_brief_path` field pointing to the research output.

---

## Discuss Mode Integration

Discussion outputs can inform decision-making:

1. Run: `/nomos swarm discuss "Should we extract the state machine?"`
2. Output: `.nomos/swarm/discuss-{timestamp}/findings.json` contains `debate`
3. The `recommendation` field provides a decision with confidence
4. New backlog items may be created for the winning approach

---

## Fix Mode Workflow

Fix mode bridges the gap between audit (find issues) and resolution (fix issues):

```
/nomos swarm audit -a    →  audit actions applied (state transitions + backlog items)
                              ↓
/nomos swarm fix         →  load audit findings, batch fix features
                              ↓
                           code-writer fixes per batch + qa-reviewer verifies
                              ↓
                           originals retried, offer re-audit
```

### State Flow

```
Original Feature:
  verified ──[audit: fail]──→ failed ──[fix: retry]──→ in_progress

Fix Feature:
  backlog ──[fix: start]──→ in_progress ──[fix: complete]──→ waiting_approval
```

### Typical Two-Command Workflow

```bash
# Step 1: Audit finds issues, auto-applies state transitions + backlog items
/nomos swarm audit -a

# Step 2: Fix mode reads the audit, batches fixes, executes them
/nomos swarm fix -a
```

### Fix Mode Flags

| Flag | Description |
|------|-------------|
| `-a` / `--auto` | Skip confirmation, execute all batches |
| `-d` / `--dry-run` | Show batch plan without executing |
| `--skip-verify` | Don't offer re-audit after fixes |

---

## Complementary Tools

| Tool | What It Does | How Swarm Complements |
|------|-------------|----------------------|
| `/nomos verify` | Single-agent static analysis per feature | Swarm adds multi-agent runtime testing + debate |
| `/nomos improve` | NOMOS system internals improvement | Swarm targets the actual product codebase |
| `nomos.sh ingest` | Ingests verify findings into features | Swarm has its own action application in Phase 4 |
| `/nomos F0XX` | Implements a single feature | Swarm audits features AFTER implementation |

---

## Output Directory Structure

All swarm output lives under `.nomos/swarm/`:

```
.nomos/swarm/
├── audit-20260208-143022/
│   ├── session.json
│   ├── findings.json
│   ├── actions.json
│   ├── report.md
│   └── screenshots/
│       ├── F025-login-initial.png
│       └── F025-login-after-submit.png
├── research-20260208-150000/
│   ├── session.json
│   ├── findings.json
│   └── report.md
└── discuss-20260208-160000/
    ├── session.json
    ├── findings.json
    └── report.md
```

Sessions are immutable after completion — they serve as a historical record.
