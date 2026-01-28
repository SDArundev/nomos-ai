# Auto-Claude Architecture

> System architecture, codebase structure, and design patterns.

---

## Codebase Structure

```
Auto-Claude/
├── apps/
│   ├── backend/                    # Python backend/CLI - ALL agent logic
│   │   ├── core/                   # Client, auth, worktree, platform abstraction
│   │   │   ├── client.py           # Claude SDK client factory (create_client)
│   │   │   ├── auth.py             # OAuth token handling
│   │   │   ├── worktree.py         # Git worktree management
│   │   │   ├── workspace/          # Workspace setup, display, finalization
│   │   │   └── platform/           # Cross-platform abstraction
│   │   │
│   │   ├── agents/                 # Agent system
│   │   │   ├── base.py             # Shared constants (auto-continue delay, pause file)
│   │   │   ├── planner.py          # Follow-up planner agent
│   │   │   ├── coder.py            # Main autonomous coder loop
│   │   │   ├── session.py          # Agent session management
│   │   │   ├── memory_manager.py   # Graphiti memory integration
│   │   │   ├── utils.py            # Implementation plan utilities
│   │   │   └── tools_pkg/          # Tool registry, permissions, MCP servers
│   │   │       ├── registry.py     # Tool registration system
│   │   │       ├── permissions.py  # Tool permission management
│   │   │       ├── models.py       # AGENT_CONFIGS (single source of truth)
│   │   │       └── tools/          # Custom tools (memory, progress, qa, subtask)
│   │   │
│   │   ├── security/               # Three-layer security system
│   │   │   ├── main.py             # Public API facade
│   │   │   ├── validator.py        # Command validation logic
│   │   │   ├── parser.py           # Command parsing utilities
│   │   │   ├── profile.py          # Security profile per project
│   │   │   ├── hooks.py            # bash_security_hook for SDK
│   │   │   ├── constants.py        # Security constants
│   │   │   └── *_validators.py     # Domain-specific validators (filesystem, git, shell, db)
│   │   │
│   │   ├── spec/                   # Spec creation pipeline
│   │   │   ├── pipeline/           # Orchestrator, agent runner, models
│   │   │   ├── phases/             # Discovery, requirements, planning, spec phases
│   │   │   ├── complexity.py       # AI complexity assessment
│   │   │   ├── critique.py         # Spec critique loop
│   │   │   ├── writer.py           # Spec document generation
│   │   │   └── validate_pkg/       # Spec and plan validation
│   │   │
│   │   ├── qa/                     # Quality assurance system
│   │   │   ├── loop.py             # Main QA validation loop (up to 50 iterations)
│   │   │   ├── reviewer.py         # QA reviewer agent
│   │   │   ├── fixer.py            # QA fixer agent
│   │   │   ├── criteria.py         # Approval criteria and sign-off tracking
│   │   │   └── report.py           # QA reports, recurring issues, manual test plans
│   │   │
│   │   ├── merge/                  # Intent-aware semantic merge
│   │   │   ├── orchestrator.py     # Main merge coordinator
│   │   │   ├── semantic_analyzer.py # Semantic change analysis
│   │   │   ├── conflict_detector.py # Conflict detection
│   │   │   ├── auto_merger/        # Deterministic merge strategies
│   │   │   ├── ai_resolver/        # AI-powered conflict resolution
│   │   │   └── file_evolution/     # File change tracking across tasks
│   │   │
│   │   ├── memory/                 # Session memory system
│   │   │   ├── sessions.py         # Session insight persistence
│   │   │   ├── codebase_map.py     # Codebase knowledge map
│   │   │   ├── patterns.py         # Discovered code patterns
│   │   │   └── summary.py          # Memory summaries
│   │   │
│   │   ├── context/                # Task context building
│   │   │   ├── builder.py          # Context assembly
│   │   │   ├── search.py           # Semantic search
│   │   │   └── categorizer.py      # File categorization
│   │   │
│   │   ├── integrations/           # External integrations
│   │   │   ├── graphiti/           # Graph memory (LadybugDB)
│   │   │   └── linear/             # Linear task sync
│   │   │
│   │   ├── runners/                # Standalone runner scripts
│   │   │   ├── github/             # GitHub issue/PR processing
│   │   │   ├── gitlab/             # GitLab MR processing
│   │   │   ├── roadmap/            # Roadmap generation
│   │   │   └── ai_analyzer/        # AI codebase analyzer
│   │   │
│   │   ├── prompts/                # Agent system prompts (.md files)
│   │   │   ├── coder.md            # Coder agent prompt
│   │   │   ├── planner.md          # Planner agent prompt
│   │   │   ├── qa_reviewer.md      # QA reviewer prompt
│   │   │   ├── qa_fixer.md         # QA fixer prompt
│   │   │   ├── spec_*.md           # Spec pipeline prompts
│   │   │   └── github/             # GitHub integration prompts
│   │   │
│   │   ├── cli/                    # CLI commands (spec, build, QA, workspace)
│   │   ├── analysis/               # Project analysis (framework, port, route detection)
│   │   ├── project/                # Project analysis, command registry, stack detection
│   │   ├── services/               # Service orchestrator, recovery
│   │   ├── prediction/             # Risk analysis, checklist generation
│   │   ├── review/                 # Code review system
│   │   ├── ideation/               # AI-powered improvement suggestions
│   │   ├── task_logger/            # Persistent task logging
│   │   └── ui/                     # Terminal UI (colors, boxes, spinners, progress)
│   │
│   └── frontend/                   # Electron desktop UI
│       └── src/
│           ├── main/               # Electron main process
│           │   ├── agent/          # Agent queue, process, state, events, parsers
│           │   ├── claude-profile/ # Multi-profile credentials, token refresh, usage
│           │   ├── terminal/       # PTY daemon, lifecycle, Claude integration
│           │   ├── ipc-handlers/   # 40+ IPC handler modules (github, gitlab, task, etc.)
│           │   ├── changelog/      # Release notes generation
│           │   ├── insights/       # Codebase exploration
│           │   ├── services/       # Profile service, SDK session recovery
│           │   └── platform/       # Cross-platform abstraction
│           │
│           ├── preload/            # Electron preload (electronAPI bridge)
│           │   └── api/            # Type-safe IPC API modules
│           │
│           ├── renderer/           # React UI
│           │   ├── components/     # 100+ React components
│           │   │   ├── KanbanBoard.tsx
│           │   │   ├── Terminal.tsx
│           │   │   ├── onboarding/
│           │   │   ├── settings/
│           │   │   ├── task-detail/
│           │   │   ├── github-issues/
│           │   │   ├── github-prs/
│           │   │   ├── gitlab-*/
│           │   │   ├── ideation/
│           │   │   ├── roadmap/
│           │   │   ├── changelog/
│           │   │   ├── context/
│           │   │   └── ui/         # Radix-based primitives
│           │   ├── stores/         # 24+ Zustand stores
│           │   ├── hooks/          # Custom React hooks
│           │   └── lib/            # Utilities, mocks, terminal helpers
│           │
│           └── shared/             # Shared types, i18n, constants
│               ├── types/          # 19+ TypeScript type definition files
│               ├── constants/      # Themes, models, IPC channels
│               └── i18n/           # en + fr translations
│
├── tests/                          # Backend pytest test suite (100+ test files)
├── scripts/                        # Build, version bump, secrets scan
├── guides/                         # CLI usage, Linux/Windows guides
└── .design-system/                 # React design system showcase
```

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ELECTRON MAIN PROCESS                                              │
├─────────────────────────────────────────────────────────────────────┤
│  - Window creation & lifecycle                                      │
│  - Python backend subprocess management                             │
│  - PTY daemon for terminal sessions (node-pty)                      │
│  - Agent queue & process management                                 │
│  - File watcher (chokidar) for spec changes                        │
│  - Claude profile management (multi-account)                        │
│  - Auto-updater (electron-updater)                                  │
│  - IPC handler registration (40+ modules)                           │
│  - Sentry error tracking                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Electron IPC (contextBridge)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ELECTRON RENDERER PROCESS (React App)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Component Layer (100+ components)                                  │
│    ├─ KanbanBoard - Task management with drag-and-drop              │
│    ├─ TerminalGrid - Multi-terminal xterm.js with WebGL             │
│    ├─ TaskDetailModal - Phase progress, subtasks, file explorer     │
│    ├─ GitHub/GitLab - Issue import, PR review, investigation        │
│    ├─ Roadmap - AI-assisted feature planning                        │
│    ├─ Ideation - Codebase improvement suggestions                   │
│    ├─ Changelog - Release notes from completed tasks                │
│    ├─ Settings - Agent profiles, themes, integrations               │
│    └─ OnboardingWizard - Setup flow                                 │
├─────────────────────────────────────────────────────────────────────┤
│  State Management Layer                                             │
│    ├─ 24+ Zustand stores (project, task, terminal, settings...)     │
│    ├─ ViewStateContext (React context)                               │
│    └─ Custom hooks (useIpc, useTerminal, useResolvedAgentSettings)  │
├─────────────────────────────────────────────────────────────────────┤
│  API Communication Layer                                            │
│    ├─ electronAPI bridge (preload scripts)                          │
│    ├─ Type-safe IPC channels                                        │
│    └─ Agent event streaming                                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Subprocess (Python)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PYTHON BACKEND (Agent Logic)                                       │
├─────────────────────────────────────────────────────────────────────┤
│  Client Factory (core/client.py)                                    │
│    ├─ create_client() - Full agent sessions with security hooks     │
│    ├─ Project index caching (5-min TTL)                             │
│    ├─ Phase-aware model & thinking budget resolution                │
│    ├─ Tool permission configuration (per agent type)                │
│    └─ MCP server setup (custom + built-in)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Agent Pipeline                                                     │
│    ├─ SpecOrchestrator - Spec creation (discovery → spec → critique)│
│    ├─ PlannerAgent - Subtask-based implementation plans             │
│    ├─ CoderAgent - Autonomous build loop with recovery              │
│    ├─ QAReviewerAgent - Implementation validation                   │
│    ├─ QAFixerAgent - Automated issue resolution                     │
│    └─ QA Loop - Review → Fix → Re-review (up to 50 iterations)     │
├─────────────────────────────────────────────────────────────────────┤
│  Security Layer                                                     │
│    ├─ bash_security_hook (attached to SDK)                          │
│    ├─ Dynamic command allowlist (base + stack + custom)             │
│    ├─ Filesystem path validation                                    │
│    ├─ MCP server validation (safe commands only)                    │
│    └─ Tool input validation                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Memory & Context                                                   │
│    ├─ File-based session memory (insights, patterns, gotchas)       │
│    ├─ Graphiti knowledge graph (LadybugDB)                          │
│    ├─ Project index & capabilities detection                        │
│    └─ Context builder (task-relevant files)                         │
├─────────────────────────────────────────────────────────────────────┤
│  Merge System                                                       │
│    ├─ SemanticAnalyzer - Intent-based change analysis               │
│    ├─ ConflictDetector - Cross-task conflict detection              │
│    ├─ AutoMerger - Deterministic merge strategies                   │
│    └─ AIResolver - Claude-powered ambiguous conflict resolution     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ claude-agent-sdk API
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CLAUDE AGENT SDK (Python)                                          │
├─────────────────────────────────────────────────────────────────────┤
│  - Autonomous agent execution (ClaudeSDKClient)                     │
│  - Tool invocation (Read, Write, Bash, Task, etc.)                  │
│  - Extended thinking (configurable budget)                          │
│  - MCP server integration                                           │
│  - Security hooks (bash command validation)                         │
│  - OAuth token management                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Task Execution

