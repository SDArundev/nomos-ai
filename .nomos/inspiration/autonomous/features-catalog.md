# Features Catalog

> Complete feature inventory organized by category with priorities and descriptions.

---

## Feature Status Legend

| Status | Description |
|--------|-------------|
| **HIGH** | Core functionality, must-have |
| **MEDIUM** | Important for user experience |
| **LOW** | Nice-to-have, can defer |

---

## 1. PROJECT MANAGEMENT

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1.1 | Multi-project support | HIGH | Manage multiple projects with favorites and trash |
| 1.2 | Project creation wizard | HIGH | Quick, interactive, or template-based creation |
| 1.3 | Workspace context management | HIGH | Per-project context files for AI reference |
| 1.4 | Project settings override | MEDIUM | Override global settings at project level |
| 1.5 | Project history tracking | LOW | Track recent projects for quick access |
| 1.6 | Project search/filter | LOW | Search projects by name, path, or tags |
| 1.7 | Project templates | LOW | Create projects from predefined templates |
| 1.8 | Project archival | LOW | Archive inactive projects |

---

## 2. KANBAN BOARD & FEATURES

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 2.1 | Kanban board view | HIGH | Visual drag-and-drop feature management |
| 2.2 | Feature status transitions | HIGH | Backlog → In Progress → Waiting Approval → Verified |
| 2.3 | Feature dependency linking | HIGH | Define and visualize feature dependencies |
| 2.4 | Feature CRUD operations | HIGH | Create, read, update, delete features |
| 2.5 | Bulk feature operations | MEDIUM | Select multiple features for batch actions |
| 2.6 | Feature suggestion generation | MEDIUM | AI-powered suggestions (features, refactoring, security) |
| 2.7 | Image/screenshot support | MEDIUM | Attach visual context to features |
| 2.8 | Feature categories | MEDIUM | Organize features by category |
| 2.9 | Category autocomplete | LOW | Quick category assignment with suggestions |
| 2.10 | List view alternative | LOW | Tabular view for feature management |
| 2.11 | Feature search/filter | LOW | Search features by title, description, status |
| 2.12 | Feature ordering | LOW | Manual ordering within columns |
| 2.13 | Feature duplication | LOW | Clone existing features |
| 2.14 | Feature description history | LOW | Track description changes over time |
| 2.15 | Board background customization | LOW | Custom images/colors for boards |

---

## 3. AI AGENT SYSTEM

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 3.1 | Claude Agent SDK integration | HIGH | Core autonomous agent capabilities |
| 3.2 | Multi-model support | HIGH | Claude Opus/Sonnet/Haiku, Codex, Cursor, OpenCode |
| 3.3 | Provider abstraction layer | HIGH | Unified interface for multiple AI providers |
| 3.4 | Session management | HIGH | Persistent agent sessions with history |
| 3.5 | Tool integration | HIGH | Read, Write, Edit, Bash, Glob, Grep, Web tools |
| 3.6 | Extended thinking modes | HIGH | None, low, medium, high, ultrathink (32K tokens) |
| 3.7 | Agent streaming output | HIGH | Real-time visibility into agent work |
| 3.8 | Planning levels | HIGH | Skip, lite, spec, full planning modes |
| 3.9 | Plan approval workflow | MEDIUM | Optional human approval before implementation |
| 3.10 | Follow-up instructions | MEDIUM | Send guidance to running agents |
| 3.11 | Agent chat mode | MEDIUM | Interactive exploratory conversations |
| 3.12 | Custom AI profiles | LOW | Different prompts and models per profile |
| 3.13 | Skill tool support | LOW | Custom skills from .claude/skills/ |
| 3.14 | Subagent task delegation | LOW | Task tool for agent-to-agent delegation |
| 3.15 | MCP server integration | MEDIUM | External tool providers via MCP |
| 3.16 | Agent output storage | MEDIUM | Markdown and JSONL output persistence |
| 3.17 | Agent history browsing | LOW | Browse past agent interactions |

---

