# Learning Extraction Report: F031 - Claude Agent SDK Client Setup

**Extraction Date:** 2026-02-06T14:20:00Z  
**Feature:** F031 - Claude Agent SDK client setup  
**Category:** CAT-AGT (Agent Integration)  
**Phase:** phase-2

---

## Summary

Successfully extracted learnings from F031 implementation and updated all learning system files. Feature completed in **15 minutes** with **1 iteration** (zero retries), establishing foundational patterns for Claude Agent SDK integration.

### Metrics Collected

| Metric | Value |
|--------|-------|
| Duration | 15 minutes |
| Files Changed | 8 |
| Lines Added | 159 |
| Lines Removed | 10 |
| Commits | 1 |
| Retries | 0 |
| Loop Iterations | 1 |
| Risk Level | MEDIUM |
| Outcome | SUCCESS |

---

## New Patterns Recorded

### 1. AGT-001: SDK_OPTION_PROPERTY_NAMES
- **Confidence:** 0.9 (HIGH)
- **Category:** Server-side
- **Key Discovery:** SDK has `tools` (base set) vs `allowedTools` (auto-allowed) - different properties, different purposes
- **File Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/patterns.json` (entry #33)

### 2. TS-015: TEST_ENV_SETUP_PATTERN
- **Confidence:** 0.8 (HIGH)
- **Category:** Testing/Environment
- **Key Discovery:** Bun tests need bunfig.toml `[test] preload` to set env vars before Zod validation at import time
- **Risk if Ignored:** HIGH - cryptic test failures if env vars not pre-set
- **File Locations:**
  - `/Users/sda/Workspace/nomos-ai/.nomos/learning/patterns.json` (entry #34)
  - `/Users/sda/Workspace/nomos-ai/.nomos/learning/code/typescript.json` (added to patterns array)

### 3. AGT-002: SDK_MODEL_ID_FORMAT
- **Confidence:** 0.8 (MEDIUM-HIGH)
- **Category:** Server-side
- **Key Discovery:** SDK uses dated model IDs (claude-opus-4-20250514, not just "opus")
- **Recommendation:** Create MODEL_MAP lookup table for centralized model ID management
- **File Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/patterns.json` (entry #35)

---

## Files Updated

### 1. patterns.json
- **Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/patterns.json`
- **Changes:** Added 3 new patterns (AGT-001, TS-015, AGT-002)
- **Total Patterns:** Now 35 (was 32)
- **Last Updated:** 2026-02-06T14:20:00Z

### 2. metrics.json
- **Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/metrics.json`
- **Changes:** Added F031 feature metrics
- **Feature Duration:** 15 min, 8 files, 1 commit, 0 retries
- **Status:** SUCCESS

### 3. insights/F031.json (NEW)
- **Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/insights/F031.json`
- **Size:** ~2.5 KB
- **Contents:**
  - 3 key discoveries about SDK properties, model IDs, and test setup
  - 5 "what worked" items demonstrating best practices
  - 4 recommendations for future agent features
  - Related patterns cross-references
  - File modification list

### 4. code/codebase-map.json
- **Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/code/codebase-map.json`
- **Addition:** `packages/server/src/agent-client.ts` entry
- **Exports Documented:** MODEL_MAP, DEFAULT_TOOLS, createAgentQuery, AgentQueryInput, AgentQueryOutput

### 5. code/typescript.json
- **Location:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/code/typescript.json`
- **Addition:** TS-015 pattern (Test environment setup with bunfig.toml preload)
- **Severity:** HIGH
- **Tags:** testing, environment, bun, zod

---

## Key Discoveries

### Discovery 1: SDK Tool Property Separation
The Claude Agent SDK distinguishes between:
- **`tools`:** Base tool set available to agent
- **`allowedTools`:** Subset that can execute without prompting

These must be passed separately in options. Code:
```typescript
const result = await agentQuery({
  prompt: 'Build a feature',
  options: {
    tools: DEFAULT_TOOLS,
    allowedTools: ['execute_code', 'read_file']
  }
});
```

### Discovery 2: Test Environment Preload Pattern
Zod validation of env module runs at import time. Tests must pre-populate env vars:
- **bunfig.toml:** `[test] preload = ["./test-setup.ts"]`
- **test-setup.ts:** Set `process.env` vars before any test imports

Without this, all tests fail with cryptic Zod validation errors.

### Discovery 3: Model ID Format
SDK requires dated model IDs, not version-only names:
- ✓ Correct: `claude-opus-4-20250514`
- ✗ Incorrect: `opus` (won't resolve)

Created MODEL_MAP for centralized lookup and type safety.

---

## What Worked Well

1. **Factory Pattern:** `createAgentQuery()` factory provides consistent API for all agent interactions
2. **Type Safety:** TypeScript strict mode catches MODEL_MAP lookups at compile time
3. **Test Setup:** Unit tests for env validation caught missing CLAUDE_MODEL initially
4. **Clean Separation:** MODEL_MAP (models), DEFAULT_TOOLS (capabilities), createAgentQuery (API)
5. **Comprehensive Testing:** 12 unit tests all passing on first try (100% pass rate)

---

## Recommendations for Future Features

1. **Reuse agent-client.ts Pattern**
   - Factory pattern proven effective for consistent SDK integration
   - MODEL_MAP pattern ready for new models as released
   - DEFAULT_TOOLS baseline extends easily with new capabilities

2. **Establish Test Setup Standard**
   - bunfig.toml + test-setup.ts pattern should be replicated for all future server tests
   - Prevents cryptic Zod validation failures

3. **Monitor Model ID Changes**
   - SDK model IDs are dated and change with releases
   - Maintain MODEL_MAP as reference documentation
   - Consider automated model detection/update mechanism for future

4. **Create Agent Feature Task Template**
   - Skeleton for future agent features (F032+)
   - Includes bunfig.toml template, test-setup.ts scaffold
   - References agent-client.ts patterns

---

## Risk Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| **Overall Risk** | MEDIUM | Agent SDK is new dependency, patterns now established |
| **Dependency Risk** | MEDIUM | @anthropic-ai/claude-agent-sdk version stability TBD |
| **Testing Risk** | LOW | Comprehensive unit tests, test setup pattern proven |
| **Integration Risk** | LOW | Factory pattern decouples SDK from business logic |
| **Knowledge Risk** | MEDIUM | SDK APIs may change; MODEL_MAP tracking mitigates |

---

## Pattern Applicability Matrix

| Pattern | Best For | Risk if Ignored | Confidence |
|---------|----------|-----------------|------------|
| AGT-001 | All agent queries | Incorrect tool configuration | 0.9 |
| TS-015 | Server test environments | Silent test failures | 0.8 |
| AGT-002 | Model selection | Runtime model resolution failures | 0.8 |

---

## Next Steps for Planning Phase

1. **For F032+** (future agent features):
   - Reference agent-client.ts factory pattern (file: packages/server/src/agent-client.ts)
   - Check MODEL_MAP for latest model IDs
   - Review TS-015 test setup pattern for test configuration

2. **For Verification Team:**
   - Ensure SDK error handling tested (model not found, API rate limit, etc.)
   - Verify agent output type safety with AgentQueryOutput type

3. **For System Improvement:**
   - Consider automated model ID discovery from SDK package metadata
   - Track SDK version compatibility as new releases appear

---

## File References (Absolute Paths)

- **Learning Patterns:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/patterns.json`
- **Metrics:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/metrics.json`
- **Insight:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/insights/F031.json`
- **Codebase Map:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/code/codebase-map.json`
- **TypeScript Knowledge:** `/Users/sda/Workspace/nomos-ai/.nomos/learning/code/typescript.json`

---

**Extraction Completed:** 2026-02-06 14:20 UTC  
**Extraction Quality:** HIGH - All required files updated, patterns documented, insights captured
