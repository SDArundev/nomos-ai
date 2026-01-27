#!/bin/bash
# NOMOS Port Release for Parallel Execution
# Cleans up port allocation when feature is complete
#
# Usage: release-ports.sh <feature_id>

set -e

FEATURE_ID="$1"

if [[ -z "$FEATURE_ID" ]]; then
    echo "Usage: $0 <feature_id>" >&2
    exit 1
fi

# Find project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
LOCKS_DIR="${PROJECT_ROOT}/.nomos/locks"

# Remove port allocation file
PORT_FILE="${LOCKS_DIR}/${FEATURE_ID}.ports"
if [[ -f "$PORT_FILE" ]]; then
    rm -f "$PORT_FILE"
    echo "✓ Released ports for $FEATURE_ID"
else
    echo "No port allocation found for $FEATURE_ID"
fi

# Check if this feature owned default ports
OWNER_FILE="${LOCKS_DIR}/default-ports.owner"
if [[ -f "$OWNER_FILE" ]]; then
    OWNER=$(cat "$OWNER_FILE")
    if [[ "$OWNER" == "$FEATURE_ID" ]]; then
        rm -f "$OWNER_FILE"
        echo "✓ Released default port ownership from $FEATURE_ID"
    fi
fi

# Clean up feature-specific logs
rm -f "/tmp/nomos-server-${FEATURE_ID}.log" 2>/dev/null || true
rm -f "/tmp/nomos-web-${FEATURE_ID}.log" 2>/dev/null || true
echo "✓ Cleaned up log files for $FEATURE_ID"
