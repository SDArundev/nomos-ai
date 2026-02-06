# Risk Assessment Guide

How to assess, classify, and act on risk levels during refactoring.

---

## Risk Level Definitions

| Level | Score | Description | Gate Action |
|-------|-------|-------------|-------------|
| **LOW** | 0-1 | Simple rename, single-file change, high test coverage | Auto-merge if tests pass |
| **MEDIUM** | 2-3 | Multi-file change, dependency swap, moderate coverage | Require diff review |
| **HIGH** | 4-5 | Structure change, many files, low coverage, breaking changes | Require approval + manual test |
| **CRITICAL** | 6+ | Breaking public API, cross-package restructure | Require explicit confirmation per step |

---

## Risk Scoring

Calculate risk score by summing factors:

| Factor | +0 | +1 | +2 |
|--------|----|----|-----|
| **Files affected** | 1-5 | 6-20 | 21+ |
| **Breaking changes** | None | Internal only | Public API |
| **Test coverage** | >80% | 50-80% | <50% |
| **Refactor type** | rename, inline | dependency, move, extract | optimize, structure, modernize |
| **Cross-package** | Single package | 2-3 packages | 4+ packages |

**Total = sum of all factors** -> maps to risk level above.

---

## Risk Escalation Rules

### LOW Risk
- Proceed automatically in auto mode
- Show diff summary before merge in interactive mode
- Skip security review (unless dependency type)

### MEDIUM Risk
- Always show diff summary
- Run full validation suite
- Pause for review unless auto mode

### HIGH Risk
- Always pause for user review (even in auto mode)
- Run security-reviewer agent
- Generate migration guide
- Recommend manual smoke test

### CRITICAL Risk
- Always pause for explicit user confirmation
- Run all validation agents
- Create checkpoint before each execution step
- Generate detailed migration guide
- Require manual testing before merge

---

## Type-Specific Risk Factors

### Dependency Changes
- Check for CVEs in replacement package
- Check download count / maintenance status
- Bundle size difference > 50% = +1 risk
- API surface mismatch > 20% = +1 risk

### Structure Changes
- Any change to package boundaries = minimum MEDIUM
- tsconfig.json changes = +1 risk
- Build system changes = +1 risk
- CI/CD changes = +1 risk

### Rename / Move
- If symbol is exported from package = +1 risk
- If referenced in config files = +1 risk
- If part of public API = +2 risk

---

## Checkpoint Strategy

| Risk Level | Checkpoints |
|------------|-------------|
| LOW | Before execution, after execution |
| MEDIUM | Before execution, after each major step, after execution |
| HIGH | Before execution, after each file group, after execution |
| CRITICAL | After every individual file change |

Checkpoints are `git stash` snapshots in the worktree that can be restored on failure.

---

## Rollback Triggers

Automatic rollback occurs when:
1. Type checking fails after a step
2. Tests that passed in baseline now fail
3. Build fails
4. Lint introduces new errors (not pre-existing)

Manual rollback is offered when:
1. Bundle size increases > 20%
2. Build time increases > 50%
3. Security review finds concerns
