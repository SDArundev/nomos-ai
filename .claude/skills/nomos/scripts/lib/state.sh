#!/bin/bash
# NOMOS Module: State Management
# Commands: cmd_state (start, claim, complete, verify, reset, fail, retry, preverify, get, next)
# Depends on: FEATURES_FILE, TIMESTAMP, LOCKS_DIR, atomic_update, acquire_lock, release_lock

# Sync feature status to REST API (best-effort, non-blocking)
# Falls back silently if API is unavailable
_sync_status_to_api() {
    local feature_id="$1"
    local status="$2"
    local api_url="${NOMOS_API_URL:-}"
    local api_key="${NOMOS_API_KEY:-}"

    if [[ -n "$api_key" && -n "$api_url" ]]; then
        curl -sf -X POST \
            -H "Authorization: Bearer ${api_key}" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"${status}\"}" \
            "${api_url}/api/features/${feature_id}/status" \
            >/dev/null 2>&1 || true
    fi
}

cmd_state() {
    local action="$1"
    local feature_id="$2"

    if [[ -z "$action" ]]; then
        echo "Usage: $0 state <action> [feature_id]"
        echo "Actions: start, claim, complete, verify, reset, fail, retry, preverify, get, next"
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
            _sync_status_to_api "$feature_id" "in_progress"
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
                        .passes = true |
                        .completedAt = "$TIMESTAMP"
                    else . end
                )
EOF
)"
            _sync_status_to_api "$feature_id" "waiting_approval"
            echo "ok $feature_id: status -> waiting_approval, passes -> true"
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
            _sync_status_to_api "$feature_id" "verified"
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

        fail)
            local failure_reason="${3:-unspecified}"
            jq --arg id "$feature_id" --arg reason "$failure_reason" --arg ts "$TIMESTAMP" \
              '.features |= map(if .id == $id then .status = "failed" | .failureReason = $reason | .failedAt = $ts else . end)' \
              "$FEATURES_FILE" > "${FEATURES_FILE}.tmp" && mv "${FEATURES_FILE}.tmp" "$FEATURES_FILE"
            _sync_status_to_api "$feature_id" "failed"
            echo "ok $feature_id: status -> failed (reason: $failure_reason)"
            ;;

        retry)
            local current_status
            current_status=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .status' "$FEATURES_FILE")
            if [[ "$current_status" != "failed" ]]; then
                echo "Error: Can only retry features in 'failed' state (current: $current_status)" >&2
                exit 1
            fi
            atomic_update "$(cat <<EOF
                .features |= map(
                    if .id == "$feature_id" then
                        .status = "in_progress" |
                        .retries = ((.retries // 0) + 1) |
                        .startedAt = "$TIMESTAMP"
                    else . end
                )
EOF
)"
            echo "ok $feature_id: failed -> in_progress (retry #$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .retries // 1' "$FEATURES_FILE"))"
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
            echo "Actions: start, claim, complete, verify, reset, fail, retry, preverify, get, next"
            exit 1
            ;;
    esac
}
