---
name: nomos-verify
description: Batch verification and regression testing for NOMOS features. Run at any time to verify features are properly implemented, fully working, and don't break previous features. Second opinion along the way.
argument-hint: "[-a] [-s <scope>] [-r] [feature-id|range]"
---

<objective>
Verify that features are properly implemented, fully functional, and don't break existing functionality. This is a "second opinion" verification that can be run at any time during development.
</objective>

<quick_start>

**Verify a single feature:**
```bash
/verify F027
```

**Verify all verified features (regression):**
```bash
/verify -s verified
```

**Verify range of features:**
```bash
/verify F027-F050
```

**Full audit with auto-fix:**
```bash
/verify -a -s all
```

</quick_start>

<parameters>

<flags>
| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Auto mode: create bug fix features for issues found |
| `-s` | `--scope` | Scope: `single`, `range`, `verified`, `pending`, `all` |
| `-r` | `--regression` | Regression mode: verify all verified features still work |
| `-q` | `--quick` | Quick mode: smoke tests only, skip deep QA |
| `-d` | `--deep` | Deep mode: full QA, security, and code review |
| `-f` | `--fix` | Fix mode: attempt to fix issues found |
| `-o` | `--output` | Output report path (default: `.nomos/verify/`) |
</flags>

<scope_options>
| Scope | Description |
|-------|-------------|
| `single` | Verify single feature by ID (default) |
| `range` | Verify range of features (F027-F050) |
| `verified` | Verify all features with status=verified |
| `pending` | Verify all features with status=pending |
| `partial` | Verify features partially implemented |
| `all` | Verify entire feature set |
</scope_options>

<examples>
```bash
# Single feature
/verify F027

# Regression test all verified
/verify -r
/verify -s verified

# Range of features
/verify F027-F050

# Full audit with auto bug creation
/verify -a -s all

# Quick smoke test only
/verify -q F027

# Deep verification with security review
/verify -d F027

# Verify and attempt fixes
/verify -f F027
```
</examples>

</parameters>

<workflow>

## Phase 0: Setup Isolation
1. Create verification branch: `verify/{timestamp}`
2. Create worktree at `.nomos/worktrees/verify-{timestamp}`
3. All modifications happen in worktree (isolated from main)
4. Merge back only if verification passes or user approves

## Phase 1: Discovery
1. Parse arguments and determine scope
2. Load features from features.json
3. Identify features to verify based on scope
4. Check dependencies between features

## Phase 2: Verification (Parallel Agents)
Launch verification agents based on mode:

**Quick Mode (-q):**
- `qa-smoke-tester` only

**Standard Mode (default):**
- `qa-smoke-tester` - Runtime smoke tests
- `qa-functional-tester` - Acceptance criteria verification

**Deep Mode (-d):**
- `qa-smoke-tester` - Runtime smoke tests
- `qa-functional-tester` - Acceptance criteria verification
- `security-reviewer` - Security vulnerabilities
- `code-quality-reviewer` - Code patterns and quality
- `test-coverage-analyzer` - Test coverage gaps

## Phase 3: Analysis
1. Collect results from all agents
2. Categorize findings by severity (CRITICAL, HIGH, MEDIUM, LOW)
3. Identify regression issues (previously working, now broken)
4. Map issues to specific features

## Phase 4: Reporting
1. Generate verification report
2. Update features.json status if needed:
   - `verified` → `pending` if regression found
   - Keep `pending` if issues found
3. If `-a` flag: Create bug fix features for issues

## Phase 5: Summary
1. Display summary table
2. Show priority queue of fixes needed
3. Provide next steps recommendation

## Phase 6: Learn (Self-Improvement)
1. Analyze failure patterns
2. Record issue patterns to `.nomos/learning/verification-patterns.json`
3. Update verification heuristics
4. Track regression patterns
5. Generate insights for future development
6. Propose quality gate updates

## Phase 7: Merge or Cleanup
1. Review changes made in worktree
2. Determine merge strategy based on results
3. Auto-merge if all passed (or user approved)
4. Keep worktree for review if critical issues
5. Cleanup worktree after merge

</workflow>

<agents>

## Verification Agents

| Agent | Purpose | When Used |
|-------|---------|-----------|
| `qa-smoke-tester` | Start app, verify basic functionality | Always |
| `qa-functional-tester` | Test acceptance criteria against running app | Standard, Deep |
| `security-reviewer` | OWASP security review | Deep only |
| `code-quality-reviewer` | Code patterns, best practices | Deep only |
| `test-coverage-analyzer` | Identify test coverage gaps | Deep only |

## Agent Launch Strategy

```
Quick:    1 agent  (smoke only)
Standard: 2 agents (smoke + functional)
Deep:     5 agents (all)
```

All agents run in **parallel** for efficiency.

</agents>

<output_structure>

**Reports saved to `.nomos/verify/{timestamp}/`:**

```
.nomos/verify/2026-01-26T15-00-00/
├── summary.md           # Executive summary
├── smoke-results.md     # Smoke test results
├── qa-results.md        # Functional test results
├── security-results.md  # Security review (if -d)
├── quality-results.md   # Code quality (if -d)
├── coverage-results.md  # Test coverage (if -d)
├── issues.json          # Machine-readable issues
├── enhancements.json    # Nice-to-have improvements
└── features-updated.json # Updated feature statuses
```

**Global enhancement backlog:** `.nomos/enhancements-backlog.json`

