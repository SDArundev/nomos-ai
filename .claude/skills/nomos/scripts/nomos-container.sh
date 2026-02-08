#!/bin/bash
# NOMOS Container Entrypoint
# Runs inside Docker container to execute a feature headlessly.
#
# Usage (called by Docker ENTRYPOINT):
#   nomos-container.sh <FEATURE_ID>
#
# Environment variables:
#   CLAUDE_CODE_OAUTH_TOKEN  — OAuth token from `claude setup-token` (recommended for Max)
#   ANTHROPIC_API_KEY        — Claude API key (alternative)
#   CLAUDE_OAUTH_CREDENTIALS — JSON string of OAuth credentials (legacy)
#   REPO_URL                 — Git remote URL to clone (if not bind-mounted)
#   REPO_BRANCH              — Branch to clone from (default: main)
#   GH_TOKEN                 — GitHub token for push + gh CLI auth
#   GIT_USER_NAME            — Git commit author name (default: nomos-runner)
#   GIT_USER_EMAIL           — Git commit author email (default: nomos@localhost)
#   CLAUDE_MODEL             — Model to use (default: sonnet)
#   MAX_BUDGET_USD           — Max spend per feature (default: 5)
#   NOMOS_FLAGS              — Extra flags for /nomos (default: "-a -t")
#   NOMOS_PROMPT_MODE        — "direct" (default) or "skill" (if skills work in -p)
#   NOMOS_TIMEOUT            — Execution timeout in seconds (default: 3600)

set -eo pipefail

# ============================================================================
# CONSTANTS
# ============================================================================

readonly CLONE_DEPTH=100
readonly DEFAULT_MODEL="sonnet"
readonly DEFAULT_BUDGET=5
readonly DEFAULT_TIMEOUT=3600
readonly NOMOS_USER="nomos"

# ============================================================================
# VALIDATION
# ============================================================================

FEATURE_ID="${1:?ERROR: Feature ID required as first argument}"

# Validate feature ID format (F001-F999)
if ! [[ "$FEATURE_ID" =~ ^F[0-9]{3,4}$ ]]; then
    echo "ERROR: Invalid feature ID format: ${FEATURE_ID} (expected F001-F999)" >&2
    exit 1
fi

LOG_PREFIX="[nomos:${FEATURE_ID}]"
WORKSPACE="/workspace"

# ============================================================================
# LOGGING
# ============================================================================

