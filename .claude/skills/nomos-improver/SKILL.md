---
name: nomos-improver
description: >
  Structured improvement of the NOMOS autonomous development system.
  Use when asked to improve, fix, audit, update, optimize, or refactor any part of the NOMOS pipeline:
  steps, agents, templates, scripts, references, learning files, schemas, or the SKILL.md itself.
  Triggers: "improve nomos", "update nomos", "fix nomos", "nomos pipeline", "nomos agents",
  "nomos steps", "nomos templates", "nomos scripts", "nomos learning", "audit nomos",
  "refactor nomos", "optimize nomos", "nomos system", "nomos quality".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(bash -n *)
  - Bash(python3 -c *)
  - Bash(jq *)
  - Bash(grep *)
  - Bash(find *)
  - Bash(wc *)
  - Bash(diff *)
  - Bash(ls *)
---

<objective>
Systematically improve the NOMOS autonomous development system while maintaining cross-file consistency. Uses progressive step loading and structured templates mirroring the NOMOS pipeline architecture.
</objective>

<quick_start>

```
# Audit a specific component type
"audit nomos agents"
"audit nomos steps"

# Improve a specific component
"improve step-04-verify"
"improve code-writer agent"

# System-wide audit
"audit entire nomos system"
```

</quick_start>

<component_types>

| Type | Location | Count | Format |
|------|----------|-------|--------|
| **Skill** | `.claude/skills/nomos/SKILL.md` | 1 | Markdown + YAML frontmatter |
| **Steps** | `.claude/skills/nomos/steps/step-*.md` | 7 | Markdown (progressive loading) |
| **Templates** | `.claude/skills/nomos/templates/*.md` | 7 | Markdown with `{{variables}}` |
| **Scripts** | `.claude/skills/nomos/scripts/*.sh` | 2 | Bash |
| **References** | `.claude/skills/nomos/references/*.md` | 9 | Markdown |
| **Agents** | `.claude/agents/*.md` | 11 | Markdown |
| **Learning** | `.nomos/learning/*.json` | 8+ | JSON |
| **Schemas** | `.nomos/schemas/*.json` | 2 | JSON Schema |
| **Specs** | `.nomos/features.json`, `.nomos/app_spec.json` | 2 | JSON |

For the complete file inventory with cross-file dependencies, see `references/component-map.md`.

</component_types>

<workflow>
**NOMOS Improver Pipeline (5 steps):**

```
00-init → 01-audit → 02-plan → 03-execute → 04-validate
(scope)   (check)    (design)  (apply)      (verify)
```

</workflow>

<state_variables>

| Variable | Type | Description |
|----------|------|-------------|
| `{improvement_type}` | string | audit, improve, fix, add, restructure, optimize |
| `{scope}` | string | Component type(s): step, agent, template, script, reference, learning, system |
| `{target_files}` | list | Specific files being inspected or modified |
| `{cascading_files}` | list | Files requiring updates due to cascading impacts |
| `{auto_mode}` | boolean | Skip confirmations (from user flags) |

</state_variables>

<entry_point>

**FIRST ACTION:** Load `steps/step-00-init.md`

Step 00 handles:
- Parse user intent (audit vs improve vs fix vs add)
- Identify scope (component types, specific files)
- Classify improvement complexity
- Initialize state variables

</entry_point>

<step_files>
**Progressive loading — only load current step:**

| Step | File | Purpose |
|------|------|---------|
| 00 | `steps/step-00-init.md` | Parse intent, scope, classify complexity |
| 01 | `steps/step-01-audit.md` | Read targets, run consistency checks, report findings |
| 02 | `steps/step-02-plan.md` | Design improvement with cascading impact analysis |
| 03 | `steps/step-03-execute.md` | Apply primary changes + cascading updates |
| 04 | `steps/step-04-validate.md` | Cross-reference checks, syntax validation, consistency |

</step_files>

<execution_rules>

- **Load one step at a time** — Only load the current step file
- **Follow next_step directive** at end of each step
- **Persist state variables** across all steps
- **Always read before edit** — Never modify a file without reading it first
- **Never break the pipeline** — If unsure about an impact, audit first

<critical>
**CROSS-FILE CONSISTENCY RULE:**
Every change to a NOMOS file can cascade to others. The impact table in step-02 MUST be consulted before any edit. Orphaned references (links to deleted/renamed content) are the #1 source of NOMOS bugs.
</critical>

</execution_rules>

<references>

| File | When to Read |
|------|-------------|
| `references/component-map.md` | Step 01 — full file inventory with dependency graph |
| `references/audit-checklist.md` | Step 01 — per-component audit checklists |
| `references/improvement-patterns.md` | Step 02 — proven recipes for common improvements |

</references>
