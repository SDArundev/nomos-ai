# Refactor Expert Templates

Templates for refactoring output files.

## Output Templates

| Template | Purpose | Output Location |
|----------|---------|-----------------|
| `analysis.md` | Impact analysis report | `.nomos/refactor/{timestamp}/analysis.md` |
| `plan.md` | Step-by-step plan | `.nomos/refactor/{timestamp}/plan.md` |
| `diff-summary.md` | Changes summary | `.nomos/refactor/{timestamp}/diff-summary.md` |
| `migration-guide.md` | Migration instructions | `.nomos/refactor/{timestamp}/migration-guide.md` |
| `state.json` | Session state | `.nomos/refactor/{timestamp}/state.json` |

## Global Files

| File | Purpose | Location |
|------|---------|----------|
| `refactoring-history.json` | All refactoring records | `.nomos/learning/refactoring-history.json` |

## Variable Placeholders

| Variable | Description |
|----------|-------------|
| `{timestamp}` | ISO timestamp |
| `{refactor_type}` | Type of refactor |
| `{target}` | Refactor target |
| `{replacement}` | Replacement value |
| `{files_changed}` | Count of files |
| `{lines_added}` | Lines added |
| `{lines_removed}` | Lines removed |
| `{risk_level}` | LOW/MEDIUM/HIGH |
