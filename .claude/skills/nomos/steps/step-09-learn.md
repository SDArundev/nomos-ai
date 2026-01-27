---
name: step-09-learn
description: Extract patterns, metrics, and learnings from completed feature
prev_step: steps/step-08-merge.md
next_step: steps/step-10-ship.md
---

# Step 9: Learn (NOMOS-Unique)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip learning extraction
- 🛑 NEVER overwrite existing patterns without merging
- ✅ ALWAYS calculate feature metrics
- ✅ ALWAYS extract both patterns and anti-patterns
- ✅ ALWAYS update threshold calculations
- 📋 YOU ARE A LEARNER, not an implementer
- 💬 FOCUS on extracting reusable knowledge
- 🚫 FORBIDDEN to modify any code

## EXECUTION PROTOCOLS:

- 🎯 Collect all metrics from this feature
- 💾 Update learning files with new insights
- 📖 Generate retrospective summary
- 🚫 FORBIDDEN to skip metric collection

## CONTEXT BOUNDARIES:

- Feature has been merged successfully
- All output files from steps 00-08 are available
- Historical learning files may exist
- This step enriches the learning system

## YOUR TASK:

Extract patterns, anti-patterns, and metrics from the completed feature to improve future implementations.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier (e.g., F016) |
| `{feature_title}` | Feature title |
| `{output_dir}` | Path to output directory |
| `{learned_patterns}` | Patterns that were applied |
| `{risk_level}` | Risk assessment from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Initialize Output

Append to `{output_dir}/09-learn.md`:

```markdown
# Learning Extraction: {feature_id}

**Started:** {timestamp}
**Feature:** {feature_title}

---
```

### 2. Collect Feature Metrics

Calculate from git and state:

```bash
# Duration
startedAt=$(jq -r '.features["{feature_id}"].startedAt' .nomos/features.json)
verifiedAt=$(jq -r '.features["{feature_id}"].verifiedAt' .nomos/features.json)
duration_minutes=$((verifiedAt - startedAt))

# Files changed
git diff --stat main~1..main

# Lines changed
git diff --shortstat main~1..main

# Commit count
git rev-list --count nomos/{feature_id}
```

**Log:**
```markdown
## Feature Metrics

| Metric | Value |
|--------|-------|
| Duration | {minutes} min |
| Files Changed | {count} |
| Lines Added | +{count} |
| Lines Removed | -{count} |
| Commits | {count} |
| Retries | {count from state history} |
| Risk Level | {risk_level} |
| Outcome | SUCCESS |
```

### 3. Analyze for Success Patterns

Based on metrics, identify success indicators:

```
IF duration < threshold AND retries == 0:
  → Pattern: GOOD_PLANNING
  → "Clear requirements and plan led to smooth implementation"

IF files_changed < threshold:
  → Pattern: FOCUSED_SCOPE
  → "Well-scoped feature with minimal blast radius"

IF all_tests_passed_first_try:
  → Pattern: TEST_DRIVEN
  → "Tests written alongside implementation"
```

**Log:**
```markdown
## Success Patterns Identified

| Pattern | Evidence | Recommendation |
|---------|----------|----------------|
| {pattern} | {metric_evidence} | {apply_when} |
```

### 4. Analyze for Anti-Patterns

Based on metrics, identify warning signs:

```
IF retries > 2:
  → Anti-Pattern: UNCLEAR_REQUIREMENTS
  → "Multiple retries suggest unclear acceptance criteria"

IF files_changed > threshold * 1.5:
  → Anti-Pattern: SCOPE_CREEP
  → "Large changeset suggests feature grew beyond plan"

IF duration > threshold * 2:
  → Anti-Pattern: COMPLEXITY_UNDERESTIMATED
  → "Significantly longer than expected"
```

**Log:**
```markdown
## Anti-Patterns Identified

| Anti-Pattern | Evidence | Prevention |
|--------------|----------|------------|
| {antipattern} | {metric_evidence} | {how_to_avoid} |
```

### 5. Update metrics.json

Read existing metrics, add this feature:

```json
{
  "features": {
    "{feature_id}": {
      "duration_minutes": {value},
      "files_changed": {value},
      "lines_added": {value},
      "lines_removed": {value},
      "commits": {value},
      "retries": {value},
      "risk_level": "{risk_level}",
      "phase": "{phase}",
      "outcome": "success",
      "timestamp": "{ISO}"
    }
  },
  "aggregates": {
    "avg_duration": {recalculated},
    "avg_files": {recalculated},
    "success_rate": {recalculated}
  }
}
```

Write to `.nomos/learning/metrics.json`

### 6. Update patterns.json

Merge new patterns with existing:

```json
{
  "patterns": [
    {
      "name": "{pattern_name}",
      "description": "{description}",
      "evidence_count": {incremented},
      "last_seen": "{feature_id}",
      "applies_to": ["{category}"],
      "recommendation": "{recommendation}"
    }
  ]
}
```

Write to `.nomos/learning/patterns.json`

