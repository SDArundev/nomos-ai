#!/bin/bash
# NOMOS Module: Verification Ingestion
# Commands: cmd_ingest
# Ingests verification findings (issues, enhancements, regressions) into features.json
# Depends on: PROJECT_ROOT, FEATURES_FILE, TIMESTAMP, atomic_update

cmd_ingest() {
    local dry_run=false
    if [[ "$1" == "--dry-run" ]]; then
        dry_run=true
    fi

    local VERIFY_DIR="${PROJECT_ROOT}/.nomos/verify"
    local VP_FILE="${PROJECT_ROOT}/.nomos/learning/verification-patterns.json"
    local REGRESSION_FILE="${PROJECT_ROOT}/.nomos/learning/regression-log.json"

    # Find latest verify run directory
    local latest_run=""
    if [[ -d "$VERIFY_DIR" ]]; then
        latest_run=$(ls -1d "$VERIFY_DIR"/*/ 2>/dev/null | sort -r | head -1)
    fi

    if [[ -z "$latest_run" ]]; then
        echo "No verification runs found in $VERIFY_DIR"
        exit 0
    fi

    local run_name
    run_name=$(basename "$latest_run")
    echo "=== INGEST: $run_name ==="

    local issues_file="${latest_run}issues.json"
    local enhancements_file="${latest_run}enhancements.json"

    local ingested_issues=0
    local ingested_enhancements=0
    local ingested_regressions=0

    # ---- 1. Ingest HIGH/CRITICAL issues as pending features ----

    if [[ -f "$issues_file" ]]; then
        echo ""
        echo "--- Issues ---"

        # Extract HIGH and CRITICAL findings
        local high_issues
        high_issues=$(jq -r '[.findings[] | select(.severity == "HIGH" or .severity == "CRITICAL")] | length' "$issues_file" 2>/dev/null || echo "0")
        echo "HIGH+CRITICAL issues: $high_issues"

        if [[ "$high_issues" -gt 0 ]]; then
            # Process each high+ issue
            local issue_ids
            issue_ids=$(jq -r '.findings[] | select(.severity == "HIGH" or .severity == "CRITICAL") | .id' "$issues_file" 2>/dev/null)

            while IFS= read -r issue_id; do
                [[ -z "$issue_id" ]] && continue

                # Check if already ingested (dedup by tag)
                local already_exists
                already_exists=$(jq -r --arg tag "verify-ingested:${issue_id}" '[.features[] | select(.tags != null) | select(.tags[] == $tag)] | length' "$FEATURES_FILE" 2>/dev/null || echo "0")

                if [[ "$already_exists" -gt 0 ]]; then
                    echo "  SKIP $issue_id (already ingested)"
                    continue
                fi

                # Extract issue details
                local severity description suggested_fix feature_ref effort
                severity=$(jq -r --arg id "$issue_id" '.findings[] | select(.id == $id) | .severity' "$issues_file")
                description=$(jq -r --arg id "$issue_id" '.findings[] | select(.id == $id) | .description' "$issues_file")
                suggested_fix=$(jq -r --arg id "$issue_id" '.findings[] | select(.id == $id) | .suggested_fix // ""' "$issues_file")
                feature_ref=$(jq -r --arg id "$issue_id" '.findings[] | select(.id == $id) | .feature // "CROSS-CUTTING"' "$issues_file")
                effort=$(jq -r --arg id "$issue_id" '.findings[] | select(.id == $id) | .effort // "medium"' "$issues_file")

                # Set priority: CRITICAL=1, HIGH=5
                local priority=5
                [[ "$severity" == "CRITICAL" ]] && priority=1

                if [[ "$dry_run" == "true" ]]; then
                    echo "  WOULD ADD: $issue_id ($severity) → pending, priority=$priority"
                    echo "    desc: $description"
                else
                    # Generate feature ID (FXXX format from next available)
                    local next_id
                    next_id=$(jq -r '[.features[].id | ltrimstr("F") | tonumber] | max + 1 | "F" + (. | tostring | if length < 3 then ("000" + .)[-3:] else . end)' "$FEATURES_FILE" 2>/dev/null)

                    # Add as new feature
                    atomic_update "$(cat <<JQEOF
                        .features += [{
                            "id": "$next_id",
                            "title": "Fix: $description",
                            "description": "$description. Suggested fix: $suggested_fix",
                            "status": "pending",
                            "priority": $priority,
                            "category": "CAT-FIX",
                            "passes": false,
                            "tags": ["verify-ingested", "verify-ingested:$issue_id", "from-verify:$run_name"],
                            "sourceIssue": "$issue_id",
                            "relatedFeature": "$feature_ref",
                            "effort": "$effort",
                            "createdAt": "$TIMESTAMP"
                        }]
JQEOF
)"
                    echo "  ADDED: $next_id ← $issue_id ($severity, priority=$priority)"
                fi
                ingested_issues=$((ingested_issues + 1))
            done <<< "$issue_ids"
        fi
    fi

    # ---- 2. Ingest enhancements as backlog features ----

    if [[ -f "$enhancements_file" ]]; then
        echo ""
        echo "--- Enhancements ---"

        local enhancement_count
        enhancement_count=$(jq '.enhancements | length' "$enhancements_file" 2>/dev/null || echo "0")
        echo "Enhancements: $enhancement_count"

        if [[ "$enhancement_count" -gt 0 ]]; then
            local idx=0
            while [[ $idx -lt $enhancement_count ]]; do
                local suggestion category enh_effort related_str
                suggestion=$(jq -r --argjson i "$idx" '.enhancements[$i].suggestion' "$enhancements_file")
                category=$(jq -r --argjson i "$idx" '.enhancements[$i].category // "general"' "$enhancements_file")
                enh_effort=$(jq -r --argjson i "$idx" '.enhancements[$i].effort // "medium"' "$enhancements_file")
                related_str=$(jq -r --argjson i "$idx" '.enhancements[$i].related_features // [] | join(",")' "$enhancements_file")

                # Dedup by suggestion text hash (first 40 chars)
                local dedup_key="${suggestion:0:40}"
                local already_exists
                already_exists=$(jq -r --arg desc "$dedup_key" '[.features[] | select(.title | startswith($desc))] | length' "$FEATURES_FILE" 2>/dev/null || echo "0")

                if [[ "$already_exists" -gt 0 ]]; then
                    echo "  SKIP enhancement #$idx (similar feature exists)"
                    idx=$((idx + 1))
                    continue
                fi

                if [[ "$dry_run" == "true" ]]; then
                    echo "  WOULD ADD: enhancement ($category) → backlog, priority=100"
                    echo "    suggestion: $suggestion"
                else
                    local next_id
                    next_id=$(jq -r '[.features[].id | ltrimstr("F") | tonumber] | max + 1 | "F" + (. | tostring | if length < 3 then ("000" + .)[-3:] else . end)' "$FEATURES_FILE" 2>/dev/null)

                    atomic_update "$(cat <<JQEOF
                        .features += [{
                            "id": "$next_id",
                            "title": "$suggestion",
                            "description": "Enhancement suggestion from verification: $suggestion",
                            "status": "backlog",
                            "priority": 100,
                            "category": "CAT-ENH",
                            "passes": false,
                            "tags": ["verify-ingested", "enhancement", "from-verify:$run_name"],
                            "effort": "$enh_effort",
                            "relatedFeatures": "$related_str",
                            "createdAt": "$TIMESTAMP"
                        }]
JQEOF
)"
                    echo "  ADDED: $next_id ← enhancement ($category)"
                fi
                ingested_enhancements=$((ingested_enhancements + 1))
                idx=$((idx + 1))
            done
        fi
    fi

    # ---- 3. Ingest regressions → mark affected features as failed ----

    if [[ -f "$REGRESSION_FILE" ]]; then
        echo ""
        echo "--- Regressions ---"

        local regression_count
        regression_count=$(jq '.regressions // [] | length' "$REGRESSION_FILE" 2>/dev/null || echo "0")
        echo "Regressions: $regression_count"

        if [[ "$regression_count" -gt 0 ]]; then
            local reg_features
            reg_features=$(jq -r '.regressions[].feature_id // empty' "$REGRESSION_FILE" 2>/dev/null)

            while IFS= read -r reg_fid; do
                [[ -z "$reg_fid" ]] && continue

                local current_status
                current_status=$(jq -r --arg id "$reg_fid" '.features[] | select(.id == $id) | .status // "unknown"' "$FEATURES_FILE" 2>/dev/null)

                # Only fail features that are verified or waiting_approval
                if [[ "$current_status" == "verified" || "$current_status" == "waiting_approval" ]]; then
                    if [[ "$dry_run" == "true" ]]; then
                        echo "  WOULD FAIL: $reg_fid (regression detected, currently $current_status)"
                    else
                        atomic_update "$(cat <<JQEOF
                            .features |= map(
                                if .id == "$reg_fid" then
                                    .status = "failed" |
                                    .failureReason = "regression_detected" |
                                    .failedAt = "$TIMESTAMP" |
                                    .passes = false
                                else . end
                            )
JQEOF
)"
                        echo "  FAILED: $reg_fid (regression, was $current_status)"
                    fi
                    ingested_regressions=$((ingested_regressions + 1))
                else
                    echo "  SKIP: $reg_fid (status: $current_status, not eligible for regression fail)"
                fi
            done <<< "$reg_features"
        fi
    fi

    # ---- Summary ----

    echo ""
    echo "=== SUMMARY ==="
    local mode_label="APPLIED"
    [[ "$dry_run" == "true" ]] && mode_label="DRY RUN"
    echo "Mode: $mode_label"
    echo "Issues → features: $ingested_issues"
    echo "Enhancements → backlog: $ingested_enhancements"
    echo "Regressions → failed: $ingested_regressions"
    echo "Total ingested: $((ingested_issues + ingested_enhancements + ingested_regressions))"
}
