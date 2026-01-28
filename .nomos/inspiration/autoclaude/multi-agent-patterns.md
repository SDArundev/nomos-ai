# Multi-Agent Patterns

> Coordination patterns for specialized agents in autonomous development pipelines.

---

## Agent Roles

Auto-Claude uses a **specialized multi-agent pipeline** where each agent has a distinct role:

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐
│  PLANNER    │→ │    CODER     │→ │ QA REVIEWER  │→ │  QA FIXER  │
│             │  │              │  │              │  │            │
│ Create plan │  │ Implement    │  │ Validate     │  │ Fix issues │
│ from spec   │  │ subtasks     │  │ against spec │  │ from QA    │
│             │  │              │  │              │  │            │
│ Tools:      │  │ Tools:       │  │ Tools:       │  │ Tools:     │
│ Read, Write │  │ Read, Write  │  │ Read, Bash   │  │ Read, Write│
│ Bash, Glob  │  │ Bash, Edit   │  │ Glob, Grep   │  │ Bash, Edit │
│ Grep, Task  │  │ Glob, Grep   │  │ (NO Write!)  │  │ Glob, Grep │
│             │  │ Task         │  │              │  │            │
│ MCP:        │  │ MCP:         │  │ MCP:         │  │ MCP: none  │
│ context7    │  │ context7     │  │ puppeteer    │  │            │
│             │  │ auto-tools   │  │              │  │            │
└─────────────┘  └──────────────┘  └──────────────┘  └────────────┘
```

### Key Design: Separation of Concerns

- **QA Reviewer has NO write/edit tools** - it can only read code and run tests. This prevents the reviewer from "fixing" issues itself, ensuring clean separation between validation and implementation.
- **Each agent type has a distinct tool set** optimized for its role.
- **MCP servers are agent-type-specific** - e.g., only QA gets browser testing (Puppeteer).

---

## Pipeline Orchestration

### Sequential Pipeline with QA Loop

```
                                    ┌──────────────────┐
                                    │                  │
                                    ▼                  │
Spec Pipeline → Planner → Coder Loop → QA Reviewer ──┤
                                         │            │
                                         ▼ (rejected) │
                                    QA Fixer ─────────┘
                                         │
                                         ▼ (approved)
                                    User Review → Merge
```

### Spec Pipeline (Multi-Phase)

```python
# spec/pipeline/orchestrator.py
class SpecOrchestrator:
    """
    Multi-phase spec creation:
    1. Complexity assessment (AI-based or heuristic)
    2. Discovery (project analysis)
    3. Requirements (acceptance criteria)
    4. Spec writing (formal specification)
    5. Spec critique (quality review loop)
    6. Implementation plan (subtask breakdown)
    """

    async def run(self):
        assessment = await self._assess_complexity()

        # Phase execution adapts to complexity
        if assessment.level == "simple":
            phases = ["requirements", "spec_writing"]
        elif assessment.level == "moderate":
            phases = ["discovery", "requirements", "spec_writing"]
        else:  # complex or epic
            phases = ["discovery", "requirements", "spec_writing", "spec_critique"]

        for phase in phases:
            result = await self._run_agent(phase)
            self._phase_summaries[phase] = summarize_phase_output(phase, result)
```

---

## Parallel Agent Execution

### Terminal-Based Parallelism

Auto-Claude supports up to 12 parallel agent terminals. Each terminal runs an independent agent process:

```typescript
// frontend: src/main/agent/agent-queue.ts
class AgentQueue {
    private maxConcurrent = 12;
    private running = new Map<string, AgentProcess>();
    private pending: QueueItem[] = [];

    async enqueue(task: Task): Promise<void> {
        if (this.running.size < this.maxConcurrent) {
            await this.startAgent(task);
        } else {
            this.pending.push(task);
        }
    }

    private async startAgent(task: Task): Promise<void> {
        const process = new AgentProcess(task);
        this.running.set(task.id, process);

        process.on('complete', () => {
            this.running.delete(task.id);
            this.drainQueue();
        });

        await process.start();
    }
}
```

### Worktree-Per-Task Isolation

```
Project/
├── .auto-claude/
│   └── worktrees/
│       ├── 001-user-auth/     # Task 1 worktree (isolated branch)
│       ├── 002-api-routes/    # Task 2 worktree (isolated branch)
│       └── 003-dashboard/     # Task 3 worktree (isolated branch)
```

Each parallel agent works in its own worktree, preventing file conflicts during development.

---

## Intent-Aware Semantic Merge

### The Problem

When multiple agents work in parallel on different tasks, their changes may conflict when merged back to main. Standard git merge fails on semantic conflicts.

### The Solution: Multi-Layer Merge Pipeline

```python
# merge/orchestrator.py
class MergeOrchestrator:
    """
    Intent-aware merge pipeline:
    1. Track file evolution across tasks (baselines + changes)
    2. Analyze semantic intent of each change
    3. Detect conflicts between tasks
    4. Apply deterministic merges where possible (AutoMerger)
    5. Use AI for ambiguous conflicts (AIResolver)
    """

    def __init__(self, project_dir, enable_ai=True):
        self.analyzer = SemanticAnalyzer()
        self.conflict_detector = ConflictDetector()
        self.auto_merger = AutoMerger()
        self.ai_resolver = create_claude_resolver() if enable_ai else None
        self.pipeline = MergePipeline()

    async def merge_tasks(self, tasks: list[TaskMergeRequest]) -> MergeReport:
        """Merge changes from multiple parallel tasks."""
        # 1. Load file evolution data
        evolution = self.evolution_tracker.get_changes(tasks)

        # 2. Analyze semantic intent
        analyses = {}
        for task in tasks:
            analyses[task.id] = self.analyzer.analyze(task.changes)

        # 3. Detect conflicts
        conflicts = self.conflict_detector.detect(analyses)

        # 4. Apply deterministic merges
        merged = self.auto_merger.merge(evolution, conflicts)

        # 5. AI-resolve remaining conflicts
        if self.ai_resolver and merged.unresolved:
            for conflict in merged.unresolved:
                resolution = await self.ai_resolver.resolve(conflict)
                merged.apply(resolution)

        return merged.to_report()