### 7. Update antipatterns.json

Merge new anti-patterns with existing:

```json
{
  "antipatterns": [
    {
      "name": "{antipattern_name}",
      "description": "{description}",
      "evidence_count": {incremented},
      "last_seen": "{feature_id}",
      "severity": "{HIGH/MEDIUM/LOW}",
      "prevention": "{how_to_avoid}"
    }
  ]
}
```

Write to `.nomos/learning/antipatterns.json`

### 8. Extract Code Patterns (MANDATORY)

**Analyze implementation for code-level learnings:**

1. **Identify learnable code from diff**:
   ```bash
   # Get changed files
   git diff --name-only HEAD~1

   # Analyze for patterns:
   # - Bug fixes → potential pitfalls
   # - New utilities → potential patterns
   # - Config changes → potential best practices
   ```

2. **Detect category from file paths**:
   ```
   /db/, /database/, drizzle    → database.json
   /auth/, /security/, jwt      → security.json
   /components/, .tsx, hooks    → react.json
   /api/, /routes/, endpoint    → api.json
   types.ts, schema, zod        → typescript.json
   Dockerfile, .yml, ci         → devops.json
   error, logger, pino          → error-handling.json
   ```

3. **Create pattern entry**:
   ```json
   {
     "id": "{CAT}-{next_number}",
     "title": "{descriptive_title}",
     "subcategory": "{specific_area}",
     "framework": "{library_used}",
     "problem": "{what_went_wrong_or_needed}",
     "solution": "{how_it_was_solved}",
     "codeBefore": "{if_applicable}",
     "codeAfter": "{working_code}",
     "learnedFrom": "{feature_id}",
     "severity": "{CRITICAL|HIGH|MEDIUM|LOW}",
     "tags": ["{relevant}", "{tags}"],
     "addedAt": "{ISO_timestamp}"
   }
   ```

4. **Enhance with Context7** (MANDATORY for new patterns):
   ```
   → Use mcp__context7__resolve-library-id
     query: "{framework_name} {topic}"

   → Use mcp__context7__query-docs
     libraryId: "{resolved_id}"
     query: "{pattern_topic}"

   → Add to pattern:
     context7Query: "{query_used}"
     context7LibraryId: "{library_id}"
   ```

5. **Update category file**:
   ```bash
   # Read existing
   cat .nomos/learning/code/{category}.json

   # Add new pattern to patterns array
   # Update lastUpdated timestamp
   # Write back
   ```

**Log:**
```markdown
## Code Patterns Extracted

### New Patterns
| ID | Category | Title | Context7 Enhanced |
|----|----------|-------|-------------------|
| {id} | {cat} | {title} | ✓ |

### New Pitfalls
| ID | Error | Prevention |
|----|-------|------------|
| {id} | {error} | {prevention} |

### Files Updated
- `.nomos/learning/code/{category}.json`
```

### 9. Generate Retrospective

Create a brief retrospective summary:

```markdown
## Retrospective: {feature_id}

### What Went Well
- {positive_1}
- {positive_2}

### What Could Improve
- {improvement_1}
- {improvement_2}

### Key Learnings
1. {learning_1}
2. {learning_2}

### Recommendations for Similar Features
- {recommendation_1}
- {recommendation_2}
```

### 9. Complete Output

Append to `{output_dir}/09-learn.md`:

```markdown
---
## Step Complete

**Status:** ✓ Complete
**Patterns Extracted:** {count}
**Anti-Patterns Extracted:** {count}
**Metrics Recorded:** ✓
**Next:** step-10-ship.md (if pr_mode) or COMPLETE
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ All feature metrics collected
✅ Success patterns identified and recorded
✅ Anti-patterns identified and recorded
✅ metrics.json updated
✅ patterns.json updated
✅ antipatterns.json updated
✅ **Code patterns extracted and categorized**
✅ **Context7 used to enhance new patterns**
✅ **Category files updated (.nomos/learning/code/)**
✅ Retrospective generated
✅ Output saved

## FAILURE MODES:

❌ Skipping metric collection
❌ Not identifying any patterns (there's always something to learn)
❌ Overwriting existing patterns instead of merging
❌ Not updating aggregate statistics
❌ **CRITICAL**: Modifying code in this step

## LEARNING PROTOCOLS:

- Always extract at least one pattern (positive or negative)
- Merge with existing learnings, don't overwrite
- Recalculate aggregates after adding new data
- Keep evidence count for pattern confidence
- Tag patterns with feature phase/category

---

## NEXT STEP:

**If `{pr_mode}` = true:** Proceed to `./step-10-ship.md`

**Otherwise:** WORKFLOW COMPLETE

```
✓ Feature {feature_id} Complete

**Summary:**
- Status: verified
- Duration: {duration} min
- Files: {count} changed
- Learnings: {count} patterns extracted

**Output:** {output_dir}/
```

<critical>
Remember: This step is ONLY about learning extraction - the feature is already done!
</critical>
