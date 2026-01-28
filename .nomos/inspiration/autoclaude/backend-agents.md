# Backend Agent System

> Python agent architecture: Planner, Coder, QA Reviewer, QA Fixer.

---

## Agent Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  AGENT SYSTEM (apps/backend/agents/)                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  base.py          Constants, shared config            │
│  session.py       run_agent_session() + post-process  │
│  coder.py         run_autonomous_agent() main loop    │
│  planner.py       run_followup_planner()              │
│  memory_manager.py Graphiti integration               │
│  utils.py         Plan loading, commit tracking       │
│                                                      │
│  tools_pkg/                                          │
│  ├── registry.py    Tool registration system          │
│  ├── permissions.py Tool permission management        │
│  ├── models.py      AGENT_CONFIGS (source of truth)  │
│  └── tools/         Custom tools                      │
│      ├── memory.py   Memory read/write tools          │
│      ├── progress.py Progress tracking tools          │
│      ├── qa.py       QA-specific tools                │
│      └── subtask.py  Subtask management tools         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Agent Lifecycle

### 1. Client Creation

```python
# Every agent session starts with create_client()
from core.client import create_client

client = create_client(
    project_dir=project_dir,
    spec_dir=spec_dir,
    model=get_phase_model(spec_dir, "coding"),
    agent_type="coder",  # planner | coder | qa_reviewer | qa_fixer
    max_thinking_tokens=get_phase_thinking_budget(spec_dir, "coding"),
)
```

### 2. Session Execution

```python
# agents/session.py
async def run_agent_session(
    client: ClaudeSDKClient,
    prompt: str,
    spec_dir: Path,
    verbose: bool = False,
    phase: LogPhase = LogPhase.CODING,
) -> tuple[str, str]:
    """Run agent and return (status, response)."""
    task_logger = get_task_logger(spec_dir)

    try:
        response = await client.send_message(prompt)
        if task_logger:
            task_logger.log_session_response(response, phase)
        return "success", response.text
    except Exception as e:
        if task_logger:
            task_logger.log_error(str(e), phase)
        return "error", str(e)
```

### 3. Post-Session Processing

```python
# agents/session.py
async def post_session_processing(
    spec_dir: Path,
    subtask: dict,
    status: str,
    response: str,
):
    """Process after each agent session."""
    # 1. Update subtask status in implementation_plan.json
    # 2. Save session insights to memory
    # 3. Update codebase map with discoveries
    # 4. Sync spec files to source (if in worktree)
    # 5. Emit phase events for frontend
```

---

## Coder Agent (agents/coder.py)

The main autonomous agent loop:

```python
async def run_autonomous_agent(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    max_iterations: int | None = None,
    verbose: bool = False,
    source_spec_dir: Path | None = None,
) -> None:
    """
    Main autonomous coding loop.

    Flow:
    1. If first run → invoke planner to create implementation_plan.json
    2. Load next pending subtask
    3. Build context (memory, patterns, codebase map)
    4. Create Claude SDK client with security hooks
    5. Run agent session
    6. Post-session: save memory, update progress
    7. Loop until all subtasks complete
    """
```

### Key Features:
- **Auto-continue**: 3-second delay between subtasks
- **Pause file**: Create `PAUSE` file to stop the loop
- **Recovery manager**: Checkpoints after each session
- **Status manager**: Updates ccstatusline in real-time
- **Linear integration**: Updates task status if enabled
- **Planning validation**: Validates plan structure after creation
- **Max validation retries**: 3 attempts to fix invalid plans

---

## Planner Agent (agents/planner.py)

Follow-up planner for extending completed specs:

```python
async def run_followup_planner(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    verbose: bool = False,
) -> bool:
    """
    Add follow-up work to a completed spec.

    1. Read FOLLOWUP_REQUEST.md
    2. Read existing implementation_plan.json
    3. Add new phases with pending subtasks
    4. Reset plan status to in_progress
    """
```

---

## QA Reviewer (qa/reviewer.py)

Validates implementation without write access:

```python
async def run_qa_agent_session(
    client: ClaudeSDKClient,
    spec_dir: Path,
    iteration: int,
    verbose: bool = False,
) -> tuple[str, str]:
    """
    QA review session.

    The agent:
    1. Reads spec.md (source of truth)
    2. Reads implementation_plan.json
    3. Checks git diff for changes
    4. Starts dev environment
    5. Runs automated tests
    6. Performs manual code review
    7. Generates QA report
    8. Writes verdict (approved/rejected)
    """
```

### Tool Restrictions:
- **Has**: Read, Bash, Glob, Grep
- **Does NOT have**: Write, Edit
- **MCP**: Puppeteer (browser testing)

---

## QA Fixer (qa/fixer.py)

Applies fixes based on QA reviewer findings:

```python
async def run_qa_fixer_session(
    client: ClaudeSDKClient,
    spec_dir: Path,
    iteration: int,
    from_human_feedback: bool = False,
) -> tuple[str, str]:
    """
    QA fix session.

    Reads the latest QA report and applies fixes.
    Can also process human feedback from QA_FIX_REQUEST.md.
    """
```

