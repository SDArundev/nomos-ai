# Workflow Patterns

> Autonomous pipeline, QA loop, and spec creation patterns for multi-agent development.

---

## Core Workflow: Task Lifecycle

```
BACKLOG → SPEC_CREATION → PLANNING → BUILDING → QA_REVIEW → APPROVED → MERGED
    │          │              │          │          │           │          │
    │          │              │          │          │           │          └── Feature shipped
    │          │              │          │          │           └── QA passed, user reviews
    │          │              │          │          └── QA loop (review → fix → re-review)
    │          │              │          └── Coder agent implementing subtasks
    │          │              └── Planner creates implementation plan
    │          └── AI creates spec (discovery → requirements → spec → critique)
    └── Not started, in queue
```

---

## Spec Creation Pipeline

### Multi-Phase Spec Orchestrator

```python
class SpecOrchestrator:
    """Orchestrates spec creation with dynamic complexity adaptation."""

    async def run(self):
        # Phase 1: Complexity assessment (AI or heuristics)
        self.assessment = await self._assess_complexity()

        # Phase 2: Discovery (project analysis)
        discovery_output = await self._run_phase("discovery")

        # Phase 3: Requirements gathering
        requirements_output = await self._run_phase("requirements")

        # Phase 4: Spec writing
        spec_output = await self._run_phase("spec_writing")

        # Phase 5: Spec critique (optional loop)
        critique_output = await self._run_phase("spec_critique")

        # Phase 6: Implementation plan generation
        plan_output = await self._run_phase("planning")

        # Validate outputs
        self.validator.validate_spec()
        self.validator.validate_implementation_plan()
```

### Complexity Assessment

```python
class ComplexityAssessment:
    level: str        # "simple" | "moderate" | "complex" | "epic"
    confidence: float # 0.0 - 1.0
    factors: list     # What drove the assessment
    recommended_phases: list  # Which pipeline phases to run

# Complexity determines which phases execute:
# simple   → skip discovery, lite spec, no critique
# moderate → full discovery, standard spec, optional critique
# complex  → full discovery, detailed spec, mandatory critique
# epic     → full pipeline with extended thinking budgets
```

### Conversation Compaction

```python
# Between phases, previous outputs are summarized to save context
def summarize_phase_output(phase_name: str, output: str) -> str:
    """Create compact summary of phase output for subsequent phases."""
    # Preserves key decisions, requirements, constraints
    # Drops verbose analysis, exploration logs
    # Keeps structured data (JSON, lists)
    return summary

# Phase summaries are accumulated and injected as context
phase_summaries = {}
for phase in phases:
    result = await run_phase(phase, context=phase_summaries)
    phase_summaries[phase.name] = summarize_phase_output(phase.name, result)
```

---

## Autonomous Coder Loop

### Main Build Loop

```python
async def run_autonomous_agent(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    max_iterations: int = None,
) -> None:
    """Run the autonomous agent loop."""

    # Setup
    recovery_manager = RecoveryManager(spec_dir, project_dir)
    status_manager = StatusManager(project_dir)

    # Check if fresh start or continuation
    first_run = is_first_run(spec_dir)

    if first_run:
        # Phase 1: Planning
        status_manager.update(state=BuildState.PLANNING)
        # Planner agent creates implementation_plan.json
        await run_planning_session(project_dir, spec_dir, model)
        # Validate plan structure
        valid, errors = validate_implementation_plan()

    # Phase 2: Coding loop
    status_manager.update(state=BuildState.BUILDING)
    iteration = 0

    while not is_build_complete(spec_dir):
        if max_iterations and iteration >= max_iterations:
            break

        # Get next subtask
        subtask = get_next_subtask(spec_dir)
        if not subtask:
            break

        # Load context for this subtask
        context = await load_subtask_context(spec_dir, subtask)

        # Generate prompt
        prompt = generate_subtask_prompt(subtask, context)

        # Create client with phase-specific config
        coding_model = get_phase_model(spec_dir, "coding", model)
        thinking_budget = get_phase_thinking_budget(spec_dir, "coding")
        client = create_client(
            project_dir, spec_dir, coding_model,
            agent_type="coder",
            max_thinking_tokens=thinking_budget,
        )

        # Run agent session
        async with client:
            status, response = await run_agent_session(client, prompt, spec_dir)

        # Post-session: save memory, update progress
        await post_session_processing(spec_dir, subtask, status, response)

        # Auto-continue delay
        await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)

        iteration += 1

    # All subtasks complete
    status_manager.update(state=BuildState.COMPLETE)
```

