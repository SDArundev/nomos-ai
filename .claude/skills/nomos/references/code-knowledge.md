# Code Knowledge Base & Context7 Integration

## Overview

The Code Knowledge Base captures **code-level learnings** - patterns, pitfalls, and best practices organized by technology domain. Combined with **Context7 MCP** for live documentation lookup.

---

## Directory Structure

```
.nomos/learning/code/
├── schema.json          # JSON schema for all code knowledge files
├── database.json        # Drizzle ORM, SQLite, migrations
├── security.json        # Auth, XSS, validation, headers
├── react.json           # React, TanStack Query, dnd-kit, Zustand
├── typescript.json      # Types, generics, branded types
├── api.json             # Hono, REST design, validation
├── error-handling.json  # Errors, logging, Pino
└── devops.json          # Git, worktrees, CI/CD, Turborepo
```

---

## Schema Elements

### CodePattern
Reusable solution to a recurring problem.

```json
{
  "id": "DB-001",
  "title": "Synchronous Transactions with Drizzle",
  "subcategory": "transactions",
  "framework": "drizzle-orm",
  "runtime": "bun-sqlite",
  "problem": "What goes wrong",
  "solution": "How to fix it",
  "codeBefore": "// Broken code",
  "codeAfter": "// Working code",
  "context7Query": "bun sqlite transaction drizzle",
  "context7LibraryId": "/drizzle-team/drizzle-orm-docs",
  "learnedFrom": "F021",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "tags": ["orm", "sqlite", "transactions"]
}
```

### CodePitfall
Common mistake to avoid.

```json
{
  "id": "PIT-DB-001",
  "title": "Drizzle Transaction API Mismatch",
  "description": "What happens",
  "errorMessage": "Exact error text for matching",
  "stackTracePattern": "regex to match stack",
  "prevention": "How to avoid",
  "fix": "How to fix if hit",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW"
}
```

### BestPractice
Recommended approach for quality.

```json
{
  "id": "BP-DB-001",
  "title": "Use Repository Pattern",
  "description": "What to do",
  "rationale": "Why it matters",
  "codeExample": "// Example code",
  "appliesWhen": ["When this applies"],
  "context7Query": "drizzle repository pattern"
}
```

---

## Context7 MCP Integration

### Purpose

Use Context7 to verify patterns against latest documentation before applying. Libraries and APIs evolve - patterns can become outdated.

### When to Use Context7

1. **Step 1 (Context)**: Verify loaded patterns are still valid
2. **Step 3 (Plan)**: Look up latest API usage before implementing
3. **Step 6 (Review)**: Check if implementation follows current best practices
4. **Step 9 (Learn)**: Get official docs to enhance new patterns

### How to Use

```markdown
## Using Context7 in Steps

### 1. Resolve Library ID
Use `mcp__context7__resolve-library-id` to find the library:

Query: "drizzle orm bun sqlite"
→ Returns: /drizzle-team/drizzle-orm-docs

### 2. Query Documentation
Use `mcp__context7__query-docs` with the library ID:

libraryId: "/drizzle-team/drizzle-orm-docs"
query: "bun sqlite transaction synchronous"
→ Returns: Latest transaction usage patterns

### 3. Verify/Update Pattern
Compare returned docs with stored pattern.
If different, update the pattern with new info.
```

### Context7 Sources in Code Files

Each category file includes a `context7Sources` array:

```json
{
  "context7Sources": [
    {
      "libraryId": "/drizzle-team/drizzle-orm-docs",
      "libraryName": "Drizzle ORM",
      "relevantTopics": ["transactions", "migrations", "bun-sqlite"]
    }
  ]
}
```

---

## Loading Code Patterns (Step 1)

### Process

1. **Identify feature technologies**:
   - Parse feature description and acceptance criteria
   - Match keywords to categories (database, react, api, etc.)

2. **Load relevant category files**:
   ```javascript
   const categories = detectCategories(feature);
   // e.g., ['database', 'api'] for a repository feature

   for (const cat of categories) {
     const patterns = loadCodePatterns(`.nomos/learning/code/${cat}.json`);
     // Filter by severity (CRITICAL, HIGH always included)
     // Filter by tags matching feature
   }
   ```

3. **Verify with Context7** (for CRITICAL/HIGH patterns):
   ```
   For each pattern with context7Query:
     → Call mcp__context7__query-docs
     → Check if pattern is still accurate
     → Note if update needed
   ```

