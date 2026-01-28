# Data Models

> Data structures, spec format, and schema definitions.

---

## Spec Directory Structure

Each task produces a spec in `.auto-claude/specs/XXX-name/`:

```
.auto-claude/specs/001-user-authentication/
├── spec.md                         # Formal specification document
├── requirements.json               # Acceptance criteria
├── context.json                    # Project context snapshot
├── implementation_plan.json        # Subtask-based plan
├── build-progress.txt              # Quick progress summary
├── task_metadata.json              # Task-level configuration overrides
├── project_index.json              # Project structure snapshot
│
├── qa_report.md                    # Latest QA review output
├── qa_signoff.json                 # QA approval status
├── qa_iterations/                  # QA iteration history
│   ├── iteration_001.json
│   └── iteration_002.json
├── QA_FIX_REQUEST.md               # Human feedback (temporary)
│
├── memory/                         # Session memory
│   ├── session_insights/
│   │   ├── session_001.json
│   │   └── session_002.json
│   ├── codebase_map.json
│   ├── patterns.json
│   └── gotchas.json
│
├── FOLLOWUP_REQUEST.md             # Follow-up task request (temporary)
└── logs/                           # Task logger output
    └── task_log.jsonl
```

---

## Implementation Plan Schema

```json
{
    "status": "in_progress",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T12:30:00Z",
    "complexity": "moderate",
    "total_subtasks": 8,
    "completed_subtasks": 3,
    "phases": [
        {
            "name": "Phase 1: Database Schema",
            "description": "Set up database models and migrations",
            "status": "completed",
            "subtasks": [
                {
                    "id": "1.1",
                    "title": "Create User model",
                    "description": "Add User table with email, name, password_hash, created_at, updated_at",
                    "status": "completed",
                    "service": "backend",
                    "dependencies": [],
                    "verification": "User model exists with all required fields",
                    "files_to_modify": ["src/models/user.py"],
                    "files_to_reference": ["src/models/base.py"],
                    "estimated_complexity": "low"
                }
            ]
        }
    ]
}
```

### Subtask Status Flow

```
pending → in_progress → completed
                     ↘ skipped (if blocked or unnecessary)
```

---

## Task Metadata Schema

```json
{
    "spec_number": "001",
    "name": "user-authentication",
    "title": "User Authentication System",
    "created_at": "2025-01-15T10:00:00Z",
    "phase_models": {
        "planning": "opus",
        "coding": "sonnet",
        "qa": "sonnet"
    },
    "thinking_budgets": {
        "planning": 16000,
        "coding": 8000,
        "qa": 8000
    },
    "worktree_enabled": true,
    "linear_task_id": "LIN-123"
}
```

---

## QA Signoff Schema

```json
{
    "approved": false,
    "iteration_count": 3,
    "last_review_at": "2025-01-15T14:00:00Z",
    "verdict": "rejected",
    "findings": [
        {
            "severity": "high",
            "category": "missing_tests",
            "description": "No unit tests for auth middleware",
            "file": "src/middleware/auth.py"
        }
    ],
    "recurring_issues": [],
    "human_escalation_required": false
}
```

---

## QA Iteration Schema

```json
{
    "iteration": 2,
    "timestamp": "2025-01-15T13:30:00Z",
    "reviewer_verdict": "rejected",
    "findings_count": 3,
    "findings": [
        {
            "id": "F001",
            "severity": "high",
            "description": "Missing error handling in login endpoint",
            "category": "error_handling",
            "file": "src/api/auth.py",
            "line": 42
        }
    ],
    "fixer_applied": true,
    "fixer_status": "success",
    "issues_resolved": ["F001"],
    "issues_remaining": ["F002", "F003"]
}
```

---

## Session Insights Schema

```json
{
    "session_number": 3,
    "timestamp": "2025-01-15T11:00:00Z",
    "subtasks_completed": ["1.1", "1.2"],
    "discoveries": {
        "src/api/auth.py": "JWT authentication with bcrypt password hashing",
        "src/middleware/rate_limit.py": "Token bucket rate limiter, 100 req/min"
    },
    "what_worked": [
        "Following existing middleware pattern for auth",
        "Using existing User model base class"
    ],
    "what_failed": [
        "Direct database access from controller (violated service layer pattern)"
    ],
    "recommendations_for_next_session": [
        "Always use service layer for database operations",
        "Check existing middleware patterns before creating new ones"
    ]
}
```

---

## Codebase Map Schema

