# Features Catalog

> Complete feature inventory by category from Auto-Claude v2.7.5.

---

## Category: Autonomous Task Execution

| Feature | Description |
|---------|-------------|
| Spec Creation Pipeline | Multi-phase AI spec generation (discovery, requirements, writing, critique) |
| Complexity Assessment | AI-based task complexity classification (simple/moderate/complex/epic) |
| Implementation Planner | Subtask-based plan generation with dependencies and verification criteria |
| Autonomous Coder Loop | Iterative subtask implementation with progress tracking |
| Subagent Spawning | Coder agent can spawn parallel sub-agents via Task tool |
| Recovery Manager | Session recovery from checkpoints with memory persistence |
| Build Progress Tracking | Per-subtask status (pending/in_progress/completed/skipped) |
| Linear Integration | Sync task status to Linear for team tracking |
| Phase Events (NDJSON) | Structured phase progress events for frontend consumption |

---

## Category: Quality Assurance

| Feature | Description |
|---------|-------------|
| QA Reviewer Agent | Implementation validation against spec (no write tools) |
| QA Fixer Agent | Automated fix application for issues found by reviewer |
| Self-Validating QA Loop | Review → Fix → Re-review cycle (max 50 iterations) |
| Recurring Issue Detection | Detects 3+ occurrences of same issue, escalates to human |
| Human Feedback Integration | QA_FIX_REQUEST.md for manual issue injection |
| Manual Test Plan | Auto-generated for projects without test frameworks |
| QA Iteration History | Full history of all QA iterations with verdicts |
| No-Test Project Handling | Adapted QA strategy for projects lacking test infrastructure |

---

## Category: Merge & Conflict Resolution

| Feature | Description |
|---------|-------------|
| Intent-Aware Semantic Merge | Multi-layer merge pipeline for parallel agent changes |
| Semantic Analyzer | Understands intent behind code changes |
| Conflict Detector | Cross-task conflict identification |
| AutoMerger | Deterministic merge strategies (append, import, props, hooks, ordering) |
| AI Conflict Resolver | Claude-powered resolution for ambiguous conflicts |
| File Evolution Tracker | Tracks baseline and changes per task |
| Merge Pipeline | Orchestrates full merge process |

---

## Category: Memory System

| Feature | Description |
|---------|-------------|
| Session Insights | Per-session memory (discoveries, what worked, what failed) |
| Codebase Map | Persistent map of discovered file purposes |
| Code Patterns | Accumulated code pattern knowledge |
| Gotchas | Accumulated warnings and pitfalls |
| Memory Summary | Cross-session summary generation |
| Graphiti Integration | Graph-based semantic memory (optional, Python 3.12+) |
| LadybugDB | Embedded graph database (no Docker required) |
| Memory CLI | Command-line memory management tools |

---

## Category: Desktop Application

| Feature | Description |
|---------|-------------|
| Kanban Board | Visual task management with drag-and-drop (dnd-kit) |
| Agent Terminals | Up to 12 parallel xterm.js terminals with WebGL |
| Task Detail Modal | Phase progress, subtasks, file explorer, review |
| Onboarding Wizard | Multi-step setup (Claude auth, dev tools, memory) |
| Auto-Updater | Automatic app updates via electron-updater |
| Cross-Platform | macOS (DMG), Windows (NSIS), Linux (AppImage, DEB, Flatpak) |
| Multi-Tab Projects | Multiple projects with sortable tab bar |
| 7 Color Themes | Default, Dusk, Lime, Ocean, Retro, Neo + more (light/dark) |
| i18n | English + French translations (react-i18next) |

---

## Category: Terminal System

| Feature | Description |
|---------|-------------|
| PTY Daemon | Background PTY process management (node-pty) |
| Terminal Lifecycle | Session creation, cleanup, event handling |
| Claude Integration Handler | Claude SDK within terminal sessions |
| Terminal Grid | Multi-terminal layout with resize |
| Terminal Buffer Persistence | Save/restore terminal content |
| WebGL Rendering | GPU-accelerated terminal rendering |
| Terminal File Drop | Drag-and-drop files into terminal |
| Task Context Injection | One-click task context into terminal |
| Auto-Naming | AI-generated terminal session names |

---

## Category: GitHub Integration

