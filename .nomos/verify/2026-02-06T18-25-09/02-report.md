# Verification Report

**Generated:** 2026-02-06T18:25:09
**Scope:** Failed features (regressions)
**Depth:** Standard (3 dimensions)
**Fix Mode:** true
**Features:** 5 (F001, F007, F010, F011, F018)

---

## Executive Summary

Targeted verification of 5 failed/regression features across 3 dimensions (Bugs, Quality, Requirements). All 5 features confirmed as having actionable issues.

**After deduplication: 12 unique findings** from 22 raw findings (10 duplicates merged).

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 4 |
| MEDIUM | 1 |
| LOW | 1 |
| **Total** | **12** |

**Pass Rate:** 0% (0/5 features pass — all have CRITICAL or HIGH issues)

---

## Findings by Severity

### CRITICAL (6)

| # | ID | Feature | Description | Effort |
|---|-----|---------|-------------|--------|
| 1 | FIX-001 | CROSS-CUTTING | `crypto.randomUUID()` used for all entity IDs instead of branded format (F###, P###, S###) — violates type system, breaks validation | Medium |
| 2 | FIX-002 | F007 | Projects table missing `status` column defined in ProjectSchema Zod type — schema drift | Low |
| 3 | FIX-003 | F010 | Learning table has schema but no learningRepository + no learning oRPC router — all 4 ACs NOT_MET | Medium |
| 4 | FIX-004 | F011 | No rollback capability for database migrations — AC4 NOT_MET | Low |
| 5 | FIX-005 | F001 | No TypeScript project references configured — AC3 NOT_MET | Low |
| 6 | FIX-006 | F007/F018 | Schema drift: Drizzle `filename?` optional vs Zod `filename` required in FeatureAssetSchema | Low |

### HIGH (4)

| # | ID | Feature | Description | Effort |
|---|-----|---------|-------------|--------|
| 1 | FIX-007 | F018 | TOCTOU race condition in `bulkUpdateStatus` — validate + update not wrapped in transaction | Medium |
| 2 | FIX-008 | F018 | `bulkUpdateStatus` silently skips non-existent feature IDs — should throw NOT_FOUND | Low |
| 3 | FIX-009 | CROSS-CUTTING | `VALID_TRANSITIONS` state machine duplicated in 4 files (server + client) | Low |
| 4 | FIX-010 | CROSS-CUTTING | Error handling try-catch boilerplate duplicated 15+ times across routers | Low |

### MEDIUM (1)

| # | ID | Feature | Description |
|---|-----|---------|-------------|
| 1 | FIX-011 | F001 | turbo.json has check-types but not explicit 'check' pipeline per AC |

### LOW (1)

| # | ID | Feature | Description |
|---|-----|---------|-------------|
| 1 | FIX-012 | F007 | settings `.default({})` JavaScript object may not serialize correctly for SQLite JSON |

---

## Per-Feature Breakdown

### F001: Monorepo scaffold with Turborepo — FAIL

| AC | Status |
|----|--------|
| turbo.json configured with build, dev, check pipelines | PARTIALLY_MET |
| Package workspaces defined in root package.json | MET |
| TypeScript project references working | NOT_MET |
| bun run dev starts all apps concurrently | MET |

**Findings:** FIX-005 (CRITICAL), FIX-011 (MEDIUM)
**Fix:** Add `references` array to root tsconfig.json linking all packages/apps.

### F007: Projects table schema — FAIL

| AC | Status |
|----|--------|
| Table created with all columns | MET (but schema drift with Zod) |
| Primary key on id | MET |
| Unique constraint on path | MET |
| JSON column for flexible settings | MET |

**Findings:** FIX-002 (CRITICAL), FIX-006 (CRITICAL), FIX-012 (LOW)
**Fix:** Add `status` column to projects table + migration. Fix filename optionality in FeatureAssetSchema.

### F010: Learning table schema — FAIL

| AC | Status |
|----|--------|
| Learnings stored with metadata | NOT_MET |
| Category for filtering patterns | NOT_MET |
| Source featureId tracked | NOT_MET |
| Timestamp for recency | NOT_MET |

**Findings:** FIX-003 (CRITICAL)
**Fix:** Create learningRepository + learning oRPC router + export from index files.

### F011: Database migrations initial setup — FAIL

| AC | Status |
|----|--------|
| Migrations generated successfully | MET |
| Migrations run on server start | MET |
| Schema version tracked | MET |
| Rollback capability exists | NOT_MET |

**Findings:** FIX-004 (CRITICAL)
**Fix:** Add `db:rollback` script using drizzle-kit drop + document rollback procedure.

### F018: Features oRPC router — FAIL

| AC | Status |
|----|--------|
| All feature procedures work | MET |
| Status transitions validated | MET (but TOCTOU race) |
| Bulk operations efficient | MET (but silent failures) |
| Filtering by status/phase | MET |

**Findings:** FIX-001 (CRITICAL), FIX-007 (HIGH), FIX-008 (HIGH)
**Fix:** Switch to branded ID generation in repository. Wrap bulk ops in transaction. Report missing IDs.

---

## Fix Strategy (Priority Order)

All features are in fix mode. Fixes ordered by dependency and severity:

| Priority | ID | Feature | Fix Description | Effort | Dependencies |
|----------|-----|---------|----------------|--------|--------------|
| P1 | FIX-005 | F001 | Add TS project references to root tsconfig.json | Low | None |
| P2 | FIX-002 | F007 | Add `status` column to projects table + generate migration | Low | None |
| P3 | FIX-006 | F007 | Fix FeatureAssetSchema filename optionality (make optional) | Low | None |
| P4 | FIX-004 | F011 | Add `db:rollback` script + document rollback procedure | Low | None |
| P5 | FIX-003 | F010 | Create learningRepository + learning oRPC router | Medium | None |
| P6 | FIX-001 | CROSS | Switch from UUID to branded ID generation in repositories | Medium | FIX-003 (learning repo pattern) |
| P7 | FIX-007 | F018 | Wrap bulkUpdateStatus in transaction | Medium | None |
| P8 | FIX-008 | F018 | Track + report missing feature IDs in bulk ops | Low | FIX-007 |
| P9 | FIX-009 | CROSS | Extract VALID_TRANSITIONS to @nomos-ai/types | Low | None |
| P10 | FIX-010 | CROSS | Create handleRepositoryError utility | Low | None |

**Total estimated: 5 low + 3 medium = manageable in 1-2 fix iterations**

---

## Recommendations

1. **Fix order:** P1-P4 are independent low-effort fixes — do them first
2. **F010 (P5)** is the biggest work item — create repository following existing patterns, then router
3. **Branded IDs (P6)** should be done after learning repo since the pattern applies to all repos
4. **Transaction fix (P7-P8)** for F018 should be done together
5. **Quality fixes (P9-P10)** are optional for re-verification but improve maintainability
6. After all fixes: run typecheck (`bun run check-types`) to validate

---

## Decision Gate

**fix_mode = true** AND **6 CRITICAL + 4 HIGH findings** → **Proceed to step-03-fix**
