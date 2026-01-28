---
name: step-00-init
description: Initialize NOMOS workflow - parse flags, load feature, setup worktree, interactive config
next_step: steps/step-01-context.md
---

# Step 0: Initialization

<critical>
## MANDATORY EXECUTION SEQUENCE

You MUST follow these steps IN ORDER. Do NOT skip ahead.

1. Parse flags → 2. Interactive config (if -i) → 3. Get feature ID → 4. Validate feature → 5. Create WORKTREE → 6. Create output → 7. Update state → 8. Proceed

**STOP AND CHECK:** Before ANY bash command, verify you are on the correct step.
</critical>

## EXECUTION RULES:

- NEVER create output directory before worktree exists
- NEVER skip feature validation
- NEVER run commands from inside the worktree (except bun install/build)
- ALWAYS run commands from PROJECT ROOT (use absolute paths)
- ALWAYS create worktree FIRST, then output directory
- ALWAYS use features.json as single source of truth
- Status values: `pending` (not started), `in_progress`, `waiting_approval`, `verified`

## PROJECT ROOT:

**All commands must run from project root unless explicitly noted.**
```bash
PROJECT_ROOT=$(pwd)
```

---

## PRE-STEP: Cleanup Orphaned Processes

**Always run at start of any feature run to prevent port conflicts:**
```bash
bash .claude/skills/nomos/scripts/nomos.sh ports cleanup
```

---

## STEP 1: Parse Flags

**Load defaults:**
```
{auto_mode}        = false
{test_mode}        = false
{pr_mode}          = false
{plan_only}        = false
{verify_only}      = false
{learn_only}       = false
{interactive_mode} = false
{resume_mode}      = false
{cleanup_mode}     = false
{from_step}        = null
{feature_id}       = null
```

**Parse user input:**
```
-a or --auto           → {auto_mode} = true
-t or --test           → {test_mode} = true
-pr or --pull-request  → {pr_mode} = true
-p or --plan           → {plan_only} = true
-v or --verify         → {verify_only} = true
-l or --learn          → {learn_only} = true
-i or --interactive    → {interactive_mode} = true
-r or --resume         → {resume_mode} = true
-c or --cleanup        → {cleanup_mode} = true
-f N or --from-step N  → {from_step} = N (0-6)
-n N or --parallel N   → RESERVED (not yet implemented, see SKILL.md parallel_features_design)
-s or --status         → SHOW STATUS AND EXIT

Non-flag argument → {feature_id}
```

---

## STEP 1b: Interactive Configuration (if -i)

**IF {interactive_mode} = true:**

Present current config and allow the user to toggle flags.

**Display current configuration:**
```
**Current NOMOS Configuration for {feature_id}:**

| Flag | Status | Description |
|------|--------|-------------|
| Auto (`-a`) | {auto_mode ? "ON" : "OFF"} | Skip confirmations |
| Test (`-t`) | {test_mode ? "ON" : "OFF"} | Include test steps |
| PR (`-pr`) | {pr_mode ? "ON" : "OFF"} | Create pull request |
| Plan only (`-p`) | {plan_only ? "ON" : "OFF"} | Stop after planning |
| Verify only (`-v`) | {verify_only ? "ON" : "OFF"} | Review step only |
```

**Ask for Primary Flags** using AskUserQuestion with multiSelect:
```yaml
questions:
  - header: "Configure"
    question: "Select flags to TOGGLE (selected flags will flip their state):"
    options:
      - label: "Auto mode (-a)"
        description: "Skip confirmations, full pipeline"
      - label: "Test mode (-t)"
        description: "Include test creation and running"
      - label: "PR mode (-pr)"
        description: "Create pull request at end"
      - label: "Done - proceed with current"
        description: "No changes, proceed with workflow"
    multiSelect: true
```

**Ask for Scope:**
```yaml
questions:
  - header: "Scope"
    question: "What scope for this run?"
    options:
      - label: "Full pipeline (Recommended)"
        description: "Run all steps from context to merge/ship"
      - label: "Plan only (-p)"
        description: "Stop after step 02 (planning)"
      - label: "Verify only (-v)"
        description: "Run only step 04 (verify)"
    multiSelect: false
```

**Apply changes and show final configuration.**

---

## STEP 2: Handle Special Modes

**IF `-s` or `--status`:**
```bash
cat .nomos/features.json | jq '{
  total: .features | length,
  completed: [.features[] | select(.passes == true)] | length,
  remaining: [.features[] | select(.passes == false)] | length,
  in_progress: [.features[] | select(.status == "in_progress")] | length,
  pre_implemented: [.features[] | select(.preImplemented == true)] | length
}'

cat .nomos/features.json | jq -r '.features[] | select(.passes == false) | "\(.id): \(.title)"' | head -5
```
→ EXIT after showing status

