#!/bin/bash
# NOMOS Unified Script v2
# Consolidates: feature-state.sh, allocate-ports.sh, release-ports.sh, init.sh, progress.sh
#
# Usage:
#   nomos.sh state <action> <feature_id>    # Feature state management
#   nomos.sh ports allocate <feature_id>    # Allocate ports for parallel execution
#   nomos.sh ports release <feature_id>     # Release ports for a feature
#   nomos.sh ports cleanup                  # Clean up orphaned processes
#   nomos.sh init <feature_id> <args...>    # Initialize output templates

set -e

# Find project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
FEATURES_FILE="${PROJECT_ROOT}/.nomos/features.json"
LOCKS_DIR="${PROJECT_ROOT}/.nomos/locks"
NOMOS_OUTPUT_DIR="${PROJECT_ROOT}/.nomos/output"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="${SKILL_DIR}/templates"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

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
# SUBCOMMAND: state
# ============================================================================
# Actions: start, claim, complete, verify, reset, preverify, get, next

cmd_state() {
    local action="$1"
    local feature_id="$2"

    if [[ -z "$action" ]]; then
        echo "Usage: $0 state <action> [feature_id]"
        echo "Actions: start, claim, complete, verify, reset, preverify, get, next"
        exit 1
    fi

    if [[ "$action" != "next" ]] && [[ -z "$feature_id" ]]; then
        echo "Usage: $0 state <action> <feature_id>"
        exit 1
    fi

    if [[ ! -f "$FEATURES_FILE" ]]; then
        echo "Error: features.json not found at $FEATURES_FILE"
        exit 1
    fi

    case "$action" in
        start)
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "in_progress" |
                        .startedAt = (.startedAt // "$TIMESTAMP")
                    else . end
                )
EOF
)"
            echo "ok $feature_id: status -> in_progress"
            ;;

        claim)
            local lockdir="${LOCKS_DIR}/features.lock.d"
            if ! acquire_lock "$lockdir"; then
                echo "Error: Could not acquire lock" >&2
                exit 1
            fi
            trap "release_lock '$lockdir'" EXIT

            local current_status
            current_status=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .status' "$FEATURES_FILE")

            if [[ "$current_status" == "in_progress" ]]; then
                echo "ALREADY_CLAIMED"
                exit 1
            elif [[ "$current_status" == "verified" ]]; then
                echo "ALREADY_VERIFIED"
                exit 1
            elif [[ "$current_status" == "waiting_approval" ]]; then
                echo "WAITING_APPROVAL"
                exit 1
            fi

            jq --arg id "$feature_id" --arg ts "$TIMESTAMP" '
                .features |= map(
                    if .id == $id then
                        .status = "in_progress" |
                        .startedAt = (.startedAt // $ts)
                    else . end
                )
            ' "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"

            echo "CLAIMED"
            echo "ok $feature_id: claimed and status -> in_progress"
            ;;

        next)
            local lockdir="${LOCKS_DIR}/features.lock.d"
            if ! acquire_lock "$lockdir"; then
                echo "Error: Could not acquire lock" >&2
                exit 1
            fi
            trap "release_lock '$lockdir'" EXIT

            local next_feature
            next_feature=$(jq -r '
                [.features[] | select(
                    .passes == false and
                    .status != "in_progress" and
                    .status != "verified" and
                    .status != "waiting_approval"
                )] | sort_by(.id) | .[0].id // "NONE"
            ' "$FEATURES_FILE")

            if [[ "$next_feature" == "NONE" ]] || [[ -z "$next_feature" ]]; then
                echo "NONE"
                exit 0
            fi

            jq --arg id "$next_feature" --arg ts "$TIMESTAMP" '
                .features |= map(
                    if .id == $id then
                        .status = "in_progress" |
                        .startedAt = (.startedAt // $ts)
                    else . end
                )
            ' "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"

            echo "$next_feature"
            ;;

        complete)
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "waiting_approval" |
                        .completedAt = "$TIMESTAMP"
                    else . end
                )
