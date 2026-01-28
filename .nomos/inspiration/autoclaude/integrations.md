# Integrations

> GitHub, GitLab, Linear, and Graphiti integration patterns.

---

## GitHub Integration

### Architecture

```
runners/github/
├── runner.py                # Main GitHub runner
├── orchestrator.py          # Review orchestration
├── gh_client.py             # GitHub CLI wrapper
├── models.py                # Data models
├── rate_limiter.py          # API rate limiting
├── sanitize.py              # Input sanitization
├── permissions.py           # Permission checks
├── bot_detection.py         # Bot/spam detection
├── duplicates.py            # Duplicate issue detection
├── confidence.py            # Confidence scoring
├── context_gatherer.py      # Codebase context for reviews
├── learning.py              # Review learning/feedback
├── lifecycle.py             # Issue lifecycle management
├── memory_integration.py    # Graphiti memory for reviews
├── multi_repo.py            # Multi-repository support
├── onboarding.py            # GitHub setup
├── output_validator.py      # Review output validation
│
├── providers/               # Provider abstraction
│   ├── factory.py
│   ├── github_provider.py
│   └── protocol.py
│
└── services/                # Review services
    ├── pr_review_engine.py         # Main PR review
    ├── autofix_processor.py        # Auto-fix findings
    ├── batch_processor.py          # Batch operations
    ├── followup_reviewer.py        # Follow-up reviews
    ├── parallel_orchestrator_reviewer.py  # Parallel review agents
    ├── triage_engine.py            # Issue triage
    ├── prompt_manager.py           # Prompt selection
    └── pr_worktree_manager.py      # PR worktree setup
```

### Multi-Agent PR Review

```
PR Submitted
    │
    ▼
PR Orchestrator
    ├─→ Security Agent (OWASP, vulnerabilities)
    ├─→ Quality Agent (code patterns, best practices)
    ├─→ Logic Agent (business logic correctness)
    └─→ Structural Agent (architecture concerns)
    │
    ▼
Finding Validator (filter false positives)
    │
    ▼
PR Reviewer (final verdict)
    │
    ├── Approve (no issues)
    ├── Request Changes (with specific findings)
    └── Auto-Fix (create fix PR)
```

### Issue Processing

```python
# Features:
# - Import GitHub issues as Auto-Claude tasks
# - AI-powered investigation (deep dive analysis)
# - Automated triage (categorization + priority)
# - Duplicate detection (semantic similarity)
# - Spam/bot detection
# - Batch issue processing
```

---

## GitLab Integration

```
runners/gitlab/
├── runner.py                # Main GitLab runner
├── glab_client.py           # GitLab CLI wrapper
├── orchestrator.py          # MR review orchestration
├── models.py                # Data models
└── services/
    └── mr_review_engine.py  # Merge request review
```

### Features
- Import GitLab issues as tasks
- AI-powered MR review
- Auto-fix for review findings
- OAuth integration
- Release management

---

## Linear Integration

```
integrations/linear/
├── config.py               # Linear API configuration
├── integration.py           # Linear API operations
└── updater.py               # Task status sync

# Also: linear_config.py, linear_integration.py, linear_updater.py (legacy)
```

### Task Status Sync

```python
# linear_updater.py
class LinearTaskState:
    task_id: str
    status: str  # "backlog" | "in_progress" | "in_review" | "done"

    @staticmethod
    def load(spec_dir: Path) -> LinearTaskState | None:
        """Load Linear task state from spec directory."""

async def linear_task_started(spec_dir: Path):
    """Update Linear task to 'In Progress'."""

async def linear_qa_started(spec_dir: Path):
    """Update Linear task to 'In Review'."""

async def linear_qa_approved(spec_dir: Path):
    """Update Linear task to 'Done'."""

async def linear_build_complete(spec_dir: Path):
    """Update Linear with build completion."""
```

---

## Graphiti (Knowledge Graph Memory)

```
integrations/graphiti/
├── memory.py                # Graph memory operations
├── config.py                # Configuration
├── providers.py             # Provider setup
├── migrate_embeddings.py    # Embedding migration
│
├── providers_pkg/           # Provider implementations
│   ├── factory.py           # Provider factory
│   ├── models.py            # Provider models
│   ├── validators.py        # Config validation
│   ├── cross_encoder.py     # Re-ranking
│   ├── embedder_providers/  # 6 embedding providers
│   │   ├── openai_embedder.py
│   │   ├── azure_openai_embedder.py
│   │   ├── google_embedder.py
│   │   ├── ollama_embedder.py
│   │   ├── voyage_embedder.py
│   │   └── openrouter_embedder.py
│   └── llm_providers/       # 6 LLM providers
│       ├── anthropic_llm.py
│       ├── openai_llm.py
│       ├── azure_openai_llm.py
│       ├── google_llm.py
│       ├── ollama_llm.py
│       └── openrouter_llm.py
│
└── queries_pkg/             # Graph queries
    ├── client.py            # Graph client
    ├── graphiti.py          # Core operations
    ├── search.py            # Semantic search
    ├── schema.py            # Graph schema
    └── kuzu_driver_patched.py  # LadybugDB driver
```

### Features
- Embedded graph database (LadybugDB, no Docker)
- Multi-provider support (6 embedders + 6 LLMs)
- Semantic search across code knowledge
- Entity relationship tracking
- Cross-session knowledge retention
- Embedding migration (switch providers)

---

## Ideation & Insights

### Ideation System

```
ideation/
├── runner.py               # Main ideation runner
├── generator.py            # Idea generation
├── analyzer.py             # Codebase analysis
├── prioritizer.py          # Idea prioritization
├── formatter.py            # Output formatting
├── phase_executor.py       # Multi-phase execution
├── project_index_phase.py  # Project indexing
├── output_streamer.py      # Streaming output
├── config.py               # Configuration
└── types.py                # Data types
```

6 ideation categories:
1. **Code Improvements** - Structure and organization
2. **Code Quality** - Maintainability and readability
3. **Documentation** - Missing docs and comments
4. **Performance** - Optimization opportunities
5. **Security** - Vulnerability hardening
6. **UI/UX** - Frontend improvements

### Insights System

```
insights/
├── insights-executor.ts    # Insight generation
├── session-manager.ts      # Session management
├── session-storage.ts      # Persistence
├── config.ts               # Configuration
└── paths.ts                # File paths
```

AI-powered codebase exploration chat interface.

---

## Roadmap System

```
runners/roadmap/
├── orchestrator.py          # Roadmap orchestration
├── executor.py              # Phase execution
├── phases.py                # Discovery phases
├── competitor_analyzer.py   # Competitive analysis
├── graph_integration.py     # Graphiti integration
├── models.py                # Data models
└── project_index.json       # Project knowledge
```

### Features
- AI-assisted feature planning
- Competitor analysis
- Audience targeting
- Phase-based roadmap generation
- Kanban view for roadmap items

---

## Changelog System

```
changelog/
├── changelog-service.ts     # Main service
├── generator.ts             # Changelog generation
├── formatter.ts             # Output formatting
├── git-integration.ts       # Git history parsing
├── parser.ts                # Changelog parsing
├── version-suggester.ts     # Semantic version suggestion
└── types.ts                 # Data types
```

### Features
- Generate release notes from completed tasks
- Parse git history for changes
- Suggest semantic version bumps
- Archive completed tasks
- Create GitHub releases

---

*Reference: Integration patterns from Auto-Claude v2.7.5*