## 4. AUTOMATION & AUTO-MODE

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 4.1 | Auto-mode orchestration | HIGH | Autonomous feature loop execution |
| 4.2 | Per-worktree concurrency | HIGH | Configurable parallel agent limits |
| 4.3 | Feature queue management | HIGH | Automatic feature selection and execution |
| 4.4 | Pipeline execution | MEDIUM | Sequential step execution after implementation |
| 4.5 | Failure recovery | MEDIUM | Auto-pause after 3 consecutive failures |
| 4.6 | Quota detection | MEDIUM | Detect and handle API rate limits |
| 4.7 | Task progress monitoring | MEDIUM | Real-time progress visualization |
| 4.8 | Interrupted work resume | MEDIUM | Continue from last checkpoint |
| 4.9 | Context loading | MEDIUM | Automatic CLAUDE.md and memory loading |
| 4.10 | Event emission | MEDIUM | WebSocket events for all auto-mode actions |
| 4.11 | Loop status display | LOW | Visual indicator of auto-mode state |
| 4.12 | Concurrency adjustment | LOW | Dynamic concurrency changes |

---

## 5. GIT INTEGRATION

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 5.1 | Git worktree isolation | HIGH | Each feature executes in isolated branch |
| 5.2 | Worktree lifecycle management | HIGH | Create, delete, checkout worktrees |
| 5.3 | Git status display | HIGH | Show current branch and changes |
| 5.4 | Git diff viewer | MEDIUM | Visual code change review |
| 5.5 | Commit creation | MEDIUM | Create commits with messages |
| 5.6 | PR creation workflow | MEDIUM | Generate pull requests from features |
| 5.7 | Branch management | MEDIUM | List, create, switch, delete branches |
| 5.8 | Push/pull operations | MEDIUM | Sync with remote repository |
| 5.9 | Branch autocomplete | LOW | Quick branch selection |
| 5.10 | Commit message generation | LOW | AI-assisted commit messages |
| 5.11 | Merge operations | LOW | Merge branches locally |
| 5.12 | Discard changes | LOW | Revert uncommitted modifications |
| 5.13 | Remote management | LOW | Add, remove, list remotes |
| 5.14 | Git initialization | LOW | Initialize new repositories |

---

## 6. TERMINAL INTEGRATION

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 6.1 | Multi-session terminal | HIGH | Multiple concurrent terminal sessions |
| 6.2 | PTY session management | HIGH | node-pty based terminal emulation |
| 6.3 | WebSocket communication | HIGH | Bidirectional terminal I/O |
| 6.4 | Split pane layout | MEDIUM | Horizontal/vertical pane splitting |
| 6.5 | Keyboard navigation | MEDIUM | Ctrl+Alt+Arrow for spatial navigation |
| 6.6 | Session persistence | MEDIUM | Restore sessions across project switches |
| 6.7 | Terminal tabs | MEDIUM | Tab-based session organization |
| 6.8 | ANSI output rendering | LOW | Full terminal color support |
| 6.9 | Scrollback buffer | LOW | 50KB output history for reconnection |
| 6.10 | Output throttling | LOW | 4KB/4ms batching to prevent flooding |
| 6.11 | Shell detection | LOW | Auto-detect user's preferred shell |
| 6.12 | Terminal themes | LOW | 20+ terminal color schemes |
| 6.13 | Font customization | LOW | Terminal font family and size |
| 6.14 | Resize handling | LOW | Debounced terminal resizing |

---

## 7. GITHUB INTEGRATION

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.1 | Issue syncing | MEDIUM | Import and display GitHub issues |
| 7.2 | Issue validation | MEDIUM | Async background validation |
| 7.3 | PR management | MEDIUM | View and manage pull requests |
| 7.4 | Issue-to-feature conversion | LOW | Convert issues to Automaker features |
| 7.5 | PR creation from feature | LOW | Generate PR directly from completed feature |
| 7.6 | GitHub authentication | LOW | OAuth/token-based auth |

---

