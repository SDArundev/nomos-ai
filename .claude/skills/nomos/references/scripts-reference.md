# NOMOS Scripts Reference

All operations use `scripts/nomos.sh` and `scripts/nomos-verify.sh`.

## nomos.sh Commands

### Feature State Management

```bash
bash .claude/skills/nomos/scripts/nomos.sh state <action> <feature_id>
```

Actions: `start`, `claim`, `complete`, `verify`, `reset`, `preverify`, `get`, `next`

### Port Management

```bash
bash .claude/skills/nomos/scripts/nomos.sh ports allocate <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh ports release <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh ports cleanup <feature_id>
```

### Template Initialization

```bash
bash .claude/skills/nomos/scripts/nomos.sh init <feature_id> <args...>
```

### Feature Analysis

```bash
bash .claude/skills/nomos/scripts/nomos.sh diff <feature_id> [--stat|--names|--summary]
bash .claude/skills/nomos/scripts/nomos.sh metrics <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh metrics <feature_id> --category-stats
bash .claude/skills/nomos/scripts/nomos.sh health <feature_id> [--wait|--check]
```

### Learning System

```bash
bash .claude/skills/nomos/scripts/nomos.sh insights <feature_id>
bash .claude/skills/nomos/scripts/nomos.sh patterns <feature_id> [--for-plan|--for-code|--for-qa]
```

### Session Dashboard

```bash
bash .claude/skills/nomos/scripts/nomos.sh session
```

Outputs: project status counts, recent activity, failed features needing attention, learning health, next recommended feature, and active worktrees.

## nomos-verify.sh Commands

Server lifecycle for step-04 Track B:

```bash
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> start
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> wait
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> smoke
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> stop
bash .claude/skills/nomos/scripts/nomos-verify.sh <feature_id> status
```

## Available Agents

| Agent | Used In | Purpose |
|-------|---------|---------|
| `explore-codebase` | step-01 | Find existing patterns, files, utilities |
| `explore-docs` | step-01 | Research library docs via Context7 MCP |
| `websearch` | step-01 | Find approaches, best practices |
| `code-writer` | step-03 | Implements plan or fixes QA issues |
| `qa-reviewer` | step-03 | Reviews changes against plan/ACs |
| `qa-functional-tester` | step-04 Track B | Test acceptance criteria in running app |
| `security-reviewer` | step-04 Track C | OWASP security review |
| `code-quality-reviewer` | step-04 Track C | Code quality & patterns |
| `test-coverage-analyzer` | step-04 Track C | Test coverage gaps |

## Agent Complexity Guidelines

| Complexity | Agents | When |
|------------|--------|------|
| Simple | 1-2 | Bug fix, small tweak |
| Medium | 2-4 | New feature in familiar stack |
| Complex | 4-7 | Unfamiliar libraries, integrations |
| Major | 6-10 | Multiple systems, many unknowns |
