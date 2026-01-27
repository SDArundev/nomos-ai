#!/bin/bash
#
# nomos-verify init script
# Creates isolated worktree for verification
#

set -e

# Generate timestamp
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
BRANCH_NAME="verify/${TIMESTAMP}"
WORKTREE_PATH=".nomos/worktrees/verify-${TIMESTAMP}"
OUTPUT_DIR=".nomos/verify/${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[verify]${NC} Initializing verification session..."

# Create output directory
mkdir -p "${OUTPUT_DIR}"
echo -e "${GREEN}✓${NC} Created output directory: ${OUTPUT_DIR}"

# Create branch from current HEAD
git branch "${BRANCH_NAME}" 2>/dev/null || {
    echo "Branch ${BRANCH_NAME} already exists, using existing"
}

# Create worktree
if [ -d "${WORKTREE_PATH}" ]; then
    echo "Worktree already exists at ${WORKTREE_PATH}"
else
    git worktree add "${WORKTREE_PATH}" "${BRANCH_NAME}"
    echo -e "${GREEN}✓${NC} Created worktree: ${WORKTREE_PATH}"
fi

# Save state
cat > "${OUTPUT_DIR}/state.json" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "branch": "${BRANCH_NAME}",
  "worktree": "${WORKTREE_PATH}",
  "output_dir": "${OUTPUT_DIR}",
  "status": "initialized",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo -e "${GREEN}✓${NC} State saved to: ${OUTPUT_DIR}/state.json"
echo ""
echo "Verification session ready:"
echo "  Branch:   ${BRANCH_NAME}"
echo "  Worktree: ${WORKTREE_PATH}"
echo "  Output:   ${OUTPUT_DIR}"