| Feature | Description |
|---------|-------------|
| Issue Import | Import GitHub issues as tasks |
| Issue Investigation | AI-powered issue analysis |
| Issue Triage | Automated issue categorization |
| Duplicate Detection | AI detects duplicate issues |
| Spam Detection | Bot/spam issue filtering |
| PR Review | Multi-agent code review (security, quality, logic) |
| PR Auto-Fix | Automated fix for review findings |
| PR Follow-Up | Post-review follow-up comments |
| Batch PR Review | Review multiple PRs at once |
| OAuth Integration | GitHub OAuth for API access |
| Release Integration | Create GitHub releases from changelogs |

---

## Category: GitLab Integration

| Feature | Description |
|---------|-------------|
| Issue Import | Import GitLab issues as tasks |
| Issue Investigation | AI-powered issue analysis |
| MR Review | Merge request code review |
| MR Auto-Fix | Automated fix for review findings |
| OAuth Integration | GitLab OAuth for API access |
| Release Integration | Create releases from changelogs |

---

## Category: Insights & Ideation

| Feature | Description |
|---------|-------------|
| Insights Chat | AI chat interface for codebase exploration |
| Code Improvements | AI suggestions for code structure |
| Code Quality | Maintainability analysis |
| Documentation Gaps | Missing documentation detection |
| Performance | Performance optimization suggestions |
| Security Hardening | Security vulnerability detection |
| UI/UX Improvements | Frontend improvement suggestions |

---

## Category: Roadmap

| Feature | Description |
|---------|-------------|
| Roadmap Generation | AI-assisted feature planning |
| Competitor Analysis | Competitive landscape analysis |
| Feature Prioritization | Priority-based feature ordering |
| Roadmap Kanban View | Visual roadmap with phases |

---

## Category: Changelog

| Feature | Description |
|---------|-------------|
| Changelog Generation | Release notes from completed tasks |
| Version Suggestion | Semantic version recommendation |
| Git Integration | Parse changes from git history |
| Archive Tasks | Archive completed tasks to changelog |
| GitHub Release | Publish changelog as GitHub release |

---

## Category: Authentication & Profiles

| Feature | Description |
|---------|-------------|
| OAuth Authentication | Claude Code OAuth flow |
| API Key Profiles | Direct API key configuration |
| Multi-Account Swapping | Multiple Claude accounts with auto-switch |
| Rate Limit Detection | Detect and react to API rate limits |
| Usage Monitoring | Per-profile usage tracking |
| Profile Scoring | Score profiles by availability |
| Token Encryption | OS-level credential storage |
| Token Refresh | Automatic OAuth token lifecycle |

---

## Category: Security

| Feature | Description |
|---------|-------------|
| Bash Security Hook | Command validation before execution |
| Dynamic Command Allowlist | Base + stack-detected + custom commands |
| Filesystem Validation | Path traversal prevention |
| Git Safety | Force push/reset protection |
| MCP Server Validation | Safe command/flag allowlisting |
| Secret Scanning | Pre-commit secret detection |
| Tool Input Validation | Agent tool parameter validation |
| VirusTotal Scanning | Release binary scanning |

---

## Category: Developer Experience

| Feature | Description |
|---------|-------------|
| CLI Interface | Full CLI for headless operation |
| Dev Mode | Electron + Vite HMR development |
| Debug Mode | Enhanced logging and remote debugging |
| Sentry Integration | Error tracking (optional) |
| Platform Abstraction | Cross-platform path/executable helpers |
| Biome Linting | Frontend code quality |
| Ruff Linting | Backend code quality |
| Pre-Commit Hooks | Husky + lint-staged |

---

## Feature Count Summary

| Category | Count |
|----------|-------|
| Task Execution | 9 |
| Quality Assurance | 8 |
| Merge System | 7 |
| Memory System | 8 |
| Desktop App | 9 |
| Terminal System | 9 |
| GitHub Integration | 11 |
| GitLab Integration | 6 |
| Insights/Ideation | 7 |
| Roadmap | 4 |
| Changelog | 5 |
| Auth/Profiles | 8 |
| Security | 8 |
| Developer Experience | 8 |
| **Total** | **~107** |

---

*Reference: Feature catalog from Auto-Claude v2.7.5*
