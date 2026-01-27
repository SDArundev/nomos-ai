---
name: step-04a-smoke
description: Runtime smoke test - start the app and verify basic functionality
prev_step: steps/step-04-execute.md
next_step: steps/step-05-validate.md
---

# Step 4a: Smoke Test (Runtime Verification)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER skip this step - ALL features must be runtime tested
- 🛑 NEVER mark pass if server fails to start
- ✅ ALWAYS start both server AND web (full stack)
- ✅ ALWAYS hit real endpoints (not mocked)
- ✅ ALWAYS verify the feature at runtime
- 📋 YOU ARE A QA ENGINEER, not a code reviewer
- 💬 FOCUS on "Does it actually run?"
- 🚫 FORBIDDEN to proceed if runtime fails

<critical>
## NO SKIP POLICY

This step is MANDATORY for ALL feature types:
- **UI features**: Test in browser
- **API features**: Test via curl/fetch
- **Database features**: Verify data via API or UI
- **Library features**: Verify integration in running app

The only way to know code works is to RUN it.
</critical>

## EXECUTION PROTOCOLS:

- 🎯 Start BOTH server and web from worktree
- 💾 Capture startup logs and errors
- 📖 Test basic functionality based on feature type
- 🚫 FORBIDDEN to claim "works" without running it

## CONTEXT BOUNDARIES:

- Code implementation is complete (step-04)
- No validation checks have run yet
- This step bridges implementation and validation
- Focus: Does the code actually execute?

## YOUR TASK:

Start the application (server + web) and verify it runs without runtime errors.

---

<available_state>
From previous steps:

| Variable | Description |
|----------|-------------|
| `{feature_id}` | Feature identifier |
| `{feature_title}` | Feature title |
| `{auto_mode}` | Skip confirmations |
| `{worktree_path}` | Path to worktree |
| `{output_dir}` | Path to output directory |
| Files modified | From step-04 execution |
</available_state>

---

## EXECUTION SEQUENCE:

### 1. Detect Feature Type (Determines HOW to test, NOT whether to test)

Analyze modified files to determine testing approach:

```markdown
## Feature Type Detection

| Type | Indicators | Testing Approach |
|------|------------|------------------|
| Database/Seed | packages/db, schema, seed, migrate | Verify data via API → check UI |
| Backend/API | apps/server, routes, handlers | Test endpoints with curl |
| Frontend/UI | apps/web, components, pages | Test in browser with Playwright |
| Full Stack | Multiple areas | All of the above |
| Library/Types | packages/types, config | Verify no runtime errors on import |
```

**ALL types require starting the application. No exceptions.**

### 2. Read Worktree Ports (PARALLEL EXECUTION SUPPORT)

**Read ports configured during worktree setup (step-00-init):**

```bash
cd {worktree_path}

# Read ports from worktree config (set during init)
PORTS_JSON=$(cat .nomos/ports.json)
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')

echo "Using ports: SERVER=$SERVER_PORT, WEB=$WEB_PORT"

# Feature-specific log files (avoids overwriting from parallel agents)
SERVER_LOG="/tmp/nomos-server-{feature_id}.log"
WEB_LOG="/tmp/nomos-web-{feature_id}.log"
```

### 3. Start Application(s) (ALWAYS BOTH)

**Always start both server AND web (ports configured in worktree .env files):**

```bash
cd {worktree_path}

# Check if server already running on this port
if curl -s "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
    echo "Server already running on port $SERVER_PORT, reusing existing instance"
    SERVER_PID="EXISTING"
else
    # Start server (PORT is in apps/server/.env)
    bun run dev:server > "$SERVER_LOG" 2>&1 &
    SERVER_PID=$!
fi

# Check if web already running on this port
if curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1; then
    echo "Web already running on port $WEB_PORT, reusing existing instance"
    WEB_PID="EXISTING"
else
    # Start web (VITE_PORT in apps/web/.env configures the port)
    VITE_PORT=$WEB_PORT bun run dev:web > "$WEB_LOG" 2>&1 &
    WEB_PID=$!
fi

# Wait for server startup (max 30 seconds)
echo "Waiting for server on port $SERVER_PORT..."
for i in {1..30}; do
  curl -s "http://localhost:$SERVER_PORT/health" > /dev/null && break
  sleep 1
done

# Wait for web startup (max 30 seconds)
echo "Waiting for web on port $WEB_PORT..."
for i in {1..30}; do
  curl -s "http://localhost:$WEB_PORT" > /dev/null && break
  sleep 1
done

echo "Server PID: $SERVER_PID (port $SERVER_PORT)"
echo "Web PID: $WEB_PID (port $WEB_PORT)"
```

**If startup fails, check feature-specific logs:**
```bash
tail -50 "$SERVER_LOG"
tail -50 "$WEB_LOG"
```

### 4. Verify Health

**Backend health check (use allocated port):**

```bash
curl -s "http://localhost:$SERVER_PORT/health" | jq '.'
```

Expected: `{ "success": true, "data": { "status": "ok" } }`

**Frontend health check (use allocated port):**

```bash
curl -s "http://localhost:$WEB_PORT" | head -20
```

Expected: HTML content with `<!doctype html>`

### 5. Test Feature Functionality

**Use the appropriate testing protocol based on feature type:**

**Important: Use `$SERVER_PORT` and `$WEB_PORT` variables throughout testing.**

---

#### 5A. Database/Seeding Features

**For features involving database, schema, migrations, or seed data:**

```bash
# 1. Verify data exists via API (use allocated port)
curl -s "http://localhost:$SERVER_PORT/api/v1/features" | jq '.data | length'
curl -s "http://localhost:$SERVER_PORT/api/v1/profiles" | jq '.data | length'
curl -s "http://localhost:$SERVER_PORT/api/v1/settings" | jq '.data'

# 2. Check for expected seeded records
curl -s "http://localhost:$SERVER_PORT/api/v1/features" | jq '.data[] | {id, title, status}'
```

