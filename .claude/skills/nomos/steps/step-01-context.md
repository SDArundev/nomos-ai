---
name: step-01-context
description: Load learnings, patterns, and memory from NOMOS learning system
prev_step: steps/step-00-init.md
next_step: steps/step-02-analyze.md
---

# Step 1: Load Context (NOMOS-Unique)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip loading learnings if they exist
- 🛑 NEVER proceed without checking dependencies
- ✅ ALWAYS load patterns relevant to this feature's phase
- ✅ ALWAYS calculate risk assessment
- 📋 YOU ARE A CONTEXT LOADER, not an implementer
- 💬 FOCUS on gathering learned knowledge
- 🚫 FORBIDDEN to start any implementation

## EXECUTION PROTOCOLS:

- 🎯 Load learned patterns and anti-patterns
- 💾 Save loaded context to output file
- 📖 Calculate risk based on historical metrics
- 🚫 FORBIDDEN to proceed with blocked dependencies

## CONTEXT BOUNDARIES:

- Variables from step-00-init are available
- Feature spec is loaded from features.json
- Learning files may or may not exist
- This step enriches context before analysis

## YOUR TASK:

Load all relevant learned patterns, anti-patterns, metrics, and memory to enrich the implementation context.

---

<available_state>
From step-00-init:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier (e.g., F016) |
| `{feature_title}` | Feature title |
| `{feature_description}` | Feature description |
| `{acceptance_criteria}` | Success criteria |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output directory |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Initialize Output

Append to `{output_dir}/01-context.md`:

```markdown
# Context Loading: {feature_id}

**Started:** {timestamp}
**Feature:** {feature_title}

---
```

### 2. Load Learned Patterns

**If `.nomos/learning/patterns.json` exists:**

Read and extract patterns relevant to this feature:
- Filter by phase (if feature has phase assignment)
- Filter by category (UI, API, Database, etc.)
- Note success indicators (ZERO_RETRIES, SMALL_CHANGESET, etc.)

```markdown
## Learned Patterns

| Pattern | Success Rate | Applies To |
|---------|--------------|------------|
| {pattern_name} | {rate}% | {description} |
```

**If file doesn't exist:** Note "No learned patterns available yet."

### 3. Load Anti-Patterns

**If `.nomos/learning/antipatterns.json` exists:**

Read and extract warnings:
- Filter by relevance to this feature type
- Note failure indicators (HIGH_RETRIES, LARGE_CHANGESET, etc.)

```markdown
## Anti-Patterns to Avoid

| Anti-Pattern | Risk | Mitigation |
|--------------|------|------------|
| {antipattern_name} | {severity} | {how_to_avoid} |
```

**If file doesn't exist:** Note "No anti-patterns recorded yet."

### 4. Load Historical Metrics

**If `.nomos/learning/metrics.json` exists:**

Calculate thresholds from historical data:
- Average duration for similar features
- Average files changed
- Phase-specific success rate
- Typical retry count

```markdown
## Historical Metrics

| Metric | Average | Threshold |
|--------|---------|-----------|
| Duration | {avg} min | {avg * 1.5} min |
| Files Changed | {avg} | {avg * 1.5} |
| Retries | {avg} | {avg + 1} |
```

**If file doesn't exist:** Use default thresholds.

### 5. Calculate Risk Assessment

Based on feature complexity and historical data:

```
RISK FACTORS:
1. Phase success rate < 80% → +1 RISK
2. Many dependencies → +1 RISK
3. Unfamiliar technology → +1 RISK
4. Large scope (many AC) → +1 RISK
5. Previous failures on similar → +1 RISK

RISK LEVELS:
- 0-1 factors: LOW
- 2-3 factors: MEDIUM
- 4+ factors: HIGH
```

Set `{risk_level}` accordingly.

```markdown
## Risk Assessment

**Risk Level:** {risk_level}

**Factors:**
- [ ] Factor 1: {status}
- [ ] Factor 2: {status}
```

### 6. Check Dependencies

Read features.json and check if all dependencies are verified:

```bash
# Extract dependencies for this feature
jq '.features[] | select(.id == "{feature_id}") | .dependencies' .nomos/features.json
```

