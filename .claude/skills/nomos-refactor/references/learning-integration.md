# Learning System Integration

How nomos-refactor uses the NOMOS learning system for context and records its own learnings.

---

## Reading Patterns (Step 01)

Before analysis, load relevant learning context. All reads are **graceful** — missing files are ignored.

### Relevant Pattern Categories

| Refactor Type | Pattern Categories to Load | Why |
|---------------|---------------------------|-----|
| `dependency` | `dependencies`, `project-setup` | Package compatibility, install patterns |
| `move` | `typescript`, `project-setup` | tsconfig paths, import patterns |
| `rename` | `typescript`, `process` | Symbol naming conventions |
| `optimize` | `server`, `frontend`, `database` | Domain-specific optimization patterns |
| `extract` | `typescript`, `multi-layer` | Module boundaries, composition |
| `inline` | `typescript` | Abstraction patterns |
| `modernize` | `typescript`, `server`, `frontend` | Modern pattern examples |
| `structure` | `project-setup`, `multi-layer`, `git-workflow` | Architecture, worktree, build |

### jq Queries

```bash
# Load patterns by category (graceful)
jq --arg cat "$CATEGORY" '[.patterns[] | select(.category == $cat)] | .[0:5]' \
  .nomos/learning/patterns.json 2>/dev/null || echo "[]"

# Load antipatterns (all refactoring-relevant)
jq '[.antipatterns[] | select(.category == "refactoring" or .category == "qa")]' \
  .nomos/learning/antipatterns.json 2>/dev/null || echo "[]"

# Load verification patterns (quality + integration issues to watch for)
jq '[.patterns[] | select(.type == "quality" or .type == "integration")] | .[0:5]' \
  .nomos/learning/verification-patterns.json 2>/dev/null || echo "[]"
```

### How to Use Loaded Patterns

1. **In agent prompts:** Include as `<context>` block so agents avoid known pitfalls
2. **In risk assessment:** Known antipatterns for the refactor type increase risk score
3. **In execution:** Pattern recommendations guide implementation choices

---

## Writing Learnings (Step 08)

After a successful refactoring, record what was learned.

### Refactoring History

Append to `.nomos/learning/refactoring-history.json`:

```json
{
  "refactorings": [
    {
      "id": "REF-{timestamp}",
      "type": "{refactor_type}",
      "target": "{target}",
      "replacement": "{replacement}",
      "files_changed": 15,
      "risk_level": "MEDIUM",
      "duration_minutes": 12,
      "rollbacks": 0,
      "success": true
    }
  ]
}
```

### New Patterns

If the refactoring revealed a reusable pattern, add to `.nomos/learning/patterns.json`:

```json
{
  "id": "PAT-XXX",
  "name": "REFACTOR_PATTERN_NAME",
  "description": "What was learned",
  "category": "refactoring",
  "evidence_count": 1,
  "last_seen": "REF-{timestamp}",
  "recommendation": "How to apply this pattern",
  "confidence": 0.4,
  "success_rate": 1.0,
  "risk_if_ignored": "LOW"
}
```

### New Antipatterns

If the refactoring hit a known pitfall, add to `.nomos/learning/antipatterns.json`:

```json
{
  "id": "ANTI-XXX",
  "name": "REFACTOR_ANTIPATTERN",
  "description": "What went wrong",
  "category": "refactoring",
  "severity": "MEDIUM",
  "prevention": "How to avoid it",
  "what_went_wrong": "Specific failure description",
  "lesson": "Key takeaway"
}
```

---

## Cross-Skill Integration

| Learning File | Read By | Written By |
|---------------|---------|------------|
| `patterns.json` | step-01 (context) | step-08 (new patterns) |
| `antipatterns.json` | step-01 (context) | step-08 (new antipatterns) |
| `verification-patterns.json` | step-01 (context) | nomos-verify only |
| `refactoring-history.json` | step-01 (context) | step-08 (record) |
| `metrics.json` | — | — (feature metrics, not refactor) |

The learning system is **optional and graceful**. Refactoring works without any learning data. Learning data improves refactoring quality over time by avoiding known pitfalls and applying proven strategies.