## 8. THEMING & CUSTOMIZATION

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 8.1 | Theme selection | MEDIUM | 50+ theme options (dark/light) |
| 8.2 | Theme persistence | MEDIUM | Remember theme preference |
| 8.3 | Per-project theme override | LOW | Different themes per project |
| 8.4 | Font customization | LOW | UI font family selection |
| 8.5 | Per-project font override | LOW | Different fonts per project |
| 8.6 | Board backgrounds | LOW | Custom images/colors for boards |
| 8.7 | Terminal color schemes | LOW | 20+ terminal-specific themes |
| 8.8 | Theme hydration | LOW | Instant theme application on load |
| 8.9 | Dark mode detection | LOW | Auto-select based on system preference |

---

## 9. DEVELOPER EXPERIENCE

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 9.1 | Code syntax highlighting | MEDIUM | CodeMirror-based editors |
| 9.2 | Log parser | MEDIUM | Structured agent output display |
| 9.3 | Keyboard shortcuts | MEDIUM | Customizable global shortcuts |
| 9.4 | Editor integration | LOW | Open in VSCode, Cursor, etc. |
| 9.5 | Development server management | LOW | Start/stop dev servers from UI |
| 9.6 | Dev server logs | LOW | Access development server output |
| 9.7 | Init script execution | LOW | Run project initialization scripts |
| 9.8 | Available editors detection | LOW | Auto-detect installed editors |
| 9.9 | Available terminals detection | LOW | Auto-detect terminal applications |

---

## 10. SECURITY

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 10.1 | Git worktree sandboxing | HIGH | Prevents main branch contamination |
| 10.2 | Path validation | HIGH | Validates against allowed directories |
| 10.3 | Session-based authentication | HIGH | HTTP-only, SameSite cookies |
| 10.4 | API key authentication | MEDIUM | Optional API key for endpoints |
| 10.5 | Rate limiting | MEDIUM | 5 auth attempts per minute |
| 10.6 | Environment sanitization | MEDIUM | Filtered env vars to agents |
| 10.7 | CORS configuration | MEDIUM | Allowlist-based origin control |
| 10.8 | Content-type validation | LOW | Enforce JSON for API requests |
| 10.9 | WebSocket token auth | LOW | Short-lived tokens for WS connections |
| 10.10 | Credential masking | LOW | Hide API keys in UI display |

---

## 11. CONFIGURATION & SETTINGS

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 11.1 | Global settings | HIGH | User-wide preferences |
| 11.2 | Project settings | HIGH | Per-project overrides |
| 11.3 | Settings persistence | HIGH | Save/load settings to disk |
| 11.4 | Settings migration | MEDIUM | Upgrade settings between versions |
| 11.5 | Model configuration | MEDIUM | Per-phase model selection |
| 11.6 | Provider configuration | MEDIUM | API keys and endpoints |
| 11.7 | MCP server configuration | LOW | External tool server setup |
| 11.8 | Keyboard shortcut customization | LOW | Remap shortcuts |
| 11.9 | Settings sync (server) | LOW | Sync settings via backend |

---

## 12. NOTIFICATIONS & EVENTS

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 12.1 | Event streaming | HIGH | WebSocket-based real-time events |
| 12.2 | Event history | MEDIUM | Persistent event log (1000 max) |
| 12.3 | Notification system | MEDIUM | Toast/alert notifications |
| 12.4 | Notification persistence | LOW | Save notifications to disk |
| 12.5 | Mark as read | LOW | Track read/unread status |
| 12.6 | Notification center | LOW | UI for viewing all notifications |

---

## 13. SPECIFICATION SYSTEM

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 13.1 | Spec generation | MEDIUM | AI-generated project specifications |
| 13.2 | Spec editing | MEDIUM | View/Edit/Source modes |
| 13.3 | Spec parsing | MEDIUM | XML spec to structured object |
| 13.4 | Task extraction | MEDIUM | Parse tasks from specs |
| 13.5 | Acceptance criteria | LOW | GIVEN-WHEN-THEN format support |

---

