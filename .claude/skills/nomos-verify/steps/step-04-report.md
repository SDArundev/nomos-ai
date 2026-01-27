# Step 04: Generate Report

<objective>
Generate verification report and update features.json as needed.
</objective>

<instructions>

## 1. Generate Summary Report

Create `{output_dir}/summary.md`:

```markdown
# Verification Report

**Generated:** {timestamp}
**Scope:** {scope}
**Mode:** {mode}
**Features Verified:** {count}

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Features | {total} |
| Passed | {passed} |
| Failed | {failed} |
| Regressions | {regressions} |
| Issues Found | {issue_count} |

## Results by Feature

| ID | Title | Status | Issues |
|----|-------|--------|--------|
| F027 | Hono Server Foundation | ✅ PASS | 0 |
| F037 | WebSocket Handler | ❌ FAIL | 1 CRITICAL |
| ... | ... | ... | ... |

## Issues by Severity

### CRITICAL
| ID | Feature | Description |
|----|---------|-------------|
| ISS-001 | F037 | WebSocket returns 404 |

### HIGH
| ID | Feature | Description |
|----|---------|-------------|
| ISS-002 | F033 | Delete doesn't cascade sessions |

## Regressions

| Feature | Previous Status | Issue |
|---------|-----------------|-------|
| F037 | verified | Now fails: WebSocket 404 |

## Recommendations

1. Fix CRITICAL issues immediately (blocks other features)
2. Address HIGH issues before next release
3. MEDIUM issues can be batched
4. LOW issues are optional improvements
```

## 2. Update features.json

### Revert Regressions
```javascript
for (const f of regressions) {
  f.status = 'pending';
  delete f.verifiedAt;
  // Add note about regression
}
```

### Create Bug Fix Features (if -a mode)

For each CRITICAL/HIGH issue:

```javascript
const bugFix = {
  id: nextFeatureId(),
  title: `Fix: ${issue.description}`,
  category: affectedFeature.category,
  description: `BUG: ${issue.description}\n\nEvidence: ${issue.evidence}`,
  phase: affectedFeature.phase,
  priority: severityToPriority(issue.severity),
  status: 'backlog',
  dependencies: [], // or block the affected feature
  acceptanceCriteria: [
    `${issue.ac_affected} passes verification`,
    `Regression test added`
  ]
};
```

Priority mapping:
| Severity | Priority |
|----------|----------|
| CRITICAL | 1-2 |
| HIGH | 3-10 |
| MEDIUM | 11-30 |
| LOW | 31+ |

## 3. Save Updated features.json

```bash
# Backup first
cp .nomos/features.json .nomos/features.json.backup

# Write updated version
node -e "
const fs = require('fs');
const data = /* updated data */;
fs.writeFileSync('.nomos/features.json', JSON.stringify(data, null, 2) + '\n');
"
```

## 4. Generate Enhancement Suggestions

For **PASSED** features, analyze notes and observations to suggest future improvements.

### Enhancement Categories (by priority)

| Priority | Category | Description |
|----------|----------|-------------|
| P1 | security | Security hardening beyond requirements |
| P2 | performance | Speed, efficiency, resource optimization |
| P2 | resilience | Error recovery, graceful degradation |
| P3 | observability | Metrics, tracing, debugging improvements |
| P3 | testing | Additional test coverage, edge cases |
| P4 | ux | User/developer experience polish |
| P4 | documentation | API docs, examples, inline comments |
| P5 | architecture | Future extensibility, patterns |

### Generate from Notes

Convert verification notes to enhancement suggestions:

```javascript
for (const note of notes) {
  if (note.severity === 'LOW' && feature.status === 'passed') {
    const enhancement = {
      id: `ENH-${nextId()}`,
      feature: note.feature,
      priority: categorizePriority(note),
      category: categorizeType(note),
      title: note.description,
      description: note.details,
      rationale: "Discovered during verification - not required but would improve quality",
      effort: estimateEffort(note),
      impact: estimateImpact(note),
      suggested_ac: generateAC(note),
      related_notes: [note.id],
      discovered: timestamp,
      status: "proposed"
    };
    enhancements.push(enhancement);
  }
}
```

### Proactive Enhancement Discovery

Also scan for common improvement opportunities:

| Pattern | Enhancement Type |
|---------|------------------|
| No request validation | P2 resilience - Add Zod schemas |
| Plain text errors | P3 ux - Structured JSON errors |
| No rate limiting | P2 security - Add rate limits |
| No caching headers | P3 performance - Add ETag/Cache-Control |
| Missing Content-Type | P4 ux - Consistent response headers |
| No health metrics | P3 observability - Add /health/ready endpoint |
| No request IDs | P3 observability - Add correlation IDs |

### Save Enhancements

Create `{output_dir}/enhancements.json`:

```json
{
  "timestamp": "{timestamp}",
  "feature": "F027",
  "enhancements": [
    {
      "id": "ENH-001",
      "priority": "P3",
      "category": "ux",
      "title": "Return JSON for 404 errors",
      "description": "404 responses currently return plain text",
      "rationale": "Consistent API response format improves client handling",
      "effort": "low",
      "impact": "medium",
      "suggested_ac": ["All error responses return JSON with {error, message, statusCode}"]
    }
  ],
  "summary": {
    "total": 2,
    "by_priority": {"P2": 0, "P3": 1, "P4": 1}
  }
}
```

### Append to Global Enhancement Backlog

Merge new enhancements into `.nomos/enhancements-backlog.json` (cumulative file).

---

## 5. Generate Machine-Readable Output

Create `{output_dir}/issues.json`:

```json
{
  "timestamp": "{timestamp}",
  "scope": "{scope}",
  "results": {
    "passed": ["F027", "F028", ...],
    "failed": ["F037", ...],
    "regressions": ["F037"]
  },
  "issues": [
    {
      "id": "ISS-001",
      "feature": "F037",
      "severity": "CRITICAL",
      "description": "WebSocket returns 404",
      "fix_feature": "F162"
    }
  ],
  "features_updated": {
    "reverted_to_pending": ["F037"],
    "bug_fixes_created": ["F162", "F163"]
  }
}
```

## 5. Display Report Location

```markdown
## Report Generated

**Location:** {output_dir}/summary.md

**Files:**
- summary.md - Human-readable report
- issues.json - Machine-readable issues
- analysis.json - Full analysis data

**Features Updated:**
- Regressions reverted: {count}
- Bug fixes created: {count}
```

</instructions>

<next_step>
Load `steps/step-05-summary.md`
</next_step>
