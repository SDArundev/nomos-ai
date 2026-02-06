# Verification Report — F031

## Executive Summary

**Feature:** F031 — Claude Agent SDK client setup
**Scope:** Single feature | **Depth:** Standard (3 dimensions) | **Status:** verified

**Result: CONDITIONAL PASS** — All 4 acceptance criteria are MET, but 1 CRITICAL SDK contract violation found.

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 3 |
| **Total (deduplicated)** | **8** |

**Regressions:** 0 (CRITICAL finding is pre-existing, not a regression — existed at verification time)

---

## Findings by Severity

### CRITICAL (1)

| ID | Title | File | Dimension |
|----|-------|------|-----------|
| F-001 | Missing `allowDangerouslySkipPermissions` flag | agent-client.ts:39 | Bugs |

**F-001: Missing `allowDangerouslySkipPermissions` flag when using `bypassPermissions`**
- **Dimension:** Bugs
- **File:** `apps/server/src/lib/agent-client.ts:39`
- **Description:** `createAgentQuery` sets `permissionMode: "bypassPermissions"` as default but does not set the required `allowDangerouslySkipPermissions: true` flag. The SDK type declarations explicitly state: "Must be set to `true` when using `permissionMode: 'bypassPermissions'`. This is a safety measure to ensure intentional bypassing of permissions."
- **Evidence:** Verified against SDK v0.2.34 type declarations at `sdk.d.ts:667-670`.
- **Impact:** SDK contract violation. May cause runtime errors in future SDK versions. Permission bypass may silently fail.
- **Fix:** Add `allowDangerouslySkipPermissions: true` to the options object when permissionMode is `bypassPermissions`.
- **Regression:** NO — pre-existing issue, not introduced by a later change.

### HIGH (1)

| ID | Title | File | Dimension |
|----|-------|------|-----------|
| F-002 | `permissionMode` type not derived from constant | agent-client.ts:26 | Quality |

**F-002: `permissionMode` type not derived from `PERMISSION_MODES` constant + missing SDK modes**
- **Dimension:** Quality
- **File:** `apps/server/src/lib/agent-client.ts:26`
- **Description:** The `permissionMode` parameter uses a hardcoded string union `"default" | "acceptEdits" | "bypassPermissions" | "plan"` instead of deriving from the `PERMISSION_MODES` constant. Additionally, the SDK defines 6 modes (`default`, `acceptEdits`, `bypassPermissions`, `plan`, `delegate`, `dontAsk`) but our code only lists 4 — missing `delegate` and `dontAsk`.
- **Impact:** DRY violation, type/value drift risk. Missing modes means callers can't use `delegate` or `dontAsk` even though the SDK supports them.
- **Fix:** Create `PermissionMode` type derived from `PERMISSION_MODES`, update `PERMISSION_MODES` to include all SDK modes, or import `PermissionMode` type directly from SDK.

### MEDIUM (3)

| ID | Title | File | Dimension |
|----|-------|------|-----------|
| F-003 | Model fallback skips MODEL_MAP validation | agent-client.ts:28 | Bugs + Quality |
| F-004 | Incomplete test coverage | agent-client.test.ts | Quality + Requirements |
| F-005 | Missing validation for numeric parameters | agent-client.ts:22-23 | Quality |

**F-003: Model fallback skips MODEL_MAP validation**
- **File:** `apps/server/src/lib/agent-client.ts:28`
- **Description:** When `options.model` is provided, it's mapped via `MODEL_MAP`. When not, `env.CLAUDE_MODEL` is used directly — a different code path for the same purpose. If `env.CLAUDE_MODEL` is set to a short form like `"sonnet"`, SDK gets an invalid model string.
- **Impact:** Runtime SDK error if env var misconfigured. Error surfaces far from root cause.
- **Mitigation:** The Zod env schema defaults to a valid full model ID, so this only triggers on manual misconfiguration.

