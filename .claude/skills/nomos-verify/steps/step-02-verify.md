# Step 02: Run Verification

<objective>
Launch parallel verification agents based on mode.
</objective>

<instructions>

## 1. Ensure Services Running

Check required services are available:

```bash
# Check server
curl -s http://localhost:3008/health || echo "Server not running"

# Check web (if UI features)
curl -s http://localhost:3001 || echo "Web app not running"
```

If services not running:
- In auto mode: Attempt to start them
- Otherwise: Report as prerequisite failure

## 2. Launch Verification Agents

Based on `{mode}`, launch agents **in parallel**:

### Quick Mode
```
Task: qa-smoke-tester
```

### Standard Mode
```
Task: qa-smoke-tester
Task: qa-functional-tester
```

### Deep Mode
```
Task: qa-smoke-tester
Task: qa-functional-tester
Task: security-reviewer
Task: code-quality-reviewer
Task: test-coverage-analyzer
```

## 3. Agent Prompts

### qa-smoke-tester
```
Run smoke tests on the NOMOS application.

**Server (http://localhost:3008):**
- Health endpoint returns 200
- API endpoints respond (GET /api/v1/features)
- WebSocket accepts connections

**Web App (http://localhost:3001):**
- App loads without JS errors
- Main routes accessible

Report PASS/FAIL for each check with evidence.
```

### qa-functional-tester
```
Run functional QA tests for these features:
{features_to_verify}

For each feature, verify its acceptance criteria:
{acceptance_criteria_list}

Test against running application:
- Server: http://localhost:3008
- Web: http://localhost:3001

Report PASS/FAIL for each AC with evidence.
```

### security-reviewer
```
Review these files for security vulnerabilities:
{relevant_files}

Check for:
- OWASP Top 10 vulnerabilities
- Input validation issues
- Authentication/authorization gaps
- Secrets exposure

Report findings with severity (CRITICAL/HIGH/MEDIUM/LOW).
```

### code-quality-reviewer
```
Review these files for code quality:
{relevant_files}

Check for:
- Code patterns and best practices
- Error handling
- TypeScript type safety
- DRY violations

Report HIGH confidence issues only.
```

### test-coverage-analyzer
```
Analyze test coverage for:
{features_to_verify}

Check:
- Test files exist
- Coverage percentage
- Critical paths tested
- Edge cases covered

Report gaps with recommendations.
```

## 4. Collect Results

Wait for all agents to complete.

Store results in:
- `{output_dir}/smoke-results.md`
- `{output_dir}/qa-results.md`
- `{output_dir}/security-results.md` (if deep)
- `{output_dir}/quality-results.md` (if deep)
- `{output_dir}/coverage-results.md` (if deep)

## 5. Display Progress

```markdown
## Verification Progress

| Agent | Status | Duration |
|-------|--------|----------|
| Smoke Test | ✅ Complete | 12s |
| Functional QA | ✅ Complete | 45s |
| Security Review | ⏳ Running | - |
| Code Quality | ⏳ Running | - |
| Coverage | ✅ Complete | 8s |
```

</instructions>

<next_step>
Load `steps/step-03-analyze.md`
</next_step>