**IF `-l` without feature_id:**
→ Load step-06-finish.md directly (learning extraction track)
→ EXIT after learning

---

## STEP 3: Get Feature ID

**IF {feature_id} is provided:**
```bash
CLAIM_RESULT=$(bash .claude/skills/nomos/scripts/nomos.sh state claim {feature_id})

if [[ "$CLAIM_RESULT" == "ALREADY_CLAIMED" ]]; then
    echo "Feature {feature_id} is already being worked on by another agent"
    exit 1
fi
```
→ Proceed to STEP 4

**IF {feature_id} is NOT provided AND {auto_mode} = true:**
```bash
NEXT_FEATURE=$(bash .claude/skills/nomos/scripts/nomos.sh state next)

if [[ "$NEXT_FEATURE" == "NONE" ]]; then
    echo "No features available to work on"
    exit 0
fi

echo "Auto-selected and claimed: $NEXT_FEATURE"
```
→ Set {feature_id} = $NEXT_FEATURE
→ Skip STEP 7 (state already updated)

**IF {feature_id} is NOT provided AND {auto_mode} = false:**
→ Ask user which feature to work on (show list where passes == false)
→ Wait for response, then proceed to STEP 4

---

## STEP 4: Validate Feature

**Check feature exists:**
```bash
cat .nomos/features.json | jq -e --arg id "{feature_id}" '.features[] | select(.id == $id)'
```

**If NOT found:** HALT and show available pending features

**If found, extract:**
```
{feature_id}          = Feature ID
{feature_title}       = .title
{feature_description} = .description
{feature_phase}       = .phase
{feature_priority}    = .priority
{feature_dependencies} = .dependencies
{acceptance_criteria} = .acceptanceCriteria
{feature_status}      = .status
```

**Validate status:**
```
IF {feature_status} == "verified":
  → ERROR: "Feature already verified."
  → HALT

IF {feature_status} == "waiting_approval" AND NOT {verify_only}:
  → Ask: "Feature is waiting approval. Run verify (-v) or reset to pending?"

IF {feature_status} == "in_progress" AND NOT {resume_mode}:
  → Ask: "Feature already in progress. Resume (-r) or start fresh?"
```

---

## STEP 4b: Dependency Visualization

Query features.json for the dependency chain of this feature:

```bash
# Direct dependencies
jq -r --arg id "{feature_id}" '.features[] | select(.id == $id) | .dependencies[]?' .nomos/features.json

# For each dependency, get status
jq -r --arg id "{feature_id}" '
  (.features[] | select(.id == $id) | .dependencies // []) as $deps |
  .features[] | select(.id == ($deps[])) | "\(.id): \(.status) (passes: \(.passes))"
' .nomos/features.json
```

**Display dependency tree:**

```markdown
## Dependencies for {feature_id}

### Depends On (must be verified)
| Feature | Title | Status | Verified? |
|---------|-------|--------|-----------|
| {dep_id} | {dep_title} | {status} | {passes} |

### Blocks (reverse lookup — features waiting on this one)
| Feature | Title | Status |
|---------|-------|--------|
| {blocked_id} | {blocked_title} | {status} |
```

**Validation:**
- All direct dependencies MUST have `passes: true`
- If any dependency is NOT verified: WARN
  - In `{auto_mode}`: Continue with warning
  - Otherwise: Ask user if they want to proceed despite unverified dependency

---

## STEP 5: Create Worktree (BEFORE output!)

<critical>
THIS STEP MUST COME BEFORE CREATING OUTPUT DIRECTORY.
Worktree must be a COMPLETE isolated environment with all config files.
</critical>

**Check if worktree exists:**
```bash
ls -d .nomos/worktrees/{feature_id} 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS"
```

**If NOT exists - create it:**
```bash
git worktree add .nomos/worktrees/{feature_id} -b nomos/{feature_id}
```

### 5a. Setup Worktree Environment (CRITICAL)

**.env files are gitignored - MUST copy them to worktree:**

**Allocate ports for parallel execution:**
```bash
PORTS_JSON=$(bash .claude/skills/nomos/scripts/nomos.sh ports allocate {feature_id})
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')
echo "Ports: SERVER=$SERVER_PORT, WEB=$WEB_PORT"
```

**Get absolute path to worktree:**
```bash
WORKTREE_ROOT=$(cd .nomos/worktrees/{feature_id} && pwd)
```

**Create apps/server/.env in worktree (use Write tool):**
```
File: .nomos/worktrees/{feature_id}/apps/server/.env
Content:
BETTER_AUTH_SECRET=XobgAnPBVBGRcImkNlOJgNygcJyNnkQF
BETTER_AUTH_URL=http://localhost:{server_port}
CORS_ORIGIN=http://localhost:{web_port}
DATABASE_URL=file:{worktree_root}/.nomos/nomos.db
PORT={server_port}
NODE_ENV=development
```

