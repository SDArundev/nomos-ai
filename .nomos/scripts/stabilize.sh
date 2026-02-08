#!/usr/bin/env bash
# stabilize.sh — Parallel stabilization pipeline using git worktrees + headless Claude sessions
# Usage:
#   ./stabilize.sh              # Run all 5 tracks
#   ./stabilize.sh --track N    # Retry a single track (1-5)
#   ./stabilize.sh --merge      # Skip execution, just merge completed tracks
#   ./stabilize.sh --verify     # Skip execution+merge, just verify
#   ./stabilize.sh --cleanup    # Remove worktrees and track branches
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRANCH="stabilize/v1"
TRACK_COUNT=5
TIMEOUT_SECONDS=1200  # 20 minutes per track
OUTPUT_DIR="$REPO_ROOT/.nomos/output/stabilize"
WORKTREE_BASE="$REPO_ROOT/.nomos/worktrees-stabilize"
TMUX_SESSION="stabilize"

# ─── Parse arguments ──────────────────────────────────────────────────
SINGLE_TRACK=""
SKIP_TO_MERGE=false
SKIP_TO_VERIFY=false
DO_CLEANUP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --track)
      SINGLE_TRACK="$2"
      shift 2
      ;;
    --merge)
      SKIP_TO_MERGE=true
      shift
      ;;
    --verify)
      SKIP_TO_VERIFY=true
      shift
      ;;
    --cleanup)
      DO_CLEANUP=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ─── Helpers ──────────────────────────────────────────────────────────
log() { echo "[stabilize] $(date +%H:%M:%S) $*"; }
die() { echo "[stabilize] ERROR: $*" >&2; exit 1; }

get_tracks() {
  if [[ -n "$SINGLE_TRACK" ]]; then
    echo "$SINGLE_TRACK"
  else
    seq 1 "$TRACK_COUNT"
  fi
}

check_deps() {
  command -v claude >/dev/null 2>&1 || die "claude CLI not found"
  command -v tmux >/dev/null 2>&1   || die "tmux not found"
  command -v git >/dev/null 2>&1    || die "git not found"
  command -v bun >/dev/null 2>&1    || die "bun not found"
}

# ─── Phase 0: SETUP ──────────────────────────────────────────────────
phase_setup() {
  log "Phase 0: SETUP"

  cd "$REPO_ROOT"

  # Ensure we're on a clean working tree (allow untracked files)
  if ! git diff --quiet HEAD 2>/dev/null; then
    die "Working tree has uncommitted changes. Commit or stash first."
  fi

  # Create stabilize branch from main if it doesn't exist
  if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    log "Creating branch $BRANCH from main"
    git branch "$BRANCH" main
  fi

  # Create output directory
  mkdir -p "$OUTPUT_DIR"
  mkdir -p "$WORKTREE_BASE"

  local tracks
  tracks=$(get_tracks)

  # Create worktrees + track branches
  for n in $tracks; do
    local track_branch="stabilize/track-$n"
    local worktree_path="$WORKTREE_BASE/track-$n"

    # Create track branch from stabilize/v1 if needed
    if ! git rev-parse --verify "$track_branch" >/dev/null 2>&1; then
      log "Creating branch $track_branch"
      git branch "$track_branch" "$BRANCH"
    fi

    # Create worktree if needed
    if [[ ! -d "$worktree_path" ]]; then
      log "Creating worktree for track $n at $worktree_path"
      git worktree add "$worktree_path" "$track_branch"
    fi

    # Install dependencies in worktree
    log "Installing deps for track $n..."
    (cd "$worktree_path" && bun install --frozen-lockfile 2>/dev/null || bun install) &
  done

  # Wait for all bun installs to complete
  wait
  log "Phase 0: SETUP complete"
}

