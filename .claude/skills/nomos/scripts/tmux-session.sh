#!/bin/bash
# NOMOS tmux Session Manager
# Manages tmux sessions for feature execution with agent panes
#
# Usage:
#   tmux-session.sh setup <feature_id>      # Create session + feature tab
#   tmux-session.sh teardown <feature_id>   # Remove feature tab
#   tmux-session.sh dashboard               # Create/refresh dashboard tab
#   tmux-session.sh pane <feature_id> <name> <output_file>  # Add agent pane
#   tmux-session.sh status                  # Show session status
#   tmux-session.sh kill                    # Kill entire nomos session

set -e

SESSION_NAME="nomos"
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# ============================================================================
# HELPERS
# ============================================================================

has_tmux() {
    command -v tmux &>/dev/null
}

session_exists() {
    tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

tab_exists() {
    local tab_name="$1"
    tmux list-windows -t "$SESSION_NAME" -F '#W' 2>/dev/null | grep -q "^${tab_name}$"
}

ensure_session() {
    if ! session_exists; then
        tmux new-session -d -s "$SESSION_NAME" -n "dashboard" -c "$PROJECT_ROOT"
        echo "Created tmux session: $SESSION_NAME"
    fi
}

# ============================================================================
# COMMANDS
# ============================================================================

cmd_setup() {
    local feature_id="$1"
    if [[ -z "$feature_id" ]]; then
        echo "Usage: tmux-session.sh setup <feature_id>" >&2
        exit 1
    fi

    if ! has_tmux; then
        echo "SKIP: tmux not installed (graceful degradation)"
        exit 0
    fi

    ensure_session

    # Create feature tab if it doesn't exist
    if ! tab_exists "$feature_id"; then
        tmux new-window -t "$SESSION_NAME" -n "$feature_id" -c "$PROJECT_ROOT"
        echo "Created tab: $feature_id"
    else
        echo "Tab already exists: $feature_id"
    fi

    # Rename first pane to "orchestrator"
    local target="${SESSION_NAME}:${feature_id}"
    tmux select-pane -t "${target}.0" -T "orchestrator" 2>/dev/null || true

    echo "TMUX_SETUP: OK"
    echo "  Session: $SESSION_NAME"
    echo "  Tab: $feature_id"
    echo "  Attach: tmux attach -t $SESSION_NAME"
}

cmd_teardown() {
    local feature_id="$1"
    if [[ -z "$feature_id" ]]; then
        echo "Usage: tmux-session.sh teardown <feature_id>" >&2
        exit 1
    fi

    if ! has_tmux; then
        exit 0
    fi

    if ! session_exists; then
        exit 0
    fi

    if tab_exists "$feature_id"; then
        tmux kill-window -t "${SESSION_NAME}:${feature_id}" 2>/dev/null || true
        echo "Removed tab: $feature_id"
    fi

    # If no windows left (besides dashboard), kill the session
    local window_count
    window_count=$(tmux list-windows -t "$SESSION_NAME" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$window_count" -le 1 ]]; then
        tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
        echo "Killed session: $SESSION_NAME (no feature tabs left)"
    fi
}

cmd_dashboard() {
    if ! has_tmux; then
        echo "SKIP: tmux not installed"
        exit 0
    fi

    ensure_session

    # Select or create dashboard tab
    if ! tab_exists "dashboard"; then
        tmux new-window -t "$SESSION_NAME" -n "dashboard" -c "$PROJECT_ROOT"
    fi

    # Send dashboard command to the dashboard pane
    local target="${SESSION_NAME}:dashboard"
    tmux send-keys -t "$target" "bash .claude/skills/nomos/scripts/nomos.sh session" Enter

    echo "Dashboard refreshed"
}

cmd_pane() {
    local feature_id="$1"
    local pane_name="$2"
    local output_file="$3"

    if [[ -z "$feature_id" || -z "$pane_name" ]]; then
        echo "Usage: tmux-session.sh pane <feature_id> <name> [output_file]" >&2
        exit 1
    fi

    if ! has_tmux; then
        echo "SKIP: tmux not installed"
        exit 0
    fi

    if ! session_exists || ! tab_exists "$feature_id"; then
        echo "WARN: Session or tab not found, skipping pane creation"
        exit 0
    fi

    local target="${SESSION_NAME}:${feature_id}"

    # Split horizontally to create a new pane
    tmux split-window -t "$target" -h -c "$PROJECT_ROOT" 2>/dev/null || \
        tmux split-window -t "$target" -v -c "$PROJECT_ROOT" 2>/dev/null || true

    # Get the new pane index
    local new_pane
    new_pane=$(tmux list-panes -t "$target" -F '#{pane_index}' | tail -1)

    # Set pane title
    tmux select-pane -t "${target}.${new_pane}" -T "$pane_name" 2>/dev/null || true

    # If output file provided, tail it in the pane
    if [[ -n "$output_file" ]]; then
        tmux send-keys -t "${target}.${new_pane}" "tail -f '$output_file' 2>/dev/null || echo 'Waiting for output...'" Enter
    fi

    echo "Created pane: $pane_name (index: $new_pane)"
}

cmd_status() {
    if ! has_tmux; then
        echo "tmux: not installed"
        exit 0
    fi

    if ! session_exists; then
        echo "tmux: no active session"
        exit 0
    fi

    echo "=== TMUX SESSION: $SESSION_NAME ==="
    echo ""
    echo "Windows:"
    tmux list-windows -t "$SESSION_NAME" -F '  #{window_index}: #{window_name} (#{window_panes} panes)' 2>/dev/null
    echo ""
    echo "Attach: tmux attach -t $SESSION_NAME"
}

cmd_kill() {
    if ! has_tmux; then
        exit 0
    fi

    if session_exists; then
        tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
        echo "Killed session: $SESSION_NAME"
    else
        echo "No active session to kill"
    fi
}

# ============================================================================
# MAIN
# ============================================================================

COMMAND="$1"
shift || true

case "$COMMAND" in
    setup)     cmd_setup "$@" ;;
    teardown)  cmd_teardown "$@" ;;
    dashboard) cmd_dashboard "$@" ;;
    pane)      cmd_pane "$@" ;;
    status)    cmd_status "$@" ;;
    kill)      cmd_kill "$@" ;;
    --help|-h|"")
        echo "NOMOS tmux Session Manager"
        echo ""
        echo "Usage:"
        echo "  $0 setup <feature_id>               Create session + feature tab"
        echo "  $0 teardown <feature_id>             Remove feature tab"
        echo "  $0 dashboard                         Create/refresh dashboard tab"
        echo "  $0 pane <feature_id> <name> [file]   Add agent pane with optional tail"
        echo "  $0 status                            Show session status"
        echo "  $0 kill                              Kill entire nomos session"
        exit 0
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'" >&2
        echo "Use '$0 --help' for usage" >&2
        exit 1
        ;;
esac

exit 0
