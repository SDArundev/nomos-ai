#!/bin/bash
# NOMOS Headless Feature Runner — Host-Side Launcher
# Spawns isolated Docker containers per feature, monitors via tmux.
#
# Usage:
#   nomos-runner.sh F045 F046 F047
#   nomos-runner.sh --build F045
#   nomos-runner.sh --model opus --budget 10 F045 F046
#   nomos-runner.sh --mount F045         # bind-mount repo instead of clone
#   nomos-runner.sh --status             # show running containers
#   nomos-runner.sh --stop               # stop all running containers
#   nomos-runner.sh --logs F045          # tail logs for a feature
#
# Prerequisites:
#   - Docker running
#   - ANTHROPIC_API_KEY set (or CLAUDE_OAUTH_CREDENTIALS)
#   - GH_TOKEN set (for git push to remote)
#   - tmux installed (optional, for monitoring)

set -eo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly IMAGE_NAME="nomos-runner"
readonly DOCKERFILE="Dockerfile.runner"
readonly SESSION_NAME="nomos"
readonly CONTAINER_PREFIX="nomos"
readonly DEFAULT_MODEL="sonnet"
readonly DEFAULT_BUDGET=5

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Cleanup background log processes on exit
LOG_PIDS=()
cleanup() {
    for pid in "${LOG_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
}
trap cleanup EXIT

# ============================================================================
# USAGE
# ============================================================================

usage() {
    cat <<'EOF'
NOMOS Headless Feature Runner

Usage:
  nomos-runner.sh [OPTIONS] <FEATURE_ID...>
  nomos-runner.sh --auto [N]          Auto-pick N features from pending/backlog (default: 1)

Options:
  --build           Force rebuild Docker image
  --model MODEL     Claude model (default: sonnet)
  --budget USD      Max budget per feature (default: 5)
  --mount           Bind-mount repo instead of cloning (faster, less isolated)
  --flags "FLAGS"   Override NOMOS flags (default: "-a -t")
  --timeout SECS    Timeout per feature in seconds (default: 3600)
  --auto [N]        Auto-pick N features from pending/backlog (default: 1)
  --status          Show running containers
  --stop            Stop all running containers
  --logs FEATURE    Tail logs for a specific feature
  --cleanup         Remove stopped containers and images
  -h, --help        Show this help

Environment:
  CLAUDE_CODE_OAUTH_TOKEN   Recommended for Claude Max (from `claude setup-token`)
  ANTHROPIC_API_KEY         Alternative: direct API key
  GH_TOKEN                  Required for git push and PR creation

Examples:
  # Auto-pick next feature (from pending or backlog)
  nomos-runner.sh --mount --auto

  # Auto-pick 3 features in parallel
  nomos-runner.sh --mount --auto 3

  # Run specific features in parallel
  nomos-runner.sh --mount F045 F046 F047

  # Build image first, use opus model
  nomos-runner.sh --build --model opus F045

  # Higher budget, custom flags
  nomos-runner.sh --budget 15 --flags "-a -t -m" F045
EOF
}

# ============================================================================
# HELPERS
# ============================================================================

log() { echo "[nomos-runner] $(date '+%H:%M:%S') $*"; }
err() { echo "[nomos-runner] ERROR: $*" >&2; }

has_tmux() { command -v tmux &>/dev/null; }

tmux_session_exists() {
    tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

ensure_tmux_session() {
    if ! has_tmux; then return; fi
    if ! tmux_session_exists; then
        tmux new-session -d -s "$SESSION_NAME" -n "runner" -c "$PROJECT_ROOT"
        log "Created tmux session: $SESSION_NAME"
    fi
}

validate_feature_id() {
    local fid="$1"
    if ! [[ "$fid" =~ ^F[0-9]{3,4}$ ]]; then
        err "Invalid feature ID: ${fid} (expected F001-F9999)"
        return 1
    fi
}

# ============================================================================
# COMMANDS
# ============================================================================

cmd_status() {
    echo "=== NOMOS Running Containers ==="
    docker ps --filter "name=${CONTAINER_PREFIX}-" --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}" 2>/dev/null || echo "No containers running"
    echo ""
    echo "=== Stopped Containers ==="
    docker ps -a --filter "name=${CONTAINER_PREFIX}-" --filter "status=exited" --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}" 2>/dev/null || echo "None"
}

