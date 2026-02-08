# Phase 2: FIX

Execute remediation for audit findings. Single-agent orchestration via Task tool — no team needed.

**Input:** `session_config` from Phase 0 (with audit context loaded)

---

## 1. Load Audit Context

Find the source audit session:

```bash
# Use the most recent audit directory, or the one specified in session_config.source_audit
audit_dir=$(ls -td .nomos/swarm/audit-* 2>/dev/null | head -1)
```

Read and validate:

```bash
actions=$(cat "${audit_dir}/actions.json")
findings=$(cat "${audit_dir}/findings.json")
```

<critical>
- STOP if no audit directory found or actions.json is missing
- STOP if actions.json has zero state_transitions AND zero new_backlog_items
- Report: "No audit findings to fix. Run `/nomos swarm audit` first."
</critical>

Extract fix targets — features in `backlog` state with tag `swarm-audit`:

```bash
fix_features=$(jq '[.features[] | select(.status == "backlog" and .category == "fix" and (.tags | index("swarm-audit")) != null)]' .nomos/features.json)
```

Also identify original failed features (for retry after fix):

```bash
failed_originals=$(jq '[.features[] | select(.status == "failed" and (.failureReason // "" | startswith("swarm_audit:")))]' .nomos/features.json)
```

Map each fix feature to its evidence from findings.json using the `fix:{original_id}` tag.

---

## 2. Batch Grouping

Cluster fix features by related original feature and code area:

```
batches = []
for each fix_feature in fix_features:
  original_id = extract from tags (e.g., "fix:F025" → "F025")
  code_area = derive from findings evidence (e.g., "auth", "api", "ui")

  # Find or create batch for this code area
  batch = find_batch(batches, code_area) or create_batch(code_area)
  batch.features.push(fix_feature)
  batch.originals.push(original_id)
  batch.evidence.push(matching findings from findings.json)
```

Priority ordering: CRITICAL severity first, then HIGH, MEDIUM, LOW.

Batch size limit: max 3 fix features per batch (keeps code-writer context focused).

---

## 3. Present Plan

Display the batch plan:

```
NOMOS Swarm — Fix Plan
━━━━━━━━━━━━━━━━━━━━━━

Source Audit: {audit_dir}
Fix Features: {N} total in {M} batches

Batch 1: {code_area} ({N} features)
  {fix_id}: {title} [CRITICAL]
    Evidence: {finding_id} — {summary}
    Original: {original_id}

Batch 2: {code_area} ({N} features)
  {fix_id}: {title} [HIGH]
    Evidence: {finding_id} — {summary}
    Original: {original_id}

━━━━━━━━━━━━━━━━━━━━━━
```

### If `--dry-run` flag is set:

Print the plan and STOP. Do not execute any batches.

```
DRY RUN — no changes will be made.
Run without --dry-run to execute fixes.
```

**STOP HERE for dry-run.**

### If `-a` (auto) flag is NOT set:

Use `AskUserQuestion` to confirm:
- "Execute all batches" (recommended)
- "Execute batch 1 only"
- "Skip — just show the plan"

---

## 4. Execute Batches

For each batch:

### 4a. State Transitions

```bash
for fix_id in batch.features:
  bash .claude/skills/nomos/scripts/nomos.sh state start "$fix_id"
```

### 4b. Dispatch Code Writer

```
writer_result = Task(
  subagent_type = "code-writer",
  model = "sonnet",
  description = "Fix {batch.code_area} batch",
  prompt = """
    ## Code Writer: Fix Batch — {batch.code_area}

    Working directory: {project_root}

    ### Fix Features
    {for each feature in batch: id, title, description}

    ### Audit Evidence
    {for each finding in batch.evidence:
      finding_id, feature_id, classification, severity,
      description, evidence details}

    ### Instructions
    1. Read the evidence carefully — understand WHAT is broken and WHY
    2. Fix each issue. Prefer minimal, targeted fixes over refactors
    3. Do NOT introduce new features or change unrelated code
    4. After fixing, verify the fix addresses the specific audit finding
    5. If a fix requires changes across multiple files, make all changes atomically

    ### Patterns to Follow
    {load from nomos.sh patterns if available}

    ### Antipatterns to Avoid
    {load from nomos.sh patterns --for-qa if available}
  """
)

writer_agent_id = writer_result.agent_id
```

### 4c. Dispatch QA Reviewer

