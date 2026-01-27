---
name: step-05a-qa
description: Functional QA - test acceptance criteria in running application
prev_step: steps/step-05-validate.md
next_step: steps/step-06-review.md
---

# Step 5a: QA (Functional Acceptance Testing)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip this step - ALL features have acceptance criteria to test
- 🛑 NEVER claim AC met without actually testing in running app
- ✅ ALWAYS test each acceptance criterion
- ✅ ALWAYS use real application (server + web running)
- ✅ ALWAYS capture evidence (screenshots, API responses, logs)
- 📋 YOU ARE A QA SPECIALIST, not a code reviewer
- 💬 FOCUS on "Does the feature work as specified?"
- 🚫 FORBIDDEN to proceed without evidence

<critical>
## NO SKIP POLICY

This step is MANDATORY for ALL feature types:
- **UI features**: Test visually in browser, capture screenshots
- **API features**: Test via curl/fetch, capture responses
- **Database features**: Verify data via API AND UI, capture both
- **Library features**: Verify integration works in running app

Every feature has acceptance criteria. Every AC must be tested at runtime.
</critical>

## EXECUTION PROTOCOLS:

- 🎯 Launch qa-functional-tester agent
- 💾 Capture evidence for each AC (screenshots OR API responses)
- 📖 Test from user's perspective AND system perspective
- 🚫 FORBIDDEN to mark AC met without proof

## CONTEXT BOUNDARIES:

- Static validation passed (step-05)
- Application runs (verified in step-04a)
- Focus: Does the feature meet requirements?
- Test acceptance criteria, not implementation details

## YOUR TASK:

Verify each acceptance criterion by testing the running application (server + web).

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{acceptance_criteria}` | List of ACs from features.json |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output directory |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Load Acceptance Criteria

Extract ACs from features.json for `{feature_id}`:

```markdown
## Acceptance Criteria

| ID | Criterion | Test Plan |
|----|-----------|-----------|
| AC1 | {criterion text} | {how to test} |
| AC2 | {criterion text} | {how to test} |
```

### 2. Read Worktree Ports and Start Services

**Read ports from worktree config (set during step-00-init):**

```bash
cd {worktree_path}

# Read ports from worktree config
PORTS_JSON=$(cat .nomos/ports.json)
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')

# Feature-specific log files
SERVER_LOG="/tmp/nomos-server-{feature_id}.log"
WEB_LOG="/tmp/nomos-web-{feature_id}.log"

echo "Using ports: SERVER=$SERVER_PORT, WEB=$WEB_PORT"

# Check if services already running (from smoke test)
if ! curl -s "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
    bun run dev:server > "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
fi

if ! curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1; then
    VITE_PORT=$WEB_PORT bun run dev:web > "$WEB_LOG" 2>&1 &
    WEB_PID=$!
fi

# Wait for startup
for i in {1..30}; do
  curl -s "http://localhost:$SERVER_PORT/health" > /dev/null && break
  sleep 1
done
```

### 3. Launch QA Agent (Parallel Testing)

**CRITICAL: Launch the qa-functional-tester agent with Playwright access**

```
Task agent: qa-functional-tester
Model: sonnet
Prompt: |
  ## QA Testing for {feature_id}: {feature_title}

  You are testing the following acceptance criteria:

  {acceptance_criteria list}

  ### Instructions:

  1. For EACH acceptance criterion:
     a. Navigate to the relevant page/endpoint
     b. Perform the required actions
     c. Verify the expected outcome
     d. Capture evidence (screenshot or response)
     e. Record PASS or FAIL with details

  2. For UI criteria:
     - Use Playwright MCP to interact with the browser
     - Take screenshots as evidence
     - Check for console errors

  3. For API criteria:
     - Use curl or fetch to hit endpoints
     - Verify response structure and data
     - Test error cases

  ### Endpoints (use allocated ports):
  - Server: http://localhost:$SERVER_PORT
  - Web: http://localhost:$WEB_PORT

  ### Required Output:

  For each AC, report:
  - AC ID
  - Test performed
  - Expected result
  - Actual result
  - PASS/FAIL
  - Evidence (screenshot path or response snippet)
```

### 4. Testing Protocols by Feature Type

---

#### 4A. Database/Seeding Features

**For features involving database, schema, migrations, or seed data:**

**Step 1: Verify via API**
```bash
# Check data exists
curl -s http://localhost:$SERVER_PORT/api/v1/features | jq '.data | length'

# Verify specific seeded records
curl -s http://localhost:$SERVER_PORT/api/v1/features | jq '.data[] | {id, title, status}'