# ─── Generate per-track runner scripts ────────────────────────────────
# We generate small bash scripts that tmux will execute, avoiding all
# quoting issues with inline prompts.
generate_runner_scripts() {
  local tracks
  tracks=$(get_tracks)

  for n in $tracks; do
    local runner="$OUTPUT_DIR/track-$n.runner.sh"
    local worktree="$WORKTREE_BASE/track-$n"
    local prompt_file="$OUTPUT_DIR/track-$n.prompt.md"
    local log_file="$OUTPUT_DIR/track-$n.log"
    local status_file="$OUTPUT_DIR/track-$n.status"

    # Remove stale status file
    rm -f "$status_file"

    cat > "$runner" <<RUNNER_EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$worktree"

echo "=== Track $n starting at \$(date) ==="
echo "Working directory: \$(pwd)"
echo "Branch: \$(git branch --show-current)"
echo ""

# Read prompt from file and pass via stdin
prompt=\$(cat "$prompt_file")

timeout $TIMEOUT_SECONDS claude -p --dangerously-skip-permissions "\$prompt" > "$log_file" 2>&1
exit_code=\$?

echo "\$exit_code" > "$status_file"
echo ""
echo "=== Track $n finished at \$(date) with exit code \$exit_code ==="
echo "Log: $log_file"
RUNNER_EOF

    chmod +x "$runner"
  done
}

# ─── Phase 1: EXECUTE ────────────────────────────────────────────────
phase_execute() {
  log "Phase 1: EXECUTE"

  generate_runner_scripts

  local tracks
  tracks=$(get_tracks)

  # Kill existing tmux session if present
  tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

  local first=true
  for n in $tracks; do
    local runner="$OUTPUT_DIR/track-$n.runner.sh"

    if $first; then
      tmux new-session -d -s "$TMUX_SESSION" -n "track-$n" "bash $runner; read -p 'Press enter to close...'"
      first=false
    else
      tmux new-window -t "$TMUX_SESSION" -n "track-$n" "bash $runner; read -p 'Press enter to close...'"
    fi
  done

  local count
  count=$(echo "$tracks" | wc -w | tr -d ' ')
  log "Launched $count tracks in tmux session '$TMUX_SESSION'"
  log "Attach with: tmux attach -t $TMUX_SESSION"
}

# ─── Phase 2: MONITOR ────────────────────────────────────────────────
phase_monitor() {
  log "Phase 2: MONITOR — waiting for all tracks to complete..."

  local tracks
  tracks=$(get_tracks)

  while true; do
    local all_done=true
    local completed=0
    local total=0

    for n in $tracks; do
      total=$((total + 1))
      if [[ -f "$OUTPUT_DIR/track-$n.status" ]]; then
        completed=$((completed + 1))
      else
        all_done=false
      fi
    done

    if $all_done; then
      break
    fi

    log "Progress: $completed/$total tracks completed"
    sleep 15
  done

  # Report results
  log "All tracks completed. Results:"
  local failed=0
  for n in $tracks; do
    local code
    code=$(cat "$OUTPUT_DIR/track-$n.status")
    if [[ "$code" == "0" ]]; then
      log "  Track $n: SUCCESS (exit 0)"
    else
      log "  Track $n: FAILED (exit $code) — see $OUTPUT_DIR/track-$n.log"
      failed=$((failed + 1))
    fi
  done

  if [[ $failed -gt 0 ]]; then
    log "WARNING: $failed track(s) failed. Review logs and retry with --track N"
  fi
}

# ─── Phase 3: MERGE ──────────────────────────────────────────────────
phase_merge() {
  log "Phase 3: MERGE"

  cd "$REPO_ROOT"
  git checkout "$BRANCH"

  local tracks
  tracks=$(get_tracks)

  for n in $tracks; do
    local track_branch="stabilize/track-$n"
    local status_file="$OUTPUT_DIR/track-$n.status"

    # Only merge successful tracks
    if [[ -f "$status_file" ]] && [[ "$(cat "$status_file")" == "0" ]]; then
      log "Merging $track_branch into $BRANCH..."
      if git merge --no-ff -m "stabilize: merge track $n fixes" "$track_branch"; then
        log "  Track $n merged successfully"
      else
        log "  Track $n MERGE CONFLICT — resolve manually, then re-run with --merge"
        git merge --abort
      fi
    else
      log "  Skipping track $n (not completed successfully)"
    fi
  done

  log "Phase 3: MERGE complete"
}