```

### AutoMerger Strategies

```python
# merge/auto_merger/strategies/
class AppendStrategy:
    """Merge appended content (imports, exports, list items)."""

class ImportStrategy:
    """Merge import statements intelligently."""

class PropsStrategy:
    """Merge React component props from multiple tasks."""

class HooksStrategy:
    """Merge React hook additions from multiple tasks."""

class OrderingStrategy:
    """Handle ordering conflicts in lists and arrays."""
```

### AI Conflict Resolution

```python
# merge/ai_resolver/resolver.py
class AIResolver:
    """Uses Claude to resolve ambiguous merge conflicts."""

    async def resolve(self, conflict: ConflictRegion) -> MergeDecision:
        """
        Provide Claude with:
        1. File baseline (before any task changes)
        2. Task A changes with intent
        3. Task B changes with intent
        4. Ask for merged result preserving both intents
        """
        prompt = format_conflict_prompt(conflict)
        client = create_claude_resolver()
        response = await client.send_message(prompt)
        return parse_merge_decision(response)
```

---

## Memory System Integration

### Per-Session Memory

```python
# memory/sessions.py
def save_session_insights(spec_dir: Path, session_num: int, insights: dict):
    """
    Save after each coder session:
    {
        "subtasks_completed": ["1.1", "1.2"],
        "discoveries": {
            "src/api/auth.py": "Handles JWT authentication"
        },
        "what_worked": ["Using existing middleware pattern"],
        "what_failed": ["Direct DB access from controller"],
        "recommendations_for_next_session": ["Follow service layer pattern"]
    }
    """
```

### Codebase Map

```python
# memory/codebase_map.py
def update_codebase_map(spec_dir: Path, discoveries: dict):
    """
    Persistent map of discovered codebase knowledge:
    {
        "src/api/auth.py": "JWT authentication and token validation",
        "src/models/user.py": "User model with bcrypt password hashing",
        "src/middleware/rate-limit.py": "Token bucket rate limiter"
    }
    """
```

### Graphiti Knowledge Graph

```python
# integrations/graphiti/memory.py
# Optional graph-based semantic memory
# Stores relationships between code entities, patterns, and decisions
# Requires Python 3.12+ and LadybugDB (embedded graph database)
# No Docker required - fully embedded
```

---

## Coder Agent: Subagent Spawning

The coder agent can spawn sub-agents via the `Task` tool for parallel work:

```markdown
## From coder.md prompt:
You can use subagents (via Task tool) for parallel execution if needed.
This is decided by the agent itself based on the task complexity.
```

The agent itself decides whether to parallelize. For complex subtasks, the coder may spawn:
- A research sub-agent to explore the codebase
- A test-writing sub-agent
- An implementation sub-agent

---

## Multi-Account Profile Swapping

```typescript
// src/main/claude-profile/rate-limit-manager.ts
class RateLimitManager {
    /**
     * When the active profile hits a rate limit:
     * 1. Detect rate limit from agent output
     * 2. Score all registered profiles by availability
     * 3. Switch to best available profile
     * 4. Resume agent session with new credentials
     */

    async onRateLimitDetected(activeProfile: string): Promise<string> {
        const profiles = await this.loadAllProfiles();
        const scores = profiles.map(p => ({
            profile: p,
            score: this.scorer.score(p),  // Based on usage, limits, freshness
        }));

        const best = scores
            .filter(s => s.profile.id !== activeProfile)
            .sort((a, b) => b.score - a.score)[0];

        if (best) {
            await this.switchProfile(best.profile);
            return best.profile.id;
        }

        throw new Error("No available profiles");
    }
}
```

---

## Key Differences from Automaker Multi-Agent

| Aspect | Auto-Claude | Automaker |
|--------|-------------|-----------|
| Agent Types | 4 specialized (planner, coder, qa_reviewer, qa_fixer) | 1 generic agent |
| Tool Separation | QA reviewer has NO write tools | All agents have same tools |
| QA Loop | Dedicated review → fix → re-review cycle (50 max) | Pipeline step with continue-on-error |
| Merge | Intent-aware semantic merge with AI resolver | Standard git merge |
| Parallelism | Up to 12 concurrent terminals | Configurable max concurrency |
| Memory | File + Graphiti knowledge graph | No cross-session memory |
| Profile Swapping | Automatic rate-limit-based switching | Single API key |
| Spec Creation | Multi-phase pipeline with critique | Single planning prompt |

---

*Reference: Multi-agent coordination patterns from Auto-Claude v2.7.5*
