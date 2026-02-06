---
name: step-02-plan
description: "Create a detailed, step-by-step plan for executing the refactor safely"
prev_step: steps/step-01-analyze.md
next_step: steps/step-03-baseline.md
---

# Step 02: Create Refactoring Plan

<objective>
Create a detailed, step-by-step plan for executing the refactor safely.
</objective>

<instructions>

## 1. Generate Plan Based on Type

### Dependency Replacement Plan

```markdown
## Refactoring Plan: {target} → {replacement}

### Step 1: Install New Dependency
- [ ] `bun add {replacement}`
- [ ] Verify installation

### Step 2: Create Compatibility Layer (if needed)
- [ ] Map differing APIs
- [ ] Create adapter functions

### Step 3: Update Imports (by file)
{for each file}
- [ ] `{file}`: Update imports
  - Change: `import { x } from '{target}'`
  - To: `import { x } from '{replacement}'`
{end for}

### Step 4: Handle API Differences
{for each breaking change}
- [ ] `{file}`: Update `{old_api}` to `{new_api}`
{end for}

### Step 5: Update Type Imports
{for each type import}
- [ ] `{file}`: Update type import
{end for}

### Step 6: Remove Old Dependency
- [ ] `bun remove {target}`
- [ ] Verify no remaining imports

### Step 7: Run Validation
- [ ] Type check
- [ ] Tests
- [ ] Lint
```

### Move/Restructure Plan

```markdown
## Refactoring Plan: Move {target} → {replacement}

### Step 1: Create Destination
- [ ] Create directory structure at {replacement}

### Step 2: Move Files
{for each file}
- [ ] Move `{source}` to `{destination}`
{end for}

### Step 3: Update Internal Imports
- [ ] Update imports within moved files

### Step 4: Update External Imports
{for each importer}
- [ ] `{file}`: Update import path
{end for}

### Step 5: Update Configuration
- [ ] tsconfig.json paths
- [ ] Package.json (if creating package)

### Step 6: Run Validation
- [ ] Type check
- [ ] Tests
- [ ] Lint
```

### Rename Plan

```markdown
## Refactoring Plan: Rename {target} → {replacement}

### Step 1: Rename Definition
- [ ] `{file}:{line}`: Rename {target} to {replacement}

### Step 2: Update References
{for each reference}
- [ ] `{file}:{line}`: Update reference
{end for}

### Step 3: Update String Literals (if applicable)
{for each string}
- [ ] `{file}:{line}`: Update string "{target}"
{end for}

### Step 4: Update Documentation
- [ ] Update JSDoc/comments
- [ ] Update README if mentioned

### Step 5: Run Validation
- [ ] Type check
- [ ] Tests
- [ ] Lint
```

## 2. Determine Execution Order

```javascript
// Sort steps by dependency and risk
const orderedSteps = steps.sort((a, b) => {
  // Tests and validation last
  if (a.type === 'validate') return 1;
  if (b.type === 'validate') return -1;

  // Structural changes first
  if (a.type === 'structure') return -1;
  if (b.type === 'structure') return 1;

  // Then imports
  return a.file.localeCompare(b.file);
});
```

## 3. Identify Checkpoint Locations

Mark safe rollback points:

```javascript
const checkpoints = [
  { after: "Step 1", reason: "Before any code changes" },
  { after: "Step 3", reason: "After major structural changes" },
  { after: "Step 5", reason: "Before validation" }
];
```

## 4. Save Plan

Save to `{output_dir}/plan.md`

## 5. Update State

```json
{
  "status": "planned",
  "plan": {
    "total_steps": 7,
    "files_to_modify": 15,
    "checkpoints": ["after-step-1", "after-step-3"],
    "estimated_risk": "MEDIUM"
  }
}
```

## 6. Display Plan Summary

```markdown
## Refactoring Plan Ready

**Total Steps:** {count}
**Files to Modify:** {count}
**Checkpoints:** {count}
**Estimated Risk:** {risk}

See full plan: `{output_dir}/plan.md`

Proceeding to baseline capture...
```

</instructions>

<next_step>
Load `steps/step-03-baseline.md`
</next_step>
