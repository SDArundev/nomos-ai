# NOMOS Component Map

Complete inventory of all NOMOS system files, their roles, and cross-file relationships.

## Table of Contents

1. [Skill Core](#skill-core)
2. [Pipeline Steps](#pipeline-steps)
3. [Output Templates](#output-templates)
4. [Scripts](#scripts)
5. [Reference Documents](#reference-documents)
6. [Agent Definitions](#agent-definitions)
7. [Learning System](#learning-system)
8. [Schemas & Specs](#schemas--specs)
9. [Dependency Graph](#dependency-graph)

---

## Skill Core

| File | Role | Read By | Written By |
|------|------|---------|------------|
| `skills/nomos/SKILL.md` | Master skill definition, workflow overview, flag docs | Claude (on trigger) | Human/improver |

**Key sections:** Quick Start, Parameters, Output Structure, Workflow (7 steps), State Variables, Allowed Tools, Critical Rules

---

## Pipeline Steps

| File | Step | Agents Launched | Reads | Writes |
|------|------|-----------------|-------|--------|
| `steps/step-00-init.md` | Init | none (orchestrator) | features.json, SKILL.md | 00-context.md (via nomos.sh init) |
| `steps/step-01-context.md` | Context | load-learnings, explore-codebase, research-docs | learning/*.json, codebase | 01-context.md |
| `steps/step-02-plan.md` | Plan | none (orchestrator) | 01-context.md, codebase | 02-plan.md |
| `steps/step-03-execute.md` | Execute | code-writer, qa-reviewer | 02-plan.md | 03-execute.md |
| `steps/step-04-verify.md` | Verify | smoke-tester, functional-tester, security/quality/coverage reviewers | 03-execute.md, codebase | 04-verify.md |
| `steps/step-05-merge.md` | Merge | none (orchestrator) | 04-verify.md | 05-merge.md |
| `steps/step-06-finish.md` | Finish | learning-extractor, ship-agent | 05-merge.md | 06-finish.md, learning/*.json |

**Step loading:** SKILL.md loads step-00 → step-00 loads step-01 → ... → step-06 (progressive chain)

---

## Output Templates

| File | Rendered By | Variables Used | Corresponds To |
|------|-------------|----------------|----------------|
| `templates/00-context.md` | `nomos.sh init` | feature_id, title, phase, priority, description, acceptance_criteria, dependencies, flags, worktree_path, timestamps | step-00 |
| `templates/01-context.md` | `nomos.sh init` | timestamp, feature_title | step-01 |
| `templates/02-plan.md` | `nomos.sh init` | timestamp, feature_title | step-02 |
| `templates/03-execute.md` | `nomos.sh init` | timestamp, feature_title, max_iterations | step-03 |
| `templates/04-verify.md` | `nomos.sh init` | timestamp, feature_title | step-04 |
| `templates/05-merge.md` | `nomos.sh init` | timestamp, feature_title | step-05 |
| `templates/06-finish.md` | `nomos.sh init` | timestamp, feature_title | step-06 |

**Variable rendering:** `nomos.sh init` uses `sed` substitution with `{{variable_name}}` pattern.

---

## Scripts

### nomos.sh (~1000 lines)

| Command | Called By | Purpose |
|---------|-----------|---------|
| `state start <id>` | step-00 | pending → in_progress |
| `state claim <id>` | step-00 | Atomic claim (returns ALREADY_CLAIMED) |
| `state complete <id>` | step-04 | in_progress → waiting_approval |
| `state verify <id>` | step-05 | waiting_approval → verified |
| `state reset <id>` | manual | any → pending |
| `state preverify <id>` | step-01 | pending → verified (skip) |
| `state get <id>` | step-00, step-01 | Read feature state |
| `state next` | step-00 | Get next pending feature |
| `ports allocate <id>` | step-00 | Allocate unique ports |
| `ports release <id>` | step-05 | Release ports |
| `ports cleanup` | manual | Kill orphaned processes |
| `init <id> <args>` | step-00 | Render all templates |
| `diff <id>` | step-05, step-06 | Show feature diff |
| `metrics <id>` | step-06 | Collect feature metrics |
| `health <id>` | step-04 | Server health check |
| `insights <id>` | step-01 | Relevance-scored insights |
| `patterns <id>` | step-01, step-02 | Filtered patterns |
| `cleanup [--stale]` | manual | Clean up stale features + orphaned worktrees |

### nomos-verify.sh (~220 lines)

| Command | Called By | Purpose |
|---------|-----------|---------|
| `start <id>` | step-04 Track B | Start dev servers |
| `wait <id>` | step-04 Track B | Wait for health |
| `smoke <id>` | step-04 Track B | Basic smoke test |
| `stop <id>` | step-04 Track B | Kill servers |
| `status <id>` | step-04 Track B | Check server status |

---

## Reference Documents

| File | Purpose | Read By | Key Content |
|------|---------|---------|-------------|
| `references/agent-prompts.md` | Prompt templates for all agents | Steps 01, 03, 04, 06 | Agent invocation patterns |
| `references/output-formats.md` | Markdown output standards | All steps | Compact context transfer blocks |
| `references/parallel-execution.md` | Multi-agent architecture | Steps 01, 04, 06 | Parallel launch rules |
| `references/state-machine.md` | Feature state transitions | Steps 00, 01, 04, 05 | 4 states, transition guards |
| `references/quality-gates.md` | Blocking check definitions | Steps 04, 05 | ART/SEC/CQ/BV/CI gates |
| `references/merge-strategies.md` | Git conflict resolution | Step 05 | Import/Append/Ordering strategies |
| `references/failure-classification.md` | Error taxonomy | Step 04 | 9 failure types, recovery rules |
| `references/code-knowledge.md` | Codebase pattern database | Steps 01, 06 | Code patterns, pitfalls, best practices |
| `references/patterns.md` | Learned pattern library | Steps 01, 02 | Pattern categories, storage format |

---

## Agent Definitions

| File | Agent Name | Model | Used In | Mode |
|------|------------|-------|---------|------|
| `agents/load-learnings.md` | load-learnings | haiku | Step 01 | Load patterns, metrics, risk assessment |
| `agents/code-writer.md` | code-writer | sonnet | Step 03 | INITIAL_IMPLEMENTATION / FIX_ISSUES |
| `agents/qa-reviewer.md` | qa-reviewer | sonnet | Step 03 | Read-only review |
| `agents/qa-smoke-tester.md` | qa-smoke-tester | sonnet | Step 04 Track B | Playwright + Bash |
| `agents/qa-functional-tester.md` | qa-functional-tester | sonnet | Step 04 Track B | Playwright + Bash |
| `agents/security-reviewer.md` | security-reviewer | sonnet | Step 04 Track C | Static analysis |
| `agents/code-quality-reviewer.md` | code-quality-reviewer | haiku | Step 04 Track C | Static analysis |
| `agents/test-coverage-analyzer.md` | test-coverage-analyzer | haiku | Step 04 Track C | Static analysis |
| `agents/explore-codebase.md` | explore-codebase | haiku | Step 01 | Grep + Read |
| `agents/explore-docs.md` | explore-docs | haiku | Step 01 | Context7 MCP |
| `agents/websearch.md` | websearch | haiku | Step 01 | WebSearch |
| `agents/research-docs.md` | research-docs | haiku | Step 03 (on-demand) | Context7 API lookup |
| `agents/action.md` | action | haiku | Step 04 (conditional) | Verify-then-act |

---

## Learning System

| File | Purpose | Written By | Read By |
|------|---------|------------|---------|
| `learning/patterns.json` | Reusable patterns (PAT-*, SRV-*) | Step 06 | Step 01, Step 02 |
| `learning/antipatterns.json` | Known mistakes (ANTI-*) | Step 06 | Step 01, Step 03 |
| `learning/metrics.json` | Per-feature metrics | Step 06 | Step 01, Step 02 |
| `learning/insights/F*.json` | Per-feature detailed insights | Step 06 | Step 01 |
| `learning/code/codebase-map.json` | File-to-purpose map | Step 06 | Step 01 |
| `learning/code/database.json` | DB patterns | Step 06 | Step 01 |
| `learning/code/server.json` | Backend patterns | Step 06 | Step 01 |
| `learning/code/typescript.json` | Type patterns | Step 06 | Step 01 |

---

## Schemas & Specs

| File | Purpose | Validates |
|------|---------|-----------|
| `schemas/feature.schema.json` | Feature backlog schema | features.json |
| `schemas/app_spec.schema.json` | App specification schema | app_spec.json |
| `features.json` | Feature backlog (source of truth) | — |
| `app_spec.json` | Project specification | — |

---

## Dependency Graph

```
SKILL.md
├── step-00-init.md
│   ├── nomos.sh (state, ports, init)
│   ├── features.json (read feature)
│   └── templates/*.md (rendered by nomos.sh init)
├── step-01-context.md
│   ├── agents/load-learnings.md
│   ├── agents/explore-codebase.md
│   ├── agents/explore-docs.md
│   ├── agents/websearch.md (optional)
│   ├── nomos.sh (insights, patterns)
│   ├── learning/*.json (all files)
│   └── references/agent-prompts.md
├── step-02-plan.md
│   ├── nomos.sh (metrics --category-stats)
│   └── references/patterns.md
├── step-03-execute.md
│   ├── agents/code-writer.md
│   ├── agents/qa-reviewer.md
│   └── references/agent-prompts.md
├── step-04-verify.md
│   ├── nomos-verify.sh (start, wait, smoke, stop)
│   ├── agents/qa-smoke-tester.md
│   ├── agents/qa-functional-tester.md
│   ├── agents/security-reviewer.md
│   ├── agents/code-quality-reviewer.md
│   ├── agents/test-coverage-analyzer.md
│   ├── references/quality-gates.md
│   └── references/failure-classification.md
├── step-05-merge.md
│   ├── nomos.sh (state verify, ports release)
│   └── references/merge-strategies.md
└── step-06-finish.md
    ├── nomos.sh (metrics, diff)
    ├── learning/*.json (write)
    └── references/output-formats.md
```