```
User creates task in Kanban Board
    │
    │ IPC: task:create
    ▼
Electron Main Process
    ├─ Persist task metadata
    ├─ Create spec directory (.auto-claude/specs/XXX-name/)
    └─ Queue agent execution
    │
    │ Agent Queue (agent-queue.ts)
    ▼
Agent Process Manager (agent-process.ts)
    ├─ Spawn Python subprocess
    ├─ Set up NDJSON output parsing
    ├─ Phase event streaming to renderer
    └─ Rate limit detection
    │
    │ Python subprocess
    ▼
Spec Pipeline (spec/pipeline/orchestrator.py)
    ├─ AI complexity assessment
    ├─ Discovery phase (project analysis)
    ├─ Requirements gathering
    ├─ Spec writing
    ├─ Spec critique loop
    └─ Output: spec.md + requirements.json + context.json
    │
    ▼
Planner Agent (agents/planner.py OR agents/coder.py first-run)
    ├─ Read spec.md
    ├─ Deep codebase investigation
    ├─ Create implementation_plan.json
    ├─ Validate plan structure
    └─ Output: implementation_plan.json with phases + subtasks
    │
    ▼
Coder Agent Loop (agents/coder.py)
    ├─ Load next pending subtask
    ├─ Load context (memory, patterns, codebase map)
    ├─ Create/locate git worktree
    ├─ Run agent session (create_client → run_agent_session)
    ├─ Post-session processing (memory save, progress update)
    ├─ Mark subtask complete
    ├─ Sync spec to source if in worktree
    └─ Loop until all subtasks complete
    │
    ▼
QA Validation Loop (qa/loop.py)
    ├─ Verify build complete
    ├─ QA Reviewer validates against spec
    │   ├─ Check all subtasks complete
    │   ├─ Start dev environment
    │   ├─ Run automated tests
    │   ├─ Manual code review
    │   └─ Generate QA report
    ├─ If rejected → QA Fixer applies fixes
    ├─ Re-review
    └─ Loop until approved (max 50 iterations)
    │
    ▼
User Review
    ├─ View diff in task detail modal
    ├─ Create PR (GitHub/GitLab)
    └─ Merge to main (with AI-powered conflict resolution)
```

