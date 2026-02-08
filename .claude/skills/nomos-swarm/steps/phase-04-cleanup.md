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

**After each call**, verify the `failureReason` was written correctly:

```bash
jq -r --arg id "{feature_id}" '.features[] | select(.id == $id) | .failureReason' .nomos/features.json
```

If the result is `null` or empty (e.g. special chars in the reason broke parsing), apply a direct jq fallback:

```bash
jq --arg id "{feature_id}" --arg reason "swarm_audit: {reason}" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '.features |= map(if .id == $id then .status = "failed" | .failureReason = $reason | .failedAt = $ts else . end)' \
  .nomos/features.json > .nomos/features.json.tmp && mv .nomos/features.json.tmp .nomos/features.json
```

<critical>
- The `state.sh` `fail` action has NO status guard — it works from ANY state including `verified`.
- Always use `--arg` for jq values containing special characters like `[0-9]{3}`, `(parens)`, or quotes.
- The canonical field is `failureReason` (NOT `failedReason`).
</critical>

### Applying New Backlog Items

Always apply new backlog items from audit findings (no `-f` flag gate required — audit findings should always create backlog items so fixes can be tracked).

For each item in `actions.new_backlog_items`:

1. Compute the next feature ID:
```bash
next_id=$(jq '[.features[].id | ltrimstr("F") | tonumber] | max + 1' .nomos/features.json)
feature_id="F$(printf '%03d' "$next_id")"
```

2. Append the new feature using `--arg` for all string fields:
```bash
jq --arg id "$feature_id" \
   --arg title "{item.title}" \
   --arg desc "{item.description}" \
   --argjson priority "{item.priority}" \
   --arg tag_fix "fix:{original_feature_id}" \
   --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.features += [{
     id: $id, title: $title, description: $desc,
     status: "backlog", priority: $priority, passes: false,
     category: "fix", tags: ["swarm-audit", $tag_fix],
     acceptanceCriteria: [], createdAt: $ts
   }]' .nomos/features.json > .nomos/features.json.tmp && mv .nomos/features.json.tmp .nomos/features.json
```

3. Verify after each append:
```bash
jq --arg id "$feature_id" '.features[] | select(.id == $id) | .title' .nomos/features.json
```

### Applying Learning Updates

**New antipatterns:** Append to `.nomos/learning/antipatterns.json` (if file exists).

Map audit schema to learning schema:
- Audit fields: `name`, `description`, `example`, `impact`
- Learning fields: `id`, `name`, `description`, `category`, `severity`, `prevention`, `what_went_wrong`, `lesson`

Before appending, dedup by name:
```bash
existing=$(jq -r '.antipatterns[].name' .nomos/learning/antipatterns.json 2>/dev/null)
```

Skip any antipattern whose `name` already exists. For new ones, append:

```json
{
  "id": "AP-{next_id}",
  "name": "{antipattern.name}",
  "description": "{antipattern.description}",
  "category": "swarm-audit",
  "severity": "medium",
  "prevention": "{derived from antipattern.impact}",
  "what_went_wrong": "{antipattern.example}",
  "lesson": "{antipattern.description}",
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

Count actual applied items by querying the files (don't trust in-memory counters):

```bash
# Count features in failed state that match this session's transitions
failed_count=$(jq '[.features[] | select(.status == "failed" and (.failureReason // "" | startswith("swarm_audit:")))] | length' .nomos/features.json)

# Count backlog items tagged with this session
backlog_count=$(jq '[.features[] | select(.tags != null and (.tags | index("swarm-audit")) != null and .status == "backlog")] | length' .nomos/features.json)

# Count antipatterns from this session
ap_count=$(jq '[.antipatterns[] | select(.source == "swarm_audit")] | length' .nomos/learning/antipatterns.json 2>/dev/null || echo 0)
```

Update `{output_dir}/session.json`:

```json
{
  "status": "completed",
  "completed_at": "{timestamp}",
  "actions_applied": {
    "state_transitions": "{failed_count}",
    "backlog_items": "{backlog_count}",
    "learning_updates": "{ap_count}"
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
