# NOMOS Learned Patterns

## How Patterns Work

Patterns are extracted from successful feature implementations and injected into the planning phase to improve future work.

---

## Pattern Categories

### Planning Patterns

| Pattern | Description | Apply When |
|---------|-------------|------------|
| GOOD_PLANNING | Clear requirements led to smooth implementation | Duration < threshold, retries = 0 |
| FOCUSED_SCOPE | Well-scoped feature with minimal blast radius | Files changed < threshold |
| CLEAR_AC | Acceptance criteria were specific and testable | All AC verified on first pass |

### Implementation Patterns

| Pattern | Description | Apply When |
|---------|-------------|------------|
| TEST_DRIVEN | Tests written alongside implementation | Tests pass on first try |
| INCREMENTAL_COMMITS | Small, focused commits at checkpoints | Commit count matches plan sections |
| PATTERN_FOLLOWING | Followed existing codebase patterns | No lint errors, consistent style |

### Review Patterns

| Pattern | Description | Apply When |
|---------|-------------|------------|
| SELF_REVIEW | Caught issues before external review | Review step found < 3 issues |
| PROACTIVE_SECURITY | Security considerations addressed early | No security findings in review |

---

## Anti-Pattern Categories

### Planning Anti-Patterns

| Anti-Pattern | Description | Prevention |
|--------------|-------------|------------|
| UNCLEAR_REQUIREMENTS | Multiple retries due to ambiguity | Clarify AC before starting |
| SCOPE_CREEP | Feature grew beyond plan | Stick to plan, note extras as new features |
| MISSING_DEPENDENCIES | Blocked by unverified dependencies | Check deps in step-01-context |

### Implementation Anti-Patterns

| Anti-Pattern | Description | Prevention |
|--------------|-------------|------------|
| BIG_BANG_CHANGES | Large changeset hard to review | Break into smaller commits |
| SKIPPED_VALIDATION | Validation errors found late | Run checks after each file |
| PATTERN_VIOLATION | Inconsistent with codebase patterns | Reference existing code |

### Review Anti-Patterns

| Anti-Pattern | Description | Prevention |
|--------------|-------------|------------|
| RUSHED_REVIEW | Issues found post-merge | Complete full quality gate |
| IGNORED_WARNINGS | Warnings became errors | Address warnings as errors |

---

## Pattern Injection

Patterns are injected into the planning phase (step-02-plan) as:

```markdown
## Learned Patterns to Apply

Based on historical success:
- {pattern_1}: {recommendation}
- {pattern_2}: {recommendation}

## Anti-Patterns to Avoid

Based on historical failures:
- {antipattern_1}: {prevention}
- {antipattern_2}: {prevention}

## Thresholds

From historical averages:
- Target duration: {threshold} min
- Target files changed: {threshold}
- Target retries: 0
```

---

## Pattern Evolution

Patterns evolve as more features are completed:

1. **New Pattern Detection**: When a feature succeeds with notable characteristics
2. **Evidence Accumulation**: Pattern confidence increases with repeated occurrence
3. **Threshold Adjustment**: Thresholds recalculated from running averages
4. **Deprecation**: Patterns with low evidence or changed codebase may be deprecated

---

## Pattern Storage

Patterns are stored in `.nomos/learning/`:

```
.nomos/learning/
├── patterns.json       # Success patterns with evidence counts
├── antipatterns.json   # Failure patterns with severity
└── metrics.json        # Feature metrics for threshold calculation
```

### patterns.json Schema

```json
{
  "patterns": [
    {
      "name": "GOOD_PLANNING",
      "description": "Clear requirements led to smooth implementation",
      "evidence_count": 5,
      "last_seen": "F015",
      "applies_to": ["all"],
      "recommendation": "Ensure AC are specific and testable"
    }
  ]
}
```

### antipatterns.json Schema

```json
{
  "antipatterns": [
    {
      "name": "SCOPE_CREEP",
      "description": "Feature grew beyond original plan",
      "evidence_count": 2,
      "last_seen": "F012",
      "severity": "MEDIUM",
      "prevention": "Stick to plan, note extras as new features"
    }
  ]
}
```

### metrics.json Schema

```json
{
  "features": {
    "F015": {
      "duration_minutes": 45,
      "files_changed": 8,
      "lines_added": 234,
      "commits": 5,
      "retries": 0,
      "phase": "phase-2",
      "outcome": "success"
    }
  },
  "aggregates": {
    "avg_duration": 52,
    "avg_files": 10,
    "success_rate": 93,
    "total_features": 15
  }
}
```
