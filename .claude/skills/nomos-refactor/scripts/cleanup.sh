#!/bin/bash
#
# nomos-refactor cleanup script
# Removes worktree and optionally the branch
#

set -e

STATE_FILE="${1}"

if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
    echo "Usage: $0 <state.json>"
    exit 1
fi

WORKTREE=$(jq -r '.worktree_path' "${STATE_FILE}")
BRANCH=$(jq -r '.branch_name' "${STATE_FILE}")

echo "Cleaning up refactor session..."

# Remove worktree
if [ -d "${WORKTREE}" ]; then
    git worktree remove "${WORKTREE}" --force
    echo "✓ Removed worktree: ${WORKTREE}"
fi

# Remove branch (only if not merged)
if git rev-parse --verify "${BRANCH}" >/dev/null 2>&1; then
    git branch -D "${BRANCH}" 2>/dev/null || git branch -d "${BRANCH}"
    echo "✓ Removed branch: ${BRANCH}"
fi

# Update state
jq '.status = "cleaned_up" | .cleaned_at = "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"' \
    "${STATE_FILE}" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "${STATE_FILE}"

echo "✓ Cleanup complete"
