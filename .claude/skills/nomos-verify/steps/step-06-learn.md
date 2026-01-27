# Step 06: Learn from Verification

<objective>
Extract patterns from verification results to improve future development and verification.
</objective>

<instructions>

## 1. Analyze Failure Patterns

For each failed verification, identify:

```javascript
{
  feature_category: "CAT-API",
  failure_type: "runtime", // runtime, logic, security, quality
  root_cause: "missing_route", // missing_route, validation, state, config
  ac_pattern: "WebSocket upgrade at /ws", // What AC failed
  fix_pattern: "Ensure route registered before middleware" // How it was/should be fixed
}
```

### Common Failure Categories

| Category | Pattern | Learning |
|----------|---------|----------|
| Runtime | Service not running | Check prerequisites before test |
| Routing | 404 errors | Verify route registration order |
| Validation | Schema mismatch | Align frontend/backend schemas |
| State | Race conditions | Use transactions for multi-step ops |
| Security | Missing validation | Apply validation consistently |
| Integration | Service mismatch | Align seed data with defaults |

## 2. Record Issue Patterns

Update `.nomos/learning/verification-patterns.json`:

```json
{
  "patterns": [
    {
      "id": "VP-001",
      "name": "WebSocket Route Order",
      "description": "WebSocket upgrade must happen before Hono router intercepts",
      "category": "CAT-API",
      "frequency": 2,
      "last_seen": "2026-01-26",
      "features_affected": ["F037", "F162"],
      "prevention": "Check upgrade header before app.fetch()",
      "detection": "WebSocket connection returns 404"
    },
    {
      "id": "VP-002",
      "name": "Foreign Key Seed Mismatch",
      "description": "API fails when referenced entities don't exist",
      "category": "CAT-DB",
      "frequency": 1,
      "last_seen": "2026-01-26",
      "features_affected": ["F157"],
      "prevention": "Seed all required parent entities",
      "detection": "500 error with FK constraint message"
    }
  ]
}
```

## 3. Update Verification Heuristics

Based on patterns, update verification priorities:

```json
// .nomos/learning/verification-heuristics.json
{
  "high_risk_patterns": [
    {
      "pattern": "WebSocket|ws://",
      "risk": "HIGH",
      "reason": "Routing order issues common",
      "extra_checks": ["Check upgrade before router"]
    },
    {
      "pattern": "foreign key|FK|references",
      "risk": "MEDIUM",
      "reason": "Seed data often missing",
      "extra_checks": ["Verify parent entities exist"]
    }
  ],
  "category_risk": {
    "CAT-API": { "runtime_failures": 0.3, "common_issues": ["routing", "validation"] },
    "CAT-UI": { "runtime_failures": 0.1, "common_issues": ["state", "rendering"] },
    "CAT-DB": { "runtime_failures": 0.2, "common_issues": ["migrations", "seeds"] }
  }
}
```

## 4. Track Regression Patterns

When regressions occur, record:

```json
// .nomos/learning/regression-log.json
{
  "regressions": [
    {
      "timestamp": "2026-01-26T15:00:00Z",
      "feature": "F037",
      "was_verified_at": "2026-01-25T10:00:00Z",
      "broke_after": "commit abc123",
      "root_cause": "Security fix changed request handling order",
      "lesson": "Security middleware changes can affect WebSocket upgrade"
    }
  ]
}
```

## 5. Generate Insights

Analyze accumulated data for insights:

```markdown
## Verification Insights

### Most Common Issues (Last 30 Days)
1. **Routing Order** - 5 occurrences
2. **Seed Data Missing** - 3 occurrences
3. **Schema Mismatch** - 2 occurrences

### High-Risk Categories
1. CAT-API: 30% failure rate (mostly routing)
2. CAT-DB: 20% failure rate (migrations, seeds)
3. CAT-UI: 10% failure rate (state management)

### Recommendations for Future Development
- Always verify WebSocket routes manually after middleware changes
- Include seed verification in smoke tests
- Add schema validation tests for API contracts
```

## 6. Update Quality Gates

If patterns suggest new checks needed, propose additions:

```markdown
### Proposed Quality Gate Updates

Based on verification patterns, consider adding:

1. **QG-WS-001**: WebSocket connectivity check in smoke tests
2. **QG-SEED-001**: Verify seed data exists before API tests
3. **QG-SCHEMA-001**: Contract testing between frontend/backend
```

## 7. Save Learning Artifacts

```bash
# Ensure learning directories exist
mkdir -p .nomos/learning

# Update pattern files
node -e "
const fs = require('fs');

// Load existing or create new
const patternsFile = '.nomos/learning/verification-patterns.json';
let patterns = fs.existsSync(patternsFile)
  ? JSON.parse(fs.readFileSync(patternsFile, 'utf8'))
  : { patterns: [], updated: null };

// Add new patterns from this verification
// ... merge logic ...

patterns.updated = new Date().toISOString();
fs.writeFileSync(patternsFile, JSON.stringify(patterns, null, 2));
"
```

## 8. Display Learning Summary

```markdown
## Learning Extracted

### New Patterns Recorded
| ID | Pattern | Category |
|----|---------|----------|
| VP-003 | ID validation missing | CAT-API |

### Pattern Frequency Updated
| Pattern | Previous | Now |
|---------|----------|-----|
| VP-001 (WebSocket Route) | 1 | 2 |

### Insights Generated
- CAT-API failure rate: 25% → recommend extra routing checks
- Regression after security changes: 2 occurrences → add to checklist

### Files Updated
- `.nomos/learning/verification-patterns.json`
- `.nomos/learning/verification-heuristics.json`
- `.nomos/learning/regression-log.json`
```

</instructions>

<integration>

## How Learning Improves Future Verification

1. **Smarter Agent Prompts**: Include known patterns in agent instructions
2. **Risk-Based Prioritization**: Check high-risk categories first
3. **Targeted Checks**: Add specific checks for known issue patterns
4. **Regression Prevention**: Flag changes that historically cause regressions

## Learning Flow

```
Verification Fails
       ↓
Analyze Root Cause
       ↓
Record Pattern
       ↓
Update Heuristics
       ↓
Future Verifications Use Learned Patterns
       ↓
Fewer Failures Over Time
```

</integration>

<next_step>
Load `steps/step-07-merge.md` to merge changes or cleanup worktree.
</next_step>
