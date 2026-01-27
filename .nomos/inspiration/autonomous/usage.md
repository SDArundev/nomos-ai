# Usage Guide

> CLI commands, keyboard shortcuts, and user workflows for autonomous AI development systems.

---

## Quick Reference

| Action | Web UI | CLI |
|--------|--------|-----|
| Start agent | Click "Start" on feature | `automaker run <feature-id>` |
| Stop agent | Click "Stop" | `automaker stop <session-id>` |
| Auto mode | Toggle switch | `automaker auto-mode start` |
| View logs | Terminal panel | `automaker logs` |
| List features | Kanban board | `automaker features list` |

---

## Web UI Workflows

### Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Automaker                              [Settings] [?]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Backlog   │  │ In Progress │  │  Completed  │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │             │
│  │ │ Feature │ │  │ │ Feature │ │  │ │ Feature │ │             │
│  │ │   #1    │ │  │ │   #2    │ │  │ │   #3    │ │             │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │             │
│  │ ┌─────────┐ │  │             │  │             │             │
│  │ │ Feature │ │  │             │  │             │             │
│  │ │   #4    │ │  │             │  │             │             │
│  │ └─────────┘ │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │  Terminal                                              [+]  │
│  │  $ Agent output streams here...                             │
│  │                                                             │
│  └─────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Creating a Feature

1. **Click "+ New Feature"** in the backlog column
2. **Fill in details:**
   - Title: Short description
   - Description: Detailed requirements
   - Priority: 1-5 (1 is highest)
   - Planning mode: skip | lite | spec | full
3. **Click "Create"**

### Starting an Agent

1. **Select feature** from Kanban board
2. **Review feature details** in side panel
3. **Click "Start Agent"**
4. **Monitor progress** in terminal panel
5. **Review changes** when complete

### Using Auto Mode

1. **Toggle "Auto Mode"** switch in header
2. **Select branch** for auto mode execution
3. **Set concurrency** (1-5 simultaneous agents)
4. **Monitor dashboard** for progress
5. **Review completed features** for approval

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + /` | Toggle terminal |
| `Ctrl/Cmd + ,` | Open settings |
| `Ctrl/Cmd + Shift + P` | Provider settings |
| `Escape` | Close modal/panel |

### Kanban Board

| Shortcut | Action |
|----------|--------|
| `N` | New feature |
| `E` | Edit selected feature |
| `D` | Delete selected feature |
| `Enter` | Open feature details |
| `Arrow keys` | Navigate features |
| `Shift + Arrow` | Move feature (reorder) |

### Terminal

| Shortcut | Action |
|----------|--------|
| `Ctrl + C` | Cancel/interrupt |
| `Ctrl + L` | Clear terminal |
| `Ctrl + Shift + C` | Copy selection |
| `Ctrl + Shift + V` | Paste |
| `Page Up/Down` | Scroll history |

### Agent Session

| Shortcut | Action |
|----------|--------|
| `Space` | Pause/resume agent |
| `S` | Stop agent |
| `R` | Retry last action |
| `A` | Approve pending action |
| `Ctrl + Enter` | Send message to agent |

---

## CLI Commands

### Installation & Setup

```bash
# Install CLI globally
npm install -g automaker-cli

# Initialize in project
automaker init

# Configure API key
automaker config set ANTHROPIC_API_KEY sk-ant-api03-...

# Verify setup
automaker doctor
```

### Project Management

```bash
# Register current directory as project
automaker project add .

# List registered projects
automaker project list

# Remove project
automaker project remove <project-id>

# Set active project
automaker project use <project-id>
```

### Feature Management

```bash
# List all features
automaker features list
automaker features list --status backlog
automaker features list --priority 1

# Create feature
automaker features create "Add user authentication" \
  --description "Implement OAuth2 login" \
  --priority 2 \
  --planning-mode spec

# Update feature
automaker features update F001 --status in_progress
automaker features update F001 --priority 1

# Delete feature
automaker features delete F001

# Import from file
automaker features import features.json

# Export to file
automaker features export > features.json
```

### Running Agents

```bash
# Run agent on feature
automaker run F001

# Run with options
automaker run F001 \
  --provider claude \
  --model claude-sonnet-4-20250514 \
  --thinking-mode high \
  --max-turns 50

# Run in background
automaker run F001 --background

# View running sessions
automaker sessions list

# Stop session
automaker stop <session-id>

# View session logs
automaker logs <session-id>
automaker logs <session-id> --follow
```

### Auto Mode

```bash
# Start auto mode
automaker auto-mode start
automaker auto-mode start --branch develop --concurrency 3

# Check status
automaker auto-mode status

# Stop auto mode
automaker auto-mode stop

