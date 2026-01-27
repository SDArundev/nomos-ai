# Verification Templates

Templates for verification output files. Used by steps to generate consistent reports.

## Output Templates

| Template | Purpose | Output Location |
|----------|---------|-----------------|
| `summary.md` | Human-readable report | `.nomos/verify/{timestamp}/summary.md` |
| `issues.json` | Machine-readable issues | `.nomos/verify/{timestamp}/issues.json` |
| `enhancements.json` | Enhancement suggestions | `.nomos/verify/{timestamp}/enhancements.json` |

## Global Files

| File | Purpose | Location |
|------|---------|----------|
| `enhancements-backlog.json` | Cumulative enhancement backlog | `.nomos/enhancements-backlog.json` |

## Learning Templates

| Template | Purpose | Output Location |
|----------|---------|-----------------|
| `verification-patterns.json` | Issue patterns | `.nomos/learning/verification-patterns.json` |

## Variable Placeholders

Templates use `{variable}` syntax for replacement:

| Variable | Description |
|----------|-------------|
| `{timestamp}` | ISO timestamp of verification |
| `{scope}` | Verification scope |
| `{mode}` | quick/standard/deep |
| `{feature_count}` | Number of features verified |
| `{total}` | Total features |
| `{passed}` | Passed count |
| `{failed}` | Failed count |
| `{regressions}` | Regression count |
| `{pass_rate}` | Pass percentage |
| `{feature_results}` | Markdown table rows |
| `{critical_issues}` | Critical issue list |
| `{high_issues}` | High issue list |
| `{recommendations}` | Generated recommendations |

## Usage

```javascript
// Load template
const template = fs.readFileSync('templates/summary.md', 'utf8');

// Replace variables
const report = template
  .replace('{timestamp}', timestamp)
  .replace('{scope}', scope)
  // ... etc

// Write output
fs.writeFileSync(`${outputDir}/summary.md`, report);
```
