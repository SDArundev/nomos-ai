#!/bin/bash
# NOMOS Verify Script - Server lifecycle for step-04 Track B
#
# Usage:
#   nomos-verify.sh <feature_id> <action>
#     start   - Start server+web from worktree, write PIDs
#     wait    - Wait for both to be healthy (max 30s each)
#     smoke   - Run smoke test (health + frontend + log check)
#     stop    - Kill processes on feature ports, verify stopped
#     status  - Report server status

set -e

GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null)
if [[ "$GIT_COMMON" == *.git ]]; then
    PROJECT_ROOT=$(dirname "$GIT_COMMON")
else
    PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
fi

FEATURE_ID="$1"
ACTION="$2"

if [[ -z "$FEATURE_ID" || -z "$ACTION" ]]; then
    echo "Usage: $0 <feature_id> <action>"
    echo "Actions: start, wait, smoke, stop, status"
    exit 1
fi

WORKTREE="${PROJECT_ROOT}/.nomos/worktrees/${FEATURE_ID}"
PORTS_FILE="${WORKTREE}/.nomos/ports.json"
PID_FILE="/tmp/nomos-pids-${FEATURE_ID}.json"
SERVER_LOG="/tmp/nomos-server-${FEATURE_ID}.log"
WEB_LOG="/tmp/nomos-web-${FEATURE_ID}.log"

# Read ports
if [[ ! -f "$PORTS_FILE" ]]; then
    echo "Error: ports.json not found at $PORTS_FILE" >&2
    exit 1
fi

SERVER_PORT=$(jq -r '.SERVER_PORT' "$PORTS_FILE" 2>/dev/null)
WEB_PORT=$(jq -r '.WEB_PORT' "$PORTS_FILE" 2>/dev/null)

