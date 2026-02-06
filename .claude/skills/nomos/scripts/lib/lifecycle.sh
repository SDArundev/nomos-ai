#!/bin/bash
# NOMOS Module: Lifecycle & Observation
# Commands: cmd_diff, cmd_health, cmd_cleanup, cmd_session
# Depends on: PROJECT_ROOT, FEATURES_FILE, NOMOS_OUTPUT_DIR, TIMESTAMP, LOCKS_DIR,
#             atomic_update, cmd_ports (from ports.sh), cmd_state (from state.sh)

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

cmd_cleanup() {
    local mode="${1:---stale}"

    case "$mode" in
        --stale)
            echo "Checking for stale features (in_progress > 24h)..."
            local now_epoch
            now_epoch=$(date +%s)
            local stale_count=0

            # Find features stuck in in_progress
            local stale_features
            stale_features=$(jq -r '.features[] | select(.status == "in_progress" and .startedAt != null) | "\(.id)|\(.startedAt)"' "$FEATURES_FILE" 2>/dev/null)

            while IFS='|' read -r fid started_at; do
                [[ -z "$fid" ]] && continue
                local started_epoch
                started_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$started_at" +%s 2>/dev/null || date -d "$started_at" +%s 2>/dev/null || echo "0")
                local age_hours=$(( (now_epoch - started_epoch) / 3600 ))

                if [[ $age_hours -gt 24 ]]; then
                    echo "STALE: $fid (in_progress for ${age_hours}h)"

                    # Release ports
                    cmd_ports release "$fid" 2>/dev/null || true

                    # Transition to failed
                    atomic_update "$(cat <<EOF
                        .features |= map(
                            if .id == "$fid" then
                                .status = "failed" |
                                .failureReason = "stale_timeout_${age_hours}h" |
                                .failedAt = "$TIMESTAMP"
                            else . end
                        )
EOF
)"
                    echo "  → Marked as failed (stale timeout)"
                    stale_count=$((stale_count + 1))
                fi
            done <<< "$stale_features"

            # Also clean up orphaned worktrees without matching in_progress feature
            echo "Checking for orphaned worktrees..."
            local worktrees_dir="${PROJECT_ROOT}/.nomos/worktrees"
            if [[ -d "$worktrees_dir" ]]; then
                shopt -s nullglob
                for wt in "${worktrees_dir}"/F*; do
                    [[ -d "$wt" ]] || continue
                    local wt_fid
                    wt_fid=$(basename "$wt")
                    local wt_status
                    wt_status=$(jq -r --arg id "$wt_fid" '.features[] | select(.id == $id) | .status // "unknown"' "$FEATURES_FILE" 2>/dev/null)

                    if [[ "$wt_status" == "verified" || "$wt_status" == "pending" || "$wt_status" == "failed" ]]; then
                        echo "ORPHANED WORKTREE: $wt_fid (status: $wt_status)"
                        echo "  → Run: git worktree remove .nomos/worktrees/$wt_fid"
                        stale_count=$((stale_count + 1))
                    fi
                done
            fi

            if [[ $stale_count -eq 0 ]]; then
                echo "No stale features or orphaned worktrees found"
            else
                echo "ok Found $stale_count stale items"
            fi
            ;;
        *)
            echo "Usage: $0 cleanup [--stale]"
            exit 1
            ;;
    esac
}

cmd_session() {
    # 1. Silent port cleanup
    cmd_ports cleanup 2>/dev/null || true

    # 2. Project status (counts by status from features.json)
    echo "=== PROJECT STATUS ==="
    jq '{
      verified: [.features[] | select(.status == "verified")] | length,
      in_progress: [.features[] | select(.status == "in_progress")] | length,
      pending: [.features[] | select(.status == "pending")] | length,
      failed: [.features[] | select(.status == "failed")] | length,
      backlog: [.features[] | select(.status == "backlog")] | length,
      total: .features | length
    }' "$FEATURES_FILE"

    # 3. Recent activity (last 3 verified features)
    echo ""
    echo "=== RECENT ACTIVITY ==="
    local recent
    recent=$(jq -r '[.features[] | select(.status == "verified") |
      {id, title, verifiedAt}] | sort_by(.verifiedAt // "") | reverse | .[0:3] |
      .[] | "\(.id): \(.title)"' "$FEATURES_FILE" 2>/dev/null)
    if [[ -n "$recent" ]]; then
        echo "$recent"
    else
        echo "No verified features yet"
    fi

    # 4. Attention needed (failed + stale in_progress)
    echo ""
    echo "=== ATTENTION ==="
    local attention
    attention=$(jq -r '.features[] | select(.status == "failed") |
      "\(.id): FAILED - \(.failureReason // "unknown")"' "$FEATURES_FILE" 2>/dev/null)
    if [[ -n "$attention" ]]; then
        echo "$attention"
    else
        echo "No issues requiring attention"
    fi

    # 5. Learning health
    echo ""
    echo "=== LEARNING ==="
    local pattern_count
    pattern_count=$(jq '.patterns | length' "$PROJECT_ROOT/.nomos/learning/patterns.json" 2>/dev/null || echo 0)
    local anti_count
    anti_count=$(jq '.antipatterns | length' "$PROJECT_ROOT/.nomos/learning/antipatterns.json" 2>/dev/null || echo 0)
    local insight_count
    insight_count=$(ls "$PROJECT_ROOT/.nomos/learning/insights/"*.json 2>/dev/null | wc -l | tr -d ' ')
    echo "Patterns: $pattern_count | Antipatterns: $anti_count | Insights: $insight_count"

    # 6. Verification health
    echo ""
    echo "=== VERIFICATION ==="
    local VP_FILE="${PROJECT_ROOT}/.nomos/learning/verification-patterns.json"
    local VERIFY_DIR="${PROJECT_ROOT}/.nomos/verify"
    if [[ -f "$VP_FILE" ]]; then
        local vp_count
        vp_count=$(jq '.patterns | length' "$VP_FILE" 2>/dev/null || echo 0)
        # Find latest verify run
        local latest_run=""
        local issue_count=0
        local high_plus=0
        if [[ -d "$VERIFY_DIR" ]]; then
            latest_run=$(ls -1d "$VERIFY_DIR"/*/ 2>/dev/null | sort -r | head -1)
            if [[ -n "$latest_run" && -f "${latest_run}issues.json" ]]; then
                issue_count=$(jq '.summary.total // 0' "${latest_run}issues.json" 2>/dev/null || echo 0)
                high_plus=$(jq '(.summary.critical // 0) + (.summary.high // 0)' "${latest_run}issues.json" 2>/dev/null || echo 0)
            fi
        fi
        local run_name
        run_name=$(basename "$latest_run" 2>/dev/null || echo "none")
        echo "VP: $vp_count | Issues: $issue_count (${high_plus} high+) | Run: $run_name"
    else
        echo "No verification data yet"
    fi

    # 7. Next recommended
    echo ""
    echo "=== NEXT ==="
    cmd_state next 2>/dev/null || echo "No pending features"

    # 8. Active worktrees
    echo ""
    echo "=== WORKTREES ==="
    local worktrees_dir="$PROJECT_ROOT/.nomos/worktrees"
    if [[ -d "$worktrees_dir" ]]; then
        local wt_found=false
        for wt in "$worktrees_dir"/F*; do
            [[ -d "$wt" ]] || continue
            wt_found=true
            echo "$(basename "$wt")"
        done
        if [[ "$wt_found" == "false" ]]; then
            echo "None"
        fi
    else
        echo "None"
    fi
}
