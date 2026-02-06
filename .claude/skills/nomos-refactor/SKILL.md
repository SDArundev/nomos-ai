---
name: nomos-refactor
description: >
  Safe, systematic codebase refactoring - dependency replacement, structure changes, optimizations.
  Always in isolated worktree with comprehensive validation.
  Triggers: "/nomos refactor", "nomos refactor", "/refactor", "refactor dependency", "refactor rename",
  "refactor move", "refactor optimize", "safe refactoring", "codebase refactoring".
argument-hint: "[-a] [-t <type>] <target> [replacement]"
---

<objective>
Execute safe, systematic refactoring operations with full traceability, validation, and rollback capability. All changes happen in isolated worktrees with comprehensive before/after testing.
</objective>

<quick_start>

**Replace a dependency:**
```bash
/refactor -t dependency lodash es-toolkit
```

**Move/restructure files:**
```bash
/refactor -t move "src/utils" "packages/shared/utils"
```

**Rename across codebase:**
```bash
/refactor -t rename "OldClassName" "NewClassName"
```

**Optimize for performance:**
```bash
/refactor -t optimize "apps/server/src/routes"
```

**Full autonomous refactor:**
```bash
/refactor -a -t dependency axios fetch
```

</quick_start>

<parameters>

<flags>
| Short | Long | Description |
|-------|------|-------------|
| `-a` | `--auto` | Autonomous mode: no confirmations |
| `-t` | `--type` | Refactor type (see types below) |
| `-d` | `--dry-run` | Show plan without executing |
| `-f` | `--force` | Skip safety checks (dangerous) |
| `-k` | `--keep` | Keep worktree after completion |
</flags>

<refactor_types>
| Type | Description | Example |
|------|-------------|---------|
| `dependency` | Replace one dependency with another | `lodash es-toolkit` |
| `move` | Move files/directories | `"src/utils" "packages/utils"` |
| `rename` | Rename symbol across codebase | `"OldName" "NewName"` |
| `optimize` | Performance optimization | `"apps/server"` |
| `extract` | Extract code to new module | `"src/big-file.ts" "utils"` |
| `inline` | Inline abstraction back | `"src/unnecessary-wrapper.ts"` |
| `modernize` | Update to modern patterns | `"callbacks" "async-await"` |
| `structure` | Reorganize project structure | `"monolith" "packages"` |
</refactor_types>

<examples>
```bash
# Replace lodash with es-toolkit
/refactor -t dependency lodash es-toolkit

# Move utilities to shared package
/refactor -t move "apps/server/src/utils" "packages/shared/src"

# Rename class across codebase
/refactor -t rename "FeatureService" "FeatureManager"

# Optimize slow module
/refactor -t optimize "apps/server/src/services/agent"

# Extract shared code
/refactor -t extract "apps/server/src/big-service.ts" "validation"

# Modernize callback patterns
/refactor -t modernize "callbacks" "async-await" --path "apps/server"

# Dry run to see plan
/refactor -d -t dependency moment dayjs

# Full auto mode
/refactor -a -t rename "userId" "accountId"
```
</examples>

</parameters>

<workflow>

## Phase 0: Setup Isolation
1. Create refactor branch: `refactor/{type}-{timestamp}`
2. Create worktree at `.nomos/worktrees/refactor-{timestamp}`
3. All modifications happen in worktree (isolated from main)
4. Merge back only if all validations pass

## Phase 1: Analysis
1. Parse arguments and determine refactor type
2. Analyze current state:
   - Find all usages of target
   - Map dependencies and importers
   - Identify test coverage
   - Check for breaking change risks
3. Generate impact report

## Phase 2: Planning
1. Create step-by-step refactor plan
2. Identify files to modify
3. Determine order of operations
4. Plan rollback points
5. Estimate risk level

## Phase 3: Baseline
1. Run full test suite (capture baseline)
2. Run type checking
3. Run linting
4. Record metrics (build time, bundle size, etc.)
5. Create checkpoint

## Phase 4: Execute
1. Execute refactor plan step by step
2. After each step:
   - Run relevant tests
   - Check types compile
   - Verify no regressions
3. If step fails: rollback to checkpoint

## Phase 5: Validate
1. Run full test suite (compare to baseline)
2. Run type checking
3. Run linting
4. Compare metrics to baseline
5. Manual smoke test if needed

## Phase 6: Review
1. Generate diff summary
2. Check for:
   - Unintended changes
   - Missing updates
   - Dead code left behind
   - Import cycle changes
3. Security scan if dependency change

## Phase 7: Merge
1. Review changes made in worktree
2. User approval (unless -a mode)
3. Merge to main with detailed commit message
4. Cleanup worktree

## Phase 8: Document
1. Record refactoring in `.nomos/learning/refactoring-history.json`
2. Update any affected documentation
3. Generate migration guide if breaking change

</workflow>

<agents>

## Refactoring Agents

| Agent | Phase | Purpose |
|-------|-------|---------|
| `explore-codebase` | Analysis (step-01) | Find usages, map dependencies |
| `code-architect` | Analysis + Planning (step-01, step-02) | Strategy, trade-offs, risk |
| `code-writer` | Execution (step-04) | Apply refactoring changes |
| `qa-smoke-tester` | Validation (step-05) | Verify app still runs |
| `security-reviewer` | Validation (step-06) | Check for introduced vulnerabilities |
| `test-coverage-analyzer` | Validation (step-05) | Ensure coverage maintained |

