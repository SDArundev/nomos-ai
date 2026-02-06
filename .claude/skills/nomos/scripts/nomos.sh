#!/bin/bash
# NOMOS Unified Script v3 (modular)
# Entry point: shared variables + locks + module sourcing + router
#
# Usage:
#   nomos.sh state <action> <feature_id>    # Feature state management
#   nomos.sh ports allocate <feature_id>    # Allocate ports for parallel execution
#   nomos.sh ports release <feature_id>     # Release ports for a feature
#   nomos.sh ports cleanup                  # Clean up orphaned processes
#   nomos.sh init <feature_id> <args...>    # Initialize output templates
#   nomos.sh ingest [--dry-run]             # Ingest verification findings into features

set -e

# ============================================================================
# SHARED: Variables used by all modules
# ============================================================================

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
FEATURES_FILE="${PROJECT_ROOT}/.nomos/features.json"
LOCKS_DIR="${PROJECT_ROOT}/.nomos/locks"
NOMOS_OUTPUT_DIR="${PROJECT_ROOT}/.nomos/output"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="${SKILL_DIR}/templates"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LIB_DIR="$(dirname "${BASH_SOURCE[0]}")/lib"

# Ensure locks directory exists
mkdir -p "$LOCKS_DIR"

# ============================================================================
# SHARED: Portable lock functions (works on macOS and Linux)
# ============================================================================

acquire_lock() {
    local lockdir="$1"
    local max_attempts="${2:-50}"
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if mkdir "$lockdir" 2>/dev/null; then
            return 0
        fi
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

atomic_update() {
    local jq_filter="$1"
    local lockdir="${LOCKS_DIR}/features.lock.d"

    if acquire_lock "$lockdir"; then
        trap "release_lock '$lockdir'" RETURN
        jq "$jq_filter" "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"
    else
        echo "Error: Could not acquire lock for features.json" >&2
        exit 1
    fi
}

# ============================================================================
# SOURCE: Load modules
# ============================================================================

source "${LIB_DIR}/state.sh"
source "${LIB_DIR}/ports.sh"
source "${LIB_DIR}/init.sh"
source "${LIB_DIR}/learn.sh"
source "${LIB_DIR}/lifecycle.sh"
source "${LIB_DIR}/ingest.sh"

# ============================================================================
# FUTURE: parallel subcommand (design only, not yet implemented)
# Usage: nomos.sh parallel <N>
# - Selects N features using "state next" N times
# - Launches each in separate worktree with unique ports
# - Tracks progress and reports aggregate status
# - Merges in dependency order
# - Extracts learnings after ALL complete
# ============================================================================

# ============================================================================
# MAIN: Route to subcommand
# ============================================================================

SUBCOMMAND="$1"
shift || true

case "$SUBCOMMAND" in
    state)
        cmd_state "$@"
        ;;
    ports)
        cmd_ports "$@"
        ;;
    init)
        cmd_init "$@"
        ;;
    diff)
        cmd_diff "$@"
        ;;
    metrics)
        # Check for --category-stats flag
        if [[ "$2" == "--category-stats" ]]; then
            cmd_metrics_category_stats "$1"
        else
            cmd_metrics "$@"
        fi
        ;;
    health)
        cmd_health "$@"
        ;;
    insights)
        cmd_insights "$@"
        ;;
    patterns)
        cmd_patterns "$@"
        ;;
    cleanup)
        cmd_cleanup "$@"
        ;;
    session)
        cmd_session "$@"
        ;;
    ingest)
        cmd_ingest "$@"
        ;;
    --help|-h|"")
        echo "NOMOS Unified Script v3 (modular)"
        echo ""
        echo "Usage:"
        echo "  $0 state <action> [feature_id]     Feature state management"
        echo "  $0 ports <allocate|release|cleanup> Port management"
        echo "  $0 init <feature_id> <args...>      Initialize output templates"
        echo "  $0 diff <feature_id> [--stat|--names|--summary]  Show feature changes"
        echo "  $0 metrics <feature_id>             Collect feature metrics as JSON"
        echo "  $0 metrics <feature_id> --category-stats  Category-level benchmarks"
        echo "  $0 health <feature_id> [--wait|--check]  Check server health"
        echo "  $0 insights <feature_id>            Top 3 relevant insights (scored)"
        echo "  $0 patterns <feature_id> [--for-plan|--for-code|--for-qa]  Filtered patterns"
        echo "  $0 cleanup [--stale]                 Clean up stale features and orphaned resources"
        echo "  $0 session                            Rich project context dashboard"
        echo "  $0 ingest [--dry-run]                 Ingest verification findings into features"
        echo ""
        echo "State actions: start, claim, complete, verify, reset, fail, retry, preverify, get, next"
        echo "Port actions:  allocate <fid>, release <fid>, cleanup"
        exit 0
        ;;
    *)
        echo "Error: Unknown subcommand '$SUBCOMMAND'"
        echo "Use '$0 --help' for usage"
        exit 1
        ;;
esac

exit 0
