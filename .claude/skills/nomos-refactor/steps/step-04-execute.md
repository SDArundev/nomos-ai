# Step 04: Execute Refactor

<objective>
Execute the refactoring plan step by step with validation after each step.
</objective>

<instructions>

## CRITICAL RULES

- 🛑 **STOP** on any test failure
- 🛑 **STOP** on any type error
- ✅ **CHECKPOINT** after major changes
- ✅ **VALIDATE** after each file group
- 📋 Work in `{worktree_path}`, NOT main

## 1. Execute Plan Steps

For each step in the plan:

```javascript
for (const step of plan.steps) {
  console.log(`Executing: ${step.name}`);

  // Execute the step
  await executeStep(step);

  // Quick validation
  const valid = await quickValidate();
  if (!valid) {
    await rollbackToCheckpoint(lastCheckpoint);
    throw new Error(`Step failed: ${step.name}`);
  }

  // Checkpoint if marked
  if (step.checkpoint) {
    await createCheckpoint(step.name);
  }
}
```

## 2. Type-Specific Execution

### Dependency Replacement

```bash
cd {worktree_path}

# Step 1: Install new dependency
bun add {replacement}

# Step 2: Update imports (use codemod or manual)
# For each file...
sed -i "s/from '{target}'/from '{replacement}'/g" {file}

# Step 3: Handle API differences (manual or with transforms)

# Step 4: Remove old dependency
bun remove {target}
```

### Move/Restructure

```bash
cd {worktree_path}

# Step 1: Create destination
mkdir -p {replacement}

# Step 2: Move files
mv {target}/* {replacement}/

# Step 3: Update imports (complex - use AST tools or careful sed)
# This requires careful handling of relative vs absolute paths
```

### Rename

```bash
cd {worktree_path}

# Use IDE-like rename or careful find/replace
# Serena's rename_symbol tool is ideal for this

# For simple cases:
find . -name "*.ts" -exec sed -i "s/\b{target}\b/{replacement}/g" {} +
```

## 3. Quick Validation Function

After each step group:

```bash
quick_validate() {
  # Type check (fast)
  bun run check-types --noEmit 2>&1 > /dev/null
  if [ $? -ne 0 ]; then
    echo "❌ Type check failed"
    return 1
  fi

  # Run affected tests only (fast)
  bun test --testPathPattern="{affected_pattern}" 2>&1 > /dev/null
  if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    return 1
  fi

  echo "✓ Quick validation passed"
  return 0
}
```

## 4. Checkpoint Function

```bash
create_checkpoint() {
  local name="$1"
  cd {worktree_path}

  git add -A
  git commit -m "checkpoint: ${name}"
  local hash=$(git rev-parse HEAD)

  # Record in state
  jq ".checkpoints += [{\"name\": \"${name}\", \"hash\": \"${hash}\"}]" \
    {output_dir}/state.json > tmp && mv tmp {output_dir}/state.json

  echo "✓ Checkpoint: ${name} (${hash})"
}
```

## 5. Rollback Function

```bash
rollback_to_checkpoint() {
  local checkpoint_hash="$1"
  cd {worktree_path}

  echo "Rolling back to ${checkpoint_hash}..."
  git reset --hard "${checkpoint_hash}"
  echo "✓ Rolled back"
}
```

## 6. Track Progress

Update state after each step:

```json
{
  "status": "executing",
  "current_step": 3,
  "total_steps": 7,
  "steps_completed": ["install-dep", "update-imports", "handle-api"],
  "last_checkpoint": "after-imports"
}
```

## 7. Handle Failures

If a step fails:

1. Log the error
2. Rollback to last checkpoint
3. If `{auto_mode}`: Try alternative approach or abort
4. If interactive: Ask user for guidance

```yaml
questions:
  - header: "Step Failed"
    question: "Step '{step_name}' failed. How to proceed?"
    options:
      - label: "Retry"
        description: "Try the step again"
      - label: "Skip"
        description: "Skip this step (risky)"
      - label: "Abort"
        description: "Rollback all changes"
    multiSelect: false
```

## 8. Completion Summary

```markdown
## Execution Complete

**Steps Completed:** {completed}/{total}
**Checkpoints Created:** {checkpoint_count}
**Files Modified:** {file_count}

{any_rollbacks ? "⚠️ Some rollbacks occurred - review carefully" : "✓ No rollbacks needed"}

Proceeding to full validation...
```

</instructions>

<next_step>
Load `steps/step-05-validate.md`
</next_step>
