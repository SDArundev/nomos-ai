#!/bin/bash
#
# nomos-refactor state management script
#

set -e

ACTION="${1:-get}"
STATE_FILE="${2:-.nomos/refactor/current/state.json}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Find most recent state file
find_latest_state() {
    local latest=$(ls -td .nomos/refactor/*/ 2>/dev/null | head -1)
    if [ -n "${latest}" ] && [ -f "${latest}state.json" ]; then
        echo "${latest}state.json"
    fi
}

case "${ACTION}" in
    get)
        if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
            STATE_FILE=$(find_latest_state)
        fi
        [ -f "${STATE_FILE}" ] && cat "${STATE_FILE}" || echo "No state found"
        ;;

    update-status)
        STATUS="${3}"
        [ -z "${STATUS}" ] && echo "Usage: $0 update-status <state.json> <status>" && exit 1
        jq ".status = \"${STATUS}\" | .updated_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" \
            "${STATE_FILE}" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} Status: ${STATUS}"
        ;;

    add-checkpoint)
        NAME="${3}"
        HASH="${4}"
        jq ".checkpoints += [{\"name\": \"${NAME}\", \"hash\": \"${HASH}\", \"at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]" \
            "${STATE_FILE}" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} Checkpoint: ${NAME}"
        ;;

    list)
        echo "Refactor Sessions:"
        for dir in .nomos/refactor/*/; do
            if [ -f "${dir}state.json" ]; then
                ts=$(basename "${dir}")
                type=$(jq -r '.refactor_type' "${dir}state.json")
                status=$(jq -r '.status' "${dir}state.json")
                target=$(jq -r '.target' "${dir}state.json")
                printf "  %-25s %-12s %-10s %s\n" "${ts}" "${type}" "${status}" "${target}"
            fi
        done
        ;;

    *)
        echo "Usage: $0 <action> [args]"
        echo ""
        echo "Actions:"
        echo "  get [state.json]              - Get current state"
        echo "  update-status <file> <status> - Update status"
        echo "  add-checkpoint <file> <name> <hash>"
        echo "  list                          - List all sessions"
        ;;
esac
