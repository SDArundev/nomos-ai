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
    local MAX_EXECUTE_ITERATIONS="${14:-3}"

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
            -e "s^{{max_execute_iterations}}^${MAX_EXECUTE_ITERATIONS}^g" \
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
# SUBCOMMAND: diff
# ============================================================================
# Show changes for a feature branch compared to main

cmd_diff() {
    local feature_id="$1"
    local mode="${2:---names}"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 diff <feature_id> [--stat|--names|--summary]" >&2
        exit 1
    fi

    local branch="nomos/${feature_id}"

    # Check if branch exists
    if ! git rev-parse --verify "$branch" &>/dev/null; then
        # Try from worktree
        local worktree="${PROJECT_ROOT}/.nomos/worktrees/${feature_id}"
        if [[ -d "$worktree" ]]; then
            cd "$worktree"
            branch="HEAD"
        else
            echo "Error: Branch $branch not found and no worktree exists" >&2
            exit 1
        fi
    fi

    case "$mode" in
        --names)
            git diff --name-only "main...${branch}"
            ;;
        --stat)
            git diff --stat "main...${branch}"
            ;;
        --summary)
            git diff --shortstat "main...${branch}"
            ;;
        *)
            echo "Error: Unknown diff mode '$mode'" >&2
            echo "Modes: --names, --stat, --summary" >&2
            exit 1
            ;;
    esac
}

# ============================================================================
# SUBCOMMAND: metrics
# ============================================================================
# Collect feature metrics as JSON

cmd_metrics() {
    local feature_id="$1"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 metrics <feature_id>" >&2
        exit 1
    fi

    local branch="nomos/${feature_id}"
    local output_dir="${NOMOS_OUTPUT_DIR}/${feature_id}"
    local checkpoint="${output_dir}/03-checkpoint.json"

    # Files changed
    local files_changed=0
    if git rev-parse --verify "$branch" &>/dev/null; then
        files_changed=$(git diff --name-only "main...${branch}" 2>/dev/null | wc -l | tr -d ' ')
    else
        files_changed=$(git diff --name-only "main~1..main" 2>/dev/null | wc -l | tr -d ' ')
    fi

    # Lines added/removed
    local lines_added=0
    local lines_removed=0
    local shortstat=""
    if git rev-parse --verify "$branch" &>/dev/null; then
        shortstat=$(git diff --shortstat "main...${branch}" 2>/dev/null)
    else
        shortstat=$(git diff --shortstat "main~1..main" 2>/dev/null)
    fi
    if [[ -n "$shortstat" ]]; then
        lines_added=$(echo "$shortstat" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
        lines_removed=$(echo "$shortstat" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
    fi

    # Commit count
    local commits=1
    if git rev-parse --verify "$branch" &>/dev/null; then
        commits=$(git rev-list --count "main..${branch}" 2>/dev/null || echo "1")
    fi

    # Loop iterations from checkpoint
    local loop_iterations=1
    if [[ -f "$checkpoint" ]]; then
        loop_iterations=$(jq -r '.loop_state.current_iteration // 1' "$checkpoint" 2>/dev/null || echo "1")
    fi

    # Timestamps from features.json
    local started_at=""
    local completed_at=""
    local verified_at=""
    if [[ -f "$FEATURES_FILE" ]]; then
        started_at=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .startedAt // ""' "$FEATURES_FILE" 2>/dev/null)
        completed_at=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .completedAt // ""' "$FEATURES_FILE" 2>/dev/null)
        verified_at=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .verifiedAt // ""' "$FEATURES_FILE" 2>/dev/null)
    fi

    # Output JSON
    cat <<EOF
{
  "feature_id": "$feature_id",
  "files_changed": $files_changed,
  "lines_added": ${lines_added:-0},
  "lines_removed": ${lines_removed:-0},
  "commits": $commits,
  "loop_iterations": $loop_iterations,
  "started_at": "$started_at",
  "completed_at": "$completed_at",
  "verified_at": "$verified_at"
}
EOF
}

# ============================================================================
# SUBCOMMAND: health
# ============================================================================
# Check or wait for server health

cmd_health() {
    local feature_id="$1"
    local mode="${2:---check}"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 health <feature_id> [--wait|--check]" >&2
        exit 1
    fi

    # Read ports
    local worktree="${PROJECT_ROOT}/.nomos/worktrees/${feature_id}"
    local ports_file="${worktree}/.nomos/ports.json"
    local server_port=""
    local web_port=""

    if [[ -f "$ports_file" ]]; then
        server_port=$(jq -r '.SERVER_PORT' "$ports_file" 2>/dev/null)
        web_port=$(jq -r '.WEB_PORT' "$ports_file" 2>/dev/null)
    else
        echo "Error: ports.json not found at $ports_file" >&2
        exit 1
    fi

    case "$mode" in
        --check)
            local server_ok="FAIL"
            local web_ok="FAIL"
            curl -s "http://localhost:${server_port}/health" > /dev/null 2>&1 && server_ok="PASS"
            curl -s "http://localhost:${web_port}" > /dev/null 2>&1 && web_ok="PASS"
            echo "server: $server_ok (port $server_port)"
            echo "web: $web_ok (port $web_port)"
            if [[ "$server_ok" == "PASS" && "$web_ok" == "PASS" ]]; then
                echo "HEALTH: PASS"
            else
                echo "HEALTH: FAIL"
                exit 1
            fi
            ;;
        --wait)
            echo "Waiting for server on port $server_port..."
            for i in $(seq 1 30); do
                if curl -s "http://localhost:${server_port}/health" > /dev/null 2>&1; then
                    echo "Server ready (${i}s)"
                    break
                fi
                [[ $i -eq 30 ]] && { echo "Server timeout after 30s"; exit 1; }
                sleep 1
            done
            echo "Waiting for web on port $web_port..."
            for i in $(seq 1 30); do
                if curl -s "http://localhost:${web_port}" > /dev/null 2>&1; then
                    echo "Web ready (${i}s)"
                    break
                fi
                [[ $i -eq 30 ]] && { echo "Web timeout after 30s"; exit 1; }
                sleep 1
            done
            echo "HEALTH: PASS"
            ;;
        *)
            echo "Error: Unknown health mode '$mode'" >&2
            echo "Modes: --wait, --check" >&2
            exit 1
            ;;
    esac
}