</output_structure>

<issue_handling>

## Issue Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| CRITICAL | Feature completely broken | Revert to pending, create P1 fix |
| HIGH | Major functionality missing | Create P2-P5 fix |
| MEDIUM | Partial implementation | Keep pending, document gap |
| LOW | Minor issues, nice-to-have | Add to existing feature AC |

## Auto-Fix Mode (-a)

When `-a` flag is set:
1. Issues become new features in features.json
2. Priority based on severity (CRITICAL=1, HIGH=2-5, MEDIUM=10-20)
3. Dependencies set to block affected features
4. One feature per issue (NOMOS principle: one agent, one session, one feature)

</issue_handling>

<enhancement_discovery>

## Enhancement Discovery

When features **PASS** verification, discover improvement opportunities:

| Priority | Category | Description |
|----------|----------|-------------|
| P1 | security | Security hardening beyond requirements |
| P2 | performance | Speed, efficiency, resource optimization |
| P2 | resilience | Error recovery, graceful degradation |
| P3 | observability | Metrics, tracing, debugging improvements |
| P3 | testing | Additional test coverage, edge cases |
| P4 | ux | User/developer experience polish |
| P4 | documentation | API docs, examples, inline comments |
| P5 | architecture | Future extensibility, patterns |

**Sources:**
1. Convert LOW notes to enhancement suggestions
2. Proactive pattern scanning (rate limiting, validation, etc.)
3. Best practice checklist comparison

**Output:**
- Per-session: `{output_dir}/enhancements.json`
- Global backlog: `.nomos/enhancements-backlog.json` (cumulative)

**Usage:** Review backlog periodically to pick enhancement features.

</enhancement_discovery>

<regression_detection>

## Regression Testing

Regression = feature was verified but now fails verification

**Detection:**
1. Check feature status = `verified`
2. Run verification
3. If fails → REGRESSION

**Response:**
1. Mark feature as `pending`
2. Create high-priority fix feature
3. Block dependent features
4. Add to regression report

</regression_detection>

<entry_point>

**FIRST ACTION:** Load `steps/step-00-init.md`

Step 00 handles:
- Argument parsing
- Scope determination
- Feature list compilation
- Output directory creation

</entry_point>

<step_files>

| Step | File | Purpose |
|------|------|---------|
| 00 | `steps/step-00-init.md` | Parse args, determine scope, setup |
| 01 | `steps/step-01-discover.md` | Load features, check dependencies |
| 02 | `steps/step-02-verify.md` | Launch parallel verification agents |
| 03 | `steps/step-03-analyze.md` | Collect and categorize results |
| 04 | `steps/step-04-report.md` | Generate report, update features.json |
| 05 | `steps/step-05-summary.md` | Display summary, next steps |
| 06 | `steps/step-06-learn.md` | Extract patterns, update heuristics |
| 07 | `steps/step-07-merge.md` | Merge to main or cleanup worktree |

</step_files>

<success_criteria>

- All specified features verified
- Clear pass/fail status for each feature
- Issues categorized by severity
- Report generated and saved
- features.json updated if needed
- Bug fix features created (if -a mode)
- Summary displayed with next steps
- **Patterns extracted and recorded**
- **Heuristics updated for future verification**
- **Regression patterns tracked**
- **Enhancement suggestions generated for passed features**
- **Global enhancement backlog updated**

</success_criteria>

<scripts>

## Shell Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/init.sh` | Create worktree and output dir | `bash scripts/init.sh` |
| `scripts/state.sh` | State management | `bash scripts/state.sh get\|set\|list` |
| `scripts/merge.sh` | Merge or cleanup | `bash scripts/merge.sh merge\|cleanup\|keep <state.json>` |

### init.sh
Creates isolated verification environment:
- Branch: `verify/{timestamp}`
- Worktree: `.nomos/worktrees/verify-{timestamp}`
- Output: `.nomos/verify/{timestamp}`
- State: `.nomos/verify/{timestamp}/state.json`

### state.sh
Manages verification state:
```bash
# Get current state
bash scripts/state.sh get

# Update status
bash scripts/state.sh update-status state.json verifying

# Add result
bash scripts/state.sh add-result state.json F027 pass

# List sessions
bash scripts/state.sh list
```

### merge.sh
Handles merge or cleanup:
```bash
# Merge to main
bash scripts/merge.sh merge state.json

# Discard changes
bash scripts/merge.sh cleanup state.json

# Keep for review
bash scripts/merge.sh keep state.json
```

</scripts>

<templates>

## Output Templates

| Template | Output |
|----------|--------|
| `templates/summary.md` | Human-readable report |
| `templates/issues.json` | Machine-readable issues |
| `templates/verification-patterns.json` | Learning patterns |

Templates use `{variable}` placeholders for replacement.

See `templates/README.md` for full variable list.

</templates>

<integration_with_nomos>

## How This Fits NOMOS Workflow

```
Normal Development:
  /nomos -a F027  →  implements feature

Verification (anytime):
  /verify F027    →  second opinion
  /verify -r      →  regression check

After Major Changes:
  /verify -s verified  →  ensure nothing broke
```

## Recommended Usage

1. **After implementing a batch of features:** `/verify -s verified`
2. **Before merging to main:** `/verify -r`
3. **Weekly regression check:** `/verify -d -s all`
4. **Quick sanity check:** `/verify -q F027`

</integration_with_nomos>
