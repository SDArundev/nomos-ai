---
name: nomos-verify
description: >
  Verification and regression testing for NOMOS features.
  Multi-dimensional analysis (bugs, quality, requirements, security, testing) with optional fix loop.
  Triggers: "/verify", "/nomos verify", "nomos verify", "verify feature", "regression check",
  "codebase audit", "second opinion", "analyze codebase", "health report", "code audit".
---

# NOMOS Verify

Read-only codebase analysis with parallel dimension-based agents and optional fix loop.

## Quick Start

```bash
/verify F027              # Verify single feature (standard depth)
/verify -q F027           # Quick check (2 dimensions)
/verify -d F027           # Deep analysis (5 dimensions)
/verify -d -f F027        # Deep + fix issues found
/verify -s verified       # Regression check all verified features
/verify -a -s all         # Full audit, auto mode
/verify -r                # Resume previous session
```

**Flags:** `-a` (auto), `-q` (quick), `-d` (deep), `-f` (fix), `-s` (scope), `-r` (resume), `-o` (output)

## Pipeline

```
00-init → 01-analyze → 02-report → [03-fix ↔ re-verify] → 04-finish
          (parallel)   (sequential)  (loop, max 3, optional) (sequential)
```

**FIRST ACTION:** Load `steps/step-00-init.md`

## Dual Focus Mode

| Scope | Analysis Mode | Focus |
|-------|-------------|-------|
| Single feature (`F027`) | **Feature-first** | Is this feature properly implemented? |
| Range (`F027-F050`) | **Feature-first** | Are these features properly implemented? |
| Verified / Pending / All | **Codebase-first** | How healthy is the overall project? |

## Depth Levels

| Depth | Dimensions | Agents |
|-------|-----------|--------|
| Quick (`-q`) | Bugs + Requirements | `code-reviewer`, `qa-reviewer` |
| Standard | Bugs + Quality + Requirements | + `scout` |
| Deep (`-d`) | ALL 5 | + `security-reviewer`, `code-reviewer` (coverage) |

## Agents

| Agent | Dimension | Depth |
|-------|-----------|-------|
| `code-reviewer` | Bugs + Coverage | Quick+ |
| `qa-reviewer` | Requirements | Quick+ |
| `scout` | Quality | Standard+ |
| `security-reviewer` | Security | Deep |
| `code-writer` | Fix loop | Step 03 only |

## Step Files

| Step | File | Mode |
|------|------|------|
| 00 | `steps/step-00-init.md` | Sequential — parse args, scope, output dir |
| 01 | `steps/step-01-analyze.md` | Parallel agents (Stage 1) |
| 02 | `steps/step-02-report.md` | Sequential — consolidate, report |
| 03 | `steps/step-03-fix.md` | Loop max 3 (Stage 2, conditional) |
| 04 | `steps/step-04-finish.md` | Sequential — summary, learning, cleanup |

## Critical Rules

**READ-ONLY BY DEFAULT:**
- Steps 00-02 are always read-only
- Worktree created ONLY in step-03 (if `-f` flag)
- No file modifications without explicit fix mode

**PARALLEL AGENTS:**
- Step-01 launches ALL agents in a SINGLE message
- Each agent analyzes a different DIMENSION (not a different feature)
- Agent count determined by depth level

**OUTPUT PATH:**
- `{output_dir}` is ALWAYS absolute
- Primary deliverable: `{output_dir}/02-report.md`

**LEARNING:**
- Always merge patterns, never overwrite
- Regressions always update features.json

## Output Structure

```
.nomos/verify/{timestamp}/
├── 00-init.md           # Session config
├── 01-analyze.md        # Raw agent findings
├── 02-report.md         # Comprehensive report (PRIMARY)
├── 03-fix.md            # Fix log (if -f flag)
├── 04-finish.md         # Final summary
├── issues.json          # Machine-readable findings
├── enhancements.json    # Enhancement suggestions
└── checkpoint.json      # Resume state
```

## References

| File | When |
|------|------|
| `references/agent-prompts.md` | Step 01 — agent prompt templates |
| `references/analysis-dimensions.md` | Step 01 — what each agent checks |
| `references/severity-guide.md` | Step 02 — severity classification |
| `references/output-formats.md` | All steps — report formats, context transfer |

## Execution Rules

- Load one step at a time (progressive loading)
- Follow `next_step` directive at end of each step
- Always read before edit (step-03 only)
- Consult `references/severity-guide.md` for classification decisions
