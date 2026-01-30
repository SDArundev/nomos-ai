# Merge Strategies Reference

Conflict resolution algorithms and git policy for NOMOS merge operations.

---

## Pre-Merge Conflict Detection

Before rebasing, check for potential conflicts:

```bash
cd {worktree_path}
git fetch origin main

# Files changed in this feature
FEATURE_FILES=$(git diff --name-only main...HEAD)

# Files changed on main since branch point
MAIN_FILES=$(git diff --name-only HEAD...origin/main)

# Find overlap
CONFLICTING_FILES=$(comm -12 <(echo "$FEATURE_FILES" | sort) <(echo "$MAIN_FILES" | sort))
```

---

## Conflict Classification

| Pattern | Type | Auto-Resolvable? |
|---------|------|-------------------|
| Both sides add imports | Import dedup | Yes -- merge both, deduplicate |
| Both sides append to array/object | Append-only | Yes -- include both additions |
| Both sides add schema fields | Schema addition | Yes -- merge fields |
| Same line edited differently | Same-line edit | No -- pause for resolution |
| File deleted on one side | Delete conflict | No -- pause for resolution |

- **If all conflicts auto-resolvable:** Proceed with rebase (resolve during rebase).
- **If any non-resolvable conflicts:** Warn before rebase, prepare resolution strategy.

---

## ImportStrategy (both branches added imports)

1. Parse all import statements into `{source, specifiers[]}` tuples
2. Merge specifiers for the same source (union of both sides)
3. Deduplicate identical specifiers
4. Sort imports:
   - External packages first (no `./` or `../` prefix)
   - Then relative imports (`./` and `../`)
   - Alphabetically within each group
5. Write merged import block

**Example:**
```
// Ours:   import { a, b } from "lib"
// Theirs: import { b, c } from "lib"
// Result: import { a, b, c } from "lib"
```

---

## AppendStrategy (both branches appended to same array/object/block)

1. Detect the append point -- last common line between both sides
2. Concatenate both additions (ours first, theirs second) after the common line
3. Verify no duplicate keys (for objects) or duplicate entries (for arrays)
4. If duplicates found: keep the first occurrence, remove the second

**Example:**
```
// Ours added:   { id: "route-a", path: "/a" }
// Theirs added: { id: "route-b", path: "/b" }
// Result: both entries appended in order
```

---

## OrderingStrategy (both branches modified barrel exports in index.ts)

1. Collect all `export` statements from both sides
2. Deduplicate -- same export from same source = keep one
3. Sort alphabetically by source path
4. Write sorted export block

**Example:**
```
// Result: exports sorted alphabetically by source
export { auth } from "./auth"
export { db } from "./db"
export { users } from "./users"
```

---

## Application Flow

```
For each conflicting file:
  1. Classify conflict type (imports / append / barrel exports / other)
  2. IF matching strategy exists -> apply strategy -> log result
  3. IF no matching strategy -> mark for manual resolution
  4. Log all resolutions to merge report
```

```markdown
## Deterministic Merge Resolutions

| File | Strategy | Action | Result |
|------|----------|--------|--------|
| `src/path/file.ts` | ImportStrategy | Merged 3 specifiers | AUTO-RESOLVED |
| `src/index.ts` | OrderingStrategy | Sorted 5 exports | AUTO-RESOLVED |
| `src/config.ts` | None | Manual resolution needed | MANUAL |
```

After all strategies applied: Always run post-rebase quality re-check.

---

## Git Skill Compatibility

NOMOS has its **own git operations** that must NOT be replaced by generic git skills.

**Why NOMOS handles git internally:**

| Aspect | Git Skills | NOMOS Requirement |
|--------|------------|-------------------|
| Commit format | `type(scope): msg` | `feat({feature_id}): {title}` + AC summary |
| Push behavior | Auto-push always | Controlled (merge step only) |
| Staging | `git add .` | Selective per worktree |
| Merge strategy | `--no-commit` | `--no-ff` to preserve history |
| State tracking | None | Updates features.json |
| Worktrees | Not supported | Core workflow |

**Rules:**

- **During NOMOS workflow (steps 00-06):** Use NOMOS git operations only
- **Outside NOMOS workflow:** Git skills can be used for ad-hoc commits
- **git-create-pr:** Compatible with step-06-finish but NOMOS has richer context
- **git-merge:** NOT compatible -- different strategies

**Rationale:** NOMOS needs feature traceability, state machine updates, and worktree isolation that generic git skills don't provide.
