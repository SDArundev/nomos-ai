# NOMOS System Architecture

**Version:** 1.0
**Last Updated:** 2026-01-27

---

## Overview

NOMOS (**N**avigation · **O**rchestration · **M**emory · **O**bservation · **S**hipping) is an autonomous AI development framework that implements features from backlog to production using git worktrees, state machines, quality gates, and self-learning.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NOMOS ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   BACKLOG    │───▶│  EXECUTION   │───▶│   LEARNING   │              │
│  │  220 Features│    │  14 Steps    │    │   Patterns   │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │features.json │    │  9 Agents    │    │patterns.json │              │
│  │app_spec.json │    │  5 Scripts   │    │retrospective │              │
│  │  schemas/    │    │ 13 Templates │    │  heuristics  │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Feature Backlog System

### 1.1 Feature Structure

```json
{
  "id": "F001",
  "title": "Feature title",
  "category": "CAT-XXX",
  "description": "What this feature does",
  "phase": "phase-1|phase-2|phase-3|phase-4",
  "priority": 1,
  "requirements": ["REQ-XXX"],
  "dependencies": ["F016", "F017"],
  "acceptanceCriteria": ["AC1: ...", "AC2: ..."],
  "estimatedSize": "XS|S|M|L|XL",
  "status": "backlog|in_progress|waiting_approval|verified",
  "passes": false,
  "model": "haiku|sonnet|opus",
  "thinkingLevel": "standard|extended",
  "planningMode": "lite|full"
}
```

### 1.2 State Machine

```
┌─────────┐     ┌─────────────┐     ┌──────────────────┐     ┌──────────┐
│ backlog │────▶│ in_progress │────▶│ waiting_approval │────▶│ verified │
└─────────┘     └─────────────┘     └──────────────────┘     └──────────┘
     ▲                │                      │
     └────────────────┴──────────────────────┘
                    (reset on failure)
```

| Transition | Trigger | Guard |
|------------|---------|-------|
| backlog → in_progress | step-00-init | Dependencies verified |
| in_progress → waiting_approval | step-06-review | All quality gates pass |
| waiting_approval → verified | step-08-merge | Human approval |
| * → backlog | Reset | Failure or explicit reset |

### 1.3 Category Distribution

| Category | Count | Description |
|----------|-------|-------------|
| CAT-KAN | 26 | Kanban board features |
| CAT-AGT | 22 | AI agent features |
| CAT-DXP | 16 | Developer experience |
| CAT-GIT | 15 | Git integration |
| CAT-TST | 12 | Testing features |
| CAT-SEC | 11 | Security features |
| CAT-AUT | 10 | Auto-mode features |
| CAT-TRM | 10 | Terminal features |
| CAT-DBS | 10 | Database features |
| CAT-OBS | 9 | Observability |
| CAT-PRJ | 9 | Project management |
| CAT-MEM | 8 | Memory/learning |
| CAT-CFG | 8 | Configuration |
| CAT-NTF | 8 | Notifications |
| CAT-THM | 8 | Theme/UI |
| CAT-DSK | 8 | Desktop/Tauri |
| CAT-SPC | 7 | Specification |
| CAT-API | 6 | API features |
| CAT-GHB | 4 | GitHub integration |
| CAT-DEP | 3 | Dependencies |

---

## 2. Execution Engine

### 2.1 Workflow Steps

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│00-init  │──▶│01-context──▶│02-analyze──▶│03-plan  │──▶│04-execute
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                               │              │
                                               │              ▼
                                               │        ┌─────────┐
                                               │        │04a-smoke│
                                               │        └─────────┘
                                               │              │
                                               ▼              ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│10-ship  │◀──│09-learn │◀──│08-merge │◀──│07-test  │◀──│06-review│
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                               │              ▲
                                               │              │
                                               │        ┌─────────┐
                                               └───────▶│05a-qa   │
                                                        └─────────┘
                                                              ▲
                                                              │
                                                        ┌─────────┐
                                                        │05-validate
                                                        └─────────┘
