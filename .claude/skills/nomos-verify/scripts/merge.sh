#!/bin/bash
#
# nomos-verify merge script
# Merges verification branch to main or cleans up
#

set -e

# Arguments
ACTION="${1:-merge}"  # merge, cleanup, keep
STATE_FILE="${2}"     # Path to state.json

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
    echo -e "${RED}Error: State file not found${NC}"
    echo "Usage: $0 [merge|cleanup|keep] <state.json>"
    exit 1
fi

# Load state
BRANCH=$(jq -r '.branch' "${STATE_FILE}")
WORKTREE=$(jq -r '.worktree' "${STATE_FILE}")
OUTPUT_DIR=$(jq -r '.output_dir' "${STATE_FILE}")
TIMESTAMP=$(jq -r '.timestamp' "${STATE_FILE}")

echo -e "${BLUE}[verify]${NC} Action: ${ACTION}"
echo "  Branch:   ${BRANCH}"
echo "  Worktree: ${WORKTREE}"

case "${ACTION}" in
    merge)
        echo -e "${BLUE}[verify]${NC} Merging to main..."

        # Get current branch
        CURRENT=$(git branch --show-current)

        # Switch to main if needed
        if [ "${CURRENT}" != "main" ]; then
            git checkout main
        fi

        # Merge
        git merge "${BRANCH}" --no-ff -m "chore(verify): merge verification ${TIMESTAMP}

Verification session completed.
Branch: ${BRANCH}"

        echo -e "${GREEN}✓${NC} Merged ${BRANCH} to main"

        # Cleanup
        echo -e "${BLUE}[verify]${NC} Cleaning up..."
        git worktree remove "${WORKTREE}" --force 2>/dev/null || true
        git branch -d "${BRANCH}" 2>/dev/null || true

        echo -e "${GREEN}✓${NC} Cleanup complete"

        # Update state
        jq '.status = "merged" | .merged_at = now' "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        ;;

    cleanup)
        echo -e "${BLUE}[verify]${NC} Discarding changes and cleaning up..."

        # Remove worktree
        git worktree remove "${WORKTREE}" --force 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Removed worktree"

        # Delete branch
        git branch -D "${BRANCH}" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Deleted branch"

        # Update state
        jq '.status = "discarded" | .discarded_at = now' "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"

        echo -e "${YELLOW}⚠${NC} Changes discarded (reports preserved in ${OUTPUT_DIR})"
        ;;

    keep)
        echo -e "${BLUE}[verify]${NC} Keeping worktree for manual review"

        # Update state
        jq '.status = "pending_review"' "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"

        echo ""
        echo "Worktree preserved at: ${WORKTREE}"
        echo ""
        echo "To merge later:"
        echo "  git checkout main && git merge ${BRANCH} --no-ff"
        echo ""
        echo "To discard:"
        echo "  git worktree remove ${WORKTREE} && git branch -D ${BRANCH}"
        ;;

    *)
        echo -e "${RED}Unknown action: ${ACTION}${NC}"
        echo "Usage: $0 [merge|cleanup|keep] <state.json>"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done.${NC}"
