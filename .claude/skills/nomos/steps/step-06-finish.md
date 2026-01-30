---
name: step-06-finish
description: "Parallel finish: extract learnings + ship feature (PR creation)"
prev_step: steps/step-05-merge.md
---

# Step 6: Finish (2 Parallel Tracks)

## References
- `references/agent-prompts.md#step-06-track-a` — Learning extraction agent prompt
- `references/agent-prompts.md#step-06-track-b` — Ship feature agent prompt
- `references/output-formats.md#step-06` — Finish report format
- `references/output-formats.md#final-summary-format` — Final summary

## MANDATORY EXECUTION RULES:

- NEVER skip learning extraction
- NEVER overwrite existing patterns without merging
- NEVER push without user confirmation (unless auto_mode)
- ALWAYS extract at least one pattern per feature
- ALWAYS calculate feature metrics
- YOU ARE A LEARNER AND SHIPPER, not an implementer
- FORBIDDEN to modify any code

## MODE: 2 PARALLEL TRACKS

```
Track A: EXTRACT LEARNINGS
  → metrics, patterns, anti-patterns, code knowledge, retrospective

Track B: SHIP FEATURE (if pr_mode)
  → push branch, create PR
```

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier (e.g., F016) |
| `{feature_title}` | Feature title |
| `{auto_mode}` | Skip confirmations |
| `{pr_mode}` | Create pull request at end |
| `{output_dir}` | **ABSOLUTE** path to output directory (at project root, NOT worktree) |
| `{learned_patterns}` | Patterns that were applied |
| `{risk_level}` | Risk assessment from step-01 |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Launch BOTH Tracks in PARALLEL

<critical>
Launch both tracks in a SINGLE message if pr_mode is true.
If pr_mode is false, only launch Track A.
Read agent prompts from `references/agent-prompts.md`.
</critical>

**Track A:** Learning Extraction — see `references/agent-prompts.md#step-06-track-a-learning-extraction`

Track A uses `nomos.sh metrics {feature_id}` to collect metrics (replaces inline git/jq commands).

**Track B:** Ship Feature (if pr_mode) — see `references/agent-prompts.md#step-06-track-b-ship-feature`

### 3b. Process Execute Loop Candidates (within Track A)

Track A reads `{output_dir}/03-candidate-antipatterns.json` and processes candidates:
- Occurrences >= 2 AND matches existing → increment evidence_count
- Occurrences >= 2 AND new → add as new antipattern
- Occurrences == 1 → skip (insufficient evidence)

This creates a self-healing cycle: recurring execute-verify issues get promoted to antipatterns, which future QA reviews check for.

### 3c. Loop Iterations Consistency (within Track A)

In the session insight JSON (`insights/{feature_id}.json`), ensure `loop_iterations_used` is a top-level field set to the actual count from `{output_dir}/03-checkpoint.json`. This feeds back into step-02 calibration via `nomos.sh metrics --category-stats`.

### 3d. Pattern Freshness Check (within Track A)

For each pattern in `patterns.json`:
- If `last_seen` is > 10 features ago AND `confidence` < 0.5:
  → Reduce confidence by 0.1 (min 0.1)
  → Add note: "Stale — not applied in 10+ features"
- If `last_seen` is > 20 features ago:
  → Archive to `patterns-archive.json`
  → Remove from active `patterns.json`

This prevents context bloat as the pattern library grows and automatically prunes one-time observations.

### 3e. Post-Feature Metrics Comparison (within Track A)

Compare actual metrics against expected (from step-02 calibration if available):

```markdown
### Metrics Comparison
| Metric | Expected | Actual | Delta |
|--------|----------|--------|-------|
| Iterations | {planned} | {actual} | {+/-} |
| Files | {planned} | {actual} | {+/-} |
```

If any metric exceeds expected by >50%:
→ Flag for retrospective analysis
→ Check if plan was too optimistic or if unexpected complexity emerged
→ Record as learning: "Category X typically takes {actual} not {expected}"

This closes the loop: step-02 predicts → step-06 compares → updates thresholds → next step-02 predicts better.

### 2. Collect Results

After both tracks complete, gather Track A and Track B reports.

### 3. Save Output

Write to `{output_dir}/06-finish.md` using the format from `references/output-formats.md#step-06-finish-report-format`.

### 4. Final Summary

Display the final summary using the format from `references/output-formats.md#final-summary-format`.

---

## SUCCESS METRICS:

- All feature metrics collected
- Success patterns identified and recorded
- Anti-patterns identified and recorded
- Learning files updated (merged, not overwritten)
- Code patterns extracted and categorized
- Context7 used for CRITICAL patterns
- Retrospective generated
- PR created (if pr_mode)
- Final summary shown
- Output saved

## FAILURE MODES:

- Skipping metric collection
- Not identifying any patterns
- Overwriting existing patterns instead of merging
- Not updating aggregate statistics
- Modifying code in this step
- Creating PR with uncommitted changes

---

## WORKFLOW COMPLETE

This is the final step of the NOMOS v2 workflow. No next step to load.

<critical>
This step is about learning and shipping - the feature is already done and merged!
</critical>
