#!/bin/bash
# NOMOS Template Setup Script
# Creates output directory structure and initializes template files
#
# Usage: init.sh "FEATURE_ID" [other args...]
# Feature ID should be like F016, F017, etc.

set -e

# Arguments
FEATURE_ID="$1"
FEATURE_TITLE="$2"
FEATURE_DESCRIPTION="$3"
FEATURE_PHASE="${4:-}"
FEATURE_PRIORITY="${5:-medium}"
FEATURE_DEPENDENCIES="${6:-none}"
ACCEPTANCE_CRITERIA="$7"
AUTO_MODE="${8:-false}"
TEST_MODE="${9:-false}"
PR_MODE="${10:-false}"
PLAN_ONLY="${11:-false}"
VERIFY_ONLY="${12:-false}"
INTERACTIVE_MODE="${13:-false}"

# Validate required arguments
if [[ -z "$FEATURE_ID" ]]; then
    echo "Error: FEATURE_ID is required"
    exit 1
fi

if [[ -z "$FEATURE_TITLE" ]]; then
    echo "Error: FEATURE_TITLE is required"
    exit 1
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Use current working directory as project root
PROJECT_ROOT=$(pwd)
NOMOS_OUTPUT_DIR="${PROJECT_ROOT}/.nomos/output"
NOMOS_WORKTREE_DIR="${PROJECT_ROOT}/.nomos/worktrees"

# Create output directory
OUTPUT_DIR="${NOMOS_OUTPUT_DIR}/${FEATURE_ID}"
mkdir -p "$OUTPUT_DIR"

# Get skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="${SKILL_DIR}/templates"

# Function to replace template variables
render_template() {
    local template_file="$1"
    local output_file="$2"

    # Determine status strings based on flags
    local test_status="⏭ Skip"
    [[ "$TEST_MODE" == "true" ]] && test_status="⏸ Pending"

    local pr_status="⏭ Skip"
    [[ "$PR_MODE" == "true" ]] && pr_status="⏸ Pending"

    # Escape special characters in variables for sed
    # Using ^ as delimiter since it's unlikely to appear in content
    local esc_feature_id="${FEATURE_ID//\\/\\\\}"
    local esc_feature_title="${FEATURE_TITLE//\\/\\\\}"
    local esc_feature_desc="${FEATURE_DESCRIPTION//\\/\\\\}"
    local esc_acceptance="${ACCEPTANCE_CRITERIA//\\/\\\\}"

    # Read template and replace variables (using ^ as delimiter to avoid conflicts with | in content)
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

# Initialize context file
render_template "${TEMPLATE_DIR}/00-context.md" "${OUTPUT_DIR}/00-context.md"

# Initialize all step files
render_template "${TEMPLATE_DIR}/01-context.md" "${OUTPUT_DIR}/01-context.md"
render_template "${TEMPLATE_DIR}/02-analyze.md" "${OUTPUT_DIR}/02-analyze.md"
render_template "${TEMPLATE_DIR}/03-plan.md" "${OUTPUT_DIR}/03-plan.md"
render_template "${TEMPLATE_DIR}/04-execute.md" "${OUTPUT_DIR}/04-execute.md"
render_template "${TEMPLATE_DIR}/05-validate.md" "${OUTPUT_DIR}/05-validate.md"
render_template "${TEMPLATE_DIR}/06-review.md" "${OUTPUT_DIR}/06-review.md"

# Conditional templates
if [[ "$TEST_MODE" == "true" ]]; then
    render_template "${TEMPLATE_DIR}/07-test.md" "${OUTPUT_DIR}/07-test.md"
fi

render_template "${TEMPLATE_DIR}/08-merge.md" "${OUTPUT_DIR}/08-merge.md"
render_template "${TEMPLATE_DIR}/09-learn.md" "${OUTPUT_DIR}/09-learn.md"

if [[ "$PR_MODE" == "true" ]]; then
    render_template "${TEMPLATE_DIR}/10-ship.md" "${OUTPUT_DIR}/10-ship.md"
fi

# Output the results for capture by caller
echo "FEATURE_ID=${FEATURE_ID}"
echo "OUTPUT_DIR=${OUTPUT_DIR}"
echo "WORKTREE_PATH=${NOMOS_WORKTREE_DIR}/${FEATURE_ID}"
echo "✓ NOMOS templates initialized: ${OUTPUT_DIR}"
exit 0