# Check settings/profiles if applicable
curl -s http://localhost:$SERVER_PORT/api/v1/profiles | jq '.data[] | {id, name, isBuiltIn}'
curl -s http://localhost:$SERVER_PORT/api/v1/settings | jq '.data'
```

**Step 2: Verify in UI**
```
Task agent: qa-functional-tester
Prompt: |
  Verify database seeding acceptance criteria for {feature_id}:

  Acceptance Criteria:
  {acceptance_criteria list}

  For EACH criterion:
  1. Navigate to the relevant page (e.g., http://localhost:$WEB_PORT for Kanban)
  2. Take a screenshot showing the data
  3. Verify the seeded data appears correctly
  4. Check console for any errors

  Capture evidence for each AC.
```

---

#### 4B. UI Testing Protocol

**For UI features, the agent uses Playwright:**

```typescript
// Navigate to feature
await page.goto('http://localhost:$WEB_PORT/feature-path');

// Take initial screenshot
await page.screenshot({ path: 'qa-evidence/ac1-initial.png' });

// Interact with feature
await page.click('[data-testid="feature-button"]');

// Verify outcome
const result = await page.locator('.result-element').textContent();
expect(result).toContain('expected text');

// Take final screenshot as evidence
await page.screenshot({ path: 'qa-evidence/ac1-final.png' });
```

---

#### 4C. API Testing Protocol

**For API features:**

```bash
# Test API endpoint
response=$(curl -s -X POST http://localhost:$SERVER_PORT/api/v1/feature \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')

# Verify response
echo "$response" | jq '.success'  # Should be true
echo "$response" | jq '.data'     # Should contain expected fields

# Test error case
error_response=$(curl -s -X POST http://localhost:$SERVER_PORT/api/v1/feature \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}')
echo "$error_response" | jq '.success'  # Should be false
echo "$error_response" | jq '.error'    # Should have error message
```

---

#### 4D. Library/Types Features

**For features involving packages/types, config, or shared utilities:**

```bash
# Verify the app uses the library without errors
curl -s http://localhost:$SERVER_PORT/health | jq '.success'  # true

# Check server logs for import/type errors
grep -i "cannot find\|undefined\|type error" $SERVER_LOG || echo "No type errors"

# Verify affected functionality still works
curl -s http://localhost:$SERVER_PORT/api/v1/features | jq '.success'  # true
```

**Then verify UI still functions:**
```
Task agent: qa-functional-tester
Prompt: |
  Verify the application still functions correctly after library changes:

  1. Navigate to http://localhost:$WEB_PORT
  2. Verify the page loads without errors
  3. Check console for any errors
  4. Test basic functionality that uses the changed library

  Report any regressions.
```

### 6. Compile Results

```markdown
## QA Test Results

### Summary
| Metric | Value |
|--------|-------|
| Total ACs | {count} |
| Passed | {count} |
| Failed | {count} |
| Blocked | {count} |

### Detailed Results

#### AC1: {criterion}
**Status:** ✓ PASS
**Test:** {what was tested}
**Expected:** {expected outcome}
**Actual:** {actual outcome}
**Evidence:** ![screenshot](qa-evidence/ac1.png)

#### AC2: {criterion}
**Status:** ✗ FAIL
**Test:** {what was tested}
**Expected:** {expected outcome}
**Actual:** {actual outcome}
**Error:** {error details}
**Evidence:** ![screenshot](qa-evidence/ac2.png)
```

### 7. Handle Failures

**If ANY acceptance criterion fails:**

1. Document the failure with evidence
2. Analyze root cause
3. Return to step-04 for fixes
4. DO NOT proceed to review

```markdown
## ❌ QA Testing FAILED

**Failed ACs:** {count}

### Failure Details

#### AC{n}: {criterion}
**Expected:** {what should happen}
**Actual:** {what happened}
**Evidence:** {screenshot/log}
**Probable Cause:** {analysis}

**Action Required:** Return to step-04-execute to fix failing acceptance criteria.
```

**If `{auto_mode}` = false:**

```yaml
questions:
  - header: "QA Failed"
    question: "Some acceptance criteria failed. How to proceed?"
    options:
      - label: "Fix and retest (Recommended)"
        description: "Return to step-04 to fix the issues"
      - label: "Continue anyway"
        description: "Proceed despite failures (document as known issues)"
      - label: "Review failures"
        description: "I want to analyze the failures first"
    multiSelect: false
```

### 8. Complete Output

Append to `{output_dir}/05a-qa.md`:

```markdown
---
## Step Complete
**Status:** ✓ Complete
**ACs Tested:** {count}
**ACs Passed:** {count}
**ACs Failed:** {count}
**Evidence captured:** {count} screenshots
**Next:** step-06-review.md
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ All acceptance criteria tested
✅ Evidence captured for each AC
✅ Tests performed on running application
✅ All ACs pass (or failures documented)
✅ User-facing functionality verified

## FAILURE MODES:

❌ **CRITICAL**: Skipping QA for "non-UI" or "database-only" features
❌ Skipping acceptance criteria
❌ Testing against mocks instead of real app
❌ Not capturing evidence (screenshots OR API responses)
❌ Claiming pass without actual testing in running app
❌ Ignoring failures
❌ **CRITICAL**: Proceeding with failed ACs
❌ Only testing one layer (API but not UI, or vice versa)
❌ Not verifying data appears correctly in UI for database features

## QA PROTOCOLS:

- Test from USER's perspective (UI) AND system perspective (API)
- Use the REAL application (both server AND web running)
- Capture EVIDENCE for every test (screenshots AND/OR API responses)
- Report ACTUAL results, not assumptions
- FAIL FAST - stop if critical AC fails
- Database features: ALWAYS verify via API first, THEN verify in UI
- Every feature type gets tested at runtime - NO EXCEPTIONS

---

## NEXT STEP:

After QA tests pass (or failures documented), load `./step-06-review.md`

<critical>
Remember: Acceptance criteria are a CONTRACT.
If the feature doesn't meet the criteria, it's not done - regardless of code quality!
</critical>
