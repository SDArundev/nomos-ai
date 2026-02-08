#!/bin/bash
# NOMOS Module: tmux Integration
# Commands: cmd_tmux
# Depends on: PROJECT_ROOT, SKILL_DIR

TMUX_SCRIPT="${SKILL_DIR}/scripts/tmux-session.sh"

cmd_tmux() {
    local action="$1"
    shift || true

    if [[ -z "$action" ]]; then
        echo "Usage: $0 tmux <setup|teardown|dashboard|pane|status|kill> [args...]" >&2
        exit 1
    fi

    bash "$TMUX_SCRIPT" "$action" "$@"
}