# ============================================================================
# SUBCOMMAND: insights
# ============================================================================
# Score and return top insights for a feature based on relevance

cmd_insights() {
    local feature_id="$1"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 insights <feature_id>" >&2
        exit 1
    fi

    if [[ ! -f "$FEATURES_FILE" ]]; then
        echo "Error: features.json not found" >&2
        exit 1
    fi

    local INSIGHTS_DIR="${PROJECT_ROOT}/.nomos/learning/insights"
    if [[ ! -d "$INSIGHTS_DIR" ]]; then
        echo "[]"
        exit 0
    fi

    # Get feature metadata
    local feature_category feature_phase feature_deps
    feature_category=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .category // ""' "$FEATURES_FILE" 2>/dev/null)
    feature_phase=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .phase // ""' "$FEATURES_FILE" 2>/dev/null)
    feature_deps=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | (.dependencies // []) | join(",")' "$FEATURES_FILE" 2>/dev/null)

    # Score each insight and collect results
    local results="[]"
    shopt -s nullglob
    for insight_file in "${INSIGHTS_DIR}"/*.json; do
        [[ -f "$insight_file" ]] || continue

        local insight_fid insight_category insight_phase
        insight_fid=$(jq -r '.feature_id // ""' "$insight_file" 2>/dev/null)
        insight_category=$(jq -r '.category // ""' "$insight_file" 2>/dev/null)
        insight_phase=$(jq -r '.phase // ""' "$insight_file" 2>/dev/null)

        # Skip self
        [[ "$insight_fid" == "$feature_id" ]] && continue

        # Calculate relevance score
        local score=0

        # +3 if insight's feature is a direct dependency
        if [[ -n "$feature_deps" ]] && echo "$feature_deps" | grep -q "$insight_fid"; then
            score=$((score + 3))
        fi

        # +2 if category matches
        if [[ -n "$feature_category" && -n "$insight_category" && "$feature_category" == "$insight_category" ]]; then
            score=$((score + 2))
        fi

        # +1 if phase matches
        if [[ -n "$feature_phase" && -n "$insight_phase" && "$feature_phase" == "$insight_phase" ]]; then
            score=$((score + 1))
        fi

        # Skip zero-score insights
        [[ $score -eq 0 ]] && continue

        # Add scored insight to results
        results=$(echo "$results" | jq --argjson score "$score" --arg fid "$insight_fid" --slurpfile insight "$insight_file" '
            . + [{
                feature_id: $fid,
                score: $score,
                discoveries: ($insight[0].discoveries // []),
                what_worked: ($insight[0].what_worked // []),
                what_failed: ($insight[0].what_failed // []),
                recommendations: ($insight[0].recommendations_for_next // $insight[0].recommendations // [])
            }]
        ')
    done

    # Sort by score descending, take top 3
    echo "$results" | jq 'sort_by(-.score) | .[0:3]'
}

# ============================================================================
# SUBCOMMAND: patterns
# ============================================================================
# Filter and format patterns for downstream consumers

cmd_patterns() {
    local feature_id="$1"
    local mode="$2"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 patterns <feature_id> [--for-plan|--for-code|--for-qa]" >&2
        exit 1
    fi

    mode="${mode:---for-plan}"

    local PATTERNS_FILE="${PROJECT_ROOT}/.nomos/learning/patterns.json"
    local ANTIPATTERNS_FILE="${PROJECT_ROOT}/.nomos/learning/antipatterns.json"

    case "$mode" in
        --for-plan)
            if [[ ! -f "$PATTERNS_FILE" ]]; then
                echo '{"proven": [], "experimental": []}'
                exit 0
            fi
            jq '{
                proven: [.[] | select((.confidence // 0) >= 0.7)] | sort_by(-.confidence),
                experimental: [.[] | select((.confidence // 0) >= 0.3 and (.confidence // 0) < 0.7)] | sort_by(-.confidence)
            }' "$PATTERNS_FILE"
            ;;

        --for-code)
            if [[ ! -f "$PATTERNS_FILE" ]]; then
                echo '[]'
                exit 0
            fi
            # Get feature category for filtering
            local feature_category
            feature_category=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .category // ""' "$FEATURES_FILE" 2>/dev/null)

            jq --arg cat "$feature_category" '[
                .[] | select((.confidence // 0) >= 0.3) |
                {
                    name: .name,
                    description: .description,
                    confidence: .confidence,
                    code_example: .code_example,
                    category: .category
                }
            ] | sort_by(-.confidence)' "$PATTERNS_FILE"
            ;;

        --for-qa)
            if [[ ! -f "$ANTIPATTERNS_FILE" ]]; then
                echo '[]'
                exit 0
            fi
            jq '[
                .[] | {
                    id: .id,
                    name: .name,
                    description: .description,
                    detection_signature: .detection_signature,
                    severity: .severity,
                    evidence_count: (.evidence_count // 1),
                    category: .category
                }
            ] | sort_by(-(.evidence_count // 1), -(if .severity == "CRITICAL" then 4 elif .severity == "HIGH" then 3 elif .severity == "MEDIUM" then 2 else 1 end))' "$ANTIPATTERNS_FILE"
            ;;

        *)
            echo "Error: Unknown patterns mode '$mode'" >&2
            echo "Modes: --for-plan, --for-code, --for-qa" >&2
            exit 1
            ;;
    esac
}

# ============================================================================
# SUBCOMMAND: metrics --category-stats (extended)
# ============================================================================
# When called with --category-stats, returns category-level benchmarks

cmd_metrics_category_stats() {
    local feature_id="$1"

    if [[ -z "$feature_id" ]]; then
        echo "Usage: $0 metrics <feature_id> --category-stats" >&2
        exit 1
    fi

    local METRICS_FILE="${PROJECT_ROOT}/.nomos/learning/metrics.json"
    local ANTIPATTERNS_FILE="${PROJECT_ROOT}/.nomos/learning/antipatterns.json"

    # Get feature category
    local feature_category
    feature_category=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .category // ""' "$FEATURES_FILE" 2>/dev/null)

    if [[ -z "$feature_category" || "$feature_category" == "null" ]]; then
        echo '{"error": "Feature category not found", "avg_duration_minutes": 0, "avg_files_changed": 0, "avg_iterations": 1, "common_antipatterns": []}'
        exit 0
    fi

    # Calculate category stats from metrics
    local category_stats='{"avg_duration_minutes": 0, "avg_files_changed": 0, "avg_iterations": 1, "sample_size": 0}'
    if [[ -f "$METRICS_FILE" ]]; then
        category_stats=$(jq --arg cat "$feature_category" '
            .features as $features |
            if ($features | type) == "array" then
                [$files[] | select(.category == $cat)] as $matched |
                if ($matched | length) > 0 then
                    {
                        category: $cat,
                        avg_duration_minutes: ([$matched[].duration_minutes // 0] | add / length | . * 10 | round / 10),
                        avg_files_changed: ([$matched[].files_changed // 0] | add / length | round),
                        avg_iterations: ([$matched[].loop_iterations // 1] | add / length | . * 10 | round / 10),
                        sample_size: ($matched | length)
                    }
                else
                    {category: $cat, avg_duration_minutes: 0, avg_files_changed: 0, avg_iterations: 1, sample_size: 0}
                end
            else
                {category: $cat, avg_duration_minutes: 0, avg_files_changed: 0, avg_iterations: 1, sample_size: 0}
            end
        ' "$METRICS_FILE" 2>/dev/null || echo '{"category": "'"$feature_category"'", "avg_duration_minutes": 0, "avg_files_changed": 0, "avg_iterations": 1, "sample_size": 0}')
    fi

    # Get common antipatterns for this category
    local common_antipatterns="[]"
    if [[ -f "$ANTIPATTERNS_FILE" ]]; then
        common_antipatterns=$(jq --arg cat "$feature_category" '[
            .[] | select(.category == $cat) |
            {id: .id, name: .name, severity: .severity, evidence_count: (.evidence_count // 1)}
        ] | sort_by(-(.evidence_count // 1)) | .[0:5]' "$ANTIPATTERNS_FILE" 2>/dev/null || echo "[]")
    fi

    # Combine
    echo "$category_stats" | jq --argjson ap "$common_antipatterns" '. + {common_antipatterns: $ap}'
}

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
    --help|-h|"")
        echo "NOMOS Unified Script v2"
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
