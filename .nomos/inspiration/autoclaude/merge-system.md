# Merge System

> Intent-aware semantic merge for parallel agent work.

---

## Overview

When multiple agents work in parallel on different tasks, their changes may conflict when merged back to main. Auto-Claude's merge system goes beyond standard git merge with semantic understanding.

---

## Architecture

```
merge/
├── orchestrator.py          # Main coordinator
├── semantic_analyzer.py     # Intent-based change analysis
├── conflict_detector.py     # Cross-task conflict detection
├── conflict_resolver.py     # Conflict resolution orchestration
├── conflict_analysis.py     # Detailed conflict analysis
├── conflict_explanation.py  # Human-readable conflict explanations
├── merge_pipeline.py        # Full merge pipeline
├── models.py                # MergeReport, MergeStats, TaskMergeRequest
├── types.py                 # ConflictRegion, FileAnalysis, MergeDecision
├── git_utils.py             # Git operations for merge
│
├── auto_merger/             # Deterministic merge strategies
│   ├── merger.py            # Main auto-merger
│   ├── context.py           # Merge context
│   ├── helpers.py           # Merge utilities
│   └── strategies/
│       ├── base_strategy.py
│       ├── append_strategy.py    # Append-only changes
│       ├── import_strategy.py    # Import statement merging
│       ├── props_strategy.py     # React props merging
│       ├── hooks_strategy.py     # React hooks merging
│       └── ordering_strategy.py  # Order-dependent merging
│
├── ai_resolver/             # AI-powered conflict resolution
│   ├── resolver.py          # Main AI resolver
│   ├── claude_client.py     # Claude API client for resolution
│   ├── prompts.py           # Conflict resolution prompts
│   ├── context.py           # Context preparation
│   ├── language_utils.py    # Language-specific utilities
│   └── parsers.py           # Parse AI resolution output
│
├── file_evolution/          # Track file changes across tasks
│   ├── tracker.py           # Main tracker
│   ├── baseline_capture.py  # Capture file baselines
│   ├── modification_tracker.py  # Track modifications
│   ├── evolution_queries.py # Query file history
│   └── storage.py           # Persistence
│
├── semantic_analysis/       # Semantic understanding
│   ├── comparison.py        # Semantic change comparison
│   ├── models.py            # Analysis models
│   └── regex_analyzer.py    # Pattern-based analysis
│
└── timeline_*.py            # File change timelines
```

---

## Merge Pipeline

```
Input: Multiple TaskMergeRequests
    │
    ▼
1. FILE EVOLUTION TRACKING
    ├─ Capture baseline (main branch state)
    ├─ Track changes per task
    └─ Build file timeline
    │
    ▼
2. SEMANTIC ANALYSIS
    ├─ Analyze intent of each change
    ├─ Classify change types (add, modify, delete, rename)
    └─ Extract affected symbols (functions, classes, imports)
    │
    ▼
3. CONFLICT DETECTION
    ├─ Compare changes across tasks
    ├─ Identify overlapping regions
    ├─ Classify conflict severity
    └─ Output: ConflictRegion[]
    │
    ▼
4. AUTO-MERGER (Deterministic)
    ├─ Try each strategy:
    │   ├─ AppendStrategy - Both tasks append to same file
    │   ├─ ImportStrategy - Both tasks add imports
    │   ├─ PropsStrategy - Both tasks add React props
    │   ├─ HooksStrategy - Both tasks add React hooks
    │   └─ OrderingStrategy - Both tasks modify ordered lists
    ├─ Apply strategy if applicable
    └─ Output: Resolved + Unresolved conflicts
    │
    ▼
5. AI RESOLVER (for unresolved conflicts)
    ├─ Prepare context (baseline + both task changes + intent)
    ├─ Send to Claude with structured prompt
    ├─ Parse resolution
    └─ Apply merged content
    │
    ▼
6. MERGE REPORT
    ├─ Files processed
    ├─ Auto-merged count
    ├─ AI-resolved count
    └─ Detailed decisions per file
```

---

## Auto-Merger Strategies

### Append Strategy

```python
class AppendStrategy:
    """
    Both tasks appended content to the same file.
    Solution: Include both additions.

    Example:
    - Task A adds route_users() to routes.py
    - Task B adds route_products() to routes.py
    - Result: Both routes added
    """
```

### Import Strategy

```python
class ImportStrategy:
    """
    Both tasks added import statements.
    Solution: Merge imports, deduplicate.

    Example:
    - Task A: from models import User
    - Task B: from models import Product
    - Result: from models import User, Product
    """
```

### Props Strategy

```python
class PropsStrategy:
    """
    Both tasks added React component props.
    Solution: Merge prop definitions.

    Example:
    - Task A adds: onAuth: () => void
    - Task B adds: onSearch: (query: string) => void
    - Result: Both props included in interface
    """
```

---

## AI Conflict Resolution

```python
# merge/ai_resolver/prompts.py
CONFLICT_RESOLUTION_PROMPT = """
You are resolving a merge conflict between two parallel development tasks.

## File: {file_path}

### Baseline (before any changes):
```
{baseline_content}
```

### Task A Changes ({task_a_name}):
Intent: {task_a_intent}
```
{task_a_content}
```

### Task B Changes ({task_b_name}):
Intent: {task_b_intent}
```
{task_b_content}
```

## Instructions:
1. Understand the intent of BOTH changes
2. Produce merged content that preserves BOTH intents
3. Never lose functionality from either task
4. Follow the existing code style

## Output:
Provide the complete merged file content.
"""
```

---

## File Evolution Tracking

```python
# merge/file_evolution/tracker.py
class FileEvolutionTracker:
    """Tracks how files evolve across parallel tasks."""

    def capture_baseline(self, project_dir: Path) -> dict:
        """Capture file state before any task changes."""
        # Records content hash for each file

    def track_task_changes(self, task_id: str, worktree_path: Path) -> list:
        """Track what a task changed relative to baseline."""
        # Returns list of FileChange objects

    def get_conflicts(self, tasks: list) -> list:
        """Find files modified by multiple tasks."""
        # Returns files with overlapping changes
```

---

## Merge Report

```python
@dataclass
class MergeReport:
    timestamp: datetime
    tasks_merged: list[str]
    stats: MergeStats
    decisions: list[MergeDecision]
    errors: list[str]

@dataclass
class MergeStats:
    files_processed: int
    auto_merged: int      # Resolved by deterministic strategies
    ai_resolved: int      # Resolved by Claude
    conflicts_total: int
    unresolved: int       # Failed to resolve

@dataclass
class MergeDecision:
    file: str
    type: str             # "auto_merge" | "ai_resolved" | "unresolved"
    strategy: str         # Which strategy was used
    description: str      # Human-readable explanation
```

---

## Key Design Decisions

### Why Not Just Git Merge?

1. **Semantic understanding** - Git merge operates on text lines; Auto-Claude's merge understands code intent (imports vs. props vs. route definitions)
2. **Language-specific strategies** - React hooks, Python imports, and TypeScript interfaces each have different merge rules
3. **Intent preservation** - When both tasks modify the same function, AI can preserve both intents rather than picking one side
4. **Deterministic first** - AI is only used for genuinely ambiguous cases, minimizing token costs

### Token Cost Optimization

```
Priority order:
1. Git merge (free) - handles non-overlapping changes
2. Auto-merger strategies (free) - handles known patterns
3. AI resolver (costs tokens) - only for ambiguous conflicts

In practice:
- ~80% of merges handled by git merge
- ~15% handled by auto-merger strategies
- ~5% require AI resolution
```

---

*Reference: Merge system architecture from Auto-Claude v2.7.5*
