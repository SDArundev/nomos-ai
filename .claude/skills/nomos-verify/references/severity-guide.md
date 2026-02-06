# Severity Classification Guide

Rules for classifying findings, prioritizing fixes, and escalation decisions.

---

## Severity Levels

| Severity | Definition | Examples | Fix Priority |
|----------|-----------|----------|-------------|
| **CRITICAL** | Feature completely broken, security vulnerability, data loss risk | Runtime crash, auth bypass, SQL injection, missing core functionality | P1 — must fix immediately |
| **HIGH** | Major functionality gap, significant quality issue, regression | Missing AC, broken integration, major logic error, XSS | P2 — fix before approval |
| **MEDIUM** | Partial implementation, suboptimal patterns, minor quality issues | Missing edge case handling, code duplication, weak validation | P3 — fix if time allows |
| **LOW** | Style issues, minor improvements, nice-to-have | Naming convention, missing JSDoc, minor refactor opportunity | P4 — enhancement backlog |

---

## Classification Rules

### CRITICAL (must fix)

- Feature does not start / crashes on load
- Security vulnerability (OWASP Top 10)
- Data loss or corruption risk
- Authentication/authorization bypass
- Previously verified feature now broken (regression)
- Missing ALL acceptance criteria

### HIGH (should fix)

- One or more acceptance criteria not met
- Major logic error (wrong behavior, not just missing)
- Significant security weakness (not exploitable but risky)
- No error handling on critical paths
- Missing integration with required systems
- Performance degradation >50% from baseline

### MEDIUM (consider fixing)

- Edge cases not handled
- Code duplication across features
- Weak input validation (non-security)
- Missing loading/error states in UI
- Inconsistent patterns with rest of codebase
- Test coverage below 60% for new code

### LOW (enhancement)

- Naming convention violations
- Missing documentation/comments
- Minor UX improvements
- Unused imports or dead code
- Minor accessibility gaps
- Test coverage between 60-80%

---

## Fix Priority Mapping

| Severity | Priority | Max Iterations | Auto-Fix |
|----------|----------|---------------|----------|
| CRITICAL | P1 | 3 | Yes (if `-f` flag) |
| HIGH | P2 | 2 | Yes (if `-f` flag) |
| MEDIUM | P3 | 0 | No — logged only |
| LOW | P4 | 0 | No — enhancement backlog |

**Fix loop only processes CRITICAL and HIGH issues.** MEDIUM and LOW are documented in the report.

---

## Escalation Rules

### When to stop fixing

- Max iterations reached (default: 3)
- Fix introduced new CRITICAL issue (regression)
- Fix requires architectural change beyond scope
- Multiple CRITICAL issues across different features

### When to ask user

- CRITICAL issue found but no `-f` flag
- Fix attempt failed twice for same issue
- Regression detected in verified feature
- Conflicting acceptance criteria

### When to auto-proceed

- `-a` (auto) AND `-f` (fix) flags set
- Issue is HIGH or below
- Fix is localized (single file)
- No regressions introduced

---

## Regression Handling

A **regression** = a feature with status `verified` that now fails verification.

| Action | When |
|--------|------|
| Mark feature as `pending` | Always on regression |
| Create P1 bug-fix feature | If `-a` (auto) mode |
| Block dependent features | If regression is CRITICAL |
| Add to regression log | Always |
| Escalate to user | If not auto mode |

---

## Deduplication Rules

When multiple agents flag the same issue:

1. **Same file + same line** = duplicate → keep highest severity
2. **Same file + different line, same root cause** = related → group as single finding
3. **Same pattern across files** = systemic → one finding with multiple locations
4. **Different dimensions, same code** = keep both (different perspectives add value)