# ─── Phase 4: VERIFY ─────────────────────────────────────────────────
phase_verify() {
  log "Phase 4: VERIFY"

  cd "$REPO_ROOT"

  # Ensure we're on the right branch (don't checkout if already there or if verifying after merge)
  local current_branch
  current_branch=$(git branch --show-current)
  if [[ "$current_branch" != "$BRANCH" ]] && git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    git checkout "$BRANCH"
  fi

  local pass=true

  log "Running type check..."
  if bun run check-types; then
    log "  check-types: PASS"
  else
    log "  check-types: FAIL"
    pass=false
  fi

  log "Running lint..."
  if bun run check; then
    log "  lint: PASS"
  else
    log "  lint: FAIL"
    pass=false
  fi

  log "Running tests..."
  if bun test; then
    log "  tests: PASS"
  else
    log "  tests: FAIL"
    pass=false
  fi

  log "Running build..."
  if bun run build; then
    log "  build: PASS"
  else
    log "  build: FAIL"
    pass=false
  fi

  log "Running antipattern checks..."
  local ap_fail=false

  if grep -rn '"anonymous"' packages/ apps/ --include='*.ts' | grep -v test | grep -v node_modules | grep -v '.nomos/' | grep -q .; then
    log "  ANTIPATTERN: Found 'anonymous' fallback in non-test code"
    grep -rn '"anonymous"' packages/ apps/ --include='*.ts' | grep -v test | grep -v node_modules | grep -v '.nomos/'
    ap_fail=true
  fi

  if grep -rn 'userId: "auto-mode"' packages/ --include='*.ts' | grep -v node_modules | grep -q .; then
    log "  ANTIPATTERN: Found hardcoded 'auto-mode' userId"
    grep -rn 'userId: "auto-mode"' packages/ --include='*.ts' | grep -v node_modules
    ap_fail=true
  fi

  if ! $ap_fail; then
    log "  antipatterns: PASS"
  else
    pass=false
  fi

  echo ""
  if $pass; then
    log "Phase 4: VERIFY — ALL CHECKS PASSED"
    log ""
    log "Next steps:"
    log "  1. Review diff:    git diff main...$BRANCH"
    log "  2. Create PR:      gh pr create --base main --head $BRANCH --title 'stabilize: fix all audit findings'"
    log "  3. Cleanup:        .nomos/scripts/stabilize.sh --cleanup"
  else
    log "Phase 4: VERIFY — SOME CHECKS FAILED (review above)"
    log ""
    log "Fix failures, then re-run: .nomos/scripts/stabilize.sh --verify"
  fi
}

# ─── CLEANUP ──────────────────────────────────────────────────────────
phase_cleanup() {
  log "Cleaning up worktrees and track branches..."
  cd "$REPO_ROOT"

  for n in $(seq 1 "$TRACK_COUNT"); do
    local worktree_path="$WORKTREE_BASE/track-$n"
    if [[ -d "$worktree_path" ]]; then
      log "  Removing worktree track-$n"
      git worktree remove --force "$worktree_path" 2>/dev/null || true
    fi
    if git rev-parse --verify "stabilize/track-$n" >/dev/null 2>&1; then
      git branch -D "stabilize/track-$n" 2>/dev/null || true
    fi
  done

  git worktree prune 2>/dev/null || true
  rmdir "$WORKTREE_BASE" 2>/dev/null || true
  tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

  # Clean up runner scripts
  rm -f "$OUTPUT_DIR"/track-*.runner.sh
  rm -f "$OUTPUT_DIR"/track-*.status

  log "Cleanup complete"
}

# ─── Main ─────────────────────────────────────────────────────────────
main() {
  check_deps

  if $DO_CLEANUP; then
    phase_cleanup
    exit 0
  fi

  if $SKIP_TO_VERIFY; then
    phase_verify
    exit 0
  fi

  if $SKIP_TO_MERGE; then
    phase_merge
    phase_verify
    exit 0
  fi

  phase_setup
  phase_execute
  phase_monitor
  phase_merge
  phase_verify

  log ""
  log "Stabilization complete!"
}

main