---

## Design Patterns

### 1. Client Factory Pattern

```python
# Single entry point for all agent sessions
def create_client(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    agent_type: str = "coder",  # planner | coder | qa_reviewer | qa_fixer
    max_thinking_tokens: int = None,
) -> ClaudeSDKClient:
    """Creates configured Claude SDK client with security hooks."""
    # Resolve model and thinking from user settings
    # Load project index (cached 5-min TTL)
    # Get agent-specific tool permissions from AGENT_CONFIGS
    # Setup MCP servers
    # Attach bash_security_hook
    # Return configured client
```

### 2. Phase-Aware Model Resolution

```python
# Configuration layering: feature → phase → global → default
def get_phase_model(spec_dir, phase, cli_model=None):
    """Resolve model for specific execution phase."""
    if cli_model:
        return cli_model
    task_meta = load_task_metadata(spec_dir)
    if task_meta and phase in task_meta.phase_models:
        return task_meta.phase_models[phase]
    return get_global_setting(f"phase_models.{phase}", DEFAULT_MODELS[phase])
```

### 3. Recovery Manager Pattern

```python
class RecoveryManager:
    """Handles agent session recovery and memory persistence."""
    def __init__(self, spec_dir, project_dir):
        self.spec_dir = spec_dir
        self.project_dir = project_dir

    async def save_checkpoint(self, session_num, subtask_id, context):
        """Save checkpoint for session recovery."""

    async def recover_session(self) -> Optional[Checkpoint]:
        """Attempt to recover from last checkpoint."""
```