---

## Agent Configuration (AGENT_CONFIGS)

```python
# agents/tools_pkg/models.py
# Single source of truth for all agent configurations

AGENT_CONFIGS = {
    "planner": {
        "allowed_tools": ["Read", "Write", "Bash", "Glob", "Grep", "Task"],
        "mcp_servers": ["context7"],
        "description": "Creates implementation plans from specs",
    },
    "coder": {
        "allowed_tools": ["Read", "Write", "Bash", "Glob", "Grep", "Edit", "Task"],
        "mcp_servers": ["context7", "auto_claude_tools"],
        "description": "Implements subtasks autonomously",
    },
    "qa_reviewer": {
        "allowed_tools": ["Read", "Bash", "Glob", "Grep"],
        "mcp_servers": ["puppeteer"],
        "description": "Validates implementation against spec",
    },
    "qa_fixer": {
        "allowed_tools": ["Read", "Write", "Bash", "Glob", "Grep", "Edit"],
        "mcp_servers": [],
        "description": "Fixes issues found by QA reviewer",
    },
}
```

---

## Custom Agent Tools

```python
# agents/tools_pkg/tools/

# memory.py - Memory management tools
class MemoryTool:
    """Read/write session memory, codebase map, patterns."""
    async def save_insight(self, key: str, value: str)
    async def load_insights(self) -> dict
    async def update_codebase_map(self, discoveries: dict)

# progress.py - Build progress tools
class ProgressTool:
    """Track subtask completion and build progress."""
    async def mark_subtask_complete(self, subtask_id: str)
    async def get_next_subtask(self) -> dict
    async def get_progress_summary(self) -> str

# qa.py - QA-specific tools
class QATool:
    """QA validation and reporting."""
    async def write_qa_report(self, findings: list, verdict: str)
    async def check_qa_criteria(self) -> dict

# subtask.py - Subtask management
class SubtaskTool:
    """Manage implementation plan subtasks."""
    async def get_subtask(self, id: str) -> dict
    async def update_subtask_status(self, id: str, status: str)
```

---

## Memory Manager Integration

```python
# agents/memory_manager.py

def debug_memory_system_status():
    """Log memory system status at agent startup."""
    graphiti_enabled = is_graphiti_memory_enabled()
    logger.info(f"Graphiti memory: {'ENABLED' if graphiti_enabled else 'DISABLED'}")

async def get_graphiti_context(spec_dir: Path, subtask: dict) -> str:
    """Load relevant context from Graphiti knowledge graph."""
    if not is_graphiti_memory_enabled():
        return ""

    # Query graph for relevant knowledge
    query = f"{subtask['title']} {subtask.get('description', '')}"
    results = await graphiti_search(query)
    return format_graphiti_results(results)
```

---

## Task Logger

```python
# task_logger/logger.py
class TaskLogger:
    """Persistent logging for autonomous tasks."""

    def start_phase(self, phase: LogPhase, message: str)
    def end_phase(self, phase: LogPhase, success: bool, message: str)
    def set_session(self, session_num: int)
    def log_session_response(self, response, phase: LogPhase)
    def log_error(self, error: str, phase: LogPhase)

class LogPhase(Enum):
    PLANNING = "planning"
    CODING = "coding"
    VALIDATION = "validation"

# Logs are stored in spec directory for persistence
# Frontend reads logs for task detail modal
```

---

## Phase Event Emission

```python
# phase_event.py
from enum import Enum
import json

class ExecutionPhase(Enum):
    SPEC_DISCOVERY = "spec_discovery"
    SPEC_REQUIREMENTS = "spec_requirements"
    SPEC_WRITING = "spec_writing"
    SPEC_CRITIQUE = "spec_critique"
    PLANNING = "planning"
    BUILDING = "building"
    QA_REVIEW = "qa_review"
    QA_FIXING = "qa_fixing"
    COMPLETE = "complete"

def emit_phase(phase: ExecutionPhase, message: str):
    """Emit NDJSON event for frontend consumption."""
    event = {
        "type": "phase",
        "phase": phase.value,
        "message": message,
        "timestamp": time.time(),
    }
    print(json.dumps(event), flush=True)
```

---

## Implementation Plan Structure

```json
{
    "status": "in_progress",
    "created_at": "2025-01-15T10:00:00Z",
    "phases": [
        {
            "name": "Phase 1: Database Schema",
            "description": "Set up database models and migrations",
            "subtasks": [
                {
                    "id": "1.1",
                    "title": "Create User model",
                    "description": "Add User table with email, name, password fields",
                    "status": "completed",
                    "service": "backend",
                    "dependencies": [],
                    "verification": "User model exists with required fields",
                    "files_to_modify": ["src/models/user.py"],
                    "files_to_reference": ["src/models/base.py"]
                },
                {
                    "id": "1.2",
                    "title": "Create migration",
                    "status": "pending",
                    "dependencies": ["1.1"],
                    "verification": "Migration creates users table"
                }
            ]
        }
    ]
}
```

---

*Reference: Backend agent system from Auto-Claude v2.7.5*
