# NOMOS Template System v2

## Overview

This directory contains template files used to initialize NOMOS workflow outputs for each feature. Templates are rendered by the unified `nomos.sh init` command.

## Template Files (7)

| Template | Purpose | Created When |
|----------|---------|--------------|
| `00-context.md` | Workflow configuration and progress tracking (7 rows) | Always |
| `01-context.md` | Learnings + codebase + research context (merged) | Always |
| `02-plan.md` | Implementation plan | Always |
| `03-execute.md` | Implementation log | Always |
| `04-verify.md` | Static + runtime + review verification (unified) | Always |
| `05-merge.md` | Merge log | Always |
| `06-finish.md` | Learning extraction + ship log | Always |

## Template Variables

Templates use `{{variable}}` syntax for placeholders:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{feature_id}}` | Feature identifier | `F016` |
| `{{feature_title}}` | Feature title | `User Authentication` |
| `{{feature_description}}` | Feature description | `Add login and signup...` |
| `{{feature_phase}}` | Phase assignment | `phase-2` |
| `{{feature_priority}}` | Priority level | `high` |
| `{{feature_dependencies}}` | Dependencies list | `F015, F014` |
| `{{acceptance_criteria}}` | Acceptance criteria text | `AC1: Users can...` |
| `{{timestamp}}` | ISO 8601 timestamp | `2026-01-28T10:30:00Z` |
| `{{auto_mode}}` | Auto mode flag | `true` or `false` |
| `{{test_mode}}` | Test mode flag | `true` or `false` |
| `{{pr_mode}}` | PR mode flag | `true` or `false` |
| `{{plan_only}}` | Plan only flag | `true` or `false` |
| `{{verify_only}}` | Verify only flag | `true` or `false` |
| `{{interactive_mode}}` | Interactive mode flag | `true` or `false` |
| `{{test_status}}` | Progress status for test | `Pending` or `Skip` |
| `{{pr_status}}` | Progress status for PR | `Pending` or `Skip` |
| `{{risk_level}}` | Risk level | `PENDING` (updated later) |

## Setup

### Initialization

```bash
bash .claude/skills/nomos/scripts/nomos.sh init \
  "F016" \
  "Feature Title" \
  "Description" \
  "phase-2" \
  "high" \
  "F015" \
  "AC1: Description" \
  "true" \
  "false" \
  "true" \
  "false" \
  "false" \
  "false"
```

### Output

```
.nomos/output/F016/
├── 00-context.md
├── 01-context.md
├── 02-plan.md
├── 03-execute.md
├── 04-verify.md
├── 05-merge.md
└── 06-finish.md
```

## v1 → v2 Changes

| v1 (13 files) | v2 (7 files) | Change |
|----------------|--------------|--------|
| 00-context.md | 00-context.md | Progress table: 11 → 7 rows |
| 01-context.md | 01-context.md | Now includes codebase + research sections |
| 02-analyze.md | (merged into 01) | Eliminated |
| 03-plan.md | 02-plan.md | Renumbered |
| 04-execute.md | 03-execute.md | Renumbered |
| 05-validate.md | (merged into 04) | Eliminated |
| 06-review.md | (merged into 04) | Eliminated |
| 07-test.md | (merged into 04) | Eliminated |
| 08-merge.md | 05-merge.md | Renumbered |
| 09-learn.md | (merged into 06) | Eliminated |
| 10-ship.md | (merged into 06) | Eliminated |
| - | 04-verify.md | NEW: Unified verification |
| - | 06-finish.md | NEW: Unified finish |