### Subtask Progress Tracking

```python
# implementation_plan.json structure
{
    "status": "in_progress",  # pending | in_progress | completed
    "phases": [
        {
            "name": "Phase 1: Backend API",
            "subtasks": [
                {
                    "id": "1.1",
                    "title": "Create user model",
                    "status": "completed",  # pending | in_progress | completed | skipped
                    "service": "backend",
                    "dependencies": [],
                    "verification": "User model exists with required fields"
                },
                {
                    "id": "1.2",
                    "title": "Create auth endpoints",
                    "status": "pending",
                    "service": "backend",
                    "dependencies": ["1.1"],
                    "verification": "Login/register endpoints return correct responses"
                }
            ]
        }
    ]
}
```

---

## QA Validation Loop

### Self-Validating Quality Assurance

```python
MAX_QA_ITERATIONS = 50
MAX_CONSECUTIVE_ERRORS = 3

async def run_qa_validation_loop(
    project_dir: Path,
    spec_dir: Path,
    model: str,
) -> bool:
    """
    Self-validating QA loop:
    1. QA Agent reviews implementation
    2. If rejected → Fixer Agent fixes issues
    3. QA Agent re-reviews
    4. Loop until approved or max iterations
    """

    # Check build is complete
    if not is_build_complete(spec_dir):
        return False

    # Check if already approved
    if is_qa_approved(spec_dir):
        return True

    # Process human feedback if present
    if (spec_dir / "QA_FIX_REQUEST.md").exists():
        await process_human_feedback(project_dir, spec_dir, model)

    # Main QA loop
    iteration = get_qa_iteration_count(spec_dir)
    consecutive_errors = 0

    while iteration < MAX_QA_ITERATIONS:
        # Step 1: QA Review
        qa_model = get_phase_model(spec_dir, "qa", model)
        reviewer_client = create_client(
            project_dir, spec_dir, qa_model,
            agent_type="qa_reviewer",
        )

        async with reviewer_client:
            review_status, review_response = await run_qa_agent_session(
                reviewer_client, spec_dir, iteration
            )

        # Record iteration
        record_iteration(spec_dir, iteration, review_status, review_response)

        # Check approval
        if is_qa_approved(spec_dir):
            return True

        # Check for recurring issues (3+ occurrences → human escalation)
        if has_recurring_issues(spec_dir):
            escalate_to_human(spec_dir)
            return False

        # Step 2: QA Fix
        fixer_client = create_client(
            project_dir, spec_dir, qa_model,
            agent_type="qa_fixer",
        )

        async with fixer_client:
            fix_status, fix_response = await run_qa_fixer_session(
                fixer_client, spec_dir, iteration
            )

        if fix_status == "error":
            consecutive_errors += 1
            if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
                return False
        else:
            consecutive_errors = 0

        iteration += 1

    return False  # Max iterations reached
```

### QA Report Structure

```
.auto-claude/specs/001-feature/
├── qa_report.md              # Latest QA review output
├── qa_iterations/            # History of all iterations
│   ├── iteration_001.json
│   ├── iteration_002.json
│   └── ...
├── QA_FIX_REQUEST.md         # Human feedback (processed then deleted)
└── qa_signoff.json           # Approval status tracking
```

### Human Feedback Integration

```python
# Users can inject feedback via QA_FIX_REQUEST.md
# The QA loop detects this file and processes it before continuing

fix_request_file = spec_dir / "QA_FIX_REQUEST.md"
if fix_request_file.exists():
    # Run fixer with human feedback as context
    await run_qa_fixer_session(fixer_client, spec_dir, iteration=0)
    # Remove processed file
    fix_request_file.unlink()
```

---

## Recovery System

