# NOMOS Audit Checklist

Per-component-type checklists for auditing the NOMOS system.

## Table of Contents

1. [Step Files](#step-files)
2. [Agent Definitions](#agent-definitions)
3. [Templates](#templates)
4. [Scripts](#scripts)
5. [References](#references)
6. [Learning System](#learning-system)
7. [SKILL.md](#skillmd)
8. [System-Wide Consistency](#system-wide-consistency)

---

## Step Files

**Location:** `.claude/skills/nomos/steps/step-*.md`

For each step file, verify:

- [ ] **Numbering** — Step number in filename matches content headings and template reference
- [ ] **Next step loading** — Ends with instruction to load the next step (or marks final step)
- [ ] **Agent references** — All agent names match files in `.claude/agents/`
- [ ] **Script calls** — All `nomos.sh` and `nomos-verify.sh` commands exist in the scripts
- [ ] **Variable usage** — Uses `{variable_name}` consistently with SKILL.md state variables
- [ ] **Output path** — Uses `{output_dir}` (absolute) for all output writes, never relative paths
- [ ] **Template alignment** — Step output format matches corresponding template structure
- [ ] **Parallel launch** — Multi-agent steps specify "launch in SINGLE message"
- [ ] **Read before load** — References to other files use Read tool, not assumptions
- [ ] **No scope creep** — Step focuses on its defined responsibility, doesn't overlap with adjacent steps
- [ ] **Error handling** — Defines what happens on failure (retry, escalate, skip)
- [ ] **Context transfer** — Includes compact context block specification for next step

### Per-Step Specifics

**step-00-init:** Flag parsing matches SKILL.md parameters, worktree created BEFORE output, ports allocated
**step-01-context:** 3 parallel agents, pre-implementation check, no planning
**step-02-plan:** File-by-file breakdown, plan critique (4 checks), no code writing
**step-03-execute:** Max iteration count defined, mode detection (INITIAL vs FIX), checkpoint writing
**step-04-verify:** 3 parallel tracks, server lifecycle (start→wait→test→stop), gate enforcement
**step-05-merge:** Rebase before merge, final validation, state update to verified, port release
**step-06-finish:** Learning extraction + ship, pattern freshness check, metrics recording

---

## Agent Definitions

**Location:** `.claude/agents/*.md`

For each agent, verify:

- [ ] **Model specified** — Has explicit model (sonnet/haiku) matching its complexity
- [ ] **Role clarity** — First paragraph clearly states what the agent does and doesn't do
- [ ] **Tool access** — Lists only tools the agent actually needs (principle of least privilege)
- [ ] **Input format** — Documents what input the agent expects (plan, issues list, context)
- [ ] **Output format** — Specifies exact output structure (verdict, report, file changes)
- [ ] **Constraints** — Defines boundaries (read-only, no scope creep, no file creation)
- [ ] **Severity classification** — Uses consistent severity levels (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] **Confidence levels** — Where applicable, outputs include confidence scores
- [ ] **Referenced in step** — At least one step file launches this agent
- [ ] **Referenced in agent-prompts.md** — Has corresponding entry in agent-prompts reference
- [ ] **No overlapping responsibility** — Doesn't duplicate another agent's role
- [ ] **Antipattern awareness** — References known antipatterns relevant to its domain

### Agent Categories

**Implementers** (write access): code-writer
**Reviewers** (read-only): qa-reviewer, security-reviewer, code-quality-reviewer, test-coverage-analyzer
**Testers** (runtime): qa-smoke-tester, qa-functional-tester
**Explorers** (research): explore-codebase, explore-docs, websearch
**Learning** (read-only): load-learnings
**Utility** (conditional): action

---

## Templates

**Location:** `.claude/skills/nomos/templates/*.md`

For each template, verify:

- [ ] **Number alignment** — Template number (00-06) matches corresponding step
- [ ] **Variable syntax** — Uses `{{variable_name}}` consistently (double curly braces)
- [ ] **All variables rendered** — Every `{{var}}` is set by `nomos.sh init` command
- [ ] **No hardcoded values** — Dynamic content uses variables, not literal strings
- [ ] **Section structure** — Headings match what the corresponding step expects to fill in
- [ ] **Compact context block** — Templates for steps 01-06 include placeholder for context transfer
- [ ] **Progress tracking** — Template 00 includes progress table with all 7 steps
- [ ] **Consistent formatting** — Uses same markdown conventions as other templates

---

## Scripts

**Location:** `.claude/skills/nomos/scripts/*.sh`

For each script, verify:

- [ ] **Syntax valid** — `bash -n script.sh` passes
- [ ] **Shebang line** — Starts with `#!/bin/bash` or `#!/usr/bin/env bash`
- [ ] **Error handling** — Uses `set -e` or explicit error checks
- [ ] **All commands referenced** — Every subcommand is called by at least one step
- [ ] **No dead commands** — No subcommands that nothing calls
- [ ] **Portable** — Works on macOS and Linux (no GNU-only flags)
- [ ] **Lock safety** — Lock operations have timeout/cleanup (nomos.sh state)
- [ ] **Path handling** — Uses absolute paths or resolves relative paths safely
- [ ] **Feature ID validation** — Validates feature ID format before operations
- [ ] **Idempotent where possible** — Repeated calls don't corrupt state
- [ ] **Output format** — stdout is parseable (JSON or simple key=value)

### nomos.sh Specifics

- [ ] All state transitions match `references/state-machine.md`
- [ ] Port allocation avoids collisions (unique per feature)
- [ ] Template init renders all variables defined in templates
- [ ] Metrics collection captures all fields expected by `learning/metrics.json`
- [ ] Insights scoring algorithm matches documented relevance criteria

### nomos-verify.sh Specifics

- [ ] Server start handles already-running processes
- [ ] Wait has configurable timeout
- [ ] Stop kills both server and web processes
- [ ] PID files cleaned up on stop
- [ ] Port-based fallback kill when PID kill fails

---

## References

**Location:** `.claude/skills/nomos/references/*.md`

For each reference, verify:

- [ ] **Listed in SKILL.md** — Referenced or discoverable from SKILL.md
- [ ] **Referenced by step** — At least one step reads this reference
- [ ] **No stale content** — Information matches current implementation
- [ ] **Consistent terminology** — Uses same names for agents, states, gates as rest of system
- [ ] **No duplication** — Content doesn't repeat what's already in SKILL.md or step files
- [ ] **Actionable content** — Provides concrete rules/patterns, not vague guidance
- [ ] **Table of contents** — Files over 100 lines have a TOC

### Per-Reference Specifics

**agent-prompts.md:** Every agent has a prompt template, templates match agent .md files
**output-formats.md:** Formats match what steps actually produce, context transfer blocks consistent
**parallel-execution.md:** Parallelism rules match step implementations
**state-machine.md:** States and transitions match nomos.sh state commands
**quality-gates.md:** Gate IDs and checks match step-04 and step-05 implementations
**merge-strategies.md:** Strategies match step-05 conflict resolution code
**failure-classification.md:** Failure types match step-04 error handling
**code-knowledge.md:** File categories match learning/code/ directory structure
**patterns.md:** Pattern format matches learning/patterns.json schema

---

## Learning System

**Location:** `.nomos/learning/`

- [ ] **JSON valid** — All .json files parse without errors
- [ ] **Pattern IDs unique** — No duplicate PAT-*, SRV-*, ANTI-* IDs across files
- [ ] **Metrics complete** — Every verified feature has an entry in metrics.json
- [ ] **Insights exist** — Every completed feature has a `learning/insights/F*.json` file
- [ ] **Codebase map current** — `code/codebase-map.json` includes recently added files
- [ ] **Confidence scores valid** — All confidence values between 0.0 and 1.0
- [ ] **Risk levels valid** — All risk levels are LOW, MEDIUM, or HIGH
- [ ] **Severity levels valid** — All severity levels are CRITICAL, HIGH, MEDIUM, or LOW
- [ ] **No orphaned patterns** — Patterns reference features that exist in features.json
- [ ] **Anti-pattern freshness** — Anti-patterns still relevant to current codebase

---

## SKILL.md

**Location:** `.claude/skills/nomos/SKILL.md`

- [ ] **Frontmatter valid** — Has name and description
- [ ] **Description triggers** — Description covers all invocation patterns
- [ ] **Parameter completeness** — All flags documented with defaults
- [ ] **Workflow matches steps** — Workflow section lists same steps as step files
- [ ] **Agent list complete** — All agents mentioned in steps are listed
- [ ] **State variables complete** — All variables used in steps are defined
- [ ] **Allowed tools complete** — Tool list covers what steps actually use
- [ ] **Critical rules current** — Rules match current implementation
- [ ] **Output structure matches** — Listed output files match templates
- [ ] **Progressive loading chain** — Step loading instructions are correct

---

## nomos-verify Checklist

**Location:** `.claude/skills/nomos-verify/`

- [ ] **SKILL.md triggers** — Includes "nomos verify", "/nomos verify", "codebase audit"
- [ ] **Step count** — 5 steps (00-04) match SKILL.md pipeline diagram
- [ ] **Depth levels** — Quick (2), Standard (3), Deep (5) agent counts correct
- [ ] **--audit flag** — Sets deep + all + codebase correctly in step-00
- [ ] **Agent references** — All agent names match `.claude/agents/` files
- [ ] **Output path** — Uses `{output_dir}` (absolute) consistently
- [ ] **Read-only default** — Steps 00-02 never modify code files
- [ ] **Fix mode isolation** — Worktree only created in step-03 (if -f flag)
- [ ] **Dimension definitions** — analysis-dimensions.md covers all 5 (+ optional 6th)
- [ ] **Severity guide** — Consistent CRITICAL/HIGH/MEDIUM/LOW classification

---

## nomos-refactor Checklist

**Location:** `.claude/skills/nomos-refactor/`

- [ ] **SKILL.md triggers** — Includes "nomos refactor", "/nomos refactor"
- [ ] **Step count** — 9 steps (00-08) match SKILL.md step_files table
- [ ] **Agent references** — Uses `explore-codebase` (not `code-explorer`), `code-architect` exists
- [ ] **Learning reads** — step-01 reads patterns.json and antipatterns.json (graceful)
- [ ] **Learning writes** — step-08 writes to refactoring-history.json and patterns.json
- [ ] **Worktree isolation** — All code changes in worktree, never main
- [ ] **Safety features** — Baseline tests, incremental validation, rollback points
- [ ] **Risk levels** — LOW/MEDIUM/HIGH/CRITICAL consistent with SKILL.md
- [ ] **Scripts** — init.sh, state.sh, cleanup.sh all have correct paths
- [ ] **Refactor types** — 8 types (dependency, move, rename, optimize, extract, inline, modernize, structure) all have analysis templates

---

## Cross-Skill Consistency

Checks across all NOMOS sub-skills:

- [ ] **Routing** — step-00-init.md routes verify/refactor/improve correctly
- [ ] **Naming convention** — All skills follow `nomos-*` pattern
- [ ] **Shared agents** — Agent names consistent across all skills that reference them
- [ ] **Learning system** — All write paths use merge (never overwrite)
- [ ] **Output conventions** — Each skill has its own output directory (.nomos/output/, .nomos/verify/, .nomos/refactor/)
- [ ] **SKILL.md triggers** — No overlapping triggers that could cause mis-routing
- [ ] **State machine** — Feature states consistent across skills
- [ ] **Progressive loading** — All skills use step-by-step loading pattern
- [ ] **Component map** — component-map.md covers all 4 skills

---

## System-Wide Consistency

Cross-cutting checks across all components:

- [ ] **Agent names consistent** — Same agent name used in step file, agent .md, agent-prompts.md
- [ ] **Step numbers consistent** — step-NN.md ↔ NN-name.md template ↔ SKILL.md workflow
- [ ] **State names consistent** — pending/in_progress/waiting_approval/verified used uniformly
- [ ] **Severity taxonomy consistent** — CRITICAL/HIGH/MEDIUM/LOW used uniformly (not ERROR/WARNING etc.)
- [ ] **Variable names consistent** — Same variable names in SKILL.md, step files, templates
- [ ] **Path conventions consistent** — Absolute paths for output_dir, relative for worktree-internal
- [ ] **Gate IDs consistent** — ART-*/SEC-*/CQ-*/BV-*/CI-* used uniformly
- [ ] **Pattern ID format consistent** — PAT-NNN, SRV-NNN, ANTI-NNN format
- [ ] **No dead references** — No links to files/sections/agents that don't exist
- [ ] **No undocumented features** — No script commands or agent capabilities missing from docs