case "$ACTION" in
    start)
        echo "Starting servers for $FEATURE_ID..."
        echo "  Server port: $SERVER_PORT"
        echo "  Web port: $WEB_PORT"

        # Kill any existing processes on these ports
        lsof -ti:"$SERVER_PORT" | xargs kill -9 2>/dev/null || true
        lsof -ti:"$WEB_PORT" | xargs kill -9 2>/dev/null || true
        sleep 1

        # Start server
        cd "$WORKTREE"
        bun run dev:server > "$SERVER_LOG" 2>&1 &
        SERVER_PID=$!

        # Start web
        VITE_PORT=$WEB_PORT bun run dev:web > "$WEB_LOG" 2>&1 &
        WEB_PID=$!

        # Write PIDs
        cat > "$PID_FILE" <<EOF
{
  "feature_id": "$FEATURE_ID",
  "server_pid": $SERVER_PID,
  "web_pid": $WEB_PID,
  "server_port": $SERVER_PORT,
  "web_port": $WEB_PORT,
  "server_log": "$SERVER_LOG",
  "web_log": "$WEB_LOG",
  "started_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

        echo "ok Server PID: $SERVER_PID, Web PID: $WEB_PID"
        echo "ok PIDs written to $PID_FILE"
        ;;

    wait)
        echo "Waiting for servers to be healthy..."

        # Wait for server
        echo -n "  Server (port $SERVER_PORT): "
        for i in $(seq 1 30); do
            if curl -s "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
                echo "ready (${i}s)"
                break
            fi
            if [[ $i -eq 30 ]]; then
                echo "TIMEOUT after 30s"
                echo "Server log tail:"
                tail -20 "$SERVER_LOG" 2>/dev/null || echo "(no log)"
                exit 1
            fi
            sleep 1
        done

        # Wait for web
        echo -n "  Web (port $WEB_PORT): "
        for i in $(seq 1 30); do
            if curl -s "http://localhost:${WEB_PORT}" > /dev/null 2>&1; then
                echo "ready (${i}s)"
                break
            fi
            if [[ $i -eq 30 ]]; then
                echo "TIMEOUT after 30s"
                echo "Web log tail:"
                tail -20 "$WEB_LOG" 2>/dev/null || echo "(no log)"
                exit 1
            fi
            sleep 1
        done

        echo "ok Both servers healthy"
        ;;

    smoke)
        echo "Running smoke test for $FEATURE_ID..."
        SMOKE_PASS=true

        # Health check
        echo -n "  Health endpoint: "
        if curl -sf "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
            echo "PASS"
        else
            echo "FAIL"
            SMOKE_PASS=false
        fi

        # Frontend check
        echo -n "  Frontend serves HTML: "
        FRONTEND_RESPONSE=$(curl -s "http://localhost:${WEB_PORT}" 2>/dev/null || echo "")
        if echo "$FRONTEND_RESPONSE" | grep -qi "<html\|<!doctype" > /dev/null 2>&1; then
            echo "PASS"
        else
            echo "FAIL"
            SMOKE_PASS=false
        fi

        # Log check for errors
        echo -n "  Server log errors: "
        ERROR_COUNT=$(grep -ciE "error|exception|panic|fatal" "$SERVER_LOG" 2>/dev/null || echo "0")
        if [[ "$ERROR_COUNT" -eq 0 ]]; then
            echo "PASS (0 errors)"
        else
            echo "WARN ($ERROR_COUNT potential errors)"
            grep -iE "error|exception|panic|fatal" "$SERVER_LOG" 2>/dev/null | head -5
        fi

        if $SMOKE_PASS; then
            echo "SMOKE: PASS"
        else
            echo "SMOKE: FAIL"
            exit 1
        fi
        ;;

    stop)
        echo "Stopping servers for $FEATURE_ID..."

        # Read PIDs if available
        if [[ -f "$PID_FILE" ]]; then
            SERVER_PID=$(jq -r '.server_pid' "$PID_FILE" 2>/dev/null)
            WEB_PID=$(jq -r '.web_pid' "$PID_FILE" 2>/dev/null)
            kill "$SERVER_PID" 2>/dev/null || true
            kill "$WEB_PID" 2>/dev/null || true
        fi

        # Force kill by port
        lsof -ti:"$SERVER_PORT" | xargs kill -9 2>/dev/null || true
        lsof -ti:"$WEB_PORT" | xargs kill -9 2>/dev/null || true

        sleep 1

        # Verify stopped
        SERVER_RUNNING=false
        WEB_RUNNING=false
        curl -s "http://localhost:$SERVER_PORT" > /dev/null 2>&1 && SERVER_RUNNING=true
        curl -s "http://localhost:$WEB_PORT" > /dev/null 2>&1 && WEB_RUNNING=true

        if $SERVER_RUNNING || $WEB_RUNNING; then
            echo "WARNING: Some processes still running"
            $SERVER_RUNNING && echo "  Server on port $SERVER_PORT still active"
            $WEB_RUNNING && echo "  Web on port $WEB_PORT still active"
            exit 1
        fi

        # Cleanup
        rm -f "$PID_FILE"
        echo "ok Servers stopped and verified"
        ;;

    status)
        echo "Server status for $FEATURE_ID:"
        echo "  Server port: $SERVER_PORT"
        echo "  Web port: $WEB_PORT"

        echo -n "  Server: "
        if curl -s "http://localhost:${SERVER_PORT}/health" > /dev/null 2>&1; then
            echo "RUNNING"
        else
            echo "STOPPED"
        fi

        echo -n "  Web: "
        if curl -s "http://localhost:${WEB_PORT}" > /dev/null 2>&1; then
            echo "RUNNING"
        else
            echo "STOPPED"
        fi

        if [[ -f "$PID_FILE" ]]; then
            echo "  PIDs: $(cat "$PID_FILE" | jq -c '{server: .server_pid, web: .web_pid}')"
        fi
        ;;

    *)
        echo "Error: Unknown action '$ACTION'"
        echo "Actions: start, wait, smoke, stop, status"
        exit 1
        ;;
esac
