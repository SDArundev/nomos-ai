# Phase 1: UNDERSTAND

Initialize environment, gather context, and produce `cp-01.json`.

**Input:** User arguments (flags + feature_id)
**Output:** `.nomos/output/{feature_id}/cp-01.json`
**Context clearing:** After writing cp-01.json, all phase 1 context is discarded.

---

## 1.1 Parse Flags

```
{auto}       = false     # -a / --auto
{test}       = false     # -t / --test
{merge}      = false     # -m / --merge (v4: replaces -pr, default for PR creation)
{cleanup}    = false     # -c / --cleanup
{plan_only}  = false     # -p / --plan
{verify_only}= false     # -v / --verify
{resume}     = false     # -r / --resume
{interactive}= false     # -i / --interactive
{from_phase} = null      # -f N / --from-phase N (0-6)
{feature_id} = null      # Non-flag argument
```

**IF `-i` (interactive):** Use AskUserQuestion to let user toggle flags before proceeding.

---

## 1.2 Get Feature ID

**IF provided:** Claim it:
```bash
bash .claude/skills/nomos/scripts/nomos.sh state claim {feature_id}
```

**IF not provided AND auto:** Auto-select:
```bash
bash .claude/skills/nomos/scripts/nomos.sh state next
```

**IF not provided AND not auto:** Ask user which feature to work on.

---

## 1.3 Validate Feature

**Try REST API first (DB is source of truth), fall back to features.json for standalone CLI use.**

### 1.3a API Mode (preferred)

Check if NOMOS server is reachable and API key is configured:

```bash
NOMOS_API_URL="${NOMOS_API_URL:-http://localhost:3000}"
NOMOS_API_KEY="${NOMOS_API_KEY:-}"

if [[ -n "$NOMOS_API_KEY" ]]; then
  FEATURE_JSON=$(curl -sf -H "Authorization: Bearer ${NOMOS_API_KEY}" \
    "${NOMOS_API_URL}/api/features/${feature_id}" 2>/dev/null)
fi
```

If `FEATURE_JSON` is non-empty and valid, use it. The API returns the feature object directly with fields: `id`, `title`, `description`, `phase`, `priority`, `dependencies`, `acceptanceCriteria`, `status`, `category`, `passes`, `estimatedSize`.

Set `{feature_source} = "api"`.

### 1.3b Fallback: features.json

If the API is unreachable or `NOMOS_API_KEY` is not set, fall back to the local file:

```bash
jq -e --arg id "{feature_id}" '.features[] | select(.id == $id)' .nomos/features.json
```

Set `{feature_source} = "file"`.

### 1.3c Extract & Validate

Extract: `id`, `title`, `description`, `phase`, `priority`, `dependencies`, `acceptanceCriteria`, `status`, `category`.

**Validate status:**
- `verified` -> ERROR, halt
- `waiting_approval` AND NOT verify_only -> ask: verify or reset?
- `failed` -> show reason, ask: retry or reset?
- `in_progress` AND NOT resume -> ask: resume or start fresh?

---

## 1.4 Check Dependencies

**API mode:** Fetch all project features from API and check dependency status:
```bash
if [[ "{feature_source}" == "api" && -n "$NOMOS_API_KEY" ]]; then
  ALL_FEATURES=$(curl -sf -H "Authorization: Bearer ${NOMOS_API_KEY}" \
    "${NOMOS_API_URL}/api/features" 2>/dev/null)
fi
```

**File mode:** Read from features.json as before.

All dependencies must have `passes: true` (or `status: "verified"`). If any unverified:
- In auto mode: fail with `unverified_dependency`
- Otherwise: ask user

---

## 1.5 Resume Check

**IF `-r` or `-f N`:** Scan for existing checkpoints:
```bash
ls -1 .nomos/output/{feature_id}/cp-*.json 2>/dev/null | sort -V | tail -1
```

If checkpoints exist, find highest completed phase and jump to next phase.
If `-f N` specified, jump directly to phase N (validate prerequisites exist).

---

## 1.6 Create Worktree

```bash
# Check if exists
ls -d .nomos/worktrees/{feature_id} 2>/dev/null

# If not, create
git worktree add .nomos/worktrees/{feature_id} -b nomos/{feature_id}
```

### Setup Environment

Allocate ports:
```bash
PORTS_JSON=$(bash .claude/skills/nomos/scripts/nomos.sh ports allocate {feature_id})
SERVER_PORT=$(echo "$PORTS_JSON" | jq -r '.SERVER_PORT')
WEB_PORT=$(echo "$PORTS_JSON" | jq -r '.WEB_PORT')
```

Get absolute paths:
```bash
WORKTREE_ROOT=$(cd .nomos/worktrees/{feature_id} && pwd)
PROJECT_ROOT=$(pwd)
OUTPUT_DIR="${PROJECT_ROOT}/.nomos/output/${feature_id}"
```