```

### 2.2 Step Responsibilities

| Step | Purpose | Agents | State Change |
|------|---------|--------|--------------|
| 00-init | Create worktree, initialize state | None | backlog → in_progress |
| 00i-interactive | Configure flags interactively | None | None |
| 01-context | Load learned patterns | None | None |
| 02-analyze | Explore codebase | explore-codebase, explore-docs, websearch | None |
| 03-plan | Create implementation plan | None | None |
| 04-execute | Implement in worktree | None | None |
| 04a-smoke | Runtime smoke test | qa-smoke-tester | None |
| 05-validate | Static validation | None | None |
| 05a-qa | Test acceptance criteria | qa-functional-tester | None |
| 06-review | Quality gates | security-reviewer, code-quality-reviewer | in_progress → waiting_approval |
| 07-test | Create tests | test-coverage-analyzer | None |
| 08-merge | Merge to main | None | waiting_approval → verified |
| 09-learn | Extract patterns | None | None |
| 10-ship | Create PR | None | None |

### 2.3 Flag System

| Flag | Long | Effect |
|------|------|--------|
| -a | --auto | Skip confirmations |
| -t | --test | Enable test creation |
| -pr | --pull-request | Create PR at end |
| -i | --interactive | Configure flags interactively |
| -r | --resume | Resume from previous state |
| -p | --plan | Stop after planning |
| -v | --verify | Run review only |
| -l | --learn | Extract patterns only |
| -s | --status | Show status and exit |
| -c | --cleanup | Remove worktree after merge |

### 2.4 Progressive Loading

The workflow uses **progressive step loading** to optimize context:
- Load only current step instructions
- Don't load future steps until needed
- Templates pre-initialize output files (75% token reduction)

---

## 3. Agent System

### 3.1 Agent Registry

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT NETWORK                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  EXPLORATION                 QA                    REVIEW            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │explore-      │     │qa-smoke-     │     │security-     │        │
│  │codebase      │     │tester        │     │reviewer      │        │
│  │(haiku)       │     │(sonnet)      │     │(sonnet)      │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │explore-      │     │qa-functional-│     │code-quality- │        │
│  │docs          │     │tester        │     │reviewer      │        │
│  │(haiku)       │     │(sonnet)      │     │(sonnet)      │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│  ┌──────────────┐                          ┌──────────────┐        │
│  │websearch     │                          │test-coverage-│        │
│  │(haiku)       │                          │analyzer      │        │
│  └──────────────┘                          │(sonnet)      │        │
│                                            └──────────────┘        │
│  UTILITY                                                            │
│  ┌──────────────┐                                                   │
│  │action        │                                                   │
│  │(haiku)       │                                                   │
│  └──────────────┘                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Adaptive Launch Strategy

| Complexity | Agents | Examples |
|------------|--------|----------|
| SIMPLE | 1-2 | Bug fix, small tweak |
| MEDIUM | 2-4 | New feature, familiar stack |
| COMPLEX | 4-7 | Unfamiliar libs, integrations |
| MAJOR | 6-10 | Multiple systems, many unknowns |

### 3.3 Agent Tools

| Agent | Tools |
|-------|-------|
| explore-codebase | Glob, Grep, Read |
| explore-docs | Context7 MCP |
| websearch | WebSearch |
| qa-smoke-tester | Bash, Playwright |
| qa-functional-tester | Bash, Playwright |
| security-reviewer | Read, Grep, Glob, Bash |
| code-quality-reviewer | Read, Grep, Glob, Bash |
| test-coverage-analyzer | Read, Grep, Bash |
| action | Grep, explore-docs |

---

## 4. Quality Gates (Constitutional)

### 4.1 Seven Immutable Articles

| Article | Name | Enforcement |
|---------|------|-------------|
| ART-001 | Specification First | Plan must exist before execute |
| ART-002 | Quality Gate Imperative | All gates must pass before merge |
| ART-003 | Human Approval Required | Required for all main merges |
| ART-004 | Worktree Isolation | Each feature in isolated worktree |
| ART-005 | Incremental Progress | One feature per agent session |
| ART-006 | Learning Preservation | Capture insights from each feature |
| ART-007 | Fail-Safe Auto-Mode | Pause after 3 consecutive failures |

### 4.2 Quality Checks

| Category | Checks |
|----------|--------|
| Security | Secrets, XSS, SQL injection, auth |
| Code Quality | Patterns, duplication, complexity |
| Test Coverage | 70%+ for new code |
| Build | TypeScript, lint, test, build |
| Spec Traceability | Features in features.json |

---

## 5. Learning System

### 5.1 Pattern Categories

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LEARNING SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GOOD PATTERNS                    ANTI-PATTERNS                     │
│  ┌──────────────────────┐        ┌──────────────────────┐          │
│  │ GOOD_PLANNING        │        │ OVER_ENGINEERING     │          │
│  │ (zero retries)       │        │ (added scope)        │          │
│  ├──────────────────────┤        ├──────────────────────┤          │
│  │ FOCUSED_SCOPE        │        │ MISSING_TESTS        │          │
│  │ (small changeset)    │        │ (coverage below 70%) │          │
│  ├──────────────────────┤        ├──────────────────────┤          │
│  │ CLEAR_AC             │        │ SECURITY_GAPS        │          │
│  │ (first-pass verify)  │        │ (OWASP issues)       │          │
│  ├──────────────────────┤        ├──────────────────────┤          │
│  │ PATTERN_FOLLOWING    │        │ PATTERN_VIOLATION    │          │
│  │ (no lint errors)     │        │ (ignored conventions)│          │
│  └──────────────────────┘        └──────────────────────┘          │
│                                                                      │
│  METRICS CAPTURED                                                   │
│  ┌──────────────────────────────────────────────────────┐          │
│  │ • Execution duration                                  │          │
│  │ • Files changed                                       │          │
│  │ • Retry count                                         │          │
│  │ • Gate failures                                       │          │
│  │ • Agent count used                                    │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Pattern Injection

Patterns from `.nomos/learning/patterns.json` are automatically injected into step-03-plan, informing planning decisions based on historical success/failure.

---

## 6. Git Workflow

### 6.1 Worktree Strategy

```
main
 │
 ├── nomos/F001 (worktree: .nomos/worktrees/F001/)
 │
 ├── nomos/F002 (worktree: .nomos/worktrees/F002/)
 │
 └── nomos/F003 (worktree: .nomos/worktrees/F003/)