## Agent Launch Strategy

```
Analysis:  2 agents in parallel (explore-codebase + code-architect)
Execution: 1 agent sequential (code-writer, with incremental validation)
Validation: 3 agents in parallel (qa-smoke-tester + security-reviewer + test-coverage-analyzer)
```

</agents>

<safety_features>

## Safety Guarantees

| Feature | Description |
|---------|-------------|
| **Worktree isolation** | Never touches main branch directly |
| **Baseline tests** | Full test run before any changes |
| **Incremental validation** | Tests after each step |
| **Automatic rollback** | Revert on any failure |
| **Diff review** | Show all changes before merge |
| **Checkpoint system** | Restore points throughout |

## Risk Levels

| Level | Description | Action |
|-------|-------------|--------|
| LOW | Rename, simple move | Auto-merge if tests pass |
| MEDIUM | Dependency swap, extract | Require review |
| HIGH | Structure change, optimize | Require approval + manual test |
| CRITICAL | Breaking change | Require explicit confirmation |

</safety_features>

<output_structure>

**Reports saved to `.nomos/refactor/{timestamp}/`:**

```
.nomos/refactor/2026-01-26T21-00-00/
├── state.json           # Refactor state
├── analysis.md          # Impact analysis
├── plan.md              # Step-by-step plan
├── baseline.json        # Pre-refactor metrics
├── results.json         # Post-refactor metrics
├── diff-summary.md      # Changes made
└── migration-guide.md   # If breaking changes
```

</output_structure>

<entry_point>

**FIRST ACTION:** Load `steps/step-00-init.md`

Step 00 handles:
- Argument parsing
- Type determination
- Worktree creation
- Output directory setup

</entry_point>

<step_files>

| Step | File | Purpose |
|------|------|---------|
| 00 | `steps/step-00-init.md` | Parse args, create worktree |
| 01 | `steps/step-01-analyze.md` | Find usages, map dependencies |
| 02 | `steps/step-02-plan.md` | Create refactoring plan |
| 03 | `steps/step-03-baseline.md` | Run tests, capture metrics |
| 04 | `steps/step-04-execute.md` | Execute refactor with validation |
| 05 | `steps/step-05-validate.md` | Full validation suite |
| 06 | `steps/step-06-review.md` | Diff review, security check |
| 07 | `steps/step-07-merge.md` | Merge to main, cleanup |
| 08 | `steps/step-08-document.md` | Record history, update docs |

</step_files>

<success_criteria>

- All tests passing (same or better than baseline)
- Types compile without errors
- No lint errors introduced
- Metrics stable or improved
- All usages updated
- No dead code left behind
- Documentation updated if needed
- Refactoring recorded in history

</success_criteria>

<type_specific_guides>

## Dependency Replacement

```bash
/refactor -t dependency <old-package> <new-package>
```

Steps:
1. Find all imports of old package
2. Map API usage (functions, types)
3. Create mapping to new package API
4. Update imports file by file
5. Handle API differences
6. Update package.json
7. Run tests

## Move/Restructure

```bash
/refactor -t move "<source>" "<destination>"
```

Steps:
1. Find all importers of source
2. Move files to destination
3. Update all import paths
4. Update tsconfig paths if needed
5. Check for circular dependencies
6. Run tests

## Rename Symbol

```bash
/refactor -t rename "<old-name>" "<new-name>"
```

Steps:
1. Find symbol definition
2. Find all references
3. Rename definition
4. Update all references
5. Update string literals if needed
6. Update tests
7. Run tests

## Performance Optimization

```bash
/refactor -t optimize "<path>"
```

Steps:
1. Profile current performance
2. Identify bottlenecks
3. Plan optimizations
4. Implement with benchmarks
5. Compare to baseline
6. Document improvements

</type_specific_guides>

<integration_with_nomos>

## How This Fits NOMOS Workflow

```
Feature Development:
  /nomos -a F017     →  implements feature

Verification:
  /verify F017       →  second opinion

Refactoring:
  /refactor -t ...   →  safe modifications
```

## Recommended Usage

1. **Before major refactor:** `/refactor -d ...` (dry run first)
2. **After dependency audit:** `/refactor -t dependency ...`
3. **Code cleanup sprint:** `/refactor -t optimize ...`
4. **Architecture evolution:** `/refactor -t structure ...`

</integration_with_nomos>

## References

| File | When |
|------|------|
| `references/refactor-types.md` | Step 01 — type-specific strategies, agent configs, gotchas |
| `references/risk-assessment.md` | Step 01 — risk scoring, escalation rules, checkpoint strategy |
| `references/learning-integration.md` | Step 01, Step 08 — how to read/write learning data |

## Execution Rules

- Load one step at a time (progressive loading)
- Follow `next_step` directive at end of each step
- Always read before edit
- Consult `references/risk-assessment.md` for risk decisions
- Consult `references/refactor-types.md` for type-specific guidance