4. **Output to context file**:
   ```markdown
   ## Code Patterns to Apply

   ### Database (HIGH priority)
   - **DB-001**: Use getNativeSqlite() for sync transactions
     - Context7 verified: ✓ (2026-01-25)

   ### Security (CRITICAL priority)
   - **SEC-001**: Validate user-provided URLs

   ## Pitfalls to Avoid

   - **PIT-DB-001**: Drizzle transaction API mismatch
     - Error: "db.transaction(...) is not a function"
   ```

---

## Extracting Code Patterns (Step 9)

### When to Extract

1. **New pattern discovered**: Code approach that solved a problem
2. **Pitfall encountered**: Bug or error that could recur
3. **Best practice applied**: Technique worth reusing

### Extraction Process

1. **Identify learnable code**:
   - Review git diff for non-trivial changes
   - Look for error fixes (potential pitfalls)
   - Look for architectural decisions (potential patterns)

2. **Classify and create entry**:
   ```javascript
   // Detect category from file paths and content
   if (file.includes('/db/') || content.includes('drizzle')) {
     category = 'database';
   }

   // Create pattern entry
   const pattern = {
     id: generateId(category), // e.g., DB-005
     title: extractTitle(commit),
     problem: extractProblem(prDescription),
     solution: extractSolution(diff),
     codeAfter: extractCode(diff),
     learnedFrom: featureId,
     severity: assessSeverity(bugType),
     tags: extractTags(content),
   };
   ```

3. **Enhance with Context7**:
   ```
   → Resolve library ID for framework used
   → Query docs for official pattern
   → Add context7Query and context7LibraryId to pattern
   ```

4. **Update category file**:
   ```javascript
   const categoryFile = `.nomos/learning/code/${category}.json`;
   const existing = JSON.parse(read(categoryFile));
   existing.patterns.push(pattern);
   existing.lastUpdated = new Date().toISOString();
   write(categoryFile, JSON.stringify(existing, null, 2));
   ```

---

## Pattern IDs

| Category | Prefix | Example |
|----------|--------|---------|
| Database | DB- | DB-001 |
| Security | SEC- | SEC-001 |
| React | REACT- | REACT-001 |
| TypeScript | TS- | TS-001 |
| API | API- | API-001 |
| Error Handling | ERR- | ERR-001 |
| DevOps | DEVOPS- | DEVOPS-001 |
| Pitfall | PIT-{CAT}- | PIT-DB-001 |
| Best Practice | BP-{CAT}- | BP-DB-001 |

---

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **CRITICAL** | Causes crashes, data loss, security holes | Always apply, verify with Context7 |
| **HIGH** | Causes bugs, poor UX, technical debt | Apply when relevant |
| **MEDIUM** | Affects quality, maintainability | Consider applying |
| **LOW** | Nice to have, optimization | Apply if time permits |

---

## Integration Points

| Step | Action | Context7 Usage |
|------|--------|----------------|
| 01-context | Load patterns | Verify CRITICAL/HIGH patterns |
| 02-analyze | Match patterns to feature | - |
| 03-plan | Include relevant patterns | Look up implementation details |
| 04-execute | Apply patterns | Reference code examples |
| 06-review | Check against patterns | Verify implementation |
| 09-learn | Extract new patterns | Enhance with official docs |

---

## Example: Full Flow

### Feature: F023 - Add Session Repository

**Step 1: Load Context**
```
Categories detected: database, typescript
Patterns loaded:
- DB-001: Sync transactions (CRITICAL) - Context7 verified ✓
- DB-003: Connection lifecycle (HIGH)
- TS-001: Zod schema inference (MEDIUM)

Pitfalls to avoid:
- PIT-DB-001: Transaction API mismatch
```

**Step 4: Execute**
```typescript
// Applying DB-001 pattern
const sqlite = getNativeSqlite(db);
sqlite.transaction(() => {
  // ... session operations
})();
```

**Step 9: Learn**
```
New pattern extracted:
- ID: DB-005
- Title: Session cleanup on disconnect
- Problem: Orphaned sessions when WebSocket disconnects
- Solution: Track sessions in Map, cleanup on disconnect
- Context7 enhanced: Yes (queried Bun WebSocket docs)
```
