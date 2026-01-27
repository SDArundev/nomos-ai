# NOMOS Feature: {{feature_id}}

**Created:** {{timestamp}}
**Feature:** {{feature_title}}

---

## Feature Specification

**ID:** {{feature_id}}
**Title:** {{feature_title}}
**Phase:** {{feature_phase}}
**Priority:** {{feature_priority}}

### Description

{{feature_description}}

### Acceptance Criteria

{{acceptance_criteria}}

### Dependencies

{{feature_dependencies}}

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | {{auto_mode}} |
| Test mode (`-t`) | {{test_mode}} |
| PR mode (`-pr`) | {{pr_mode}} |
| Plan only (`-p`) | {{plan_only}} |
| Verify only (`-v`) | {{verify_only}} |
| Interactive mode (`-i`) | {{interactive_mode}} |

---

## Worktree

**Path:** `.nomos/worktrees/{{feature_id}}`
**Branch:** `nomos/{{feature_id}}`

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ⏸ Pending | |
| 01-context | ⏸ Pending | |
| 02-analyze | ⏸ Pending | |
| 03-plan | ⏸ Pending | |
| 04-execute | ⏸ Pending | |
| 05-validate | ⏸ Pending | |
| 06-review | ⏸ Pending | |
| 07-test | {{test_status}} | |
| 08-merge | ⏸ Pending | |
| 09-learn | ⏸ Pending | |
| 10-ship | {{pr_status}} | |
