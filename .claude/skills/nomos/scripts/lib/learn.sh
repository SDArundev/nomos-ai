#!/bin/bash
# NOMOS Module: Learning System
# Commands: cmd_metrics, cmd_metrics_category_stats, cmd_insights, cmd_patterns
# Depends on: FEATURES_FILE, NOMOS_OUTPUT_DIR, PROJECT_ROOT

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
            .antipatterns[] | select(.category == $cat) |
            {id: .id, name: .name, severity: .severity, evidence_count: (.evidence_count // 1)}
        ] | sort_by(-(.evidence_count // 1)) | .[0:5]' "$ANTIPATTERNS_FILE" 2>/dev/null || echo "[]")
    fi

    # Combine
    echo "$category_stats" | jq --argjson ap "$common_antipatterns" '. + {common_antipatterns: $ap}'
}

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
    local VP_FILE="${PROJECT_ROOT}/.nomos/learning/verification-patterns.json"

    case "$mode" in
        --for-plan)
            local base_output='{"proven": [], "experimental": []}'
            if [[ -f "$PATTERNS_FILE" ]]; then
                base_output=$(jq '{
                    proven: [.patterns[] | select((.confidence // 0) >= 0.7)] | sort_by(-.confidence),
                    experimental: [.patterns[] | select((.confidence // 0) >= 0.3 and (.confidence // 0) < 0.7)] | sort_by(-.confidence)
                }' "$PATTERNS_FILE")
            fi

            # Add verification patterns if available
            if [[ -f "$VP_FILE" ]]; then
                local vp_data
                vp_data=$(jq '[.patterns // [] | .[] | {
                    id: .id,
                    name: .name,
                    description: .description,
                    type: .type,
                    frequency: .frequency,
                    features_affected: .features_affected,
                    prevention: .prevention,
                    detection: .detection,
                    source: "verification"
                }]' "$VP_FILE" 2>/dev/null || echo "[]")
                echo "$base_output" | jq --argjson vp "$vp_data" '. + {verification_patterns: $vp}'
            else
                echo "$base_output"
            fi
            ;;

        --for-code)
            local code_patterns='[]'
            if [[ -f "$PATTERNS_FILE" ]]; then
                # Get feature category for filtering
                local feature_category
                feature_category=$(jq -r --arg id "$feature_id" '.features[] | select(.id == $id) | .category // ""' "$FEATURES_FILE" 2>/dev/null)

                code_patterns=$(jq --arg cat "$feature_category" '[
                    .patterns[] | select((.confidence // 0) >= 0.3) |
                    {
                        name: .name,
                        description: .description,
                        confidence: .confidence,
                        code_example: .code_example,
                        category: .category,
                        source: "learning"
                    }
                ] | sort_by(-.confidence)' "$PATTERNS_FILE")
            fi

            # Append verification patterns with source: "verification"
            if [[ -f "$VP_FILE" ]]; then
                local vp_code
                vp_code=$(jq '[.patterns // [] | .[] | {
                    name: .name,
                    description: .description,
                    confidence: (if .frequency >= 3 then 0.8 elif .frequency >= 2 then 0.6 else 0.4 end),
                    code_example: .fix_pattern,
                    category: .category,
                    source: "verification"
                }]' "$VP_FILE" 2>/dev/null || echo "[]")
                echo "$code_patterns" | jq --argjson vp "$vp_code" '. + $vp | sort_by(-.confidence)'
            else
                echo "$code_patterns"
            fi
            ;;

        --for-qa)
            local qa_patterns='[]'
            if [[ -f "$ANTIPATTERNS_FILE" ]]; then
                qa_patterns=$(jq '[
                    .antipatterns[] | {
                        id: .id,
                        name: .name,
                        description: .description,
                        detection_signature: .detection_signature,
                        severity: .severity,
                        evidence_count: (.evidence_count // 1),
                        category: .category,
                        source: "antipattern"
                    }
                ] | sort_by(-(.evidence_count // 1), -(if .severity == "CRITICAL" then 4 elif .severity == "HIGH" then 3 elif .severity == "MEDIUM" then 2 else 1 end))' "$ANTIPATTERNS_FILE")
            fi

            # Append verification patterns as QA checks
            if [[ -f "$VP_FILE" ]]; then
                local vp_qa
                vp_qa=$(jq '[.patterns // [] | .[] | {
                    id: .id,
                    name: .name,
                    description: .description,
                    detection_signature: .detection,
                    severity: (if .type == "runtime" or .type == "security" then "HIGH" elif .type == "integration" then "MEDIUM" else "LOW" end),
                    evidence_count: .frequency,
                    category: .category,
                    source: "verification"
                }]' "$VP_FILE" 2>/dev/null || echo "[]")
                echo "$qa_patterns" | jq --argjson vp "$vp_qa" '. + $vp | sort_by(-(.evidence_count // 1), -(if .severity == "CRITICAL" then 4 elif .severity == "HIGH" then 3 elif .severity == "MEDIUM" then 2 else 1 end))'
            else
                echo "$qa_patterns"
            fi
            ;;

        *)
            echo "Error: Unknown patterns mode '$mode'" >&2
            echo "Modes: --for-plan, --for-code, --for-qa" >&2
            exit 1
            ;;
    esac
}
