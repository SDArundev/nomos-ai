# Phase 4: CLEANUP

Shutdown the agent team, optionally apply recommended actions, and clean up resources.

**Input:** `session_config`, `findings`, `actions` from Phase 3

---

## 1. Shutdown Teammates

Send shutdown requests to each teammate:

```
For each agent in session_config.team.agents:
  SendMessage(
    type="shutdown_request",
    recipient="{agent_name}",
    content="Swarm session complete. Shutting down."
  )
```

Wait for each agent to acknowledge (they respond with `shutdown_response`).

<critical>
- Send shutdown requests ONE AT A TIME and wait for acknowledgment
- If an agent doesn't respond within 30 seconds, proceed (it may have already exited)
- Do NOT force-kill agents — always request graceful shutdown
</critical>

---

## 2. Kill Dev Server (if audit mode with tester)

If the tester was active and started a dev server:

```bash
# Find and kill dev server processes
pkill -f "bun run dev" 2>/dev/null || true
```

Only do this if the tester was part of the team.

---

## 3. Apply Actions

### If `-a` (auto) flag is set:

Apply all recommended actions automatically.

### If `-a` is NOT set:

Present the actions summary and ask for confirmation:

```
Recommended Actions:
━━━━━━━━━━━━━━━━━━━

State Transitions ({N}):
  F025: verified → failed (login form non-functional)
  F031: verified → failed (tool call viz missing data layer)

New Backlog Items ({N}):
  [P1] Fix F025 login form submission
  [P1] Fix F031 tool call data layer

Learning Updates:
  +{N} new antipatterns
  -{N} stale patterns to remove
```

Use `AskUserQuestion` to confirm:
- "Apply all actions" (recommended)
- "Apply state transitions only"
- "Apply learning updates only"
- "Skip all actions"

### Applying State Transitions

For each transition in `actions.state_transitions`:

```bash
bash .claude/skills/nomos/scripts/nomos.sh state fail {feature_id} "swarm_audit: {reason}"
```

<critical>
The `state.sh` `fail` action has NO status guard — it works from ANY state including `verified`.
This is intentional for swarm audit findings.
</critical>

### Applying New Backlog Items

If `-f` (fix) flag is set, add new features to `.nomos/features.json`:

For each item in `actions.new_backlog_items`:
1. Read current features.json
2. Generate next feature ID (e.g., F073)
3. Append new feature object:

```json
{
  "id": "F073",
  "title": "{item.title}",
  "description": "{item.description}",
  "status": "backlog",
  "priority": "{item.priority}",
  "category": "fix",
  "tags": ["swarm-audit", "fix:{original_feature_id}"],
  "acceptanceCriteria": [],
  "createdAt": "{timestamp}"
}
```

4. Write updated features.json

### Applying Learning Updates

**New antipatterns:** Append to `.nomos/learning/antipatterns.json` (if file exists):
```json
{
  "name": "{antipattern.name}",
  "description": "{antipattern.description}",
  "example": "{antipattern.example}",
  "impact": "{antipattern.impact}",
  "confidence": 0.5,
  "source": "swarm_audit",
  "added": "{timestamp}"
}
```

**Stale patterns:** If `--prune` flag, remove from `.nomos/learning/patterns.json`.
Otherwise, just note them in the report.

---

## 4. Delete Team

```
TeamDelete()
```

This removes:
- `~/.claude/teams/{team_name}/` — team config
- `~/.claude/tasks/{team_name}/` — task list

---

## 5. Update Session Status

Update `{output_dir}/session.json`:

```json
{
  "status": "completed",
  "completed_at": "{timestamp}",
  "actions_applied": {
    "state_transitions": 2,
    "backlog_items": 2,
    "learning_updates": 3
  }
}
```

---

## 6. Final Summary

Print completion banner:

```
NOMOS Swarm — {MODE} Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:     Complete
Duration:   {N} minutes
Findings:   {N} total
Actions:    {N} applied

Output:     {output_dir}/
  findings.json   — {N} findings
  actions.json    — {N} actions
  report.md       — human-readable summary

{If actions applied:}
Applied:
  {N} features marked as failed
  {N} new fix tasks created
  {N} learning entries updated

{If actions skipped:}
Actions saved to {output_dir}/actions.json
Run with -a to auto-apply, or apply manually.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Done

Session complete. No further phases.
