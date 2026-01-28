# Memory System

> Cross-session knowledge retention using file-based memory and Graphiti knowledge graph.

---

## Architecture

```
memory/
├── main.py              # CLI interface and re-exports
├── sessions.py          # Session insight persistence
├── codebase_map.py      # File purpose mapping
├── patterns.py          # Discovered code patterns
├── summary.py           # Memory summaries
├── paths.py             # Memory directory paths
└── graphiti_helpers.py  # Graphiti integration helpers

integrations/graphiti/
├── memory.py            # Graph memory operations
├── config.py            # Graphiti configuration
├── providers.py         # Embedder/LLM providers
├── providers_pkg/       # Provider implementations
│   ├── embedder_providers/  # OpenAI, Azure, Google, Ollama, Voyage, OpenRouter
│   └── llm_providers/      # Anthropic, OpenAI, Azure, Google, Ollama, OpenRouter
├── queries_pkg/         # Graph queries
│   ├── client.py        # Graph client
│   ├── graphiti.py      # Graphiti operations
│   ├── search.py        # Semantic search
│   └── schema.py        # Graph schema
└── migrate_embeddings.py # Embedding migration
```

---

## Two-Tier Memory

### Tier 1: File-Based Memory (Always Active)

Every agent session saves insights to JSON files:

```
.auto-claude/specs/001-feature/memory/
├── session_insights/
│   ├── session_001.json     # Session 1 insights
│   ├── session_002.json     # Session 2 insights
│   └── session_003.json     # Session 3 insights
├── codebase_map.json        # File → purpose map
├── patterns.json            # Discovered code patterns
└── gotchas.json             # Warnings and pitfalls
```

### Tier 2: Graphiti Knowledge Graph (Optional)

Graph-based semantic memory using LadybugDB:

```python
# Requires Python 3.12+ (no Docker)
# Dependencies:
# - real_ladybug >= 0.13.0 (embedded graph database)
# - graphiti-core >= 0.5.0 (graph operations)
# - pandas >= 2.2.0 (data frames)
```

---

## Session Insights

```python
# memory/sessions.py
def save_session_insights(
    spec_dir: Path,
    session_num: int,
    insights: dict,
) -> None:
    """
    Save after each coder agent session.

    Structure:
    {
        "session_number": 3,
        "timestamp": "2025-01-15T11:00:00Z",
        "subtasks_completed": ["1.1", "1.2"],
        "discoveries": {
            "src/api/auth.py": "JWT authentication with bcrypt",
            "src/middleware/rate_limit.py": "Token bucket, 100 req/min"
        },
        "what_worked": [
            "Following existing middleware pattern for auth"
        ],
        "what_failed": [
            "Direct DB access from controller - violated service layer"
        ],
        "recommendations_for_next_session": [
            "Always use service layer for database operations"
        ]
    }
    """

def load_all_insights(spec_dir: Path) -> list[dict]:
    """Load all session insights for memory context."""
```

---

## Codebase Map

```python
# memory/codebase_map.py
def update_codebase_map(spec_dir: Path, discoveries: dict) -> None:
    """
    Accumulate file purpose knowledge.

    Agents discover file purposes during implementation.
    Map persists across sessions for faster context loading.

    Example:
    {
        "src/models/user.py": "User model with bcrypt hashing, sessions",
        "src/api/auth.py": "Auth endpoints: login, register, refresh",
        "src/middleware/auth.py": "JWT middleware - validates + attaches user",
        "src/config/database.py": "SQLAlchemy with PostgreSQL pool"
    }
    """

def load_codebase_map(spec_dir: Path) -> dict:
    """Load accumulated codebase knowledge."""
```

---

## Patterns and Gotchas

```python
# memory/patterns.py
def append_pattern(spec_dir: Path, pattern: str) -> None:
    """
    Record discovered code patterns.

    Examples:
    - "All API endpoints follow /api/v1/{resource} convention"
    - "Use try/except with specific exceptions, log with context"
    - "Database models extend BaseModel with created_at/updated_at"
    """

def append_gotcha(spec_dir: Path, gotcha: str) -> None:
    """
    Record warnings and pitfalls.

    Examples:
    - "Database connections must be explicitly closed in workers"
    - "Frontend uses CSS modules, not global styles"
    - "Tests require TESTING=true environment variable"
    """
```