```

### 6.2 Merge Strategy

- **No Fast-Forward:** `git merge --no-ff` preserves feature history
- **Commit Format:** `feat(F001): Monorepo scaffold with Turborepo`
- **Cleanup:** Optional worktree removal after merge (-c flag)

### 6.3 Available Git Skills

| Skill | Use Case |
|-------|----------|
| /git-commit | Quick commits outside NOMOS |
| /git-create-pr | PR creation |
| /git-fix-pr-comments | Address review feedback |
| /git-merge | Smart conflict resolution |

**CRITICAL:** During NOMOS workflow, use NOMOS git operations only.

---

## 7. Directory Structure

```
nomos-ai/
├── .nomos/
│   ├── app_spec.json           # Project specification
│   ├── features.json           # Feature backlog (220 features)
│   ├── schemas/
│   │   ├── app_spec.schema.json
│   │   └── feature.schema.json
│   ├── inspiration/
│   │   ├── autonomous/         # Automaker reference (20 files)
│   │   └── nomos-v3/           # NOMOS v3 reference (8 files)
│   ├── output/                 # Created per feature
│   │   └── {feature_id}/
│   ├── worktrees/              # Git worktrees
│   │   └── {feature_id}/
│   └── learning/               # Created after first merge
│       └── patterns.json
├── .claude/
│   ├── skills/
│   │   ├── nomos/              # Main NOMOS skill
│   │   │   ├── SKILL.md
│   │   │   ├── steps/          # 14 step files
│   │   │   ├── references/     # 4 reference files
│   │   │   ├── scripts/        # 5 bash scripts
│   │   │   └── templates/      # 13 templates
│   │   ├── nomos-verify/       # Verification skill
│   │   ├── git-commit/
│   │   ├── git-create-pr/
│   │   ├── git-fix-pr-comments/
│   │   ├── git-merge/
│   │   └── ...                 # Other utility skills
│   └── agents/                 # 9 agent definitions
│       ├── explore-codebase.md
│       ├── explore-docs.md
│       ├── websearch.md
│       ├── qa-smoke-tester.md
│       ├── qa-functional-tester.md
│       ├── security-reviewer.md
│       ├── code-quality-reviewer.md
│       ├── test-coverage-analyzer.md
│       └── action.md
└── CLAUDE.md                   # Project memory
```

---

## 8. Automaker Reference Patterns

### 8.1 Patterns to Adopt

| Pattern | Description | Priority |
|---------|-------------|----------|
| Atomic Writes | JSON with backups and recovery | HIGH |
| Event Streaming | WebSocket + EventEmitter | HIGH |
| Provider Factory | Dynamic model routing | MEDIUM |
| Settings Hierarchy | Global + Project overrides | MEDIUM |
| Phase Models | Different models for tasks | LOW |

### 8.2 Architecture Decisions

| Component | Automaker | NOMOS |
|-----------|-----------|-------|
| Monorepo | npm workspaces | Turborepo |
| Backend | Express 5 | Hono |
| Frontend | React 19 + Vite | React 19 + TanStack |
| Database | JSON files | SQLite + Drizzle |
| Desktop | Electron | Tauri |
| Auth | Custom | better-auth |

---

## 9. Execution Examples

### Basic Feature Run
```bash
/nomos F001
```

### Full Autonomous Pipeline
```bash
/nomos -a -t -pr F001
```

### Resume Previous Work
```bash
/nomos -r F001
```

### Plan Only
```bash
/nomos -p F001
```

### Verify Feature
```bash
/nomos -v F001
```

### Extract Learnings
```bash
/nomos -l
```

### Status Overview
```bash
/nomos -s
```

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature Pass Rate | >90% | verified / total |
| First-Pass Success | >70% | No retries needed |
| Test Coverage | >70% | Per new feature |
| Security Issues | 0 CRITICAL | Per feature |
| Learning Extraction | 100% | Pattern recorded per feature |

---

*NOMOS AI System Architecture v1.0*
