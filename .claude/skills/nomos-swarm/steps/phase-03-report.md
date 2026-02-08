# Phase 3: REPORT

Synthesize all agent findings into structured output files.

**Input:** `session_config` + collected `findings` from Phase 2

---

## 1. Generate findings.json

Write `{output_dir}/findings.json`:

```json
{
  "session": {
    "mode": "audit",
    "team": "nomos-audit-20260208-143022",
    "timestamp": "2026-02-08T14:30:22Z",
    "duration_minutes": 25,
    "agents": ["explorer", "skeptic", "tester"],
    "scope": {
      "type": "range",
      "features": ["F025", "F026", "..."],
      "total": 72
    }
  },
  "findings": [
    {
      "id": "SW-001",
      "feature_id": "F025",
      "classification": "BROKEN",
      "severity": "CRITICAL",
      "description": "Login page renders but form submit does nothing",
      "evidence": [
        {
          "agent": "explorer",
          "detail": "onSubmit handler is empty stub at apps/web/src/routes/login.tsx:42"
        },
        {
          "agent": "skeptic",
          "detail": "Auth API endpoint exists but is never called from frontend"
        },
        {
          "agent": "tester",
          "detail": "Playwright click on submit - no network request fired, form stays unchanged"
        }
      ],
      "suggested_action": "fail",
      "notes": ""
    }
  ],
  "summary": {
    "total_audited": 72,
    "broken": 8,
    "partial": 15,
    "fragile": 12,
    "misleading": 0,
    "sound": 37
  }
}
```

For **research** mode, findings structure is different:

```json
{
  "session": { "mode": "research", "..." },
  "research_brief": {
    "feature_id": "F045",
    "questions": [
      {
        "question": "What patterns exist for real-time data sync?",
        "findings": [
          {"agent": "researcher", "detail": "..."},
          {"agent": "librarian", "detail": "..."}
        ],
        "conclusion": "Use WebSocket with Zustand subscription"
      }
    ],
    "recommended_approach": "...",
    "risks": ["..."],
    "reusable_code": [
      {"path": "packages/shared/src/utils.ts", "what": "Event emitter utility"}
    ]
  }
}
```

For **discuss** mode:

```json
{
  "session": { "mode": "discuss", "..." },
  "debate": {
    "topic": "State machine extraction to @nomos-ai/types?",
    "rounds": [
      {
        "round": 1,
        "advocate": "Opening argument FOR...",
        "critic": "Opening argument AGAINST..."
      },
      {
        "round": 2,
        "advocate": "Counterargument to critic...",
        "critic": "Counterargument to advocate..."
      }
    ],
    "pragmatist_assessment": "Feasibility analysis...",
    "agreements": ["Both agree type safety matters", "..."],
    "disagreements": ["Scope of extraction", "..."],
    "recommendation": "Proceed with partial extraction",
    "confidence": "MEDIUM"
  }
}
```

For **learn** mode:

```json
{
  "session": { "mode": "learn", "..." },
  "learning_audit": {
    "files_audited": ["patterns.json", "antipatterns.json", "..."],
    "issues": [
      {
        "file": "patterns.json",
        "entry": "pattern_name",
        "issue": "Example code no longer exists",
        "action": "remove"
      }
    ],
    "stats": {
      "total_entries": 45,
      "stale": 8,
      "inconsistent": 3,
      "missing_evidence": 5,
      "healthy": 29
    }
  }
}
```

---

## 2. Generate actions.json

Write `{output_dir}/actions.json`:

```json
{
  "state_transitions": [
    {
      "feature_id": "F025",
      "action": "fail",
      "reason": "swarm_audit: login form non-functional (SW-001)"
    },
    {
      "feature_id": "F031",
      "action": "fail",
      "reason": "swarm_audit: tool call visualization missing data layer (SW-005)"
    }
  ],
  "new_backlog_items": [
    {
      "title": "Fix F025 login form submission",
      "description": "Login form renders but onSubmit handler is empty. Wire up auth API endpoint.",
      "priority": 1,
      "tags": ["swarm-audit", "fix:F025"]
    }
  ],
  "learning_updates": {
    "new_patterns": [],
    "new_antipatterns": [
      {
        "name": "empty_handler_stub",
        "description": "Event handlers left as empty stubs pass compilation but break at runtime",
        "example": "onSubmit={() => {}} with TODO comment",
        "impact": "Feature appears implemented but does nothing"
      }
    ],
    "stale_patterns": [
      {
        "name": "pattern_to_remove",
        "reason": "Referenced code no longer exists"
      }
    ]
  }
}
```

For modes other than `audit`, `state_transitions` may be empty. Research mode produces no actions by default. Discuss mode may produce backlog items for the winning recommendation. Learn mode focuses on `learning_updates`.

---

## 3. Generate report.md

Write `{output_dir}/report.md`:

```markdown
# NOMOS Swarm Report — {MODE}

**Date:** {timestamp}
**Duration:** {N} minutes
**Team:** {agent names}
**Scope:** {description}

## Executive Summary

{2-3 paragraph overview of findings}

## Findings by Severity

### Critical ({N})
{List critical findings with evidence}

### High ({N})
{List high findings}

### Medium ({N})
{List medium findings}

### Low ({N})
{List low findings}

## Feature Status

| Feature | Current | Classification | Action |
|---------|---------|---------------|--------|
| F025 | verified | BROKEN | fail |
| F026 | verified | SOUND | — |
| ... | ... | ... | ... |

## Recommended Actions

### State Transitions
{List features to fail with reasons}

### New Backlog Items
{List new tasks to create}

### Learning Updates
{List pattern/antipattern changes}

## Agent Contributions

| Agent | Findings | Key Insight |
|-------|----------|-------------|
| explorer | 15 | Identified 8 empty handler stubs |
| skeptic | 12 | Confirmed 5 missing data flows |
| tester | 8 | Captured 3 runtime crashes |
```

---

## 4. Print Summary

Display a condensed summary to the user:

```
NOMOS Swarm — {MODE} Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Duration:  {N} minutes
Audited:   {N} features
Findings:  {N} total ({N} critical, {N} high)

BROKEN:     {N} features
PARTIAL:    {N} features
FRAGILE:    {N} features
SOUND:      {N} features

Actions:    {N} state transitions, {N} new tasks
Output:     {output_dir}/
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. Continue

**IMMEDIATELY load:** `steps/phase-04-cleanup.md`

Pass `session_config`, `findings`, and `actions` forward.
