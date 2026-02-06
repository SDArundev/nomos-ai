# NOMOS Feature State Machine

## Overview

Features progress through a defined state machine tracked in `.nomos/features.json`.

---

## States

```
+-------------------------------------------------------------------+
|                                                                   |
|  backlog --> pending -------> in_progress ----> waiting_approval  |
|                |                 |    ↑               |           |
|                |                 |    |               v           |
|                |                 |  retry      +------------+     |
|                |                 |    |        |  verified  |     |
|                |                 v    |        +------------+     |
|                |              +--------+             |           |
|                |              | failed |             |           |
|                |              +--------+             |           |
|                |                                     |           |
|                +--------------(reset)----------------+           |
|                                                                   |
+-------------------------------------------------------------------+
```

### State Definitions

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `backlog` | Feature catalogued, not yet scheduled for work | (manual promotion to pending) |
| `pending` | Feature scheduled and ready to start | start, preverify |
| `in_progress` | Feature being implemented | complete, fail, reset |
| `failed` | Implementation failed with recorded reason | retry, reset |
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

**Trigger:** Feature passes all quality gates in step-04-verify

**Actions:**
1. Set `status` to `waiting_approval`
2. Set `completedAt` to current timestamp

**Guards:**
- All quality gates must pass (3 verification tracks)
- Implementation must match acceptance criteria

### verify: waiting_approval → verified

**Trigger:** Step-05-merge completes successfully

**Actions:**
1. Merge worktree to main
2. Set `status` to `verified`
3. Set `verifiedAt` to current timestamp
4. Clear `currentFeature`
5. Record learnings

**Guards:**
- Must be in `waiting_approval` state
- Final validation must pass

### fail: in_progress → failed

**Trigger:** Pipeline escalation (step-03 or step-04 exhausted retries)

**Actions:**
1. Set `status` to `failed`
2. Set `failureReason` to descriptive reason
3. Set `failedAt` to current timestamp
4. Preserve all other fields (startedAt, worktree, etc.)

**Guards:**
- Feature must be in `in_progress` state

### retry: failed → in_progress

**Trigger:** `/nomos -r F016` or manual retry after fixing root cause

**Actions:**
1. Set `status` to `in_progress`
2. Increment `retries` counter
3. Update `startedAt` to current timestamp

**Guards:**
- Feature must be in `failed` state
- Previous `failureReason` is preserved for context

### reset: any → pending

**Trigger:** Manual reset or clean restart

**Actions:**
1. Set `status` to `pending`
2. Set `passes` to `false`
3. Clear timestamps
4. Optionally remove worktree

**Guards:**
- User confirmation required
- Cannot reset `verified` features (would lose history)

### preverify: pending → verified (Pre-Implemented)

**Trigger:** Step-01-context detects feature already implemented

**Actions:**
1. Set `status` to `verified`
2. Set `passes` to `true`
3. Set `preImplemented` to `true`
4. Set `verifiedAt` to current timestamp
5. Skip to step-06-finish (learning extraction)

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
| pending | in_progress | Yes |
| pending | waiting_approval | No |
| pending | verified | Only preverify |
| in_progress | pending | Yes (reset) |
| in_progress | waiting_approval | Yes |
| in_progress | failed | Yes (escalation) |
| in_progress | verified | No |
| failed | in_progress | Yes (retry) |
| failed | pending | Yes (reset) |
| waiting_approval | pending | Yes (reset) |
| waiting_approval | in_progress | No |
| waiting_approval | verified | Yes |
| verified | any | No (terminal) |

### Validation Function

```bash
validate_transition() {
  local from="$1"
  local to="$2"

  case "$from:$to" in
    "pending:in_progress") return 0 ;;
    "in_progress:waiting_approval") return 0 ;;
    "in_progress:failed") return 0 ;;
    "in_progress:pending") return 0 ;;
    "failed:in_progress") return 0 ;;
    "failed:pending") return 0 ;;
    "waiting_approval:verified") return 0 ;;
    "waiting_approval:pending") return 0 ;;
    *) return 1 ;;
  esac
}
```

---

## NOMOS v2 Step to State Mapping

| Step | State Transition |
|------|------------------|
| step-00-init | pending → in_progress |
| step-01-context | (remains in_progress) |
| step-02-plan | (remains in_progress) |
| step-03-execute | (remains in_progress) |
| step-04-verify | in_progress → waiting_approval |
| step-05-merge | waiting_approval → verified |
| step-06-finish | (post-verification) |

---

## Script Interface

All state operations use the unified script:

```bash
bash .claude/skills/nomos/scripts/nomos.sh state <action> <feature_id>
```

Actions: `start`, `claim`, `complete`, `verify`, `reset`, `fail`, `retry`, `preverify`, `get`, `next`
