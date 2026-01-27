# Git Workflow Guide for NOMOS AI

**Quick Reference for Git Operations**

---

## Available Git Skills

| Skill | Command | Use Case |
|-------|---------|----------|
| Quick Commit | `/git-commit` | Fast commit + push |
| Create PR | `/git-create-pr` | New pull request |
| Fix PR Comments | `/git-fix-pr-comments` | Address review feedback |
| Smart Merge | `/git-merge <branch>` | Context-aware merge |

---

## Workflow 1: NOMOS Feature Development

**During NOMOS workflow (steps 00-10), use NOMOS git operations ONLY.**

```bash
# Start feature (creates worktree)
/nomos F001

# Full autonomous pipeline
/nomos -a -t -pr F001

# NOMOS handles all git operations:
# - Worktree creation
# - Commits with format: feat(F001): {title}
# - Merge with --no-ff
# - State tracking in features.json
```

**After NOMOS completes, you can use regular git skills.**

---

## Workflow 2: Ad-Hoc Changes

```bash
# 1. Make changes to codebase
# ... edit files ...

# 2. Quick commit (auto-stage, conventional message, auto-push)
/git-commit

# 3. Create PR if needed (creates branch if on main)
/git-create-pr
```

---

## Workflow 3: PR Review Cycle

```bash
# 1. PR submitted and reviewer requests changes
# 2. Fix all review comments at once
/git-fix-pr-comments

# This will:
# - Fetch all unresolved comments
# - Group changes by file
# - Implement exactly what reviewer asked
# - Create new commit "fix: address PR review comments"
# - Push automatically
```

---

## Workflow 4: Merging Branches

```bash
# Smart merge with conflict resolution
/git-merge feature-branch

# This will:
# - Gather context (PR details, commit history)
# - Attempt merge
# - Resolve conflicts intelligently by file type
# - Verify no remaining conflict markers
# - Commit the merge
```

---

## Commit Message Format

### NOMOS Commits (automatic)
```
feat(F001): Monorepo scaffold with Turborepo

AC: turbo.json configured, workspaces defined, TypeScript refs working

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Manual Commits (/git-commit)
```
type(scope): brief description

Types: feat, fix, update, docs, chore, refactor, test, perf, revert
Max 72 characters, imperative mood ("add" not "added")
```

---

## Conflict Resolution Strategy

The `/git-merge` skill resolves conflicts by file type:

| File Type | Strategy |
|-----------|----------|
| package.json | Merge dependencies, prefer higher versions |
| Config files | Combine settings unless mutually exclusive |
| Source code | Use PR context to understand intent |
| Tests | Keep all unless duplicates |
| Imports | Merge all, deduplicate |

**Abort Conditions:**
- More than 10 files conflicted
- 3+ failed resolution attempts per file
- Unresolvable conflict detected

---

## Safety Rules

### DO ✅
- Use `/nomos` for feature development
- Use `/git-commit` for quick ad-hoc commits
- Use `/git-fix-pr-comments` for review feedback
- Use `/git-merge` for smart merging

### DON'T ❌
- Don't use git skills during NOMOS workflow (steps 00-10)
- Don't force push to main/master
- Don't skip hooks without explicit request
- Don't amend commits unless requested

---

## Quick Reference

```bash
# NOMOS Feature Development
/nomos F001                    # Start feature
/nomos -a F001                 # Autonomous mode
/nomos -a -t -pr F001          # Full pipeline

# Ad-Hoc Git Operations
/git-commit                    # Quick commit + push
/git-create-pr                 # Create pull request
/git-fix-pr-comments           # Fix review feedback
/git-merge <branch>            # Smart merge

# Status
/nomos -s                      # NOMOS status
git status                     # Git status
```

---

*Use the right tool for the right job.*
