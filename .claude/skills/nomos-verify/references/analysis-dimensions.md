# Analysis Dimensions

What each agent checks at each depth level. Quick reference for step-01.

---

## Dimensions Overview

| # | Dimension | Agent | Focus |
|---|-----------|-------|-------|
| 1 | **Bugs** | `code-reviewer` | Logic errors, edge cases, null handling, runtime issues |
| 2 | **Quality** | `scout` | DRY, naming, complexity, patterns, convention adherence |
| 3 | **Requirements** | `qa-reviewer` | AC met, missing features, functional correctness, integration |
| 4 | **Security** | `security-reviewer` | OWASP, injection, auth gaps, secrets, XSS/CSRF |
| 5 | **Testing** | `code-reviewer` | Coverage gaps, untested paths, missing edge case tests |

---

## Depth Configuration

### Quick (`-q`) — 2 dimensions

| Dimension | Agent | What to Check |
|-----------|-------|---------------|
| Bugs | `code-reviewer` | Critical logic errors, null/undefined issues, obvious crashes |
| Requirements | `qa-reviewer` | Are all acceptance criteria met? Basic functional correctness |

**Use when:** Quick sanity check, CI gate, smoke verification.

### Standard (default) — 3 dimensions

| Dimension | Agent | What to Check |
|-----------|-------|---------------|
| Bugs | `code-reviewer` | Full bug analysis: logic, edge cases, error handling, type safety |
| Quality | `scout` | Code patterns, DRY violations, naming, complexity metrics |
| Requirements | `qa-reviewer` | AC verification, integration points, functional completeness |

**Use when:** Regular verification, pre-merge check.

### Deep (`-d`) — 5 dimensions

| Dimension | Agent | What to Check |
|-----------|-------|---------------|
| Bugs | `code-reviewer` | Everything in Standard + concurrency, race conditions, memory |
| Quality | `scout` | Everything in Standard + architecture patterns, abstraction quality |
| Requirements | `qa-reviewer` | Everything in Standard + cross-feature integration, UX flow |
| Security | `security-reviewer` | OWASP Top 10, auth/authz, input validation, secrets, headers |
| Testing | `code-reviewer` | Line/branch coverage, untested critical paths, test quality |

**Use when:** Major milestone, release candidate, security audit.

---

## Analysis Mode Behavior

### Feature Mode (`{analysis_mode}` = `feature`)

Each agent receives:
- Specific feature ID(s) and their acceptance criteria
- Files associated with those features (from feature metadata or git diff)
- Focus: "Is THIS feature properly implemented?"

Agent scope is **narrow** — only analyze files related to the feature(s).

### Codebase Mode (`{analysis_mode}` = `codebase`)

Each agent receives:
- Full project directory scan (`apps/`, `packages/`)
- All features with status `verified` or `in_progress` as context
- Focus: "How healthy is the OVERALL project?"

Agent scope is **broad** — analyze the entire implemented codebase holistically.
Findings are mapped back to features where possible.

---

## Agent Output Schema

Every agent must return findings in this format:

```
FINDING: {finding_id}
Severity: CRITICAL | HIGH | MEDIUM | LOW
Dimension: Bugs | Quality | Requirements | Security | Testing
Category: {subcategory}
File: {file_path}:{line_number}
Description: {what is wrong}
Impact: {why it matters}
Suggested Fix: {how to fix it}
Feature: {feature_id or "N/A" for codebase mode}
```

---

## Optional 6th Dimension: Architecture Health

**Available when:** `{depth}` = `deep` AND `{analysis_mode}` = `codebase` (i.e., `--audit` mode)

| Dimension | Agent | Focus |
|-----------|-------|-------|
| **Architecture** | `scout` (extended scope) | Dependency cycles, duplication patterns, module boundaries, dead code |

**What to Check:**
- Circular dependency chains between modules
- Code duplication across features (>30 lines similar)
- Module boundary violations (direct DB access from UI layer, etc.)
- Dead code: exported symbols with zero importers
- Inconsistent patterns across similar features

**Note:** This dimension reuses `scout` with an architecture-focused prompt. It is NOT a separate agent launch — it extends the quality dimension prompt in audit mode.

---

Multiple findings separated by `---`.

Summary at end:
```
DIMENSION SUMMARY: {dimension_name}
Total Findings: {count}
Critical: {count} | High: {count} | Medium: {count} | Low: {count}
```
