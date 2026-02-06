#!/bin/bash
# NOMOS Module: Port Management
# Commands: kill_port, cmd_ports (allocate, release, cleanup)
# Depends on: LOCKS_DIR, PROJECT_ROOT, acquire_lock, release_lock

kill_port() {
    local port="$1"
    local name="$2"
    if lsof -ti:"$port" > /dev/null 2>&1; then
        lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
        echo "ok Killed process on $name port $port"
        return 0
    fi
    return 1
}

cmd_ports() {
    local action="$1"
    local feature_id="$2"

    if [[ -z "$action" ]]; then
        echo "Usage: $0 ports <allocate|release|cleanup> [feature_id]"
        exit 1
    fi

    # Default ports
    local DEFAULT_SERVER_PORT=3008
    local DEFAULT_WEB_PORT=3001

    case "$action" in
        allocate)
            if [[ -z "$feature_id" ]]; then
                echo "Usage: $0 ports allocate <feature_id>" >&2
                exit 1
            fi

            local PORT_FILE="${LOCKS_DIR}/${feature_id}.ports"

            # Reuse previously allocated ports
            if [[ -f "$PORT_FILE" ]]; then
                cat "$PORT_FILE"
                exit 0
            fi

            # Extract feature number (F001 -> 1, F123 -> 123)
            local FEATURE_NUM
            FEATURE_NUM=$(echo "$feature_id" | sed 's/F0*//')
            local FEATURE_SERVER_PORT=$((DEFAULT_SERVER_PORT + (FEATURE_NUM * 10)))
            local FEATURE_WEB_PORT=$((DEFAULT_WEB_PORT + (FEATURE_NUM * 10)))

            # Check if a port is in use
            port_in_use() {
                local port=$1
                if command -v lsof &> /dev/null; then
                    lsof -i ":$port" > /dev/null 2>&1
                elif command -v nc &> /dev/null; then
                    nc -z localhost "$port" 2>/dev/null
                else
                    curl -s --connect-timeout 1 "http://localhost:$port" > /dev/null 2>&1
                fi
            }

            # Try to claim default ports
            local LOCK_DIR="${LOCKS_DIR}/default-ports.lock.d"
            if acquire_lock "$LOCK_DIR" 10; then
                trap "release_lock '$LOCK_DIR'" EXIT

                if ! port_in_use $DEFAULT_SERVER_PORT && ! port_in_use $DEFAULT_WEB_PORT; then
                    if [[ ! -f "${LOCKS_DIR}/default-ports.owner" ]]; then
                        echo "$feature_id" > "${LOCKS_DIR}/default-ports.owner"
                        echo "{\"SERVER_PORT\": $DEFAULT_SERVER_PORT, \"WEB_PORT\": $DEFAULT_WEB_PORT, \"mode\": \"primary\"}" | tee "$PORT_FILE"
                        exit 0
                    fi
                fi

                echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
            else
                echo "{\"SERVER_PORT\": $FEATURE_SERVER_PORT, \"WEB_PORT\": $FEATURE_WEB_PORT, \"mode\": \"parallel\"}" | tee "$PORT_FILE"
            fi
            ;;

        release)
            if [[ -z "$feature_id" ]]; then
                echo "Usage: $0 ports release <feature_id>" >&2
                exit 1
            fi

            echo "Releasing ports for $feature_id..."

            # Read ports from worktree config
            local WORKTREE_PORTS="${PROJECT_ROOT}/.nomos/worktrees/${feature_id}/.nomos/ports.json"
            local SERVER_PORT=""
            local WEB_PORT=""

            if [[ -f "$WORKTREE_PORTS" ]]; then
                SERVER_PORT=$(jq -r '.SERVER_PORT // empty' "$WORKTREE_PORTS" 2>/dev/null)
                WEB_PORT=$(jq -r '.WEB_PORT // empty' "$WORKTREE_PORTS" 2>/dev/null)
            fi

            [[ -n "$SERVER_PORT" ]] && kill_port "$SERVER_PORT" "server" || true
            [[ -n "$WEB_PORT" ]] && kill_port "$WEB_PORT" "web" || true

            # Remove port allocation file
            local PORT_FILE="${LOCKS_DIR}/${feature_id}.ports"
            [[ -f "$PORT_FILE" ]] && rm -f "$PORT_FILE" && echo "ok Released port allocation for $feature_id"

            # Check default port ownership
            local OWNER_FILE="${LOCKS_DIR}/default-ports.owner"
            if [[ -f "$OWNER_FILE" ]]; then
                local OWNER
                OWNER=$(cat "$OWNER_FILE")
                if [[ "$OWNER" == "$feature_id" ]]; then
                    rm -f "$OWNER_FILE"
                    echo "ok Released default port ownership from $feature_id"
                    kill_port 3008 "server" || true
                    kill_port 3001 "web" || true
                fi
            fi

            # Clean up logs
            rm -f "/tmp/nomos-server-${feature_id}.log" 2>/dev/null || true
            rm -f "/tmp/nomos-web-${feature_id}.log" 2>/dev/null || true
            echo "ok Cleaned up for $feature_id"
            ;;

        cleanup)
            echo "Checking for orphaned NOMOS processes..."
            local cleaned=0

            shopt -s nullglob
            for port_file in "${LOCKS_DIR}"/*.ports; do
                [[ -f "$port_file" ]] || continue
                local fid
                fid=$(basename "$port_file" .ports)
                local worktree="${PROJECT_ROOT}/.nomos/worktrees/${fid}"

                if [[ ! -d "$worktree" ]]; then
                    echo "Found orphaned allocation for $fid"
                    rm -f "$port_file"
                    cleaned=1
                fi
            done

            if [[ -f "${LOCKS_DIR}/default-ports.owner" ]]; then
                local owner
                owner=$(cat "${LOCKS_DIR}/default-ports.owner")
                local worktree="${PROJECT_ROOT}/.nomos/worktrees/${owner}"
                if [[ ! -d "$worktree" ]]; then
                    echo "Releasing orphaned default port ownership from $owner"
                    rm -f "${LOCKS_DIR}/default-ports.owner"
                    kill_port 3008 "server" || true
                    kill_port 3001 "web" || true
                    cleaned=1
                fi
            fi

            if [[ $cleaned -eq 0 ]]; then
                echo "No orphaned processes found"
            else
                echo "ok Orphaned processes cleaned up"
            fi
            ;;

        *)
            echo "Error: Unknown ports action '$action'"
            echo "Actions: allocate, release, cleanup"
            exit 1
            ;;
    esac
}
