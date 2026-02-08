> **DEPRECATED (v3):** Superseded by NOMOS v4 phases. Kept for rollback. Restore: change SKILL.md FIRST ACTION to step-00-init.md.

# Agent Prompts Reference

All agent prompt templates used across NOMOS pipeline steps.

## Table of Contents

- [Step 01: Context Agents](#step-01-context-agents) — load-learnings, explore-codebase, explore-docs
- [Step 03: Execute-Verify Loop Agents](#step-03-execute-verify-loop-agents) — code-writer, qa-reviewer
- [Step 04: Static Checks (Track A)](#step-04-static-checks-track-a)
- [Step 04: Runtime Verification (Track B)](#step-04-runtime-verification-track-b)
- [Step 04: Code Review (Track C)](#step-04-code-review-track-c--3-phase-structure) — 3-phase: review, fix, re-review
- [Step 04: Failure Fix Agent](#step-04-failure-fix-agent)
- [Step 06 Track A: Learning Extraction](#step-06-track-a-learning-extraction)
- [Step 06 Track B: Ship Feature](#step-06-track-b-ship-feature)

---

## Step 01: Context Agents

### Agent 1: load-learnings (ALWAYS launch)

```
Task agent: load-learnings
Prompt: |
  Load NOMOS learnings for feature {feature_id}: {feature_title}
  Feature Category: {category}
  Feature Phase: {phase}
  Feature Description: {feature_description}

  1. Load patterns from .nomos/learning/patterns.json (if exists)
     - Filter by relevance to this feature's phase and category
     - Apply confidence-based filtering:
       * confidence >= 0.7 -> ALWAYS include
       * confidence >= 0.3 -> include IF relevant to this feature
       * confidence < 0.3 -> SKIP unless risk_if_ignored == "HIGH"
     - Sort included patterns by confidence (highest first)
  2. Load anti-patterns from .nomos/learning/antipatterns.json (if exists)
  3. Load metrics from .nomos/learning/metrics.json (if exists)
     - Calculate thresholds from historical data
  4. Load code knowledge from .nomos/learning/code/ (if exists)
     - Detect relevant categories from feature description
     - Load matching category files (database.json, typescript.json, etc.)
     - Filter by severity (always include CRITICAL and HIGH)
  5. Check dependencies from features.json
     - Verify all dependencies are verified
  5b. Load session insights (PRE-FILTERED by orchestrator):
     The orchestrator has already scored and filtered insights.
     Use the pre-filtered RELEVANT_INSIGHTS passed in the prompt context.
     Do NOT read all insight files from .nomos/learning/insights/ — only process the top 3 provided.
     From each provided insight, inject into context:
       * `discoveries` -> things to look for / reuse
       * `what_worked` -> approaches to follow
       * `what_failed` -> approaches to avoid
       * `recommendations` -> direct guidance
  6. Calculate risk assessment:
     - Phase success rate < 80% -> +1 RISK
     - Many dependencies -> +1 RISK
     - Unfamiliar technology -> +1 RISK
     - Large scope (many AC) -> +1 RISK
     - 0-1 factors: LOW, 2-3: MEDIUM, 4+: HIGH

  Report:
  - Patterns to apply
  - Anti-patterns to avoid
  - Historical thresholds
  - Code-level patterns (with severity)
  - Session insights (top 3 relevant: discoveries, what_worked, what_failed, recommendations)
  - Risk level (LOW/MEDIUM/HIGH)
  - Dependency status
```

### Agent 2: explore-codebase (ALWAYS launch)

```
Task agent: explore-codebase
Prompt: |
  Explore codebase for feature {feature_id}: {feature_title}
  Description: {feature_description}

  ### Step 0: Load Codebase Map (FIRST)
  Read `.nomos/learning/code/codebase-map.json` if it exists.
  - If map has entries: use it to instantly locate relevant files by purpose/layer/exports
  - Then explore ONLY for files NOT already in the map
  - If map is empty or missing: fall back to full exploration (no error)

  ### Step 1: Find Related Files
  1. Files with paths and line numbers related to this feature
  2. Patterns used for similar features
  3. Relevant utilities and shared code
  4. Test patterns in use
  5. Configuration and schema files involved

  Check if feature is ALREADY IMPLEMENTED:
  - Compare acceptance criteria against findings
  - Report status per criterion: Met / Not met with evidence

  DO NOT suggest implementations. Report what EXISTS.
```

### Agent 3: explore-docs (CONDITIONAL)

```
Task agent: explore-docs
Prompt: |
  Research documentation for: {specific_library_or_framework}
  Context: Implementing {feature_title}

  MUST USE: Context7 MCP
  1. mcp__context7__resolve-library-id for {library}
  2. mcp__context7__query-docs for specific API questions

  Find:
  1. Current API for {specific_feature}
  2. Code examples
  3. Configuration needed
  4. Common pitfalls
```

---

## Step 03: Execute-Verify Loop Agents

### Code Writer Agent

```
Task agent: code-writer
Model: {phase_models.coding}
Prompt: |
  ## Code Writer: {feature_id} -- Iteration {n}

  <mode>{INITIAL_IMPLEMENTATION | FIX_ISSUES}</mode>

  Working directory: {worktree_path}

  ### Implementation Plan
  {full plan from step-02}

  ### Codebase Context
  <codebase_map>
  {relevant entries from codebase-map.json filtered by layer + imports matching planned files}
  </codebase_map>

  ### Patterns
  <patterns>
  {output of: bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-code}
  </patterns>

  ### Anti-Patterns
  <antipatterns>
  {output of: bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-qa}
  </antipatterns>

  ### Relevant Skills (from learning system)
  {list of skills matching code knowledge categories loaded in step-01}
  Example: If database.json patterns were loaded → "Skill: database-expert"
  If typescript.json patterns were loaded → "Skill: typescript-expert"

  {IF FIX_ISSUES mode:}
  ### QA Issue Report (Previous Iteration)
  <qa_report>
  {structured JSON issue report from previous QA reviewer}
  </qa_report>

  Fix ONLY the issues listed above. Do NOT modify unrelated code.
  Focus on CRITICAL and HIGH severity issues first.
  {END IF}
```

### Explore Docs Agent — Quick Lookup Mode (ON-DEMAND, optional)

```
Task agent: explore-docs
Model: haiku
Prompt: |
  QUICK LOOKUP MODE — speed is critical, return under 200 lines.

  Look up documentation for: {library_name}
  Specific question: {api_question}
  Context: Code-writer encountered an unfamiliar API during {feature_id} implementation.

  Use Context7 MCP to find:
  1. API signature for {specific_function_or_method}
  2. Minimal code example
  3. Common pitfalls

  Return concise answer. Do NOT do comprehensive research — just answer the specific question.
```

**When to launch:** The orchestrator MAY launch this agent between code-writer iterations if:
- The code-writer reports an error related to unknown API usage
- The QA reviewer flags incorrect library usage
- The error signature matches `MODULE_NOT_FOUND` or `TYPE_ERROR` with library types

**When NOT to launch:** For standard stack APIs (React, Hono, Drizzle, TanStack) that the code-writer should already know.

### QA Reviewer Agent

```
Task agent: qa-reviewer
Model: {phase_models.qa_review}
Prompt: |
  ## QA Review: {feature_id} -- Iteration {n}

  <critical>
  You are READ-ONLY. You MUST NOT use Write, Edit, or any tool that modifies files.
  Your job is to REPORT findings only.
  </critical>

  Working directory: {worktree_path}

  ### Plan Summary (what should exist)
  **Overview:** {plan overview section only}
  **Files expected:** {file list from plan with action: new/modified}
  **AC Mapping:** {AC → file mapping table from plan}

  ### Acceptance Criteria
  {acceptance_criteria}

  ### Files Changed This Iteration
  {files_changed from code writer report}

  ### Anti-Patterns to Check
  <antipatterns>
  {output of: bash .claude/skills/nomos/scripts/nomos.sh patterns {feature_id} --for-qa}
  </antipatterns>

  {IF iteration > 1:}
  ### Previous Issues (iteration {n-1})
  {previous QA report -- check that reported issues are fixed AND no regressions introduced}

  IMPORTANT: Check for NEW issues not in the previous report. Regressions are CRITICAL.
  {END IF}
```

---

## Step 04: Static Checks (Track A)

```
Task agent: general-purpose
Prompt: |
  ## Track A: Static Verification for {feature_id}

  Working directory: {worktree_path}

  Run these checks IN ORDER. Fix issues before proceeding to next check.

  NOTE: Step-03 execute-verify loop already handled typecheck/lint fixes.
  These checks are a sanity re-verification. Focus more on unit tests and
  test creation (if test_mode). If typecheck/lint fail here, it indicates
  a regression from the loop -- treat as higher priority.

  ### 1. TypeScript Check
  ```bash
  cd {worktree_path}
  bun run check-types
  ```
  MUST PASS. If fails: read errors, fix types, re-run.

  ### 2. Lint/Format (Biome)
  ```bash
  cd {worktree_path}
  bun run check
  ```
  MUST PASS. If fails: fix remaining issues, re-run.

  ### 3. Unit Tests
  ```bash
  cd {worktree_path}
  bun run test:ci
  ```
  MUST PASS. If fails: identify root cause (code bug vs test bug), fix, re-run.

  ### 4. Test Creation (if test_mode = {test_mode})
  IF test_mode is true:
  - Analyze existing test patterns (read 2-3 similar test files)
  - Create tests for new functionality
  - Map tests to acceptance criteria
  - Run tests to verify they pass

  ### Report Format:
  ```
  TRACK_A_RESULT: PASS or FAIL
  typecheck: PASS/FAIL
  lint: PASS/FAIL
  tests: PASS/FAIL (X/Y passing)
  new_tests_created: {count} (if test_mode)
  errors_fixed: {count}
  ```
```

---

## Step 04: Runtime Verification (Track B)

```
Task agent: qa-functional-tester
Model: sonnet
Prompt: |
  ## Track B: Runtime Verification for {feature_id}: {feature_title}

  Working directory: {worktree_path}
  Server port: {server_port} (or $SERVER_PORT from ports.json)
  Web port: {web_port} (or $WEB_PORT from ports.json)

  ### Phase 1: Start Application (ONCE)
  Use the nomos-verify.sh script:
  ```bash
  bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} start
  bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} wait
  ```

  ### Phase 2: Smoke Test
  ```bash
  bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} smoke
  ```

  ### Phase 3: Functional QA (Acceptance Criteria)

  Test EACH acceptance criterion:
  {acceptance_criteria}

  For each AC:
  1. Navigate to relevant page/endpoint
  2. Perform required actions
  3. Verify expected outcome
  4. Capture evidence (screenshot or API response)
  5. Record PASS or FAIL

  For UI criteria: Use Playwright MCP
  For API criteria: Use curl

  ### Phase 4: Stop Servers (MANDATORY)
  ```bash
  bash .claude/skills/nomos/scripts/nomos-verify.sh {feature_id} stop
  ```

  ### Report Format:
  ```
  TRACK_B_RESULT: PASS or FAIL
  server_startup: PASS/FAIL
  web_startup: PASS/FAIL
  smoke_test: PASS/FAIL
  ac_results:
    AC1: PASS/FAIL - {evidence}
    AC2: PASS/FAIL - {evidence}
  servers_stopped: true/false
  runtime_errors: {count}
  ```
```

---

## Step 04: Code Review (Track C) -- 3-Phase Structure

### Phase 1: Read-Only Review

```
Task agent: general-purpose
Model: {phase_models.qa_review}
Prompt: |
  ## Track C Phase 1: Read-Only Code Review for {feature_id}

  ### Execute-Verify Loop Context
  The step-03 execute-verify loop ran {loop_iterations} iteration(s).
  {IF loop_iterations > 1:}
  Files that required fixes during the loop (EXTRA SCRUTINY):
  {list of files modified in FIX_ISSUES iterations}
  {END IF}
  {IF candidate_antipatterns exist:}
  Candidate antipatterns detected during loop:
  {candidate antipatterns from 03-candidate-antipatterns.json}

  IMPORTANT: The above candidate antipatterns were detected as recurring issues during
  the execute-verify loop. Each review agent MUST check whether these patterns persist
  in the final code. If found, classify as HIGH severity with confidence "Certain"
  (they already failed QA twice).
  {END IF}

  Launch these 3 review agents IN PARALLEL (single message).
  Agent definitions contain role, methodology, and output format. Only provide runtime context here.

  ### Agent 1: security-reviewer
  Files: {modified files list} | Working directory: {worktree_path}

  ### Agent 2: code-quality-reviewer
  Files: {modified files list} | Working directory: {worktree_path}

  ### Agent 3: test-coverage-analyzer
  Files: {modified files list} | Working directory: {worktree_path}
  AC: {acceptance_criteria}

  ### Collect and Classify All Findings
  Aggregate: Severity, Validity, Blocking (CRITICAL/HIGH + Real)

  ### Report Format:
  PHASE_1_RESULT: PASS or FAIL
  phase1_findings: {total count}
  phase1_blocking: {count of CRITICAL/HIGH + Real}
  critical/high/medium/low: {counts}
```

### Phase 2: Fix (CONDITIONAL)

```
Task agent: general-purpose
Prompt: |
  ## Track C Phase 2: Fix Blocking Review Findings for {feature_id}

  Working directory: {worktree_path}

  Phase 1 review found {phase1_blocking} blocking issues.
  Fix ONLY the following reported issues:

  {list of CRITICAL/HIGH + Real findings with file, line, description}

  For each finding:
  1. Read the affected file
  2. Apply the minimal fix
  3. Do NOT modify unrelated code

  After all fixes:
  ```bash
  cd {worktree_path}
  bun run check-types
  ```

  Report:
  - phase2_fixes_applied: {count}
  - files_changed: {list}
  - typecheck_after_fix: PASS/FAIL
```

### Phase 3: Re-Review (CONDITIONAL)

```
Task agent: general-purpose
Model: {phase_models.qa_review}
Prompt: |
  ## Track C Phase 3: Re-Review Fixed Findings for {feature_id}

  <critical>READ-ONLY. MUST NOT modify files.</critical>

  Working directory: {worktree_path}

  Phase 2 fixed {phase2_fixes_applied} blocking issues.
  Check ONLY the specific findings that were fixed:

  {list of fixed findings with file, line, original issue}

  For each:
  - Verify the fix addresses the original finding
  - Check the fix didn't introduce new issues

  Report:
  - phase3_verified: {count}
  - remaining_blocking: {count}
```

---

## Step 04: Failure Fix Agent

```
Task agent: general-purpose
Prompt: |
  ## Fix: {failure_type} in Track {track}

  Working directory: {worktree_path}
  Failure: {failure_signature}
  Error output: {error_details}

  {IF HUMAN_FEEDBACK was found:}
  <human_guidance>
  {contents of HUMAN_FEEDBACK.md}
  </human_guidance>
  {END IF}

  Fix ONLY this specific issue:
  - Strategy: {fix_strategy_from_table}
  - If human guidance is provided, prioritize it over default strategy
  - Do NOT modify unrelated code
  - Verify your fix compiles/works before reporting

  Report:
  - Files changed: {list}
  - Fix applied: {description}
  - Human guidance applied: {yes/no}
```

---

## Step 06 Track A: Learning Extraction

```
Task agent: general-purpose
Model: {phase_models.learning}
Prompt: |
  ## Track A: Learning Extraction for {feature_id}: {feature_title}

  ### 1. Collect Feature Metrics
  ```bash
  bash .claude/skills/nomos/scripts/nomos.sh metrics {feature_id}
  ```

  Read feature timestamps from .nomos/features.json:
  ```bash
  jq --arg id "{feature_id}" '.features[] | select(.id == $id) | {startedAt, completedAt, verifiedAt}' .nomos/features.json
  ```

  Include `loop_iterations_used` (1-3) in the feature metrics. This tracks how
  often the execute-verify loop catches issues and helps step-02 (planning)
  calibrate: "Features of this category typically need N iterations."

  ### 2. Analyze Success Patterns
  IF duration < threshold AND retries == 0 -> GOOD_PLANNING
  IF files_changed < threshold -> FOCUSED_SCOPE
  IF all_tests_passed_first_try -> TEST_DRIVEN

  ### 3. Analyze Anti-Patterns
  IF retries > 2 -> UNCLEAR_REQUIREMENTS
  IF files_changed > threshold * 1.5 -> SCOPE_CREEP
  IF duration > threshold * 2 -> COMPLEXITY_UNDERESTIMATED

  ### 3b. Process Execute Loop Candidates
  Read `{output_dir}/03-candidate-antipatterns.json` (if exists):
  ```bash
  cat {output_dir}/03-candidate-antipatterns.json 2>/dev/null || echo "NONE"
  ```

  If file exists and has candidates, for each candidate:
  - IF occurrences >= 2 AND matches existing antipattern -> Increment evidence_count
  - IF occurrences >= 2 AND is new -> Add as new antipattern
  - IF occurrences == 1 -> Skip (insufficient evidence)

  Matching algorithm for candidate antipattern promotion:
  1. EXACT: Same category AND description contains same error code/pattern -> match
  2. FUZZY: Same category AND same file path pattern -> possible match (add as separate entry)
  3. NONE: Different category -> new antipattern entry

  When incrementing evidence_count on an existing antipattern:
  - Update last_seen to current feature_id
  - Append feature_id to a `seen_in` array for traceability

  ### 4. Update Learning Files
  Read existing files, MERGE (don't overwrite):
  - .nomos/learning/metrics.json -> Add feature metrics, recalculate aggregates
  - .nomos/learning/patterns.json -> Add/update patterns with evidence_count
    - For each pattern applied, recalculate quality scores:
      * Add {feature_id} to `features_applied`
      * If feature succeeded: add to `features_succeeded`
      * Recalculate: `success_rate = features_succeeded.length / features_applied.length`
      * Recalculate: `confidence = min(1.0, (evidence_count / 5) * success_rate)`
  - .nomos/learning/antipatterns.json -> Add/update anti-patterns

  ### 5. Update Codebase Map
  Read `.nomos/learning/code/codebase-map.json` (create if missing).
  For each file changed, add/update entry with: purpose, layer, exports, imports_from, lastTouchedBy.
  MERGE with existing entries. Update lastUpdated and lastUpdatedBy.

  ### 6. Extract Code Patterns
  Analyze diff for code-level learnings: bug fixes -> pitfalls, new utilities -> patterns, config -> best practices.
  Detect category, update .nomos/learning/code/{category}.json.
  For CRITICAL patterns, enhance with Context7 MCP.

  ### 7. Generate Retrospective
  What Went Well, What Could Improve, Key Learnings, Recommendations for Similar Features.

  ### 8. Write Session Insight
  Write to `.nomos/learning/insights/{feature_id}.json`:
  session_number, feature_id, category, phase, dependencies, discoveries, what_worked, what_failed, recommendations_for_next.

  ### Report Format:
  TRACK_A_RESULT: COMPLETE
  metrics_recorded: true
  loop_iterations_used: {1-3}
  loop_candidate_antipatterns_processed: {count}
  patterns_extracted: {count}
  antipatterns_extracted: {count}
  code_patterns_added: {count}
  codebase_map_entries_updated: {count}
  insight_written: true
  insight_file: .nomos/learning/insights/{feature_id}.json
  files_updated: {list}
```

---

## Step 06 Track B: Ship Feature

```
Task agent: general-purpose
Prompt: |
  ## Track B: Ship Feature {feature_id}: {feature_title}

  ### 1. Verify Git Status
  ```bash
  git status
  git log --oneline -5
  ```

  ### 2. Push to Remote
  ```bash
  git push -u origin main
  ```
  If push fails: display error and report.

  ### 3. Create Pull Request
  ```bash
  gh pr create --title "feat({feature_id}): {feature_title}" --body "$(cat <<'EOF'
  ## Summary
  Implements {feature_title} ({feature_id}).

  ## Changes
  {summary of key changes from output files}

  ## Verification
  - Static checks: PASS (typecheck, lint, tests)
  - Runtime verification: PASS (smoke + QA)
  - Code review: PASS (security, quality, coverage)

  ## Acceptance Criteria
  {acceptance_criteria with status}

  ---
  _Generated by NOMOS v2 workflow_
  EOF
  )"
  ```

  ### 4. Capture PR URL
  ```bash
  gh pr view --json url -q '.url'
  ```

  ### Report Format:
  TRACK_B_RESULT: COMPLETE
  pushed: true
  pr_created: true
  pr_url: {url}
```