### 4. NDJSON Phase Event Protocol

```python
# Backend emits structured events via stdout
def emit_phase(phase: ExecutionPhase, message: str):
    """Emit phase event as NDJSON for frontend parsing."""
    event = {"type": "phase", "phase": phase.value, "message": message}
    print(json.dumps(event), flush=True)

# Frontend parses in agent-process.ts
// NDJSON parser in electron main process
parser.on('data', (event) => {
    if (event.type === 'phase') {
        agentState.setPhase(event.phase);
        mainWindow.webContents.send('agent:phase', event);
    }
});
```

### 5. Project Capabilities Detection

```python
def detect_project_capabilities(project_index: dict) -> dict[str, bool]:
    """Detect what a project can do based on its structure."""
    return {
        "has_docker": bool(project_index.get("docker_compose")),
        "has_tests": bool(project_index.get("test_framework")),
        "has_ci": bool(project_index.get("ci_config")),
        "has_database": bool(project_index.get("database")),
        "has_frontend": bool(project_index.get("frontend_framework")),
        "is_monorepo": bool(project_index.get("workspaces")),
    }
```

---

## Key Architectural Decisions

### Python Backend (vs TypeScript)

Auto-Claude chose Python for the agent backend because:
1. Claude Agent SDK Python package is mature
2. Rich ecosystem for AI/ML tools
3. Graphiti/LadybugDB are Python libraries
4. Simpler async patterns for agent loops
5. Cross-platform Python bundling via standalone runtime

Trade-offs:
- Requires bundling Python runtime in Electron app
- IPC bridge between Electron (Node.js) and Python subprocess
- Two language ecosystems to maintain

### Electron (vs Tauri)

Auto-Claude uses Electron for the desktop app:
1. Mature ecosystem with electron-builder for all platforms
2. node-pty for native terminal integration
3. Large community and plugin ecosystem
4. Flatpak, AppImage, DMG, NSIS packaging

Trade-offs:
- Larger binary size (~200MB+ with bundled Python)
- Higher memory usage vs Tauri
- Node.js 24+ requirement

### Zustand (24+ stores vs monolithic state)

State is highly granular with domain-specific stores:
- `project-store.ts` - Active project
- `task-store.ts` - Tasks/specs
- `terminal-store.ts` - Terminal sessions
- `settings-store.ts` - User preferences
- `github/*.ts` - GitHub-specific state
- etc.

This enables fine-grained subscriptions and avoids unnecessary re-renders.

---

*Reference: Auto-Claude v2.7.5 architecture patterns for autonomous AI development systems.*
