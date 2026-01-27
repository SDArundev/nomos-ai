#!/bin/bash
# NOMOS Port Allocation for Parallel Execution
# Ensures each worktree gets unique ports to avoid conflicts
#
# Usage: allocate-ports.sh <feature_id>
# Output: JSON with SERVER_PORT and WEB_PORT
#
# Strategy:
# 1. Check if default ports (3008/3001) are in use
# 2. If not, use defaults (first agent wins)
# 3. If yes, calculate feature-specific ports based on feature number

set -e

FEATURE_ID="$1"

if [[ -z "$FEATURE_ID" ]]; then
    echo "Usage: $0 <feature_id>" >&2
    exit 1
fi

# Find project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
LOCKS_DIR="${PROJECT_ROOT}/.nomos/locks"
mkdir -p "$LOCKS_DIR"

# Default ports
DEFAULT_SERVER_PORT=3008
DEFAULT_WEB_PORT=3001

# Extract feature number (F001 -> 1, F123 -> 123)
FEATURE_NUM=$(echo "$FEATURE_ID" | sed 's/F0*//')

# Port range for parallel execution
# Server: 3008 + (feature_num * 10) -> 3018, 3028, 3038, etc.
# Web: 3001 + (feature_num * 10) -> 3011, 3021, 3031, etc.
FEATURE_SERVER_PORT=$((DEFAULT_SERVER_PORT + (FEATURE_NUM * 10)))
FEATURE_WEB_PORT=$((DEFAULT_WEB_PORT + (FEATURE_NUM * 10)))

# Check if a port is in use
port_in_use() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -i ":$port" > /dev/null 2>&1
    elif command -v nc &> /dev/null; then
        nc -z localhost "$port" 2>/dev/null
    else
        # Fallback: try to connect with curl
        curl -s --connect-timeout 1 "http://localhost:$port" > /dev/null 2>&1
    fi
}

# Portable lock function (works on macOS and Linux)
acquire_lock() {
    local lockfile="$1"
    local max_attempts=10
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        # Try to create lock file atomically (mkdir is atomic)
        if mkdir "$lockfile" 2>/dev/null; then
            # Successfully acquired lock
            return 0
        fi
        # Check if lock is stale (older than 60 seconds)
        if [[ -d "$lockfile" ]]; then
            local lock_age=$(($(date +%s) - $(stat -f %m "$lockfile" 2>/dev/null || stat -c %Y "$lockfile" 2>/dev/null || echo 0)))
            if [[ $lock_age -gt 60 ]]; then
                rm -rf "$lockfile"
                continue
            fi
        fi
        sleep 0.1
        ((attempt++))
    done
    return 1
}

release_lock() {
    local lockfile="$1"
    rm -rf "$lockfile"
}

# Check if this feature already has allocated ports
PORT_FILE="${LOCKS_DIR}/${FEATURE_ID}.ports"

if [[ -f "$PORT_FILE" ]]; then
    # Reuse previously allocated ports for this feature
    cat "$PORT_FILE"
    exit 0
fi

# Try to claim default ports (first agent wins)
LOCK_DIR="${LOCKS_DIR}/default-ports.lock.d"

# Try to acquire lock
if acquire_lock "$LOCK_DIR"; then
    trap "release_lock '$LOCK_DIR'" EXIT

    # Check if default ports are available
    if ! port_in_use $DEFAULT_SERVER_PORT && ! port_in_use $DEFAULT_WEB_PORT; then
        # Check if someone else already claimed them
        if [[ ! -f "${LOCKS_DIR}/default-ports.owner" ]]; then
            # Claim default ports
            echo "$FEATURE_ID" > "${LOCKS_DIR}/default-ports.owner"
            echo "{\"SERVER_PORT\": $DEFAULT_SERVER_PORT, \"WEB_PORT\": $DEFAULT_WEB_PORT, \"mode\": \"primary\"}" | tee "$PORT_FILE"
            exit 0
        fi
    fi

    # Default ports in use or claimed, use feature-specific ports
    echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
else
    # Couldn't acquire lock, use feature-specific ports
    echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
fi
