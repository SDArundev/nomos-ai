# Step 00: Initialize Verification

<objective>
Parse arguments, determine scope, create isolated worktree for verification.
</objective>

<instructions>

## 0. Create Isolated Worktree

Verification runs in isolation to avoid modifying main directly.

```bash
# Generate timestamp-based identifiers
timestamp=$(date +%Y-%m-%dT%H-%M-%S)
branch_name="verify/${timestamp}"
worktree_path=".nomos/worktrees/verify-${timestamp}"

# Create branch from current HEAD
git branch "${branch_name}"

# Create worktree
git worktree add "${worktree_path}" "${branch_name}"

echo "Created verification worktree at ${worktree_path}"
```

**Why isolation?**
- Verification may modify features.json (reverts, bug fixes)
- Learning step updates .nomos/learning/ files
- Keep main clean until changes are reviewed/approved
- Consistent with NOMOS worktree pattern

## 1. Parse Arguments

Extract from user input:
- **Feature ID or Range:** e.g., `F027`, `F027-F050`
- **Flags:** `-a`, `-s`, `-r`, `-q`, `-d`, `-f`

**Default values:**
```
scope = "single"
mode = "standard"  # quick, standard, deep
auto_fix = false
regression_only = false
```

## 2. Determine Scope

Based on arguments, set `{scope}` and `{features_to_verify}`:

| Input | Scope | Features |
|-------|-------|----------|
| `F027` | single | [F027] |
| `F027-F050` | range | [F027, F028, ..., F050] |
| `-s verified` | verified | all with status=verified |
| `-s pending` | pending | all with status=pending |
| `-r` | verified | all with status=verified (regression) |
| `-s all` | all | entire feature set |

## 3. Load Features

```bash
# Read features.json
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.nomos/features.json', 'utf8'));
// Filter based on scope
// Output list of feature IDs to verify
"
```

## 4. Create Output Directory

```bash
timestamp=$(date +%Y-%m-%dT%H-%M-%S)
output_dir=".nomos/verify/${timestamp}"
mkdir -p "${output_dir}"
```

## 5. Set State Variables

| Variable | Value |
|----------|-------|
| `{scope}` | single/range/verified/pending/all |
| `{mode}` | quick/standard/deep |
| `{auto_fix}` | true/false |
| `{regression_only}` | true/false |
| `{features_to_verify}` | list of feature IDs |
| `{output_dir}` | path to output directory |
| `{timestamp}` | ISO timestamp |
| `{worktree_path}` | path to verification worktree |
| `{branch_name}` | verification branch name |

## 6. Display Configuration

```markdown
## Verification Configuration

| Setting | Value |
|---------|-------|
| Scope | {scope} |
| Mode | {mode} |
| Features | {count} |
| Auto-fix | {auto_fix} |
| Output | {output_dir} |
```

</instructions>

<next_step>
Load `steps/step-01-discover.md`
</next_step>