log()  { echo "${LOG_PREFIX} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
fail() { log "FATAL: $*"; exit 1; }

# ============================================================================
# PREREQUISITES CHECK
# ============================================================================

log "Checking prerequisites..."

if ! command -v gosu &>/dev/null; then
    fail "gosu not found in container"
fi

if ! id "$NOMOS_USER" &>/dev/null; then
    fail "${NOMOS_USER} user not found in container"
fi

if ! command -v claude &>/dev/null; then
    fail "claude CLI not found in container"
fi

if ! command -v git &>/dev/null; then
    fail "git not found in container"
fi

log "  Prerequisites OK (gosu, claude, git, ${NOMOS_USER} user)"

# ============================================================================
# PHASE 1: AUTHENTICATION
# ============================================================================

log "Phase 1: Setting up authentication..."

mkdir -p /home/${NOMOS_USER}/.claude

if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    # Claude Max subscription — token from `claude setup-token`
    # Also need ~/.claude.json with hasCompletedOnboarding to skip interactive prompts
    log "  Auth: OAuth token detected (Claude Max)"
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    log "  Auth: API key detected"
elif [ -n "$CLAUDE_OAUTH_CREDENTIALS" ]; then
    # Legacy: raw OAuth credentials JSON
    (umask 077 && echo "$CLAUDE_OAUTH_CREDENTIALS" > /home/${NOMOS_USER}/.claude/.credentials.json)
    log "  Auth: OAuth credentials file configured (legacy)"
else
    fail "No authentication configured. Set CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY, or CLAUDE_OAUTH_CREDENTIALS"
fi

# Create ~/.claude.json to skip onboarding prompts (required for headless)
(umask 077 && cat > /home/${NOMOS_USER}/.claude.json << 'CLAUDEJSON'
{
  "hasCompletedOnboarding": true
}
CLAUDEJSON
)

chown -R ${NOMOS_USER} /home/${NOMOS_USER}

# ============================================================================
# PHASE 2: GIT CONFIGURATION
# ============================================================================

log "Phase 2: Configuring git..."

gosu ${NOMOS_USER} git config --global user.name "${GIT_USER_NAME:-nomos-runner}"
gosu ${NOMOS_USER} git config --global user.email "${GIT_USER_EMAIL:-nomos@localhost}"
gosu ${NOMOS_USER} git config --global init.defaultBranch main

# GitHub authentication for push
if [ -n "$GH_TOKEN" ]; then
    gosu ${NOMOS_USER} git config --global credential.helper store
    # Write credentials with restricted permissions from the start
    (umask 077 && echo "https://oauth2:${GH_TOKEN}@github.com" > /home/${NOMOS_USER}/.git-credentials)
    chown ${NOMOS_USER} /home/${NOMOS_USER}/.git-credentials

    # Authenticate gh CLI
    echo "$GH_TOKEN" | gosu ${NOMOS_USER} gh auth login --with-token 2>/dev/null || true
    log "  Git: GitHub auth configured (HTTPS + gh CLI)"
else
    log "  Git: No GH_TOKEN — push to remote will be skipped"
fi

# ============================================================================
# PHASE 3: WORKSPACE SETUP
# ============================================================================

log "Phase 3: Setting up workspace..."

if [ -n "$NOMOS_COPY_MOUNT" ] && [ -d "$WORKSPACE/.git" ]; then
    # Mount mode: copy bind-mounted repo to writable location
    log "  Using bind-mounted repository (copy mode)..."
    mkdir -p /work
    cp -a "$WORKSPACE/." /work/
    chown -R ${NOMOS_USER} /work
    WORKSPACE="/work"
    log "  Workspace copied to /work"

elif [ -n "$REPO_URL" ]; then
    # Clone mode: fully isolated
    BRANCH="${REPO_BRANCH:-main}"
    log "  Cloning ${REPO_URL} (branch: ${BRANCH})..."

    # Clone into /work to avoid conflicts with Docker's /workspace
    mkdir -p /work
    chown ${NOMOS_USER} /work
    gosu ${NOMOS_USER} git clone --depth=${CLONE_DEPTH} -b "$BRANCH" "$REPO_URL" /work 2>&1
    WORKSPACE="/work"
    log "  Clone complete"

elif [ -d "$WORKSPACE/.git" ]; then
    log "  Using bind-mounted repository (in-place)"
else
    fail "No REPO_URL set and no .git found at ${WORKSPACE}. Mount a repo or set REPO_URL."
fi

cd "$WORKSPACE"
log "  Working directory: $(pwd)"
log "  Git status: $(gosu ${NOMOS_USER} git rev-parse --short HEAD) on $(gosu ${NOMOS_USER} git rev-parse --abbrev-ref HEAD)"

# Create feature branch
BRANCH_NAME="feature/${FEATURE_ID}"
if gosu ${NOMOS_USER} git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
    gosu ${NOMOS_USER} git checkout "$BRANCH_NAME"
    log "  Checked out existing branch: ${BRANCH_NAME}"
else
    gosu ${NOMOS_USER} git checkout -b "$BRANCH_NAME"
    log "  Created branch: ${BRANCH_NAME}"
fi

# ============================================================================
# PHASE 4: DEPENDENCIES
# ============================================================================

log "Phase 4: Installing dependencies..."

if [ -f "$WORKSPACE/bun.lock" ] || [ -f "$WORKSPACE/bun.lockb" ]; then
    if ! gosu ${NOMOS_USER} bun install --frozen-lockfile 2>&1; then
        log "  WARNING: Frozen lockfile failed, falling back to fresh install"
        gosu ${NOMOS_USER} bun install 2>&1
    fi
elif [ -f "$WORKSPACE/package-lock.json" ]; then
    gosu ${NOMOS_USER} npm ci 2>&1
elif [ -f "$WORKSPACE/package.json" ]; then
    gosu ${NOMOS_USER} bun install 2>&1
fi

log "  Dependencies installed"

# ============================================================================
# PHASE 5: CLAUDE CODE EXECUTION
# ============================================================================

log "Phase 5: Starting Claude Code..."

MODEL="${CLAUDE_MODEL:-${DEFAULT_MODEL}}"
BUDGET="${MAX_BUDGET_USD:-${DEFAULT_BUDGET}}"
FLAGS="${NOMOS_FLAGS:--a -t}"
PROMPT_MODE="${NOMOS_PROMPT_MODE:-direct}"
TIMEOUT="${NOMOS_TIMEOUT:-${DEFAULT_TIMEOUT}}"

log "  Feature:  ${FEATURE_ID}"
log "  Model:    ${MODEL}"
log "  Budget:   \$${BUDGET}"
log "  Flags:    ${FLAGS}"
log "  Mode:     ${PROMPT_MODE}"
log "  Timeout:  ${TIMEOUT}s"

# Build the prompt
if [ "$PROMPT_MODE" = "skill" ]; then
    # Skill mode: invoke the /nomos skill directly (may not work in -p mode)
    PROMPT="/nomos ${FEATURE_ID} ${FLAGS}"
else
    # Direct mode (default): tell Claude to read the skill file explicitly
    PROMPT="You are running headless in a Docker container. Implement feature ${FEATURE_ID}.

Read .claude/skills/nomos/SKILL.md and follow the NOMOS pipeline instructions.
Flags: ${FLAGS}
Feature ID: ${FEATURE_ID}

Start by reading the SKILL.md file, then execute the pipeline phases in order.
Do NOT ask the user anything — you are in fully autonomous mode.
Commit your changes with descriptive messages when implementation is complete."
fi

# Create settings to suppress all interactive prompts
cat > /home/${NOMOS_USER}/.claude/settings.json << 'SETTINGS'
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "hasCompletedOnboarding": true
}
SETTINGS
chown -R ${NOMOS_USER} /home/${NOMOS_USER}/.claude