### Checkpoint-Based Recovery

```python
class RecoveryManager:
    """Manages session recovery and memory persistence."""

    def __init__(self, spec_dir, project_dir):
        self.spec_dir = spec_dir
        self.project_dir = project_dir

    async def save_session_insights(self, session_num, insights):
        """Save session insights for future context."""
        save_session_insights(self.spec_dir, session_num, insights)

    def get_recovery_context(self) -> str:
        """Build recovery context from previous sessions."""
        insights = load_all_insights(self.spec_dir)
        patterns = load_patterns(self.spec_dir)
        gotchas = load_gotchas(self.spec_dir)
        return format_recovery_context(insights, patterns, gotchas)
```

### Failure Classification

```python
# QA loop tracks error patterns
def classify_qa_failure(error: str) -> str:
    """Classify QA failure for appropriate response."""
    if "test" in error.lower():
        return "test_failure"      # Re-run fixer with test focus
    if "import" in error.lower():
        return "dependency_error"  # Fix imports/dependencies
    if "timeout" in error.lower():
        return "infrastructure"    # Retry or escalate
    if "conflict" in error.lower():
        return "merge_conflict"    # Use merge system
    return "unknown"               # Generic fix attempt
```

---

## Event System

### Phase Event Protocol (NDJSON)

```python
# Backend emits events via stdout for frontend consumption
from phase_event import ExecutionPhase, emit_phase

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

# Emitting events
emit_phase(ExecutionPhase.BUILDING, "Implementing subtask 1.3")
# Output: {"type":"phase","phase":"building","message":"Implementing subtask 1.3"}
```

### Frontend Event Timeline

```
spec_discovery
    ▼
spec_requirements
    ▼
spec_writing
    ▼
spec_critique (loop if needed)
    ▼
planning
    ▼
building (loop per subtask)
    ├── subtask_start
    ├── agent_session
    └── subtask_complete
    ▼
qa_review
    ├── review_start
    ├── review_verdict (approved/rejected)
    └── qa_fixing (if rejected)
    ▼
complete
```

---

## Git Worktree Integration

```python
# core/worktree.py
async def prepare_worktree(project_dir: Path, spec_name: str) -> Path:
    """Create or locate isolated git worktree for task."""
    branch_name = f"auto-claude/{spec_name}"
    worktree_path = project_dir / ".auto-claude" / "worktrees" / spec_name

    if worktree_path.exists():
        if await verify_worktree(worktree_path):
            return worktree_path
        await cleanup_worktree(project_dir, branch_name)

    # Create new worktree
    await git_command(project_dir, ["worktree", "add", str(worktree_path), "-b", branch_name])

    return worktree_path

# Coder agent works in worktree, then syncs spec back
async def sync_spec_to_source(worktree_spec_dir, source_spec_dir):
    """Sync spec files from worktree back to main project."""
    # Implementation plan, QA reports, progress files
    for file in ["implementation_plan.json", "build-progress.txt", "qa_report.md"]:
        src = worktree_spec_dir / file
        dst = source_spec_dir / file
        if src.exists():
            shutil.copy2(src, dst)
```

---

## Best Practices

### 1. Subtask Atomicity
- Each subtask is a single unit of work
- Scoped to one service in monorepos
- Has clear verification criteria
- Dependencies explicitly declared

### 2. Context Window Management
- Conversation compaction between phases
- Phase summaries (not full outputs) passed forward
- Memory system for cross-session context
- Project index caching (5-min TTL)

### 3. Worktree Isolation
- Every task gets its own git worktree
- Changes never affect main branch during development
- Spec files synced back to source for UI display
- Worktree cleanup after merge

### 4. Progressive Escalation
- Automated QA loop first (up to 50 iterations)
- Recurring issue detection (3+ same issue → human)
- Human feedback integration (QA_FIX_REQUEST.md)
- Manual test plan for no-test projects

### 5. Recovery by Design
- Session insights persisted after each subtask
- Implementation plan tracks per-subtask status
- Recovery manager can resume from any point
- Build progress file for quick status checks

---

*Reference: Workflow patterns from Auto-Claude v2.7.5*
