# Output Schemas

JSON schemas for swarm session output files.

---

## session.json

```json
{
  "mode": "audit | research | discuss | learn",
  "timestamp": "YYYYMMDD-HHMMSS",
  "output_dir": "/absolute/path/to/.nomos/swarm/{mode}-{timestamp}",
  "flags": {
    "auto": false,
    "fix": false,
    "batch_size": 5,
    "rounds": 2,
    "quick": false,
    "prune": false
  },
  "scope": {
    "type": "range | all | topic | learning_system",
    "features": ["F025", "F026"],
    "topic": "optional topic string",
    "total": 72
  },
  "team_name": "nomos-{mode}-{timestamp}",
  "team": {
    "agents": ["explorer", "skeptic", "tester"],
    "task_count": 5
  },
  "status": "initialized | assembled | executing | reporting | completed",
  "completed_at": "ISO 8601 timestamp",
  "actions_applied": {
    "state_transitions": 0,
    "backlog_items": 0,
    "learning_updates": 0
  }
}
```

---

## findings.json — Audit Mode

```json
{
  "session": {
    "mode": "audit",
    "team": "nomos-audit-YYYYMMDD-HHMMSS",
    "timestamp": "ISO 8601",
    "duration_minutes": 25,
    "agents": ["explorer", "skeptic", "tester"],
    "scope": {
      "type": "range",
      "features": ["F025", "F026"],
      "total": 72
    }
  },
  "findings": [
    {
      "id": "SW-001",
      "feature_id": "F025",
      "classification": "BROKEN | PARTIAL | FRAGILE | MISLEADING | SOUND",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "description": "Human-readable description of the issue",
      "evidence": [
        {
          "agent": "explorer | skeptic | tester",
          "detail": "Specific evidence with file:line references"
        }
      ],
      "suggested_action": "fail | backlog | note",
      "notes": "Optional additional context"
    }
  ],
  "summary": {
    "total_audited": 72,
    "broken": 0,
    "partial": 0,
    "fragile": 0,
    "misleading": 0,
    "sound": 0
  }
}
```

### Classification Definitions

| Classification | Criteria | Suggested Action |
|---------------|----------|-----------------|
| **BROKEN** | Feature does not work at all | `fail` |
| **PARTIAL** | Some AC met, others missing | `fail` or `backlog` |
| **FRAGILE** | Happy path works, edge cases fail | `backlog` |
| **MISLEADING** | AC met but feature is useless in practice | `backlog` |
| **SOUND** | Feature genuinely works | `note` (or omit) |

### Severity Definitions

| Severity | Criteria |
|----------|----------|
| **CRITICAL** | Core functionality broken, user-facing failure |
| **HIGH** | Important functionality missing or broken |
| **MEDIUM** | Non-critical functionality issues |
| **LOW** | Minor issues, cosmetic, edge cases only |

---

## findings.json — Research Mode

```json
{
  "session": { "mode": "research", "..." },
  "research_brief": {
    "feature_id": "F045",
    "questions": [
      {
        "question": "What patterns exist for similar functionality?",
        "findings": [
          { "agent": "researcher", "detail": "..." },
          { "agent": "librarian", "detail": "..." }
        ],
        "conclusion": "Summary answer"
      }
    ],
    "recommended_approach": "Narrative recommendation",
    "risks": ["Risk 1", "Risk 2"],
    "reusable_code": [
      { "path": "src/utils.ts", "what": "Description of reusable component" }
    ],
    "external_references": [
      { "library": "library-name", "doc": "API reference URL", "relevance": "Why it matters" }
    ]
  }
}
```

---

## findings.json — Discuss Mode

```json
{
  "session": { "mode": "discuss", "..." },
  "debate": {
    "topic": "The proposition being debated",
    "rounds": [
      {
        "round": 1,
        "advocate": "Opening argument text",
        "critic": "Opening argument text"
      },
      {
        "round": 2,
        "advocate": "Counterargument text",
        "critic": "Counterargument text"
      }
    ],
    "pragmatist_assessment": "Feasibility analysis text",
    "agreements": ["Point of agreement 1"],
    "disagreements": ["Point of disagreement 1"],
    "recommendation": "Final recommendation",
    "confidence": "HIGH | MEDIUM | LOW",
    "feasibility_scores": {
      "advocate_position": 7,
      "critic_position": 5
    }
  }
}
```

---

## findings.json — Learn Mode

```json
{
  "session": { "mode": "learn", "..." },
  "learning_audit": {
    "files_audited": ["patterns.json", "antipatterns.json"],
    "issues": [
      {
        "file": "patterns.json",
        "entry": "pattern_name_or_index",
        "issue": "Description of problem",
        "action": "keep | update | remove | add",
        "detail": "Specific recommendation"
      }
    ],
    "stats": {
      "total_entries": 45,
      "stale": 8,
      "inconsistent": 3,
      "missing_evidence": 5,
      "duplicates": 2,
      "healthy": 27
    },
    "new_entries": [
      {
        "type": "pattern | antipattern",
        "name": "New entry name",
        "description": "What was found",
        "evidence": "file:line"
      }
    ]
  }
}
```

---

## actions.json

```json
{
  "state_transitions": [
    {
      "feature_id": "F025",
      "action": "fail",
      "reason": "swarm_audit: description of failure (SW-001)"
    }
  ],
  "new_backlog_items": [
    {
      "title": "Fix F025 login form submission",
      "description": "Detailed description of what needs fixing",
      "priority": 1,
      "tags": ["swarm-audit", "fix:F025"]
    }
  ],
  "learning_updates": {
    "new_patterns": [
      {
        "name": "pattern_name",
        "description": "What the pattern is",
        "example": "Code example or file reference",
        "confidence": 0.5
      }
    ],
    "new_antipatterns": [
      {
        "name": "antipattern_name",
        "description": "What to avoid",
        "example": "Code example or file reference",
        "impact": "What goes wrong"
      }
    ],
    "stale_patterns": [
      {
        "name": "pattern_to_remove",
        "reason": "Why it should be removed"
      }
    ]
  }
}
```

---

## Finding ID Format

Finding IDs follow the format: `SW-{NNN}`

- `SW` prefix distinguishes swarm findings from other NOMOS IDs
- Sequential numbering within a session (SW-001, SW-002, ...)
- IDs are session-local, not globally unique
