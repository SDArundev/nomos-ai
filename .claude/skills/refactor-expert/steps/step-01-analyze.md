# Step 01: Analyze Impact

<objective>
Understand the full scope of the refactoring by finding all usages, dependencies, and potential risks.
</objective>

<instructions>

## 1. Launch Analysis Agents

Launch in parallel based on refactor type:

```javascript
const agents = [
  {
    type: "code-explorer",
    prompt: `Analyze usage of "${target}" in the codebase:
      1. Find all imports/references
      2. Map which files depend on it
      3. Identify patterns of usage
      4. Note any edge cases or special handling
      Provide a structured report.`
  }
];

// Add type-specific analysis
if (refactor_type === "dependency") {
  agents.push({
    type: "code-explorer",
    prompt: `Analyze the ${target} package:
      1. Which functions/exports are used?
      2. Are there type imports?
      3. Any version-specific features?
      4. Compare API to ${replacement}`
  });
}
```

## 2. Dependency Type Analysis

For `dependency` refactor, analyze:

```markdown
### Dependency Analysis: {target} → {replacement}

**Current Usage:**
- Files importing: {count}
- Functions used: {list}
- Types imported: {list}

**API Mapping:**
| {target} | {replacement} | Notes |
|----------|---------------|-------|
| _.map() | map() | Direct equivalent |
| _.debounce() | debounce() | Similar API |
| _.get() | get() | Different signature |

**Breaking Changes:**
- {list any API differences}

**Risk Level:** {LOW|MEDIUM|HIGH}
```

## 3. Move Type Analysis

For `move` refactor, analyze:

```markdown
### Move Analysis: {target} → {replacement}

**Files to Move:**
- {list files}

**Importers (need path updates):**
- {list files that import from target}

**Internal Dependencies:**
- {list dependencies within target}

**Path Changes:**
| Old Path | New Path |
|----------|----------|
| {old} | {new} |

**tsconfig.json Updates:**
- paths: {changes needed}

**Risk Level:** {LOW|MEDIUM|HIGH}
```

## 4. Rename Type Analysis

For `rename` refactor, analyze:

```markdown
### Rename Analysis: {target} → {replacement}

**Symbol Type:** {class|function|variable|type|interface}

**Definition Location:**
- {file}:{line}

**References Found:**
- Code references: {count}
- Type references: {count}
- String literals: {count}
- Comments/docs: {count}
- Test files: {count}

**Files Affected:**
- {list}

**Risk Level:** {LOW|MEDIUM|HIGH}
```

## 5. Optimize Type Analysis

For `optimize` refactor, analyze:

```markdown
### Optimization Analysis: {target}

**Current Metrics:**
- Build time: {ms}
- Bundle size: {kb}
- Test duration: {ms}
- Complexity score: {score}

**Identified Bottlenecks:**
1. {bottleneck description}
2. {bottleneck description}

**Optimization Opportunities:**
1. {opportunity}
2. {opportunity}

**Risk Level:** {LOW|MEDIUM|HIGH}
```

## 6. Calculate Risk Level

```javascript
function calculateRisk(analysis) {
  let risk = 0;

  // File count
  if (analysis.filesAffected > 50) risk += 2;
  else if (analysis.filesAffected > 20) risk += 1;

  // Breaking changes
  if (analysis.breakingChanges.length > 0) risk += 2;

  // Test coverage
  if (analysis.testCoverage < 50) risk += 2;
  else if (analysis.testCoverage < 80) risk += 1;

  // Type of change
  if (refactor_type === "structure") risk += 2;
  if (refactor_type === "dependency") risk += 1;

  return risk >= 4 ? "HIGH" : risk >= 2 ? "MEDIUM" : "LOW";
}
```

## 7. Generate Analysis Report

Save to `{output_dir}/analysis.md`:

```markdown
# Refactor Analysis Report

**Type:** {refactor_type}
**Target:** {target}
**Replacement:** {replacement}
**Generated:** {timestamp}

---

## Summary

| Metric | Value |
|--------|-------|
| Files Affected | {count} |
| Lines Changed (est.) | {count} |
| Test Files | {count} |
| Risk Level | {risk_level} |

---

## Impact Details

{type-specific analysis from above}

---

## Recommendations

1. {recommendation}
2. {recommendation}

---

## Proceed?

Risk Level: **{risk_level}**

{risk_level === "HIGH" ? "⚠️ Manual review recommended before proceeding." : ""}
```

## 8. Update State

```bash
# Update state.json
jq '.status = "analyzed" | .risk_level = "{risk_level}" | .analysis = {analysis_summary}' \
  state.json > state.json.tmp && mv state.json.tmp state.json
```

## 9. Confirmation (Unless Auto Mode)

If `{auto_mode}` is false and risk is HIGH:

```yaml
questions:
  - header: "Proceed?"
    question: "Analysis complete. Risk level is {risk_level}. Proceed with refactoring?"
    options:
      - label: "Proceed"
        description: "Continue with refactoring"
      - label: "Abort"
        description: "Cancel and cleanup"
    multiSelect: false
```

</instructions>

<next_step>
Load `steps/step-02-plan.md`
</next_step>