EOF
)"
            echo "ok $feature_id: status -> waiting_approval"
            ;;

        verify)
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "verified" |
                        .passes = true |
                        .verifiedAt = "$TIMESTAMP"
                    else . end
                )
EOF
)"
            echo "ok $feature_id: status -> verified, passes -> true"
            ;;

        reset)
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "pending" |
                        .passes = false |
                        del(.startedAt, .completedAt, .verifiedAt, .preImplemented)
                    else . end
                )
EOF
)"
            echo "ok $feature_id: status -> pending (reset)"
            ;;

        preverify)
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "verified" |
                        .passes = true |
                        .preImplemented = true |
                        .verifiedAt = "$TIMESTAMP"
                    else . end
                )
EOF
)"
            echo "ok $feature_id: pre-implemented -> verified"
            ;;

        get)
            jq --arg id "$feature_id" '.features[] | select(.id == $id)' "$FEATURES_FILE"
            ;;

        *)
            echo "Error: Unknown state action '$action'"
            echo "Actions: start, claim, complete, verify, reset, preverify, get, next"
            exit 1
            ;;
    esac
}

# ============================================================================
# SUBCOMMAND: ports
# ============================================================================
# Actions: allocate, release, cleanup

kill_port() {
    local port="$1"
    local name="$2"
    if lsof -ti:"$port" > /dev/null 2>&1; then
        lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
        echo "ok Killed process on $name port $port"
        return 0
    fi
    return 1
}