cmd_stop() {
    log "Stopping all NOMOS containers..."
    docker ps -q --filter "name=${CONTAINER_PREFIX}-" 2>/dev/null | xargs -r docker stop
    log "All containers stopped"
}

cmd_logs() {
    local feature_id="$1"
    if [ -z "$feature_id" ]; then
        err "Feature ID required for --logs"
        exit 1
    fi
    docker logs -f "${CONTAINER_PREFIX}-${feature_id}" 2>&1
}

cmd_cleanup() {
    log "Removing stopped NOMOS containers..."
    docker ps -a -q --filter "name=${CONTAINER_PREFIX}-" --filter "status=exited" 2>/dev/null | xargs -r docker rm
    log "Cleanup complete"
}

# ============================================================================
# MAIN
# ============================================================================

# Parse arguments
BUILD=false
MODEL="$DEFAULT_MODEL"
BUDGET=$DEFAULT_BUDGET
MOUNT=false
PROMPT_MODE="direct"
FLAGS="-a -t"
TIMEOUT=3600
AUTO_PICK=false
AUTO_COUNT=1
FEATURES=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --build)     BUILD=true; shift ;;
        --model)     MODEL="$2"; shift 2 ;;
        --budget)    BUDGET="$2"; shift 2 ;;
        --mount)     MOUNT=true; shift ;;
        --flags)     FLAGS="$2"; shift 2 ;;
        --timeout)   TIMEOUT="$2"; shift 2 ;;
        --auto)      AUTO_PICK=true
                     # Next arg is count if it's a number
                     if [[ "${2:-}" =~ ^[0-9]+$ ]]; then
                         AUTO_COUNT="$2"; shift
                     fi
                     shift ;;
        --status)    cmd_status; exit 0 ;;
        --stop)      cmd_stop; exit 0 ;;
        --logs)      cmd_logs "$2"; exit 0 ;;
        --cleanup)   cmd_cleanup; exit 0 ;;
        -h|--help)   usage; exit 0 ;;
        F*|f*)       FEATURES+=("$(echo "$1" | tr '[:lower:]' '[:upper:]')"); shift ;;
        *)           err "Unknown argument: $1"; usage; exit 1 ;;
    esac
done

