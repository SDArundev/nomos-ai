#!/bin/bash
#
# nomos-verify state management script
# Query and update verification state
#

set -e

ACTION="${1:-get}"
STATE_FILE="${2:-.nomos/verify/current/state.json}"
KEY="${3}"
VALUE="${4}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Find most recent state file if not specified
find_latest_state() {
    local latest=$(ls -td .nomos/verify/*/ 2>/dev/null | head -1)
    if [ -n "${latest}" ] && [ -f "${latest}state.json" ]; then
        echo "${latest}state.json"
    else
        echo ""
    fi
}

case "${ACTION}" in
    get)
        # Get state value
        if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
            STATE_FILE=$(find_latest_state)
        fi

        if [ -z "${STATE_FILE}" ]; then
            echo -e "${RED}No verification state found${NC}"
            exit 1
        fi

        if [ -z "${KEY}" ]; then
            # Return entire state
            cat "${STATE_FILE}"
        else
            # Return specific key
            jq -r ".${KEY}" "${STATE_FILE}"
        fi
        ;;

    set)
        # Set state value
        if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
            echo -e "${RED}State file not found: ${STATE_FILE}${NC}"
            exit 1
        fi

        if [ -z "${KEY}" ] || [ -z "${VALUE}" ]; then
            echo "Usage: $0 set <state.json> <key> <value>"
            exit 1
        fi

        jq ".${KEY} = \"${VALUE}\"" "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} Set ${KEY} = ${VALUE}"
        ;;

    update-status)
        # Update verification status
        STATUS="${3}"
        if [ -z "${STATE_FILE}" ] || [ ! -f "${STATE_FILE}" ]; then
            STATE_FILE=$(find_latest_state)
        fi

        if [ -z "${STATUS}" ]; then
            echo "Usage: $0 update-status <state.json> <status>"
            echo "Status: initialized|discovering|verifying|analyzing|reporting|learning|merging|complete"
            exit 1
        fi

        jq ".status = \"${STATUS}\" | .updated_at = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" \
            "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} Status: ${STATUS}"
        ;;

    add-result)
        # Add feature result
        FEATURE_ID="${3}"
        RESULT="${4}"  # pass|fail

        if [ -z "${FEATURE_ID}" ] || [ -z "${RESULT}" ]; then
            echo "Usage: $0 add-result <state.json> <feature_id> <pass|fail>"
            exit 1
        fi

        jq ".results.${RESULT} += [\"${FEATURE_ID}\"]" "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} ${FEATURE_ID}: ${RESULT}"
        ;;

    add-issue)
        # Add issue (reads from stdin as JSON)
        ISSUE_JSON=$(cat)
        jq ".issues += [${ISSUE_JSON}]" "${STATE_FILE}" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "${STATE_FILE}"
        echo -e "${GREEN}✓${NC} Issue added"
        ;;

    list)
        # List all verification sessions
        echo -e "${BLUE}Verification Sessions:${NC}"
        echo ""
        for dir in .nomos/verify/*/; do
            if [ -f "${dir}state.json" ]; then
                ts=$(basename "${dir}")
                status=$(jq -r '.status' "${dir}state.json")
                printf "  %-25s %s\n" "${ts}" "${status}"
            fi
        done
        ;;

    latest)
        # Get path to latest session
        find_latest_state
        ;;

    *)
        echo "Usage: $0 <action> [args]"
        echo ""
        echo "Actions:"
        echo "  get [state.json] [key]     - Get state (or specific key)"
        echo "  set <state.json> <key> <v> - Set state value"
        echo "  update-status <s.json> <s> - Update status"
        echo "  add-result <s.json> <id> <pass|fail>"
        echo "  add-issue <state.json>     - Add issue (JSON from stdin)"
        echo "  list                       - List all sessions"
        echo "  latest                     - Get latest session path"
        exit 1
        ;;
esac
