#!/bin/bash
# NOMOS Module: Template Initialization
# Commands: cmd_init
# Depends on: NOMOS_OUTPUT_DIR, TEMPLATE_DIR, TIMESTAMP, PROJECT_ROOT

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

    # Create output directory with versioned run
    local FEATURE_OUTPUT_BASE="${NOMOS_OUTPUT_DIR}/${FEATURE_ID}"
    mkdir -p "$FEATURE_OUTPUT_BASE"

    # Find next run number
    local run_num=1
    while [[ -d "${FEATURE_OUTPUT_BASE}/run-$(printf '%03d' $run_num)" ]]; do
        run_num=$((run_num + 1))
    done
    local OUTPUT_DIR="${FEATURE_OUTPUT_BASE}/run-$(printf '%03d' $run_num)"
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
    echo "RUN_DIR=run-$(printf '%03d' $run_num)"
    echo "ok NOMOS templates initialized: ${OUTPUT_DIR}"
    exit 0
}