# Auto-pick pending features from backlog
if $AUTO_PICK; then
    FEATURES_FILE="${PROJECT_ROOT}/.nomos/features.json"
    if [ ! -f "$FEATURES_FILE" ]; then
        err "features.json not found at ${FEATURES_FILE}"
        exit 1
    fi

    # Pick N features from pending or backlog, sorted by priority (lowest = highest priority)
    AUTO_FEATURES=$(jq -r '
        [.features[] | select(.status == "pending" or .status == "backlog")]
        | sort_by(.priority)
        | .[0:'"${AUTO_COUNT}"']
        | .[].id
    ' "$FEATURES_FILE" 2>/dev/null)

    if [ -z "$AUTO_FEATURES" ]; then
        log "No pending or backlog features found"
        exit 0
    fi

    while IFS= read -r fid; do
        FEATURES+=("$fid")
    done <<< "$AUTO_FEATURES"

    log "Auto-picked ${#FEATURES[@]} feature(s): ${FEATURES[*]}"
fi

# Validate features
if [ ${#FEATURES[@]} -eq 0 ]; then
    err "No features specified (use --auto or provide feature IDs)"
    usage
    exit 1
fi

for fid in "${FEATURES[@]}"; do
    validate_feature_id "$fid" || exit 1
done

# Validate auth
if [ -z "$CLAUDE_CODE_OAUTH_TOKEN" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    err "No authentication configured"
    err "Set CLAUDE_CODE_OAUTH_TOKEN (from 'claude setup-token') or ANTHROPIC_API_KEY"
    exit 1
fi

# Check Docker
if ! command -v docker &>/dev/null; then
    err "Docker not found. Install Docker first."
    exit 1
fi

if ! docker info &>/dev/null 2>&1; then
    err "Docker daemon not running. Start Docker first."
    exit 1
fi

# Get repo info
if ! REPO_URL=$(git remote get-url origin 2>/dev/null); then
    log "WARNING: Could not determine repo URL"
    REPO_URL=""
fi

# Convert SSH URL to HTTPS (container uses credential store with HTTPS)
if [[ "$REPO_URL" == git@github.com:* ]]; then
    REPO_URL="https://github.com/${REPO_URL#git@github.com:}"
    REPO_URL="${REPO_URL%.git}.git"
fi

# Always branch from main, not whatever branch is currently checked out
REPO_BRANCH="main"
GIT_NAME=$(git config user.name 2>/dev/null || echo "nomos-runner")
GIT_EMAIL=$(git config user.email 2>/dev/null || echo "nomos@localhost")

log "========================================"
log "  NOMOS HEADLESS RUNNER"
log "========================================"
log "  Features:  ${FEATURES[*]}"
log "  Model:     ${MODEL}"
log "  Budget:    \$${BUDGET}/feature"
log "  Mode:      ${PROMPT_MODE}"
log "  Flags:     ${FLAGS}"
log "  Timeout:   ${TIMEOUT}s"
log "  Mount:     ${MOUNT}"
log "  Repo:      ${REPO_URL:-local}"
log "  Branch:    ${REPO_BRANCH}"
log "========================================"

# ============================================================================
# BUILD IMAGE
# ============================================================================

if $BUILD || ! docker image inspect "$IMAGE_NAME" &>/dev/null 2>&1; then
    log "Building Docker image: ${IMAGE_NAME}..."
    docker build \
        -f "${PROJECT_ROOT}/${DOCKERFILE}" \
        -t "$IMAGE_NAME" \
        --build-arg UID="$(id -u)" \
        --build-arg GID="$(id -g)" \
        "$PROJECT_ROOT"
    log "Image built successfully"
else
    log "Using existing image: ${IMAGE_NAME}"
fi

# ============================================================================
# STOP EXISTING CONTAINERS (same feature IDs)
# ============================================================================

for FEATURE_ID in "${FEATURES[@]}"; do
    CONTAINER_NAME="${CONTAINER_PREFIX}-${FEATURE_ID}"
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Removing existing container: ${CONTAINER_NAME}"
        docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    fi
done

# ============================================================================
# LAUNCH CONTAINERS
# ============================================================================

ensure_tmux_session

CONTAINER_IDS=()
LOG_DIR="${PROJECT_ROOT}/.nomos/runner-logs"
mkdir -p "$LOG_DIR"

for FEATURE_ID in "${FEATURES[@]}"; do
    CONTAINER_NAME="${CONTAINER_PREFIX}-${FEATURE_ID}"
    LOG_FILE="${LOG_DIR}/${FEATURE_ID}.log"

    log "Launching: ${CONTAINER_NAME}..."

    # Build docker run args
    DOCKER_ARGS=(
        run -d
        --name "$CONTAINER_NAME"
        -e "CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN:-}"
        -e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}"
        -e "CLAUDE_MODEL=${MODEL}"
        -e "MAX_BUDGET_USD=${BUDGET}"
        -e "NOMOS_FLAGS=${FLAGS}"
        -e "NOMOS_PROMPT_MODE=${PROMPT_MODE}"
        -e "NOMOS_TIMEOUT=${TIMEOUT}"
        -e "GIT_USER_NAME=${GIT_NAME}"
        -e "GIT_USER_EMAIL=${GIT_EMAIL}"
    )

    # GitHub token (for push)
    if [ -n "$GH_TOKEN" ]; then
        DOCKER_ARGS+=(-e "GH_TOKEN=${GH_TOKEN}")
        DOCKER_ARGS+=(-e "REPO_URL=${REPO_URL}")
        DOCKER_ARGS+=(-e "REPO_BRANCH=${REPO_BRANCH}")
    fi

    # Mount mode: bind-mount repo (faster but less isolated)
    if $MOUNT; then
        DOCKER_ARGS+=(-v "${PROJECT_ROOT}:/workspace:ro")
        DOCKER_ARGS+=(-e "NOMOS_COPY_MOUNT=1")
    elif [ -n "$REPO_URL" ] && [ -n "$GH_TOKEN" ]; then
        # Clone mode: fully isolated (default)
        # Also pass REPO_URL and REPO_BRANCH (already set above if GH_TOKEN exists)
        :
    else
        # Fallback: bind-mount if no remote
        log "  No REPO_URL or GH_TOKEN — falling back to mount mode"
        DOCKER_ARGS+=(-v "${PROJECT_ROOT}:/workspace:ro")
        DOCKER_ARGS+=(-e "NOMOS_COPY_MOUNT=1")
    fi

    DOCKER_ARGS+=("$IMAGE_NAME" "$FEATURE_ID")

    # Launch
    set +e
    CONTAINER_ID=$(docker "${DOCKER_ARGS[@]}" 2>&1)
    DOCKER_EXIT=$?
    set -e

    if [ $DOCKER_EXIT -eq 0 ]; then
        CONTAINER_IDS+=("$CONTAINER_ID")
        log "  Started: ${CONTAINER_ID:0:12}"

        # Start logging to file (track PID for cleanup)
        docker logs -f "$CONTAINER_NAME" > "$LOG_FILE" 2>&1 &
        LOG_PIDS+=($!)

        # Set up tmux monitoring
        if has_tmux && tmux_session_exists; then
            tmux new-window -t "$SESSION_NAME" -n "$FEATURE_ID" 2>/dev/null || true
            tmux send-keys -t "${SESSION_NAME}:${FEATURE_ID}" \
                "docker logs -f ${CONTAINER_NAME} 2>&1" Enter 2>/dev/null || true
        fi
    else
        err "Failed to start container for ${FEATURE_ID}: ${CONTAINER_ID}"
    fi
done

log ""
log "All ${#CONTAINER_IDS[@]} containers launched"

if has_tmux && tmux_session_exists; then
    log "Monitor: tmux attach -t ${SESSION_NAME}"
fi

log "Logs:    ${LOG_DIR}/"
log ""

# ============================================================================
# WAIT FOR COMPLETION
# ============================================================================

log "Waiting for all containers to complete..."
log ""

RESULTS=()
ALL_SUCCESS=true

for FEATURE_ID in "${FEATURES[@]}"; do
    CONTAINER_NAME="${CONTAINER_PREFIX}-${FEATURE_ID}"

    # Wait for container to exit
    EXIT_CODE=$(docker wait "$CONTAINER_NAME" 2>/dev/null || echo "255")

    # Validate numeric
    if ! [[ "$EXIT_CODE" =~ ^[0-9]+$ ]]; then
        EXIT_CODE="255"
    fi

    if [ "$EXIT_CODE" = "0" ]; then
        RESULTS+=("OK   ${FEATURE_ID}")
        log "  [OK]   ${FEATURE_ID}"
    elif [ "$EXIT_CODE" = "124" ]; then
        RESULTS+=("TIMEOUT ${FEATURE_ID}")
        log "  [TIMEOUT] ${FEATURE_ID} (exceeded ${TIMEOUT}s)"
        ALL_SUCCESS=false
    else
        RESULTS+=("FAIL ${FEATURE_ID} (exit: ${EXIT_CODE})")
        log "  [FAIL] ${FEATURE_ID} (exit code: ${EXIT_CODE})"
        ALL_SUCCESS=false
    fi
done

# ============================================================================
# SUMMARY
# ============================================================================

log ""
log "========================================"
log "  RESULTS"
log "========================================"
for RESULT in "${RESULTS[@]}"; do
    log "  ${RESULT}"
done
log "========================================"
log "  Logs: ${LOG_DIR}/"
log "========================================"

if $ALL_SUCCESS; then
    log "All features completed successfully!"
    exit 0
else
    log "Some features failed — check logs for details"
    exit 1
fi
