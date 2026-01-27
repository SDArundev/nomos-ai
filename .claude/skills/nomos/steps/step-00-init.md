---
name: step-00-init
description: Initialize NOMOS workflow - parse flags, load feature, setup worktree
next_step: steps/step-01-context.md
---

# Step 0: Initialization

<critical>
## MANDATORY EXECUTION SEQUENCE

You MUST follow these steps IN ORDER. Do NOT skip ahead.

1. Parse flags → 2. Get feature ID → 3. Validate feature → 4. Create WORKTREE → 5. Create output → 6. Update state → 7. Proceed

**STOP AND CHECK:** Before ANY bash command, verify you are on the correct step.
</critical>

## EXECUTION RULES:

- 🛑 NEVER create output directory before worktree exists
- 🛑 NEVER skip feature validation
- ✅ ALWAYS create worktree FIRST, then output directory
- ✅ ALWAYS use features.json as single source of truth
- 📋 Status values: `pending` (not started), `in_progress`, `waiting_approval`, `verified`

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
-s or --status         → SHOW STATUS AND EXIT

Non-flag argument → {feature_id}
```

---

## STEP 2: Handle Special Modes

**IF `-s` or `--status`:**
```bash
# Show status and EXIT
cat .nomos/features.json | jq '{
  total: .features | length,
  completed: [.features[] | select(.passes == true)] | length,
  remaining: [.features[] | select(.passes == false)] | length,
  in_progress: [.features[] | select(.status == "in_progress")] | length,
  pre_implemented: [.features[] | select(.preImplemented == true)] | length
}'

# Show next features to implement (passes == false)
cat .nomos/features.json | jq -r '.features[] | select(.passes == false) | "\(.id): \(.title)"' | head -5
```
→ EXIT after showing status

**IF `-l` without feature_id:**
→ Load step-09-learn.md directly
→ EXIT after learning

---

## STEP 3: Get Feature ID

**IF {feature_id} is provided:**
```bash
# Try to claim the feature atomically (prevents two agents on same feature)
CLAIM_RESULT=$(bash .claude/skills/nomos/scripts/feature-state.sh claim {feature_id})

if [[ "$CLAIM_RESULT" == "ALREADY_CLAIMED" ]]; then
    echo "⚠️ Feature {feature_id} is already being worked on by another agent"
    echo "Tip: Run without feature ID to auto-select next available feature"
    exit 1
fi
```
→ Proceed to STEP 4

**IF {feature_id} is NOT provided AND {auto_mode} = true:**
```bash
# ATOMIC auto-select: Claims next available feature to prevent race conditions
# This uses flock to ensure only one agent claims each feature
NEXT_FEATURE=$(bash .claude/skills/nomos/scripts/feature-state.sh next)

if [[ "$NEXT_FEATURE" == "NONE" ]]; then
    echo "No features available to work on"
    exit 0
fi

echo "Auto-selected and claimed: $NEXT_FEATURE"
```
→ Set {feature_id} = $NEXT_FEATURE
→ **Note: Feature is already marked in_progress by the atomic claim**
→ Skip STEP 7 (state already updated), proceed to STEP 4

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
  → ERROR: "Feature already verified. Cannot work on it."
  → HALT

IF {feature_status} == "waiting_approval" AND NOT {verify_only}:
  → Ask: "Feature is waiting approval. Run verify (-v) or reset to pending?"

IF {feature_status} == "in_progress" AND NOT {resume_mode}:
  → Ask: "Feature already in progress. Resume (-r) or start fresh?"
```

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
# Get unique ports (prevents conflicts with other agents)
PORTS_JSON=$(bash .claude/skills/nomos/scripts/allocate-ports.sh {feature_id})
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')
echo "Ports: SERVER=$SERVER_PORT, WEB=$WEB_PORT"
```

**Create apps/server/.env in worktree:**
```bash
cat > .nomos/worktrees/{feature_id}/apps/server/.env << EOF
BETTER_AUTH_SECRET=XobgAnPBVBGRcImkNlOJgNygcJyNnkQF
BETTER_AUTH_URL=http://localhost:${SERVER_PORT}
CORS_ORIGIN=http://localhost:${WEB_PORT}
DATABASE_URL=.nomos/nomos.db
PORT=${SERVER_PORT}
EOF
```

**Create apps/web/.env in worktree:**
```bash
cat > .nomos/worktrees/{feature_id}/apps/web/.env << EOF
VITE_SERVER_URL=http://localhost:${SERVER_PORT}
VITE_PORT=${WEB_PORT}
EOF
```

**Copy database if exists (for seeded data):**
```bash
if [[ -f .nomos/nomos.db ]]; then
    cp .nomos/nomos.db .nomos/worktrees/{feature_id}/.nomos/nomos.db
fi
```

**Save port info for later steps:**
```bash
mkdir -p .nomos/worktrees/{feature_id}/.nomos
cat > .nomos/worktrees/{feature_id}/.nomos/ports.json << EOF
{"SERVER_PORT": ${SERVER_PORT}, "WEB_PORT": ${WEB_PORT}}
EOF
```

### 5b. Install Dependencies

```bash
cd .nomos/worktrees/{feature_id} && bun install
```

This ensures:
- Each worktree is fully isolated with its own .env files
- Each worktree has unique ports for parallel execution
- Database is copied for seeded data
- Parallel agents can work on different features without conflicts

**If exists (resume mode):**
```bash
cd .nomos/worktrees/{feature_id} && git status
# Read existing port allocation
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

**Now create output directory:**
```bash
mkdir -p .nomos/output/{feature_id}
```

**Run template setup:**
```bash
bash .claude/skills/nomos/scripts/init.sh \
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

**Note: Skip this step if feature was claimed via atomic selection (auto_mode with no feature_id) or explicit claim.**

**If not already claimed, update features.json:**
```bash
# Only needed if feature wasn't claimed in STEP 3
bash .claude/skills/nomos/scripts/feature-state.sh start {feature_id}
```

---

## STEP 8: Show Summary and Proceed

**Show compact summary:**
```
✓ NOMOS: {feature_id} - {feature_title}

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
IF {resume_mode} AND {resume_from_step}:
  → Load {resume_from_step}

IF {verify_only}:
  → Load step-06-review.md

IF {learn_only}:
  → Load step-09-learn.md

ELSE:
  → Load step-01-context.md
```

---

## SUCCESS CHECKLIST:

Before proceeding, verify:
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

❌ Creating output before worktree
❌ Not validating feature exists
❌ Proceeding without feature ID
❌ **NOT copying .env files to worktree** (server won't start)
❌ **NOT setting unique ports** (parallel execution will conflict)
❌ Verbose output or explanations
❌ Asking unnecessary confirmations in auto mode