# Configure auto mode
automaker config set AUTO_MODE_CONCURRENCY 3
automaker config set AUTO_MODE_REQUIRE_APPROVAL true
```

### Git Operations

```bash
# Create worktree for feature
automaker worktree create F001

# List worktrees
automaker worktree list

# Clean up worktrees
automaker worktree cleanup

# Merge feature branch
automaker merge F001 --into main
```

### Configuration

```bash
# View all config
automaker config list

# Get specific value
automaker config get ANTHROPIC_API_KEY

# Set value
automaker config set LOG_LEVEL debug

# Reset to defaults
automaker config reset
```

---

## Common Workflows

### Workflow 1: Single Feature Development

```bash
# 1. Create feature
automaker features create "Fix login bug" \
  --description "Users can't login with special characters in password" \
  --priority 1

# 2. Run agent
automaker run F001

# 3. Review changes
git diff

# 4. If satisfied, commit
automaker commit F001 --message "Fix special character handling in login"

# 5. Mark complete
automaker features update F001 --status verified
```

### Workflow 2: Batch Feature Processing (Auto Mode)

```bash
# 1. Import feature backlog
automaker features import backlog.json

# 2. Start auto mode
automaker auto-mode start --concurrency 2

# 3. Monitor progress
automaker auto-mode status --watch

# 4. Review completed features
automaker features list --status waiting_approval

# 5. Approve or reject
automaker features approve F001 F002 F003
automaker features reject F004 --reason "Needs requirements clarification"
```

### Workflow 3: Collaborative Development

```bash
# Terminal 1: Start auto mode on develop branch
automaker auto-mode start --branch develop

# Terminal 2: Work on urgent feature manually
automaker run F-URGENT --provider claude --thinking-mode ultrathink

# Both agents work in parallel, auto mode respects concurrency limits
```

### Workflow 4: Spec Mode (Complex Feature)

```bash
# 1. Create complex feature
automaker features create "Implement payment system" \
  --description "Full Stripe integration with subscriptions" \
  --planning-mode full \
  --priority 1

# 2. Run planning phase only
automaker run F001 --phase planning

# 3. Review generated spec
cat .automaker/output/F001/spec.md

# 4. Approve plan
automaker plan approve F001

# 5. Continue with implementation
automaker run F001 --phase implementation
```

---

## Provider Configuration

### Switching Providers

```bash
# Via CLI
automaker config set DEFAULT_PROVIDER codex

# Via environment
export DEFAULT_PROVIDER=claude
```

### Provider-Specific Settings

```bash
# Claude settings
automaker provider claude \
  --model claude-sonnet-4-20250514 \
  --thinking-mode high \
  --max-tokens 8192

# Codex settings
automaker provider codex \
  --model gpt-4o \
  --temperature 0.7
```

### Thinking Mode Options

| Mode | Token Budget | Use Case |
|------|--------------|----------|
| none | 0 | Simple tasks |
| low | 1,024 | Quick decisions |
| medium | 4,096 | Standard tasks |
| high | 16,384 | Complex analysis |
| ultrathink | 32,768+ | Deep reasoning |

```bash
# Set thinking mode
automaker run F001 --thinking-mode ultrathink --thinking-budget 50000
```

---

## Terminal Integration

### Interactive Terminal

The web UI includes an integrated terminal for:
- Viewing agent output in real-time
- Sending commands to agents
- Running git commands
- Debugging issues

### Terminal Commands

```bash
# Inside integrated terminal
help              # Show available commands
clear             # Clear terminal
history           # Show command history
exit              # Close terminal session
```

### Agent Interaction

```bash
# Send message to running agent
> Tell the agent to focus on error handling

# Approve pending action
> approve

# Reject with reason
> reject "Please use a different approach"

# Pause agent
> pause

# Resume agent
> resume
```

---

## Tips & Best Practices

### Feature Writing

```markdown
Good feature description:
- Clear acceptance criteria
- Specific file/component mentions
- Example inputs/outputs
- Edge cases to handle

Bad feature description:
- "Make it better"
- "Fix the bug"
- Vague requirements
```

### Optimal Settings

| Scenario | Planning Mode | Thinking Mode | Concurrency |
|----------|---------------|---------------|-------------|
| Bug fixes | skip | low | 3 |
| Small features | lite | medium | 2 |
| Medium features | spec | high | 1 |
| Large features | full | ultrathink | 1 |

### Cost Optimization

```bash
# Use cheaper models for simple tasks
automaker run F001 --model claude-haiku-3-5-20250414

# Limit thinking budget
automaker run F001 --thinking-budget 10000

# Set max turns
automaker run F001 --max-turns 20
```

---

*Reference: Usage patterns from Automaker v0.13.0+*