<critical>
`OUTPUT_DIR` MUST be an ABSOLUTE path. Never relative.
</critical>

Create .env files using Write tool (same as v3 step-00):
- `{worktree_path}/apps/server/.env` (with SERVER_PORT, DATABASE_URL, etc.)
- `{worktree_path}/apps/web/.env` (with VITE_SERVER_URL, VITE_PORT)
- `{worktree_path}/.nomos/ports.json`

Copy database if exists. Install dependencies:
```bash
(cd .nomos/worktrees/{feature_id} && bun install)
```

---

## 1.7 Create Output Directory

```bash
mkdir -p .nomos/output/{feature_id}
```

---

## 1.8 Update State

```bash
bash .claude/skills/nomos/scripts/nomos.sh state start {feature_id}
```

---

## 1.9 Setup tmux (graceful)

```bash
bash .claude/skills/nomos/scripts/tmux-session.sh setup {feature_id}
```

---

## 1.10 Load Relevant Learning Context

Read patterns and antipatterns from the learning system, filtered by feature category:

```bash
CATEGORY="{category}"  # e.g., CAT-AGT, CAT-FE, CAT-API

# Read patterns relevant to this category
RELEVANT_PATTERNS=$(jq --arg cat "$CATEGORY" '[.patterns[] | select(
  (.applies_to // [] | any(. == $cat)) or
  (.applies_to // [] | any(. == "all")) or
  (.category == "infra")
) | {id, name, recommendation, gotcha: (.gotcha // .gotchas // null), risk_if_ignored}]' .nomos/learning/patterns.json)

# Read antipatterns relevant to this category
RELEVANT_ANTIPATTERNS=$(jq --arg cat "$CATEGORY" '[.antipatterns[] | select(
  (.category == "security") or
  (.severity == "CRITICAL") or
  (.severity == "HIGH")
) | {id, name, prevention, severity}]' .nomos/learning/antipatterns.json)
```

These will be passed to the scout agent and included in cp-01.json for Phase 2.

---

## 1.11 Dispatch Scout Agent

<critical>
Use the Task tool to dispatch the scout agent with a FRESH context window.
</critical>

```
scout_result = Task(
  subagent_type = "explore-codebase",
  model = "haiku",
  description = "Scout context for {feature_id}",
  prompt = """
    You are the NOMOS scout agent. Gather ALL context for feature {feature_id}.

    Feature: {feature_title}
    Description: {feature_description}
    Category: {category}
    Phase: {phase}
    Acceptance Criteria: {acceptance_criteria}
    Dependencies: {dependencies}

    Relevant patterns from learning system:
    {RELEVANT_PATTERNS}

    Relevant antipatterns to avoid:
    {RELEVANT_ANTIPATTERNS}

    Working directory: {PROJECT_ROOT}

    Follow the workflow in .claude/agents/scout.md.
    Include the relevant patterns and antipatterns in your output.
    Return ONLY a JSON object (no markdown, no explanation).
  """
)
```

**IF pre_implemented == true in scout result:**
```bash
bash .claude/skills/nomos/scripts/nomos.sh state preverify {feature_id}
```
-> Skip to Phase 6 (learning only)

---

## 1.12 Write cp-01.json

Using Write tool, create `.nomos/output/{feature_id}/cp-01.json`:

```json
{
  "v": 4,
  "phase": 1,
  "feature_id": "{feature_id}",
  "ts": "{ISO-8601}",
  "status": "completed",
  "env": {
    "worktree_path": ".nomos/worktrees/{feature_id}",
    "output_dir": "{OUTPUT_DIR}",
    "server_port": {SERVER_PORT},
    "web_port": {WEB_PORT},
    "project_root": "{PROJECT_ROOT}",
    "feature_source": "{feature_source}",
    "nomos_api_url": "{NOMOS_API_URL}"
  },
  "flags": {
    "auto": {auto},
    "test": {test},
    "merge": {merge},
    "cleanup": {cleanup},
    "plan_only": {plan_only},
    "verify_only": {verify_only}
  },
  "feature_summary": {
    "id": "{feature_id}",
    "title": "{feature_title}",
    "ac": [{acceptance_criteria}],
    "category": "{category}",
    "phase": "{phase}",
    "dependencies": [{dependencies}]
  },
  "learning": {
    "patterns": {RELEVANT_PATTERNS},
    "antipatterns": {RELEVANT_ANTIPATTERNS}
  },
  "data": {scout_result}
}
```

---

## 1.13 Show Summary and Proceed

```
NOMOS v4: {feature_id} - {feature_title}
Risk: {risk_level} | Files: {key_files count} | Patterns: {patterns count}
-> Phase 2: PLAN
```

**CLEAR context. Load:** `steps/phase-02-plan.md`