log "  Prompt: ${PROMPT}"
log "  === Claude Code output begins ==="

# Build env vars for Claude Code
CLAUDE_ENV=(
    HOME="/home/${NOMOS_USER}"
)

if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    CLAUDE_ENV+=(CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}")
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    CLAUDE_ENV+=(ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}")
fi

# Build Claude CLI args
CLAUDE_ARGS=(
    -p "$PROMPT"
    --dangerously-skip-permissions
    --model "$MODEL"
    --output-format stream-json
    --verbose
)

# Budget cap only works with API key, not with subscription OAuth
if [ -n "$ANTHROPIC_API_KEY" ]; then
    CLAUDE_ARGS+=(--max-budget-usd "$BUDGET")
fi

# Stream JSON parser — extracts readable text from Claude's NDJSON stream.
# Outputs assistant text and results in real-time instead of buffering.
parse_stream_json() {
    while IFS= read -r line; do
        # Skip empty lines
        [ -z "$line" ] && continue
        # Extract type field
        type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null) || { echo "$line"; continue; }
        case "$type" in
            assistant)
                echo "$line" | jq -r '(.message.content // [])[] | select(.type == "text") | .text' 2>/dev/null || true
                ;;
            result)
                result=$(echo "$line" | jq -r '.result // empty' 2>/dev/null) || true
                if [ -n "$result" ]; then
                    echo ""
                    echo "=== RESULT ==="
                    echo "$result"
                fi
                ;;
        esac
    done
}

# Run Claude Code with timeout, streaming output through parser
set +e
timeout "${TIMEOUT}" gosu ${NOMOS_USER} env "${CLAUDE_ENV[@]}" \
    claude "${CLAUDE_ARGS[@]}" \
    2>&1 | parse_stream_json

CLAUDE_EXIT=${PIPESTATUS[0]}
set -e

if [ $CLAUDE_EXIT -eq 124 ]; then
    log "  TIMEOUT: Claude execution exceeded ${TIMEOUT}s"
fi

log "  === Claude Code output ends ==="
log "  Exit code: ${CLAUDE_EXIT}"

# ============================================================================
# PHASE 6: PUSH RESULTS
# ============================================================================

log "Phase 6: Pushing results..."

cd "$WORKSPACE"

# Check if there are any uncommitted changes
CHANGES=$(gosu ${NOMOS_USER} git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if [ "$CHANGES" -gt 0 ]; then
    log "  WARNING: ${CHANGES} uncommitted changes detected (Claude may not have committed)"
    log "  Auto-committing remaining changes..."
    gosu ${NOMOS_USER} git add -A
    gosu ${NOMOS_USER} git commit -m "chore(${FEATURE_ID}): auto-commit remaining changes from headless runner" 2>/dev/null || true
fi

# Count commits on branch (use origin/branch for shallow clone compatibility)
COMMIT_COUNT=$(gosu ${NOMOS_USER} git rev-list --count "origin/${REPO_BRANCH:-main}..HEAD" 2>/dev/null || echo "0")
# Validate numeric
if ! [[ "$COMMIT_COUNT" =~ ^[0-9]+$ ]]; then
    COMMIT_COUNT="0"
fi
log "  Commits on branch: ${COMMIT_COUNT}"

if [ -n "$GH_TOKEN" ] && [ -n "$REPO_URL" ] && [ "$COMMIT_COUNT" -gt 0 ]; then
    gosu ${NOMOS_USER} git push -u origin "$BRANCH_NAME" 2>&1 && \
        log "  Pushed branch: ${BRANCH_NAME}" || \
        log "  WARNING: Push failed"
elif [ "$COMMIT_COUNT" -eq 0 ]; then
    log "  No commits to push"
else
    log "  Skipping push (no GH_TOKEN or REPO_URL)"
fi

# ============================================================================
# SUMMARY
# ============================================================================

log "========================================"
log "  NOMOS HEADLESS RUNNER — COMPLETE"
log "========================================"
log "  Feature:     ${FEATURE_ID}"
log "  Branch:      ${BRANCH_NAME}"
log "  Commits:     ${COMMIT_COUNT}"
log "  Claude exit: ${CLAUDE_EXIT}"
log "  Status:      $([ $CLAUDE_EXIT -eq 0 ] && echo 'SUCCESS' || echo 'FAILED')"
log "========================================"

exit $CLAUDE_EXIT