**Create apps/web/.env in worktree (use Write tool):**
```
File: .nomos/worktrees/{feature_id}/apps/web/.env
Content:
VITE_SERVER_URL=http://localhost:{server_port}
VITE_PORT={web_port}
```

**Copy database if exists:**
```bash
if [[ -f .nomos/nomos.db ]]; then
    cp .nomos/nomos.db .nomos/worktrees/{feature_id}/.nomos/nomos.db
fi
```

**Save port info (use Write tool):**
```bash
mkdir -p .nomos/worktrees/{feature_id}/.nomos
```
```
File: .nomos/worktrees/{feature_id}/.nomos/ports.json
Content:
{"SERVER_PORT": {server_port}, "WEB_PORT": {web_port}}
```

### 5b. Install Dependencies

```bash
(cd .nomos/worktrees/{feature_id} && bun install)
```

**If exists (resume mode):**
```bash
git -C .nomos/worktrees/{feature_id} status
PORTS_JSON=$(cat .nomos/worktrees/{feature_id}/.nomos/ports.json)
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')
```

**Set variables:**
```
{worktree_path} = .nomos/worktrees/{feature_id}
{server_port} = $SERVER_PORT
{web_port} = $WEB_PORT
```

---

## STEP 6: Create Output Structure (AFTER worktree!)

<critical>
**MUST RUN FROM PROJECT ROOT**
</critical>

```bash
mkdir -p .nomos/output/{feature_id}
```

**Run template setup (from project root):**
```bash
bash .claude/skills/nomos/scripts/nomos.sh init \
  "{feature_id}" \
  "{feature_title}" \
  "{feature_description}" \
  "{feature_phase}" \
  "{feature_priority}" \
  "{feature_dependencies}" \
  "{acceptance_criteria}" \
  "{auto_mode}" \
  "{test_mode}" \
  "{pr_mode}" \
  "{plan_only}" \
  "{verify_only}" \
  "{interactive_mode}"
```

**Set variable:**
```
{output_dir} = .nomos/output/{feature_id}
```

---

## STEP 7: Update Feature State

**Note: Skip if feature was claimed via atomic selection.**

```bash
bash .claude/skills/nomos/scripts/nomos.sh state start {feature_id}
```

---

## STEP 8: Show Summary and Proceed

**Show compact summary:**
```
NOMOS: {feature_id} - {feature_title}

| Variable | Value |
|----------|-------|
| feature_id | {feature_id} |
| feature_title | {feature_title} |
| status | in_progress |
| auto_mode | {auto_mode} |
| test_mode | {test_mode} |
| pr_mode | {pr_mode} |
| cleanup_mode | {cleanup_mode} |
| worktree_path | {worktree_path} |
| output_dir | {output_dir} |

→ Loading context...
```

**Then IMMEDIATELY load next step:**
```
IF {from_step} is set (0-6):
  → Validate prerequisites:
    1. Output dir exists: .nomos/output/{feature_id}/
    2. Worktree exists: .nomos/worktrees/{feature_id}/
    3. For from_step > 0: output file for previous step exists
       (e.g., from_step=3 requires 02-plan.md to exist)
  → If prerequisites met: Load step-{from_step:02d}-*.md directly
  → If prerequisites missing: WARN and ask user to confirm or start from beginning

IF {resume_mode} AND {resume_from_step}:
  → Load {resume_from_step}

IF {verify_only}:
  → Load step-04-verify.md

IF {learn_only}:
  → Load step-06-finish.md

ELSE:
  → Load step-01-context.md
```

---

## SUCCESS CHECKLIST:

- [ ] Feature ID obtained (provided or auto-selected)
- [ ] Feature validated from features.json
- [ ] Worktree created at .nomos/worktrees/{feature_id}
- [ ] Worktree has apps/server/.env (with unique PORT)
- [ ] Worktree has apps/web/.env (with VITE_PORT and VITE_SERVER_URL)
- [ ] Worktree has .nomos/ports.json (port config for later steps)
- [ ] Database copied to worktree (if exists)
- [ ] Dependencies installed (bun install)
- [ ] Output created at .nomos/output/{feature_id}
- [ ] Feature status updated to in_progress
- [ ] Summary shown
- [ ] Next step loaded

## FAILURE MODES:

- Creating output before worktree
- Not validating feature exists
- Proceeding without feature ID
- NOT copying .env files to worktree (server won't start)
- NOT setting unique ports (parallel execution will conflict)
- Running commands from inside worktree
- Verbose output or explanations
- Asking unnecessary confirmations in auto mode