```json
{
    "src/models/user.py": "User model with bcrypt password hashing and session management",
    "src/api/auth.py": "Authentication endpoints: login, register, refresh token",
    "src/middleware/auth.py": "JWT middleware - validates token, attaches user to request",
    "src/services/user_service.py": "User CRUD operations, password validation",
    "src/config/database.py": "SQLAlchemy setup with PostgreSQL connection pool"
}
```

---

## Project Index Schema

```json
{
    "project_type": "monorepo",
    "framework": "fastapi",
    "language": "python",
    "runtime": "python3.12",
    "package_manager": "uv",
    "test_framework": "pytest",
    "database": "postgresql",
    "ci_config": ".github/workflows/ci.yml",
    "docker_compose": "docker-compose.yml",
    "services": {
        "backend": {
            "path": "apps/backend",
            "framework": "fastapi",
            "port": 8000
        },
        "frontend": {
            "path": "apps/frontend",
            "framework": "react",
            "port": 3000
        }
    },
    "workspaces": ["apps/*"],
    "entry_points": ["apps/backend/main.py", "apps/frontend/src/main.tsx"]
}
```

---

## Security Profile Schema

```json
{
    "project_dir": "/path/to/project",
    "detected_stack": {
        "languages": ["python", "typescript"],
        "frameworks": ["fastapi", "react"],
        "databases": ["postgresql", "redis"],
        "package_managers": ["uv", "npm"]
    },
    "base_commands": ["ls", "cat", "git", "echo", "..."],
    "stack_commands": ["python", "pytest", "npm", "npx", "psql", "redis-cli"],
    "custom_commands": ["make", "docker-compose"],
    "total_allowed": 87
}
```

---

## Merge Report Schema

```json
{
    "timestamp": "2025-01-15T15:00:00Z",
    "tasks_merged": ["001-auth", "002-api"],
    "files_processed": 12,
    "auto_merged": 10,
    "ai_resolved": 2,
    "conflicts_detected": 2,
    "merge_decisions": [
        {
            "file": "src/api/routes.py",
            "type": "auto_merge",
            "strategy": "append",
            "description": "Both tasks added new routes - appended"
        },
        {
            "file": "src/models/user.py",
            "type": "ai_resolved",
            "description": "Both tasks modified User model - AI merged fields"
        }
    ]
}
```

---

## Phase Event Schema (NDJSON)

```json
{"type": "phase", "phase": "planning", "message": "Creating implementation plan", "timestamp": 1705312800.0}
{"type": "phase", "phase": "building", "message": "Implementing subtask 1.3", "timestamp": 1705312860.0}
{"type": "subtask", "id": "1.3", "status": "completed", "timestamp": 1705313400.0}
{"type": "phase", "phase": "qa_review", "message": "Starting QA validation", "timestamp": 1705313460.0}
{"type": "qa_verdict", "approved": false, "findings": 3, "timestamp": 1705313520.0}
{"type": "phase", "phase": "qa_fixing", "message": "Fixing 3 issues", "timestamp": 1705313580.0}
{"type": "phase", "phase": "complete", "message": "Build complete", "timestamp": 1705313640.0}
```

---

## Frontend Type Definitions

Key types in `src/shared/types/`:

```typescript
// task.ts
interface Task {
    id: string;
    specNumber: string;
    title: string;
    description: string;
    status: TaskStatus;
    phase: ExecutionPhase;
    model: string;
    thinkingLevel: string;
    worktreeEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    subtasks: Subtask[];
    qaReport?: QAReport;
}

type TaskStatus = 'backlog' | 'in_progress' | 'qa_review' | 'approved' | 'merged';

// terminal.ts
interface TerminalSession {
    id: string;
    name: string;
    taskId?: string;
    workingDir: string;
    isAgent: boolean;
    createdAt: string;
}

// profile.ts
interface ClaudeProfile {
    id: string;
    name: string;
    type: 'oauth' | 'api_key';
    isActive: boolean;
    usagePercent: number;
    rateLimited: boolean;
}

// settings.ts
interface AppSettings {
    theme: string;
    language: string;
    defaultModel: string;
    defaultThinkingLevel: string;
    worktreeDefault: boolean;
    maxConcurrentAgents: number;
    notifications: NotificationSettings;
    github?: GitHubSettings;
    gitlab?: GitLabSettings;
    linear?: LinearSettings;
    graphiti?: GraphitiSettings;
}
```

---

*Reference: Data models and schemas from Auto-Claude v2.7.5*