## 14. MEMORY & CONTEXT

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 14.1 | CLAUDE.md loading | HIGH | Auto-load project conventions |
| 14.2 | Context file management | MEDIUM | Manage AI reference files |
| 14.3 | Memory files | MEDIUM | Task-relevant memory loading |
| 14.4 | Context deduplication | LOW | Prevent duplicate context injection |
| 14.5 | Wiki/knowledge base | LOW | Project documentation |
| 14.6 | History browsing | LOW | Browse past agent interactions |

---

## 15. DEPENDENCY MANAGEMENT

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 15.1 | Dependency resolution | MEDIUM | Determine blocking dependencies |
| 15.2 | Dependency visualization | MEDIUM | Graph view of feature dependencies |
| 15.3 | Circular dependency detection | MEDIUM | Prevent circular references |
| 15.4 | Blocking dependency display | LOW | Show what blocks a feature |
| 15.5 | Ancestor context injection | LOW | Include dependency context in prompts |

---

## 16. IDEATION & SUGGESTIONS

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 16.1 | Feature suggestions | MEDIUM | AI-generated feature ideas |
| 16.2 | Refactoring suggestions | LOW | Code improvement recommendations |
| 16.3 | Security suggestions | LOW | Security improvement ideas |
| 16.4 | Performance suggestions | LOW | Performance optimization ideas |
| 16.5 | Title generation | LOW | AI-generated feature titles |

---

## 17. DESKTOP INTEGRATION (ELECTRON)

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 17.1 | Cross-platform builds | HIGH | macOS, Windows, Linux support |
| 17.2 | Backend server spawn | HIGH | Start server from Electron main |
| 17.3 | Health check | HIGH | Verify server readiness |
| 17.4 | Port allocation | MEDIUM | Dynamic port finding |
| 17.5 | Native file dialogs | MEDIUM | File/folder selection |
| 17.6 | Window state persistence | LOW | Remember window size/position |
| 17.7 | Deep linking | LOW | Handle automaker:// URLs |
| 17.8 | Auto-update | LOW | Application updates |

---

## Implementation Roadmap

### Phase 1: Foundation (MVP)
- 1.1-1.3 Project management basics
- 2.1-2.4 Kanban board core
- 3.1-3.7 Agent system core
- 4.1-4.3 Auto-mode basics
- 5.1-5.3 Git basics
- 10.1-10.3 Security essentials

### Phase 2: Enhanced Experience
- 2.5-2.8 Kanban enhancements
- 3.8-3.11 Planning and follow-up
- 4.4-4.7 Pipeline and recovery
- 5.4-5.8 Git operations
- 6.1-6.7 Terminal system
- 8.1-8.2 Theming basics

### Phase 3: Polish & Integration
- Remaining features by priority
- GitHub integration
- Advanced customization
- Performance optimization

---

## Feature Count Summary

| Category | HIGH | MEDIUM | LOW | Total |
|----------|------|--------|-----|-------|
| Project Management | 3 | 1 | 4 | 8 |
| Kanban & Features | 4 | 4 | 7 | 15 |
| AI Agent System | 7 | 5 | 5 | 17 |
| Automation | 3 | 6 | 3 | 12 |
| Git Integration | 3 | 5 | 6 | 14 |
| Terminal | 3 | 4 | 7 | 14 |
| GitHub | 0 | 3 | 3 | 6 |
| Theming | 0 | 2 | 7 | 9 |
| Developer Experience | 0 | 3 | 6 | 9 |
| Security | 2 | 3 | 5 | 10 |
| Configuration | 2 | 3 | 4 | 9 |
| Notifications | 1 | 2 | 3 | 6 |
| Specification | 0 | 4 | 1 | 5 |
| Memory & Context | 1 | 2 | 3 | 6 |
| Dependencies | 0 | 3 | 2 | 5 |
| Ideation | 0 | 1 | 4 | 5 |
| Desktop | 3 | 2 | 3 | 8 |
| **TOTAL** | **32** | **53** | **73** | **158** |

---

*Reference: Complete feature catalog from Automaker v0.13.0+*