---

## Memory Context Building

```python
# agents/memory_manager.py
async def build_memory_context(spec_dir: Path, subtask: dict) -> str:
    """Build context from memory for agent session."""

    parts = []

    # 1. Session insights (what was learned)
    insights = load_all_insights(spec_dir)
    if insights:
        parts.append("## Previous Session Insights")
        for insight in insights[-3:]:  # Last 3 sessions
            parts.append(format_insight(insight))

    # 2. Codebase map (what files do)
    codebase_map = load_codebase_map(spec_dir)
    if codebase_map:
        parts.append("## Known File Purposes")
        for file, purpose in codebase_map.items():
            parts.append(f"- `{file}`: {purpose}")

    # 3. Code patterns (conventions)
    patterns = load_patterns(spec_dir)
    if patterns:
        parts.append("## Code Patterns")
        for pattern in patterns:
            parts.append(f"- {pattern}")

    # 4. Gotchas (warnings)
    gotchas = load_gotchas(spec_dir)
    if gotchas:
        parts.append("## Known Gotchas")
        for gotcha in gotchas:
            parts.append(f"- {gotcha}")

    # 5. Graphiti context (if enabled)
    if is_graphiti_memory_enabled():
        graph_context = await get_graphiti_context(spec_dir, subtask)
        if graph_context:
            parts.append("## Semantic Knowledge Graph")
            parts.append(graph_context)

    return "\n\n".join(parts)
```

---

## Graphiti Integration

### Knowledge Graph

```python
# integrations/graphiti/memory.py
class GraphitiMemory:
    """Semantic memory backed by Graphiti knowledge graph."""

    async def store_insight(self, key: str, content: str, metadata: dict):
        """Store insight as graph node with relationships."""

    async def search(self, query: str, limit: int = 10) -> list:
        """Semantic search across stored knowledge."""

    async def get_related(self, entity: str) -> list:
        """Get entities related to a given entity."""
```

### Provider Support

Graphiti supports multiple embedding and LLM providers:

```
Embedder Providers:
- OpenAI (default)
- Azure OpenAI
- Google (Gemini)
- Ollama (local)
- Voyage AI
- OpenRouter

LLM Providers:
- Anthropic (default)
- OpenAI
- Azure OpenAI
- Google (Gemini)
- Ollama (local)
- OpenRouter
```

---

## Memory Summary

```python
# memory/summary.py
def get_memory_summary(spec_dir: Path) -> dict:
    """
    Quick summary of memory state.

    Returns:
    {
        "total_sessions": 5,
        "total_files_mapped": 23,
        "total_patterns": 8,
        "total_gotchas": 4,
        "recent_insights": [...],  # Last 3 sessions
        "graphiti_enabled": true,
        "graphiti_node_count": 147
    }
    """
```

---

## Memory CLI

```bash
# Memory management from command line
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action summary
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action list-insights
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action list-map
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action list-patterns
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action list-gotchas
python memory/main.py --spec-dir .auto-claude/specs/001-feature --action clear
```

---

## Key Design Decisions

### File-Based as Default
File-based memory works everywhere, requires no setup, and is human-readable. It's the default and always active.

### Graphiti as Enhancement
The knowledge graph is optional and requires Python 3.12+. It adds semantic search, entity relationships, and richer context but isn't required.

### Per-Spec Memory
Each spec/task has its own memory directory. This prevents cross-contamination between unrelated tasks.

### Memory Accumulation
Memory only grows during a task lifecycle. Patterns and gotchas from session 1 inform session 5. The codebase map accumulates file knowledge across all sessions.

### Memory Context Budgeting
When building context, only the last 3 session insights are included (plus all patterns/gotchas/codebase map) to stay within context window limits.

---

*Reference: Memory system architecture from Auto-Claude v2.7.5*
