# NOMOS Improvement Patterns

Proven recipes for common improvements to the NOMOS system.

## Table of Contents

1. [Tighten Agent Prompt](#tighten-agent-prompt)
2. [Add New Agent](#add-new-agent)
3. [Add Quality Gate](#add-quality-gate)
4. [Add Step Variable](#add-step-variable)
5. [Add Template Variable](#add-template-variable)
6. [Add Script Command](#add-script-command)
7. [Restructure Step](#restructure-step)
8. [Update Learning Schema](#update-learning-schema)
9. [Add Reference Document](#add-reference-document)
10. [Fix Cross-File Inconsistency](#fix-cross-file-inconsistency)
11. [Optimize Agent Performance](#optimize-agent-performance)
12. [Add New Feature Category](#add-new-feature-category)

---

## Tighten Agent Prompt

**Complexity:** Low | **Files:** 1-2

**When:** Agent produces inconsistent output, misses edge cases, or exceeds its scope.

**Steps:**
1. Read the agent definition (`.claude/agents/{name}.md`)
2. Identify the specific problem (too verbose, wrong format, scope creep, missing check)
3. Edit the agent file with targeted changes:
   - Add/tighten constraints section
   - Add concrete examples of expected output
   - Add explicit "do NOT" rules for observed bad behaviors
   - Adjust severity/confidence thresholds
4. Update `references/agent-prompts.md` if it has a corresponding prompt template
5. Validate: agent name still matches references in step files

**Anti-patterns to avoid:**
- Don't make prompts longer than necessary — concise is better
- Don't add generic advice Claude already knows — only domain-specific rules
- Don't duplicate constraints already in the step file

---

## Add New Agent

**Complexity:** High | **Files:** 4+

**When:** A new capability is needed that doesn't fit existing agents.

**Steps:**
1. **Define the agent** — Create `.claude/agents/{name}.md`:
   - Choose model (sonnet for complex tasks, haiku for simple/fast)
   - Define role, tools, input format, output format, constraints
   - Add severity classification if it produces findings
2. **Add to step** — Edit the step file that will launch it:
   - Add agent to parallel launch block (if parallel) or sequential flow
   - Define what input context to pass
   - Define how to handle agent output
3. **Add prompt template** — Update `references/agent-prompts.md`:
   - Add section for the new agent under the relevant step
   - Include prompt template with variable placeholders
4. **Update SKILL.md** — Add agent to:
   - Agent list (if there is one)
   - Workflow section (under the step that uses it)
   - Allowed tools (if agent uses new tools)
5. **Update parallel-execution.md** — If agent runs in parallel, update parallel architecture docs
6. **Validate:** Run the full audit checklist for agents

**Template for new agent .md:**
```markdown
# {Agent Name}

{One-line role description.}

## Model
{sonnet|haiku}

## Input
{What context this agent receives.}

## Tools
{List of tools this agent can use.}

## Output Format
{Exact structure of what the agent produces.}

## Constraints
{Boundaries and rules.}
```

---

## Add Quality Gate

**Complexity:** Medium | **Files:** 3

**When:** A new validation check should block feature progression.

**Steps:**
1. **Define the gate** — Assign an ID following the convention:
   - `ART-NNN`: Architectural/process gates
   - `SEC-NNN`: Security gates
   - `CQ-NNN`: Code quality gates
   - `BV-NNN`: Browser validation gates
   - `CI-NNN`: CI integration gates
2. **Add to quality-gates.md** — Document:
   - Gate ID, name, description
   - Check command or procedure
   - Pass/fail criteria
   - Which step enforces it
3. **Add to step-04-verify.md** — Integrate into the appropriate track:
   - Track A (static): TypeScript, lint, test gates
   - Track B (runtime): Browser, server, functional gates
   - Track C (review): Security, quality, coverage gates
4. **Add to step-05-merge.md** (if pre-merge check) — Add to final validation
5. **Validate:** Gate ID is unique, enforcement matches documentation

---

## Add Step Variable

**Complexity:** Low | **Files:** 2-3

**When:** Steps need to share a new piece of state.

**Steps:**
1. **Define in SKILL.md** — Add to the "State Variables" section:
   - Variable name (snake_case in curly braces: `{new_variable}`)
   - Type and default value
   - Which step sets it, which steps read it
2. **Set in step** — Add variable assignment in the step that initializes it
3. **Use in downstream steps** — Reference with `{new_variable}` syntax
4. **Validate:** Variable is set before first use, no circular dependencies

---

## Add Template Variable

**Complexity:** Low | **Files:** 2

**When:** A template needs dynamic content that isn't currently rendered.

**Steps:**
1. **Add to template** — Use `{{variable_name}}` syntax in the target template
2. **Add to nomos.sh init** — Add `sed` substitution in the `cmd_init()` function:
   ```bash
   sed -i '' "s/{{variable_name}}/$VALUE/g" "$output_file"
   ```
3. **Validate:** Run `nomos.sh init` and verify the variable is rendered

---

## Add Script Command

**Complexity:** Medium | **Files:** 2+

**When:** Steps need a new operation that should be deterministic (not LLM-generated).

**Steps:**
1. **Implement in script** — Add function to `nomos.sh` (or `nomos-verify.sh` if server-related):
   - Follow existing function naming: `cmd_<subcommand>()` in nomos.sh
   - Add to the case statement in `main()`
   - Include usage/help text
   - Handle errors explicitly
2. **Call from step** — Add the command invocation in the relevant step file
3. **Update SKILL.md** — Add to allowed tools if it's a new bash command pattern
4. **Validate:** `bash -n` syntax check, test with a sample feature ID

---

## Restructure Step

**Complexity:** High | **Files:** 5+

**When:** A step's responsibility needs to change significantly.

**Steps:**
1. **Map impact** — Identify all files that reference this step:
   - SKILL.md (workflow section)
   - Previous step (loads this step)
   - Next step (receives this step's output)
   - Template (output structure)
   - agent-prompts.md (if agents change)
   - output-formats.md (if output format changes)
2. **Design new structure** — Define:
   - New sections and their order
   - What agents are launched (same, fewer, more?)
   - Input requirements from previous step
   - Output format for next step (compact context block)
3. **Edit step file** — Implement the restructure
4. **Update template** — Align template sections with new step output
5. **Update output-formats.md** — Update format documentation
6. **Update agent-prompts.md** — If agent invocations changed
7. **Update SKILL.md** — Workflow section, any affected state variables
8. **Update adjacent steps** — If input/output contract changed
9. **Validate:** Full system audit, especially step flow and context transfer

---

## Update Learning Schema

**Complexity:** Medium | **Files:** 3-4

**When:** Learning files need new fields or restructured data.

**Steps:**
1. **Design schema change** — Define new fields, types, required vs optional
2. **Update step-06-finish.md** — Change how learning data is written:
   - New fields extracted from feature implementation
   - New aggregation logic
3. **Update step-01-context.md** — Change how learning data is read:
   - New fields loaded and presented
   - New filtering/scoring logic
4. **Migrate existing data** — Update existing JSON files to new schema:
   - Add new fields with sensible defaults
   - Don't break existing data
5. **Update code-knowledge.md** — If code pattern schema changed
6. **Validate:** All JSON files parse, step-01 can read, step-06 can write

---

## Add Reference Document

**Complexity:** Low | **Files:** 2

**When:** A new topic needs dedicated documentation.

**Steps:**
1. **Create file** — Add to `references/{name}.md`:
   - Add table of contents if > 100 lines
   - Use consistent heading levels (## for sections, ### for subsections)
   - Include concrete rules/patterns, not vague advice
2. **Reference from SKILL.md or step** — Add link where the reference will be loaded:
   - `See [references/{name}.md](references/{name}.md) for details`
   - Specify WHEN to load it (progressive disclosure)
3. **Validate:** File exists, link works, no duplication with existing references

---

## Fix Cross-File Inconsistency

**Complexity:** Low-Medium | **Files:** 2+

**When:** Audit reveals mismatches between files.

**Steps:**
1. **Identify the source of truth** — Determine which file has the correct version:
   - For agent names: agent .md files are source of truth
   - For state transitions: state-machine.md is source of truth
   - For gate definitions: quality-gates.md is source of truth
   - For variable names: SKILL.md is source of truth
   - For output formats: output-formats.md is source of truth
2. **Fix all references** — Update all files that reference the incorrect version
3. **Grep for stragglers** — Search the entire `.claude/` and `.nomos/` trees for the old value
4. **Validate:** No remaining references to the old value

---

## Optimize Agent Performance

**Complexity:** Medium | **Files:** 1-2

**When:** Agent is slow, uses too many tokens, or produces unnecessarily verbose output.

**Techniques:**
1. **Reduce input context** — Only pass what the agent needs, not everything from previous steps
2. **Constrain output** — Specify maximum output length or exact format (table, JSON, etc.)
3. **Downgrade model** — Use haiku instead of sonnet if task is simple enough
4. **Simplify prompt** — Remove redundant instructions, let Claude's defaults handle common sense
5. **Add early exit** — If the agent can determine "nothing to do" quickly, let it exit early
6. **Batch operations** — If agent does N similar checks, specify batch format instead of sequential

---

## Add New Feature Category

**Complexity:** Low | **Files:** 2-3

**When:** A new domain of features needs its own category.

**Steps:**
1. **Define category** — Choose ID following `CAT-XXX` format (3 uppercase letters)
2. **Add to features.json** — Add to categories array with name and description
3. **Add to app_spec.json** — If categories are listed there
4. **Add patterns** — If the category has known patterns, add to `learning/patterns.json`
5. **Validate:** Category ID is unique, follows naming convention
