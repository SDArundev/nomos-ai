# NOMOS Quality Gates

## Constitutional Enforcement

Quality gates that MUST pass before a feature can be verified.

---

## ART-001: Specification-First

**Rule:** Every feature MUST have a plan before implementation.

**Check:**
- Plan file exists at `.nomos/output/{feature_id}/03-plan.md`
- Plan contains file-by-file breakdown
- All acceptance criteria are mapped to plan items

**Severity:** BLOCKING - Cannot proceed without plan

---

## ART-002: Test Coverage

**Rule:** New functionality MUST have corresponding tests.

**Check:**
- Test files exist for new components/functions
- Tests cover acceptance criteria
- Tests pass consistently

**Severity:** BLOCKING (if test_mode enabled)

---

## ART-008: Requirement Traceability

**Rule:** Features MUST link to requirements in features.json.

**Check:**
- Feature exists in features.json
- Feature has acceptance criteria defined
- Implementation satisfies acceptance criteria

**Severity:** BLOCKING - Cannot verify untracked feature

---

## Security Checks

### SEC-001: No Hardcoded Secrets

**Check:** Search for hardcoded passwords, API keys, secrets in source files.

**Severity:** CRITICAL - Must not contain hardcoded secrets

### SEC-002: No XSS Vulnerabilities

**Check:** Review usage of innerHTML and similar patterns for proper sanitization.

**Severity:** HIGH - Review each usage

### SEC-003: Environment Files

**Check:**
- `.env` files in `.gitignore`
- No `.env` files committed
- `.env.example` exists with safe defaults

**Severity:** CRITICAL

---

## Code Quality Checks

### CQ-001: TypeScript Strict

**Check:**
```bash
bun run check-types
```

**Severity:** BLOCKING - Must pass

### CQ-002: Linting

**Check:**
```bash
bun run check
```

**Severity:** BLOCKING - Must pass

### CQ-003: No Debug Code

**Check:** Search for console.log and debugger statements outside test files.

**Severity:** MEDIUM - Remove before merge

### CQ-004: TODO Limit

**Check:** Count TODO comments in changed files.

**Threshold:** < 5 new TODOs per feature

**Severity:** LOW - Document if exceeding

---

## Browser Validation (UI Features)

### BV-001: Visual Verification

**For UI features only:**
- Component renders without errors
- Layout matches design/requirements
- Interactive elements function correctly

**Check:** Start dev server and verify visually.

**Severity:** HIGH for UI features

---

## CI Integration

### CI-001: Pipeline Status

**Check:**
- All CI checks pass
- No regressions introduced

**Severity:** BLOCKING

---

## Quality Gate Summary

| Gate | Type | Severity |
|------|------|----------|
| ART-001 | Plan exists | BLOCKING |
| ART-002 | Tests exist | BLOCKING (if -t) |
| ART-008 | Requirement link | BLOCKING |
| SEC-001 | No secrets | CRITICAL |
| SEC-002 | No XSS | HIGH |
| SEC-003 | Env files | CRITICAL |
| CQ-001 | TypeScript | BLOCKING |
| CQ-002 | Linting | BLOCKING |
| CQ-003 | No debug | MEDIUM |
| CQ-004 | TODO limit | LOW |
| BV-001 | Browser test | HIGH (UI) |
| CI-001 | CI passes | BLOCKING |

---

## Enforcement

Quality gates are enforced in:
- **step-05-validate.md** - Quick checks (CQ-001, CQ-002)
- **step-06-review.md** - Full quality gate (all checks)
- **step-08-merge.md** - Final validation before merge
