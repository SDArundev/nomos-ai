# NOMOS Feature State Machine

## Overview

Features progress through a defined state machine tracked in `.nomos/features.json`.

---

## States

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   pending ──────► in_progress ──────► waiting_approval     │
│      │                │                      │              │
│      │                │                      ▼              │
│      │                │               ┌─────────────┐       │
│      │                │               │  verified   │       │
│      │                │               └─────────────┘       │
│      │                │                      │              │
│      └────────────────┴──────────────────────┘              │
│                    (reset)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `pending` | Feature defined but not started | start, preverify |
| `in_progress` | Feature being implemented | complete, reset |
| `waiting_approval` | Implementation done, awaiting review | verify, reset |
| `verified` | Feature approved and merged | (terminal) |

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `passes` | boolean | **Primary selection field** - false = needs work, true = complete |
| `status` | string | Workflow state tracking |
| `preImplemented` | boolean | True if feature existed before NOMOS ran |

---

## Transitions

### start: pending → in_progress

**Trigger:** `/nomos F016` or `/nomos -a F016`

**Actions:**
1. Create worktree at `.nomos/worktrees/{feature_id}`
2. Set `status` to `in_progress`
3. Set `startedAt` to current timestamp
4. Set `currentFeature` to `{feature_id}`

**Guards:**
- Feature must exist in .nomos/features.json
- Feature status must be `pending`
- All dependencies must be `verified` (or user override)

### complete: in_progress → waiting_approval

**Trigger:** Feature passes all quality gates in step-06

**Actions:**
1. Set `status` to `waiting_approval`
2. Set `completedAt` to current timestamp

**Guards:**
- All quality gates must pass
- Implementation must match acceptance criteria

### verify: waiting_approval → verified

**Trigger:** `/nomos -v F016` passes review or automatic in step-08

**Actions:**
1. Merge worktree to main
2. Set `status` to `verified`
3. Set `verifiedAt` to current timestamp
4. Clear `currentFeature`
5. Record learnings

**Guards:**
- Must be in `waiting_approval` state
- Final validation must pass

### reset: any → pending

**Trigger:** Manual reset or critical failure

**Actions:**
1. Set `status` to `pending`
2. Set `passes` to `false`
3. Clear timestamps
4. Optionally remove worktree

**Guards:**
- User confirmation required
- Cannot reset `verified` features (would lose history)

### preverify: pending → verified (Pre-Implemented)

**Trigger:** Step-02-analyze detects feature already implemented

**Actions:**
1. Set `status` to `verified`
2. Set `passes` to `true`
3. Set `preImplemented` to `true`
4. Set `verifiedAt` to current timestamp
5. Skip to step-09-learn

**Guards:**
- All acceptance criteria must be met by existing code
- Evidence must be documented with file:line references

---

## State Storage

### .nomos/features.json Structure

```json
{
  "features": [
    {
      "id": "F016",
      "title": "Feature Title",
      "description": "Feature description",
      "passes": false,
      "status": "in_progress",
      "preImplemented": null,
      "phase": "phase-2",
      "priority": "high",
      "dependencies": ["F015"],
      "acceptanceCriteria": [
        "AC1: Description",
        "AC2: Description"
      ],
      "startedAt": "2026-01-25T10:00:00Z",
      "completedAt": null,
      "verifiedAt": null
    }
  ],
  "state": {
    "currentFeature": "F016",
    "history": [
      {
        "timestamp": "2026-01-25T10:00:00Z",
        "feature": "F016",
        "action": "start",
        "from": "pending",
        "to": "in_progress"
      }
    ]
  }
}
```

---

## State Queries

### Get Current Feature

```bash
jq -r '.state.currentFeature' .nomos/features.json
```

### Get Feature Status

```bash
jq -r '.features[] | select(.id == "F016") | .status' .nomos/features.json
```

### List Features by Status

```bash
jq -r '.features[] | select(.status == "pending") | .id' .nomos/features.json
```

### List Features Needing Work (passes == false)

```bash
jq -r '.features[] | select(.passes == false) | "\(.id): \(.title)"' .nomos/features.json
```

### List Pre-Implemented Features

```bash
jq -r '.features[] | select(.preImplemented == true) | .id' .nomos/features.json
```

### Get History for Feature

```bash
jq -r '.state.history[] | select(.feature == "F016")' .nomos/features.json
```

---

## State Validation

### Valid Transitions Matrix

| From | To | Valid? |
|------|----|--------|
| pending | in_progress | ✓ |
| pending | waiting_approval | ✗ |
| pending | verified | ✗ |
| in_progress | pending | ✓ (reset) |
| in_progress | waiting_approval | ✓ |
| in_progress | verified | ✗ |
| waiting_approval | pending | ✓ (reset) |
| waiting_approval | in_progress | ✗ |
| waiting_approval | verified | ✓ |
| verified | any | ✗ (terminal) |

### Validation Function

```bash
validate_transition() {
  local from="$1"
  local to="$2"

  case "$from:$to" in
    "pending:in_progress") return 0 ;;
    "in_progress:waiting_approval") return 0 ;;
    "in_progress:pending") return 0 ;;
    "waiting_approval:verified") return 0 ;;
    "waiting_approval:pending") return 0 ;;
    *) return 1 ;;
  esac
}
```

---

## NOMOS Step to State Mapping

| Step | State Transition |
|------|------------------|
| step-00-init | pending → in_progress |
| step-01 to step-05 | (remains in_progress) |
| step-06-review | in_progress → waiting_approval |
| step-07-test | (remains waiting_approval) |
| step-08-merge | waiting_approval → verified |
| step-09-learn | (post-verification) |
| step-10-ship | (post-verification) |
