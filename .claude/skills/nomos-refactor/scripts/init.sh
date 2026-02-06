#!/bin/bash
#
# nomos-refactor initialization script
# Creates isolated worktree and output directory
#

set -e

REFACTOR_TYPE="${1:-}"
TARGET="${2:-}"
REPLACEMENT="${3:-}"

# Validate arguments
if [ -z "$REFACTOR_TYPE" ]; then
    echo "Error: Refactor type required"
    echo "Usage: init.sh <type> <target> [replacement]"
    exit 1
fi

if [ -z "$TARGET" ]; then
    echo "Error: Target required"
    exit 1
fi

# Timestamp and paths
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
BRANCH_NAME="refactor/${REFACTOR_TYPE}-${TIMESTAMP}"
WORKTREE_PATH=".nomos/worktrees/refactor-${TIMESTAMP}"
OUTPUT_DIR=".nomos/refactor/${TIMESTAMP}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Create worktree
git branch "${BRANCH_NAME}"
git worktree add "${WORKTREE_PATH}" "${BRANCH_NAME}"

# Initialize state
cat > "${OUTPUT_DIR}/state.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "refactor_type": "${REFACTOR_TYPE}",
  "target": "${TARGET}",
  "replacement": "${REPLACEMENT}",
  "status": "initialized",
  "worktree_path": "${WORKTREE_PATH}",
  "output_dir": "${OUTPUT_DIR}",
  "branch_name": "${BRANCH_NAME}",
  "checkpoints": [],
  "steps_completed": []
}
EOF

echo "TIMESTAMP=${TIMESTAMP}"
echo "WORKTREE_PATH=${WORKTREE_PATH}"
echo "OUTPUT_DIR=${OUTPUT_DIR}"
echo "BRANCH_NAME=${BRANCH_NAME}"
echo "✓ Refactor session initialized"