```
qa_result = Task(
  subagent_type = "qa-reviewer",
  model = "sonnet",
  description = "Verify {batch.code_area} fixes",
  prompt = """
    ## QA Reviewer: Verify Fix Batch — {batch.code_area}

    ### Fix Features
    {for each feature in batch: id, title, acceptance criteria}

    ### Original Audit Findings
    {batch.evidence — the issues that triggered these fixes}

    ### Review Checklist
    For each fix feature:
    1. Does the fix address the specific audit finding?
    2. Has the root cause been fixed (not just symptoms)?
    3. Are there any regressions introduced?
    4. Does the code follow existing patterns?

    ### Verdict
    Return JSON:
    {
      "verdict": "PASS" | "FAIL",
      "features": [
        {
          "id": "F073",
          "status": "PASS" | "FAIL",
          "notes": "explanation"
        }
      ],
      "issues": ["description of any remaining issues"]
    }
  """
)
```

### 4d. Handle QA Result

**If PASS:** Continue to commit.

**If FAIL:** One retry via `Task(resume: writer_agent_id)` with QA feedback:

```
retry_result = Task(
  resume = writer_agent_id,
  prompt = """
    QA found issues with your fixes:
    {qa_result.issues}

    Please address these issues. This is your final attempt.
  """
)
```

Then re-run QA. If still FAIL, mark features as `needs_manual_review`:

```bash
for fix_id in failed_features:
  # Don't use state fail — leave in in_progress for manual intervention
  jq --arg id "$fix_id" --arg note "QA failed after retry — needs manual review" \
    '.features |= map(if .id == $id then .notes = $note else . end)' \
    .nomos/features.json > .nomos/features.json.tmp && mv .nomos/features.json.tmp .nomos/features.json
```

### 4e. Commit Batch

```bash
# Stage all changed files
git add -A

# Commit with structured message
git commit -m "fix(swarm): batch {N} — {batch.code_area}

Fixes: {comma-separated fix feature IDs}
Audit: {audit_dir}
Findings: {comma-separated finding IDs}

Co-Authored-By: Claude Sonnet <noreply@anthropic.com>"
```

### 4f. Complete Fix Features

```bash
for fix_id in passed_features:
  bash .claude/skills/nomos/scripts/nomos.sh state complete "$fix_id"
```

---

## 5. Post-Batch Processing

### Retry Original Failed Features

For each original feature that was fixed:

```bash
for original_id in batch.originals:
  # Only retry if the fix features all passed
  if all fix features for this original passed:
    bash .claude/skills/nomos/scripts/nomos.sh state retry "$original_id"
```

<critical>
- `state retry` only works on features in `failed` state
- Check current state before calling retry
- Retry moves feature to `in_progress` — it will need re-verification
</critical>

### Offer Re-Audit (if not `--skip-verify`)

If all batches completed and `--skip-verify` flag is NOT set:

```
Fixes applied. Would you like to re-audit the affected features?

Use AskUserQuestion:
- "Run quick re-audit" (recommended)
- "Skip re-audit"
```

If re-audit requested, print the command but do NOT execute (let the user run it):

```
Run: /nomos swarm audit {space-separated original feature IDs} -q
```

---

## 6. Write Summary

Write `{output_dir}/summary.json`:

```json
{
  "source_audit": "{audit_dir}",
  "timestamp": "{ISO timestamp}",
  "batches": [
    {
      "batch_number": 1,
      "code_area": "{area}",
      "features": ["F073", "F074"],
      "originals": ["F025"],
      "status": "completed | partial | failed",
      "commit_sha": "{sha}",
      "qa_verdict": "PASS | FAIL",
      "qa_retried": false
    }
  ],
  "totals": {
    "features_fixed": 4,
    "features_failed": 0,
    "batches_completed": 2,
    "batches_failed": 0,
    "originals_retried": 3
  },
  "feature_states": [
    {
      "id": "F073",
      "status": "waiting_approval",
      "was": "backlog"
    }
  ]
}
```

Write `{output_dir}/plan.json` (saved from step 3):

```json
{
  "batches": [
    {
      "batch_number": 1,
      "code_area": "{area}",
      "features": ["F073", "F074"],
      "evidence": [{"finding_id": "SW-001", "summary": "..."}],
      "priority": "CRITICAL"
    }
  ],
  "total_features": 4,
  "total_batches": 2
}
```

---

## 7. Print Completion Banner

```
NOMOS Swarm — Fix Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━

Source Audit: {audit_dir}
Batches:     {completed}/{total} completed
Features:    {fixed}/{total} fixed
Commits:     {N} commits

{For each batch:}
  Batch {N}: {code_area} — {status}
    Features: {ids}
    Commit: {sha_short}

{If any failed:}
  Needs Manual Review:
    {feature_id}: {reason}

{If originals retried:}
  Originals Retried:
    {original_id}: failed → in_progress

Output: {output_dir}/
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Done

Fix session complete. No further phases (fix mode skips Phase 3 Report and Phase 4 Cleanup).