**If dependencies not verified:**
- List incomplete dependencies
- If `{auto_mode}` = false: Ask user to proceed or wait
- If `{auto_mode}` = true: WARN and proceed

```markdown
## Dependencies

| Dependency | Status |
|------------|--------|
| {dep_id} | ✓ Verified / ⏸ Pending |
```

### 7. Load Code Knowledge Base (MANDATORY)

**Load code-level patterns from `.nomos/learning/code/`:**

1. **Detect relevant categories** from feature description:
   - Keywords like "database", "drizzle", "sqlite" → `database.json`
   - Keywords like "auth", "validation", "xss" → `security.json`
   - Keywords like "react", "component", "hook" → `react.json`
   - Keywords like "api", "endpoint", "rest" → `api.json`
   - Keywords like "types", "schema", "zod" → `typescript.json`

2. **Load matching category files**:
   ```bash
   # Example: Feature involves database and API
   categories=("database" "api")
   for cat in "${categories[@]}"; do
     cat ".nomos/learning/code/${cat}.json"
   done
   ```

3. **Filter by severity** (always include CRITICAL and HIGH):
   ```
   patterns.filter(p =>
     p.severity === 'CRITICAL' ||
     p.severity === 'HIGH' ||
     p.tags.some(t => featureTags.includes(t))
   )
   ```

4. **Verify CRITICAL patterns with Context7** (MANDATORY):
   ```
   For each CRITICAL pattern with context7LibraryId:
     → Use mcp__context7__query-docs
     → libraryId: pattern.context7LibraryId
     → query: pattern.context7Query
     → Check if pattern is still accurate
     → Note verification status
   ```

**Log:**
```markdown
## Code Patterns (from .nomos/learning/code/)

### Database Patterns
| ID | Title | Severity | Context7 Verified |
|----|-------|----------|-------------------|
| DB-001 | Sync Transactions | CRITICAL | ✓ 2026-01-25 |
| DB-003 | Connection Lifecycle | HIGH | - |

### Pitfalls to Avoid
| ID | Title | Error Pattern |
|----|-------|---------------|
| PIT-DB-001 | Transaction API Mismatch | "is not a function" |

### Best Practices
- BP-DB-001: Use Repository Pattern
```

### 8. Load Relevant Decisions

**If `.nomos/memory/decisions/` exists:**

Scan for decisions related to:
- This feature's phase
- Similar features
- Technical areas involved

```markdown
## Relevant Decisions

| Decision | Date | Summary |
|----------|------|---------|
| {title} | {date} | {one_line_summary} |
```

### 9. Generate Context Summary

Combine all loaded information:

```markdown
## Context Summary

**Feature:** {feature_title}
**Risk Level:** {risk_level}

**Patterns to Apply:**
- {pattern_1}
- {pattern_2}

**Anti-Patterns to Avoid:**
- {antipattern_1}
- {antipattern_2}

**Thresholds:**
- Target duration: {threshold} min
- Target files: {threshold}

**Dependencies:** {status}

→ Proceeding to analysis...
```

### 9. Complete Output

Append to `{output_dir}/01-context.md`:

```markdown
---
## Step Complete
**Status:** ✓ Complete
**Risk Level:** {risk_level}
**Patterns Loaded:** {count}
**Next:** step-02-analyze.md
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ Patterns loaded (if available)
✅ Anti-patterns loaded (if available)
✅ Metrics loaded and thresholds calculated
✅ Risk assessment completed
✅ Dependencies checked
✅ Relevant decisions noted
✅ Context summary generated
✅ Output saved

## FAILURE MODES:

❌ Skipping learning files without checking
❌ Not calculating risk assessment
❌ Proceeding with blocked dependencies (without warning)
❌ Not setting {learned_patterns} variable
❌ **CRITICAL**: Starting implementation in this step

## CONTEXT PROTOCOLS:

- Learning files are optional but valuable
- Always calculate risk even with no history
- Dependencies can block but user can override
- Set {learned_patterns} for injection in planning

---

## NEXT STEP:

After context summary, proceed directly to `./step-02-analyze.md`

<critical>
Remember: This step is ONLY about loading context - no analysis or planning yet!
</critical>
