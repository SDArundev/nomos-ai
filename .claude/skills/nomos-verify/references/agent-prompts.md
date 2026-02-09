# Agent Prompts Reference

All agent prompt templates used across nomos-verify pipeline steps.

## Table of Contents

- [Step 01: Analysis Agents (Feature Mode)](#step-01-analysis-agents-feature-mode)
- [Step 01: Analysis Agents (Codebase Mode)](#step-01-analysis-agents-codebase-mode)
- [Step 03: Fix Loop Agents](#step-03-fix-loop-agents)

---

## Step 01: Analysis Agents (Feature Mode)

Used when `{analysis_mode}` = `feature` (single feature or range).

### Dimension 1: Bugs (code-reviewer)

```
Task agent: code-reviewer
Prompt: |
  ## Bug Analysis: Feature-First Verification

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Feature(s): {features_to_verify}
  Files to analyze: {feature_files}

  ### Acceptance Criteria
  {acceptance_criteria}

  ### Known Patterns
  {verification_patterns_if_exists}

  ### Analysis Focus
  For each file related to this feature:
  1. Logic errors — incorrect conditionals, wrong comparisons, off-by-one
  2. Null/undefined handling — missing null checks, optional chaining gaps
  3. Edge cases — empty arrays, zero values, boundary conditions
  4. Error handling — unhandled promises, missing try/catch, silent failures
  5. Type safety — any casts, incorrect type assertions, missing type guards
  6. Race conditions — async timing issues, state mutations during render

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Bugs for all findings.
```

### Dimension 2: Quality (scout)

```
Task agent: scout
Prompt: |
  ## Code Quality Analysis: Feature-First Verification

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Feature(s): {features_to_verify}
  Files to analyze: {feature_files}

  ### Analysis Focus
  For each file related to this feature:
  1. DRY violations — duplicated logic, copy-paste code
  2. Naming conventions — consistency with project patterns
  3. Complexity — deeply nested logic, long functions, god components
  4. Pattern adherence — follows existing project conventions
  5. Separation of concerns — business logic in UI, data fetching in components
  6. Import organization — circular deps, unnecessary imports

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Quality for all findings.
```

### Dimension 3: Requirements (qa-reviewer)

```
Task agent: qa-reviewer
Prompt: |
  ## Requirements Verification: Feature-First

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Feature(s): {features_to_verify}
  Files to analyze: {feature_files}

  ### Acceptance Criteria
  {acceptance_criteria}

  ### Analysis Focus
  For each acceptance criterion:
  1. Is it fully implemented? (trace code path from entry point to result)
  2. Is it correctly implemented? (does the behavior match the AC?)
  3. Are integration points connected? (API → UI, DB → API, etc.)
  4. Are error states handled? (what happens when things fail?)
  5. Is the feature accessible from the user's perspective?

  Mark each AC as: MET / PARTIALLY_MET / NOT_MET / CANNOT_VERIFY

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Requirements for all findings.

  Additionally, provide AC status table:
  | AC | Status | Evidence | File:Line |
```

### Dimension 4: Security (security-reviewer)

```
Task agent: security-reviewer
Prompt: |
  ## Security Analysis: Feature-First Verification

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Feature(s): {features_to_verify}
  Files to analyze: {feature_files}

  ### Analysis Focus (OWASP-aligned)
  1. Injection — SQL, NoSQL, command, LDAP injection vectors
  2. Authentication — weak auth, missing auth checks, session handling
  3. Authorization — missing access controls, IDOR, privilege escalation
  4. Data exposure — sensitive data in logs, responses, error messages
  5. XSS — reflected, stored, DOM-based cross-site scripting
  6. CSRF — missing tokens, SameSite cookie issues
  7. Secrets — hardcoded credentials, API keys, tokens in code
  8. Input validation — missing sanitization, type coercion issues

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Security for all findings.
```

### Dimension 5: Testing (code-reviewer)

```
Task agent: code-reviewer
Prompt: |
  ## Test Coverage Analysis: Feature-First Verification

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Feature(s): {features_to_verify}
  Files to analyze: {feature_files}

  ### Acceptance Criteria
  {acceptance_criteria}

  ### Analysis Focus
  1. Coverage gaps — which files/functions lack tests?
  2. Untested critical paths — error handlers, edge cases, auth flows
  3. AC coverage — does each acceptance criterion have a test?
  4. Test quality — are tests actually asserting meaningful things?
  5. Integration gaps — are component interactions tested?
  6. Missing test types — unit, integration, e2e as appropriate

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Testing for all findings.

  Additionally, provide coverage summary:
  | Area | Files | Tested | Coverage |
```

---

## Step 01: Analysis Agents (Codebase Mode)

Used when `{analysis_mode}` = `codebase` (verified/pending/all scopes).

### Dimension 1: Bugs (code-reviewer) — Codebase

```
Task agent: code-reviewer
Prompt: |
  ## Bug Analysis: Codebase Health Check

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Scan: All implemented code in apps/ and packages/
  Features in scope: {features_to_verify}

  ### Analysis Focus
  Holistic codebase scan for:
  1. Cross-feature logic errors — shared utilities with bugs
  2. Integration bugs — features that don't connect properly
  3. Global error handling gaps — uncaught exceptions, missing boundaries
  4. Type system issues — inconsistent types across modules
  5. State management bugs — stale state, race conditions
  6. Build/runtime issues — import errors, missing deps

  Map each finding to a feature where possible. Use "CROSS-CUTTING" for systemic issues.

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Bugs for all findings.
```

### Dimension 2: Quality (scout) — Codebase

```
Task agent: scout
Prompt: |
  ## Code Quality: Codebase Health Check

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Scan: All implemented code in apps/ and packages/

  ### Analysis Focus
  Holistic quality assessment:
  1. Architecture patterns — consistency across features
  2. Code duplication — cross-feature DRY violations
  3. Dependency health — circular deps, unused packages
  4. Convention adherence — naming, structure, organization
  5. Complexity hotspots — high cyclomatic complexity areas
  6. Technical debt — shortcuts, TODOs, workarounds

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Quality for all findings.
```

### Dimension 3: Requirements (qa-reviewer) — Codebase

```
Task agent: qa-reviewer
Prompt: |
  ## Requirements Audit: Codebase Health Check

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Features: {features_to_verify}
  Scan: All implemented code

  ### Analysis Focus
  For each feature in scope:
  1. Verify ALL acceptance criteria are implemented
  2. Check cross-feature integration (do features work together?)
  3. Identify orphaned code (implemented but not connected)
  4. Check for missing features (AC defined but no code)
  5. Validate data flow end-to-end

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Requirements for all findings.

  Provide per-feature status:
  | Feature | ACs Met | ACs Total | Status |
```

### Dimension 4: Security (security-reviewer) — Codebase

```
Task agent: security-reviewer
Prompt: |
  ## Security Audit: Codebase Health Check

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Scan: All implemented code in apps/ and packages/

  ### Analysis Focus
  Full security audit:
  1. Authentication — all auth flows, session management
  2. Authorization — access control consistency across routes
  3. Input validation — all user input entry points
  4. Data handling — PII exposure, encryption at rest/transit
  5. Dependencies — known vulnerable packages
  6. Configuration — security headers, CORS, CSP
  7. Secrets — scan for hardcoded credentials across codebase

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Security for all findings.
```

### Dimension 5: Testing (code-reviewer) — Codebase

```
Task agent: code-reviewer
Prompt: |
  ## Test Coverage Audit: Codebase Health Check

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  ### Scope
  Scan: All test files and corresponding source files

  ### Analysis Focus
  1. Overall coverage — which modules have tests, which don't?
  2. Critical path coverage — auth, data mutation, API endpoints
  3. Test quality — assertion density, meaningful checks
  4. Test organization — consistent patterns, proper setup/teardown
  5. E2E gaps — which user flows lack end-to-end tests?
  6. Regression protection — are verified features protected by tests?

  ### Output Format
  Use the finding format from references/analysis-dimensions.md.
  Set Dimension: Testing for all findings.

  Provide coverage matrix:
  | Module | Source Files | Test Files | Estimated Coverage |
```

---

## Step 03: Fix Loop Agents

### Code Writer (Fix Mode)

```
Task agent: code-writer
Prompt: |
  ## Fix: Verification Issues — Iteration {n}

  Working directory: {worktree_path}

  ### Issues to Fix (Priority Order)
  {prioritized_issues_list}

  ### Rules
  - Fix ONLY the listed issues
  - Fix in priority order (CRITICAL first, then HIGH)
  - Do NOT modify unrelated code
  - Do NOT add features or improvements
  - Run typecheck after fixes: `bun run check-types`

  ### Report
  For each issue fixed:
  - Issue ID: {id}
  - File changed: {path}
  - Fix applied: {description}
  - Verified: {typecheck pass/fail}
```

### QA Reviewer (Fix Validation)

```
Task agent: qa-reviewer
Prompt: |
  ## Fix Validation: Iteration {n}

  <critical>
  You are READ-ONLY. Do NOT modify any files. Report findings only.
  </critical>

  Working directory: {worktree_path}

  ### Issues That Were Fixed
  {list_of_fixed_issues}

  ### Validation Checks
  For each fixed issue:
  1. Is the original issue resolved?
  2. Did the fix introduce new issues?
  3. Are acceptance criteria still met?

  ### Verdict
  PASS — all fixes correct, no regressions
  FAIL — {list of remaining/new issues}
```
