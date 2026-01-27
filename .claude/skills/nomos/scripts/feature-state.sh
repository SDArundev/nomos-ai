#!/bin/bash
# NOMOS Feature State Management
# Updates features.json as the single source of truth
# Uses flock for atomic updates to prevent race conditions in parallel execution
#
# Usage: feature-state.sh <action> <feature_id>
# Actions:
#   start      - Set status to in_progress, set startedAt
#   claim      - Atomically claim a feature (fails if already in_progress/verified)
#   complete   - Set status to waiting_approval, set completedAt
#   verify     - Set status to verified, set verifiedAt
#   reset      - Reset to pending
#   preverify  - Mark as pre-implemented (already exists in codebase)
#   get        - Get feature details (JSON)
#   next       - Get next available feature (atomic selection)

set -e

ACTION="$1"
FEATURE_ID="$2"

# Find project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
FEATURES_FILE="${PROJECT_ROOT}/.nomos/features.json"
LOCK_FILE="${PROJECT_ROOT}/.nomos/locks/features.lock"

# Ensure locks directory exists
mkdir -p "${PROJECT_ROOT}/.nomos/locks"

# Validate inputs
if [[ -z "$ACTION" ]]; then
    echo "Usage: $0 <action> [feature_id]"
    echo "Actions: start, claim, complete, verify, reset, get, next"
    exit 1
fi

if [[ "$ACTION" != "next" ]] && [[ -z "$FEATURE_ID" ]]; then
    echo "Usage: $0 <action> <feature_id>"
    echo "Actions: start, claim, complete, verify, reset, get, next"
    exit 1
fi

if [[ ! -f "$FEATURES_FILE" ]]; then
    echo "Error: features.json not found at $FEATURES_FILE"
    exit 1
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Portable lock function (works on macOS and Linux)
acquire_lock() {
    local lockdir="$1"
    local max_attempts=50
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        # Try to create lock directory atomically (mkdir is atomic)
        if mkdir "$lockdir" 2>/dev/null; then
            return 0
        fi
        # Check if lock is stale (older than 30 seconds)
        if [[ -d "$lockdir" ]]; then
            local lock_age=$(($(date +%s) - $(stat -f %m "$lockdir" 2>/dev/null || stat -c %Y "$lockdir" 2>/dev/null || echo 0)))
            if [[ $lock_age -gt 30 ]]; then
                rm -rf "$lockdir"
                continue
            fi
        fi
        sleep 0.1
        ((attempt++))
    done
    return 1
}

release_lock() {
    local lockdir="$1"
    rm -rf "$lockdir"
}

# Atomic file update with portable locking
atomic_update() {
    local jq_filter="$1"
    local lockdir="${LOCK_FILE}.d"

    if acquire_lock "$lockdir"; then
        trap "release_lock '$lockdir'" RETURN
        jq "$jq_filter" "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"
    else
        echo "Error: Could not acquire lock for features.json" >&2
        exit 1
    fi
}

case "$ACTION" in
    start)
        atomic_update "$(cat <<EOF
            .features |= map(
                if .id == "$FEATURE_ID" then
                    .status = "in_progress" |
                    .startedAt = (.startedAt // "$TIMESTAMP")
                else . end
            )
EOF
)"
        echo "✓ $FEATURE_ID: status → in_progress"
        ;;

    claim)
        # Atomically claim a feature - fails if already in_progress or verified
        # This prevents race conditions when multiple agents try to select the same feature
        lockdir="${LOCK_FILE}.d"

        if ! acquire_lock "$lockdir"; then
            echo "Error: Could not acquire lock" >&2
            exit 1
        fi
        trap "release_lock '$lockdir'" EXIT

        # Check current status
        CURRENT_STATUS=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .status' "$FEATURES_FILE")

        if [[ "$CURRENT_STATUS" == "in_progress" ]]; then
            echo "ALREADY_CLAIMED"
            exit 1
        elif [[ "$CURRENT_STATUS" == "verified" ]]; then
            echo "ALREADY_VERIFIED"
            exit 1
        elif [[ "$CURRENT_STATUS" == "waiting_approval" ]]; then
            echo "WAITING_APPROVAL"
            exit 1
        fi

        # Claim it
        jq --arg id "$FEATURE_ID" --arg ts "$TIMESTAMP" '
            .features |= map(
                if .id == $id then
                    .status = "in_progress" |
                    .startedAt = (.startedAt // $ts)
                else . end
            )
        ' "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"

        echo "CLAIMED"
        echo "✓ $FEATURE_ID: claimed and status → in_progress"
        ;;

    next)
        # Atomically select and claim the next available feature
        # Returns the feature ID or "NONE" if no features available
        lockdir="${LOCK_FILE}.d"

        if ! acquire_lock "$lockdir"; then
            echo "Error: Could not acquire lock" >&2
            exit 1
        fi
        trap "release_lock '$lockdir'" EXIT

        # Find next feature where passes == false AND status is not in_progress/verified
        NEXT_FEATURE=$(jq -r '
            [.features[] | select(
                .passes == false and
                .status != "in_progress" and
                .status != "verified" and
                .status != "waiting_approval"
            )] | sort_by(.id) | .[0].id // "NONE"
        ' "$FEATURES_FILE")

        if [[ "$NEXT_FEATURE" == "NONE" ]] || [[ -z "$NEXT_FEATURE" ]]; then
            echo "NONE"
            exit 0
        fi

        # Claim it atomically
        jq --arg id "$NEXT_FEATURE" --arg ts "$TIMESTAMP" '
            .features |= map(
                if .id == $id then
                    .status = "in_progress" |
                    .startedAt = (.startedAt // $ts)
                else . end
                )
        ' "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"

        echo "$NEXT_FEATURE"
        ;;

    complete)
        atomic_update "$(cat <<EOF
            .features |= map(
                if .id == "$FEATURE_ID" then
                    .status = "waiting_approval" |
                    .completedAt = "$TIMESTAMP"
                else . end
            )
EOF
)"
        echo "✓ $FEATURE_ID: status → waiting_approval"
        ;;

    verify)
        atomic_update "$(cat <<EOF
            .features |= map(
                if .id == "$FEATURE_ID" then
                    .status = "verified" |
                    .passes = true |
                    .verifiedAt = "$TIMESTAMP"
                else . end
            )
EOF
)"
        echo "✓ $FEATURE_ID: status → verified, passes → true"
        ;;

    reset)
        atomic_update "$(cat <<EOF
            .features |= map(
                if .id == "$FEATURE_ID" then
                    .status = "pending" |
                    .passes = false |
                    del(.startedAt, .completedAt, .verifiedAt, .preImplemented)
                else . end
            )
EOF
)"
        echo "✓ $FEATURE_ID: status → pending, passes → false (reset)"
        ;;

    preverify)
        # For features that already exist in the codebase
        atomic_update "$(cat <<EOF
            .features |= map(
                if .id == "$FEATURE_ID" then
                    .status = "verified" |
                    .passes = true |
                    .preImplemented = true |
                    .verifiedAt = "$TIMESTAMP"
                else . end
            )
EOF
)"
        echo "✓ $FEATURE_ID: pre-implemented → verified, passes → true"
        ;;

    get)
        jq --arg id "$FEATURE_ID" '.features[] | select(.id == $id)' "$FEATURES_FILE"
        ;;

    *)
        echo "Error: Unknown action '$ACTION'"
        echo "Actions: start, claim, complete, verify, preverify, reset, get, next"
        exit 1
        ;;
esac

exit 0
