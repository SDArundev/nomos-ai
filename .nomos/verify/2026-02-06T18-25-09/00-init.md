# Verification Session: Fix Failed Features

| Field | Value |
|-------|-------|
| **Scope** | failed |
| **Analysis Mode** | codebase |
| **Depth** | standard |
| **Fix Mode** | true |
| **Auto Mode** | false |
| **Features** | 5 features (F001, F007, F010, F011, F018) |
| **Output** | /Users/sda/Workspace/nomos-ai/.nomos/verify/2026-02-06T18-25-09 |
| **Max Fix Iterations** | 3 |
| **Timestamp** | 2026-02-06T18-25-09 |

## Features to Fix

| Feature | Title | Failure Reason |
|---------|-------|---------------|
| F001 | Monorepo scaffold with Turborepo | Missing TS project references (AC unmet) |
| F007 | Projects table schema | Missing `status` column in DB |
| F010 | Learning table schema | No learningRepository or learning router |
| F011 | Database migrations initial setup | No rollback capability (AC unmet) |
| F018 | Features oRPC router | TOCTOU race, silent failures, UUID IDs |

## Dimensions (Standard)
1. Bugs (code-reviewer)
2. Requirements (qa-reviewer)
3. Quality (code-quality-reviewer)