cmd_ports() {
    local action="$1"
    local feature_id="$2"

    if [[ -z "$action" ]]; then
        echo "Usage: $0 ports <allocate|release|cleanup> [feature_id]"
        exit 1
    fi

    # Default ports
    local DEFAULT_SERVER_PORT=3008
    local DEFAULT_WEB_PORT=3001

    case "$action" in
        allocate)
            if [[ -z "$feature_id" ]]; then
                echo "Usage: $0 ports allocate <feature_id>" >&2
                exit 1
            fi

            local PORT_FILE="${LOCKS_DIR}/${feature_id}.ports"

            # Reuse previously allocated ports
            if [[ -f "$PORT_FILE" ]]; then
                cat "$PORT_FILE"
                exit 0
            fi

            # Extract feature number (F001 -> 1, F123 -> 123)
            local FEATURE_NUM
            FEATURE_NUM=$(echo "$feature_id" | sed 's/F0*//')
            local FEATURE_SERVER_PORT=$((DEFAULT_SERVER_PORT + (FEATURE_NUM * 10)))
            local FEATURE_WEB_PORT=$((DEFAULT_WEB_PORT + (FEATURE_NUM * 10)))

            # Check if a port is in use
            port_in_use() {
                local port=$1
                if command -v lsof &> /dev/null; then
                    lsof -i ":$port" > /dev/null 2>&1
                elif command -v nc &> /dev/null; then
                    nc -z localhost "$port" 2>/dev/null
                else
                    curl -s --connect-timeout 1 "http://localhost:$port" > /dev/null 2>&1
                fi
            }

            # Try to claim default ports
            local LOCK_DIR="${LOCKS_DIR}/default-ports.lock.d"
            if acquire_lock "$LOCK_DIR" 10; then
                trap "release_lock '$LOCK_DIR'" EXIT

                if ! port_in_use $DEFAULT_SERVER_PORT && ! port_in_use $DEFAULT_WEB_PORT; then
                    if [[ ! -f "${LOCKS_DIR}/default-ports.owner" ]]; then
                        echo "$feature_id" > "${LOCKS_DIR}/default-ports.owner"
                        echo "{\"SERVER_PORT\": $DEFAULT_SERVER_PORT, \"WEB_PORT\": $DEFAULT_WEB_PORT, \"mode\": \"primary\"}" | tee "$PORT_FILE"
                        exit 0
                    fi
                fi

                echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
            else
                echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
            fi
            ;;

        release)
            if [[ -z "$feature_id" ]]; then
                echo "Usage: $0 ports release <feature_id>" >&2
                exit 1
            fi

            echo "Releasing ports for $feature_id..."

            # Read ports from worktree config
            local WORKTREE_PORTS="${PROJECT_ROOT}/.nomos/worktrees/${feature_id}/.nomos/ports.json"
            local SERVER_PORT=""
            local WEB_PORT=""

            if [[ -f "$WORKTREE_PORTS" ]]; then
                SERVER_PORT=$(jq -r '.SERVER_PORT // empty' "$WORKTREE_PORTS" 2>/dev/null)
                WEB_PORT=$(jq -r '.WEB_PORT // empty' "$WORKTREE_PORTS" 2>/dev/null)
            fi

            [[ -n "$SERVER_PORT" ]] && kill_port "$SERVER_PORT" "server" || true
            [[ -n "$WEB_PORT" ]] && kill_port "$WEB_PORT" "web" || true

            # Remove port allocation file
            local PORT_FILE="${LOCKS_DIR}/${feature_id}.ports"
            [[ -f "$PORT_FILE" ]] && rm -f "$PORT_FILE" && echo "ok Released port allocation for $feature_id"

            # Check default port ownership
            local OWNER_FILE="${LOCKS_DIR}/default-ports.owner"
            if [[ -f "$OWNER_FILE" ]]; then
                local OWNER
                OWNER=$(cat "$OWNER_FILE")
                if [[ "$OWNER" == "$feature_id" ]]; then
                    rm -f "$OWNER_FILE"
                    echo "ok Released default port ownership from $feature_id"
                    kill_port 3008 "server" || true
                    kill_port 3001 "web" || true
                fi
            fi

            # Clean up logs
            rm -f "/tmp/nomos-server-${feature_id}.log" 2>/dev/null || true
            rm -f "/tmp/nomos-web-${feature_id}.log" 2>/dev/null || true
            echo "ok Cleaned up for $feature_id"
            ;;

        cleanup)
            echo "Checking for orphaned NOMOS processes..."
            local cleaned=0

            shopt -s nullglob
            for port_file in "${LOCKS_DIR}"/*.ports; do
                [[ -f "$port_file" ]] || continue
                local fid
                fid=$(basename "$port_file" .ports)
                local worktree="${PROJECT_ROOT}/.nomos/worktrees/${fid}"

                if [[ ! -d "$worktree" ]]; then
                    echo "Found orphaned allocation for $fid"
                    rm -f "$port_file"
                    cleaned=1
                fi
            done

            if [[ -f "${LOCKS_DIR}/default-ports.owner" ]]; then
                local owner
                owner=$(cat "${LOCKS_DIR}/default-ports.owner")
                local worktree="${PROJECT_ROOT}/.nomos/worktrees/${owner}"
                if [[ ! -d "$worktree" ]]; then
                    echo "Releasing orphaned default port ownership from $owner"
                    rm -f "${LOCKS_DIR}/default-ports.owner"
                    kill_port 3008 "server" || true
                    kill_port 3001 "web" || true
                    cleaned=1
                fi
            fi

            if [[ $cleaned -eq 0 ]]; then
                echo "No orphaned processes found"
            else
                echo "ok Orphaned processes cleaned up"
            fi
            ;;

        *)
            echo "Error: Unknown ports action '$action'"
            echo "Actions: allocate, release, cleanup"
            exit 1
            ;;
    esac
}

# ============================================================================
# SUBCOMMAND: init
# ============================================================================
# Initializes output directory and templates for a feature

cmd_init() {
    local FEATURE_ID="$1"
    local FEATURE_TITLE="$2"
    local FEATURE_DESCRIPTION="$3"
    local FEATURE_PHASE="${4:-}"
    local FEATURE_PRIORITY="${5:-medium}"
    local FEATURE_DEPENDENCIES="${6:-none}"
    local ACCEPTANCE_CRITERIA="$7"
    local AUTO_MODE="${8:-false}"
    local TEST_MODE="${9:-false}"
    local PR_MODE="${10:-false}"
    local PLAN_ONLY="${11:-false}"
    local VERIFY_ONLY="${12:-false}"
    local INTERACTIVE_MODE="${13:-false}"

    if [[ -z "$FEATURE_ID" ]]; then
        echo "Error: FEATURE_ID is required"
        exit 1
    fi

    if [[ -z "$FEATURE_TITLE" ]]; then
        echo "Error: FEATURE_TITLE is required"
        exit 1
    fi

    # Create output directory
    local OUTPUT_DIR="${NOMOS_OUTPUT_DIR}/${FEATURE_ID}"
    mkdir -p "$OUTPUT_DIR"

    # Determine status strings based on flags
    local test_status="Skip"
    [[ "$TEST_MODE" == "true" ]] && test_status="Pending"

    local pr_status="Skip"
    [[ "$PR_MODE" == "true" ]] && pr_status="Pending"

    # Template rendering function
    render_template() {
        local template_file="$1"
        local output_file="$2"

        local esc_feature_id="${FEATURE_ID//\\/\\\\}"
        local esc_feature_title="${FEATURE_TITLE//\\/\\\\}"
        local esc_feature_desc="${FEATURE_DESCRIPTION//\\/\\\\}"
        local esc_acceptance="${ACCEPTANCE_CRITERIA//\\/\\\\}"

        sed -e "s^{{feature_id}}^${esc_feature_id}^g" \
            -e "s^{{feature_title}}^${esc_feature_title}^g" \
            -e "s^{{feature_description}}^${esc_feature_desc}^g" \
            -e "s^{{feature_phase}}^${FEATURE_PHASE}^g" \
            -e "s^{{feature_priority}}^${FEATURE_PRIORITY}^g" \
            -e "s^{{feature_dependencies}}^${FEATURE_DEPENDENCIES}^g" \
            -e "s^{{acceptance_criteria}}^${esc_acceptance}^g" \
            -e "s^{{timestamp}}^${TIMESTAMP}^g" \
            -e "s^{{auto_mode}}^${AUTO_MODE}^g" \
            -e "s^{{test_mode}}^${TEST_MODE}^g" \
            -e "s^{{pr_mode}}^${PR_MODE}^g" \
            -e "s^{{plan_only}}^${PLAN_ONLY}^g" \
            -e "s^{{verify_only}}^${VERIFY_ONLY}^g" \
            -e "s^{{interactive_mode}}^${INTERACTIVE_MODE}^g" \
            -e "s^{{test_status}}^${test_status}^g" \
            -e "s^{{pr_status}}^${pr_status}^g" \
            -e "s^{{risk_level}}^PENDING^g" \
            "$template_file" > "$output_file"
    }

    # Render v2 templates (7 output files)
    render_template "${TEMPLATE_DIR}/00-context.md" "${OUTPUT_DIR}/00-context.md"
    render_template "${TEMPLATE_DIR}/01-context.md" "${OUTPUT_DIR}/01-context.md"
    render_template "${TEMPLATE_DIR}/02-plan.md" "${OUTPUT_DIR}/02-plan.md"
    render_template "${TEMPLATE_DIR}/03-execute.md" "${OUTPUT_DIR}/03-execute.md"
    render_template "${TEMPLATE_DIR}/04-verify.md" "${OUTPUT_DIR}/04-verify.md"
    render_template "${TEMPLATE_DIR}/05-merge.md" "${OUTPUT_DIR}/05-merge.md"
    render_template "${TEMPLATE_DIR}/06-finish.md" "${OUTPUT_DIR}/06-finish.md"

    echo "FEATURE_ID=${FEATURE_ID}"
    echo "OUTPUT_DIR=${OUTPUT_DIR}"
    echo "WORKTREE_PATH=${PROJECT_ROOT}/.nomos/worktrees/${FEATURE_ID}"
    echo "ok NOMOS templates initialized: ${OUTPUT_DIR}"
    exit 0
}

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
    --help|-h|"")
        echo "NOMOS Unified Script v2"
        echo ""
        echo "Usage:"
        echo "  $0 state <action> [feature_id]     Feature state management"
        echo "  $0 ports <allocate|release|cleanup> Port management"
        echo "  $0 init <feature_id> <args...>      Initialize output templates"
        echo ""
        echo "State actions: start, claim, complete, verify, reset, preverify, get, next"
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