**F-004: Incomplete test coverage for SDK integration**
- **File:** `apps/server/src/lib/agent-client.test.ts`
- **Description:** Tests only verify `createAgentQuery` is a function and check constant structures. No tests for parameter passing, default application, model mapping, or SDK invocation.
- **Impact:** Behavior changes won't be caught by tests.

**F-005: Missing validation for numeric parameters**
- **File:** `apps/server/src/lib/agent-client.ts:22-23`
- **Description:** `maxTurns` and `maxBudgetUsd` accept any number without validation. Negative numbers, NaN, or Infinity pass through to SDK.
- **Impact:** Confusing SDK errors instead of clear validation messages.

### LOW (3)

| ID | Title | File | Dimension |
|----|-------|------|-----------|
| F-006 | DEFAULT_TOOLS not sealed with `as const` | types/src/agent.ts:15 | Quality |
| F-007 | Missing prompt validation | agent-client.ts:19 | Bugs |
| F-008 | Undocumented bypassPermissions default | agent-client.ts:39 | Requirements |

**F-006:** `DEFAULT_TOOLS` exported as mutable array. `PERMISSION_MODES` uses `as const` but `DEFAULT_TOOLS` doesn't.

**F-007:** Empty/whitespace-only prompts passed directly to SDK without validation.

**F-008:** Default to `bypassPermissions` is intentional for NOMOS autonomous use case but lacks JSDoc explaining the security rationale.

---

## Per-Feature Breakdown

### F031 — Claude Agent SDK client setup

| AC | Status | Evidence |
|----|--------|----------|
| SDK imported and configured | **MET** | `@anthropic-ai/claude-agent-sdk` v0.2.34 imported, `query()` wrapped in factory |
| API key loaded from env | **MET** | `ANTHROPIC_API_KEY` validated in env schema, SDK auto-reads from env |
| Model configurable | **MET** | `MODEL_MAP` maps enum→SDK IDs, optional `model` param with env fallback |
| Tool permissions set | **MET** | `DEFAULT_TOOLS` + override param, `PERMISSION_MODES` constant, `permissionMode` configurable |

**Verdict:** All ACs met. Feature functions correctly. CRITICAL finding is an SDK contract issue, not a broken AC.

---

## Regression Analysis

**Regressions detected: 0**

F031 is `verified`. The CRITICAL finding (F-001) is a **pre-existing issue** that was present at verification time — the `allowDangerouslySkipPermissions` flag was never set. This is NOT a regression (nothing previously passing now fails). It's an enhancement needed for SDK compliance.

---

## Improvement Strategy

**Priority fix order (if fix mode enabled):**

| Priority | ID | Effort | Description |
|----------|----|--------|-------------|
| P1 | F-001 | Low (1 file) | Add `allowDangerouslySkipPermissions` flag |
| P2 | F-002 | Low (1 file) | Derive PermissionMode type, add missing modes |
| P3 | F-003 | Low (1 file) | Validate model ID format |
| P3 | F-004 | Medium (1 file) | Add integration tests with mocked SDK |
| P3 | F-005 | Low (1 file) | Add numeric parameter validation |

---

## Enhancement Suggestions

| Category | Suggestion | Finding |
|----------|-----------|---------|
| Security | Document `bypassPermissions` default with security rationale | F-008 |
| Type Safety | Seal `DEFAULT_TOOLS` with `as const` | F-006 |
| Resilience | Add prompt validation (empty/whitespace check) | F-007 |
| Testing | Add SDK integration tests with mocks | F-004 |

---

## Recommendations

1. **Fix F-001 immediately** — SDK contract violation should be fixed regardless of fix mode
2. **Fix F-002 soon** — Update PERMISSION_MODES to match SDK's 6 modes and derive type
3. **Log F-003 through F-008** — These are improvements, not blockers
4. **No state change needed** — Feature remains `verified` (no regression detected)
