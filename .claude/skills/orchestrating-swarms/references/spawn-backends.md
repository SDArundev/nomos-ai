# Spawn Backends

A **backend** determines how teammate Claude instances actually run. Claude Code supports three backends, and **auto-detects** the best one based on your environment.

---

## Backend Comparison

| Backend | How It Works | Visibility | Persistence | Speed |
|---------|-------------|------------|-------------|-------|
| **in-process** | Same Node.js process as leader | Hidden (background) | Dies with leader | Fastest |
| **tmux** | Separate terminal in tmux session | Visible in tmux | Survives leader exit | Medium |
| **iterm2** | Split panes in iTerm2 window | Visible side-by-side | Dies with window | Medium |

---

## Auto-Detection Logic

```
Start
  └─ Running inside tmux? ($TMUX set)
       ├─ Yes → Use tmux backend
       └─ No → Running in iTerm2? ($TERM_PROGRAM === "iTerm.app")
              ├─ No → tmux available? (which tmux)
              │     ├─ Yes → Use tmux (external session)
              │     └─ No → Use in-process
              └─ Yes → it2 CLI installed? (which it2)
                    ├─ Yes → Use iterm2 backend
                    └─ No → tmux available?
                          ├─ Yes → Use tmux (prompt to install it2)
                          └─ No → Error: Install tmux or it2
```

**Detection checks:**
1. `$TMUX` environment variable → inside tmux
2. `$TERM_PROGRAM === "iTerm.app"` or `$ITERM_SESSION_ID` → in iTerm2
3. `which tmux` → tmux available
4. `which it2` → it2 CLI installed

---

## in-process (Default for non-tmux)

Teammates run as async tasks within the same Node.js process.

**How it works:**
- No new process spawned
- Teammates share the same Node.js event loop
- Communication via in-memory queues (fast)
- You don't see teammate output directly

**When it's used:**
- Not running inside tmux session
- Non-interactive mode (CI, scripts)
- Explicitly set via `CLAUDE_CODE_SPAWN_BACKEND=in-process`

**Layout:**
```
┌─────────────────────────────────────────┐
│           Node.js Process               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Leader  │  │Worker 1 │  │Worker 2 │ │
│  │ (main)  │  │ (async) │  │ (async) │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
```

**Pros:** Fastest startup, lowest overhead, works everywhere
**Cons:** Can't see teammate output in real-time, all die if leader dies, harder to debug

```javascript
// in-process is automatic when not in tmux
Task({
  team_name: "my-project",
  name: "worker",
  subagent_type: "general-purpose",
  prompt: "...",
  run_in_background: true
})

// Force in-process explicitly
// export CLAUDE_CODE_SPAWN_BACKEND=in-process
```

---

## tmux

Teammates run as separate Claude instances in tmux panes/windows.

**How it works:**
- Each teammate gets its own tmux pane
- Separate process per teammate
- You can switch panes to see teammate output
- Communication via inbox files

**When it's used:**
- Running inside a tmux session (`$TMUX` is set)
- tmux available and not in iTerm2
- Explicitly set via `CLAUDE_CODE_SPAWN_BACKEND=tmux`

**Layout modes:**

1. **Inside tmux (native):** Splits your current window
```
┌─────────────────┬─────────────────┐
│                 │    Worker 1     │
│     Leader      ├─────────────────┤
│   (your pane)   │    Worker 2     │
│                 ├─────────────────┤
│                 │    Worker 3     │
└─────────────────┴─────────────────┘
```

2. **Outside tmux (external session):** Creates a new tmux session called `claude-swarm`
```bash
# View workers:
tmux attach -t claude-swarm
```

**Pros:** See teammate output in real-time, teammates survive leader exit, can attach/detach sessions
**Cons:** Slower startup, requires tmux installed, more resource usage

**Useful tmux commands:**
```bash
tmux list-panes              # List all panes
tmux select-pane -t 1        # Switch to pane
tmux kill-pane -t %5         # Kill a pane
tmux attach -t claude-swarm  # View swarm session
tmux select-layout tiled     # Rebalance layout
```

---

## iterm2 (macOS only)

Teammates run as split panes within your iTerm2 window.

**How it works:**
- Uses iTerm2's Python API via `it2` CLI
- Splits your current window into panes
- Each teammate visible side-by-side
- Communication via inbox files

**When it's used:**
- Running in iTerm2 (`$TERM_PROGRAM === "iTerm.app"`)
- `it2` CLI is installed and working
- Python API enabled in iTerm2 preferences

**Layout:**
```
┌─────────────────┬─────────────────┐
│                 │    Worker 1     │
│     Leader      ├─────────────────┤
│   (your pane)   │    Worker 2     │
│                 ├─────────────────┤
│                 │    Worker 3     │
└─────────────────┴─────────────────┘
```

**Pros:** Visual debugging, native macOS experience, no tmux needed, automatic pane management
**Cons:** macOS + iTerm2 only, requires setup, panes die with window

**Setup:**
```bash
# 1. Install it2 CLI
uv tool install it2
# OR: pipx install it2
# OR: pip install --user it2

# 2. Enable Python API in iTerm2
# iTerm2 → Settings → General → Magic → Enable Python API

# 3. Restart iTerm2

# 4. Verify
it2 --version
it2 session list
```

**If setup fails:** Claude Code will prompt you to set up it2 when you first spawn a teammate. You can choose to install it2 now, use tmux instead, or cancel.

---

## Forcing a Backend

```bash
# Force in-process (fastest, no visibility)
export CLAUDE_CODE_SPAWN_BACKEND=in-process

# Force tmux (visible panes, persistent)
export CLAUDE_CODE_SPAWN_BACKEND=tmux

# Auto-detect (default)
unset CLAUDE_CODE_SPAWN_BACKEND
```

---

## Backend in Team Config

The backend type is recorded per-teammate in `config.json`:

```json
{
  "members": [
    {
      "name": "worker-1",
      "backendType": "in-process",
      "tmuxPaneId": "in-process"
    },
    {
      "name": "worker-2",
      "backendType": "tmux",
      "tmuxPaneId": "%5"
    }
  ]
}
```

---

## Environment Variables

Spawned teammates automatically receive:

```bash
CLAUDE_CODE_TEAM_NAME="my-project"
CLAUDE_CODE_AGENT_ID="worker-1@my-project"
CLAUDE_CODE_AGENT_NAME="worker-1"
CLAUDE_CODE_AGENT_TYPE="Explore"
CLAUDE_CODE_AGENT_COLOR="#4A90D9"
CLAUDE_CODE_PLAN_MODE_REQUIRED="false"
CLAUDE_CODE_PARENT_SESSION_ID="session-xyz"
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "No pane backend available" | Neither tmux nor iTerm2 available | Install tmux: `brew install tmux` |
| "it2 CLI not installed" | In iTerm2 but missing it2 | Run `uv tool install it2` |
| "Python API not enabled" | it2 can't communicate with iTerm2 | Enable in iTerm2 Settings → General → Magic |
| Workers not visible | Using in-process backend | Start inside tmux or iTerm2 |
| Workers dying unexpectedly | Outside tmux, leader exited | Use tmux for persistence |

**Checking current backend:**
```bash
cat ~/.claude/teams/{team}/config.json | jq '.members[].backendType'
echo $TMUX              # Check if inside tmux
echo $TERM_PROGRAM      # Check if in iTerm2
which tmux              # Check tmux availability
which it2               # Check it2 availability
```