**Then verify in UI:**
```
Task agent: qa-smoke-tester
Prompt: |
  Verify database seeding for {feature_title}:

  1. Navigate to http://localhost:$WEB_PORT (Kanban board)
  2. Take a screenshot of the board
  3. Verify seeded features appear in the correct columns
  4. Check for any console errors
  5. Report what data is visible

  Expected: Seeded features should appear on the board
  Files modified: {list from step-04}
  Server port: $SERVER_PORT
  Web port: $WEB_PORT
```

---

#### 5B. API/Backend Features

**For features involving server routes, handlers, or API logic:**

```
Task agent: qa-smoke-tester
Prompt: |
  Test the following API endpoints for {feature_title}:

  1. Hit the relevant endpoints based on the feature
  2. Verify responses are valid JSON with correct structure
  3. Test both success and error cases
  4. Check for runtime errors in server logs
  5. Report any failures

  Server: http://localhost:$SERVER_PORT
  Feature: {feature_description}
  Files modified: {list from step-04}
```

---

#### 5C. UI/Frontend Features

**For features involving components, pages, or UI logic:**

```
Task agent: qa-smoke-tester
Prompt: |
  Use Playwright to verify the UI for {feature_title}:

  1. Navigate to the relevant page
  2. Take a screenshot
  3. Verify key elements render correctly
  4. Interact with the feature if applicable
  5. Check console for errors
  6. Report any failures

  Web: http://localhost:$WEB_PORT
  Feature: {feature_description}
  Files modified: {list from step-04}
```

---

#### 5D. Library/Types Features

**For features involving packages/types, config, or shared utilities:**

```bash
# Verify the app starts without import errors (use allocated ports)
curl -s "http://localhost:$SERVER_PORT/health" | jq '.success'
curl -s "http://localhost:$WEB_PORT" | grep -q "<!doctype html>" && echo "Web loads OK"

# Check feature-specific logs for any runtime errors
grep -i "error\|cannot find\|undefined" "$SERVER_LOG" || echo "No errors"
```

### 6. Check Server Logs

```bash
# Capture any runtime errors from feature-specific logs
grep -i "error\|exception\|failed" "$SERVER_LOG" || echo "No errors"
```

### 7. Present Results

```markdown
## Smoke Test Results

**Port Allocation:**
| Setting | Value |
|---------|-------|
| Mode | {PORT_MODE: primary/parallel} |
| Server Port | {SERVER_PORT} |
| Web Port | {WEB_PORT} |

**Startup:**
| Service | Port | Status |
|---------|------|--------|
| Server | {SERVER_PORT} | ✓ Running |
| Web | {WEB_PORT} | ✓ Running |

**Health Checks:**
| Endpoint | Response | Status |
|----------|----------|--------|
| /health | 200 OK | ✓ |
| / | HTML | ✓ |

**Feature Test:**
| Test | Result |
|------|--------|
| {test 1} | ✓ Pass |
| {test 2} | ✓ Pass |

**Console Errors:** None

**Runtime Status:** ✓ All smoke tests passed
```

### 8. Cleanup

```bash
# Stop background processes (only if we started them, not if EXISTING)
if [[ "$SERVER_PID" != "EXISTING" ]]; then
    kill $SERVER_PID 2>/dev/null || true
fi
if [[ "$WEB_PID" != "EXISTING" ]]; then
    kill $WEB_PID 2>/dev/null || true
fi

# Optionally clean up port allocation file (uncomment if single-use)
# rm -f .nomos/locks/{feature_id}.ports
```

### 9. Handle Failures

**If smoke test fails:**

1. Log the failure details
2. Stop and return to step-04 to fix
3. DO NOT proceed to validation

```markdown
## ❌ Smoke Test FAILED

**Failure Type:** {Runtime Error / Startup Failure / Endpoint Error}
**Ports Used:** SERVER={SERVER_PORT}, WEB={WEB_PORT}
**Error:**
\`\`\`
{error details}
\`\`\`

**Logs:**
- Server: $SERVER_LOG
- Web: $WEB_LOG

**Root Cause Analysis:**
- {likely cause}

**Action Required:** Return to step-04-execute to fix.
```

### 10. Complete Output

Append to `{output_dir}/04a-smoke.md`:

```markdown
---
## Step Complete
**Status:** ✓ Complete
**Services tested:** {count}
**Endpoints verified:** {count}
**Runtime errors:** {count}
**Next:** step-05-validate.md
**Timestamp:** {ISO timestamp}
```

---

## SUCCESS METRICS:

✅ Application starts without errors
✅ Health endpoint returns success
✅ Feature-specific endpoints respond
✅ No runtime exceptions in logs
✅ UI renders (if applicable)
✅ Console has no errors

## FAILURE MODES:

❌ **CRITICAL**: Skipping smoke test for "non-UI" or "library" features
❌ Not starting BOTH server and web
❌ Ignoring startup errors
❌ Proceeding with runtime failures
❌ Not testing the actual feature based on its type
❌ **CRITICAL**: Marking pass without running code
❌ Not verifying database features via API AND UI
❌ Only testing one layer (e.g., only API, not UI)

## SMOKE TEST PROTOCOLS:

- Start the REAL application
- Hit REAL endpoints (not mocks)
- Capture REAL logs
- Test the ACTUAL feature
- Report ACTUAL results

---

## NEXT STEP:

After smoke tests pass, load `./step-05-validate.md`

<critical>
Remember: If the code doesn't run, it doesn't work - no matter what the types say!
This step exists specifically to catch runtime bugs that static analysis misses.
</critical>
