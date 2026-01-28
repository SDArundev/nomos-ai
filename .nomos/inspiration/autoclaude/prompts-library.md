# Prompts Library

> Agent prompt engineering patterns and system prompt architecture.

---

## Prompt Architecture

Auto-Claude uses **Markdown-based system prompts** stored in `apps/backend/prompts/`:

```
prompts/
├── coder.md                    # Main coder agent prompt
├── coder_recovery.md           # Recovery mode coder prompt
├── planner.md                  # Implementation planner prompt
├── qa_reviewer.md              # QA reviewer prompt
├── qa_fixer.md                 # QA fixer prompt
├── spec_gatherer.md            # Spec discovery phase
├── spec_researcher.md          # Requirements research
├── spec_writer.md              # Spec document generation
├── spec_critic.md              # Spec critique loop
├── spec_quick.md               # Quick/simple spec mode
├── complexity_assessor.md      # AI complexity assessment
├── followup_planner.md         # Follow-up task planning
├── validation_fixer.md         # Validation issue fixer
├── insight_extractor.md        # Codebase insight extraction
├── roadmap_discovery.md        # Roadmap feature discovery
├── roadmap_features.md         # Roadmap feature generation
├── competitor_analysis.md      # Competitor analysis
├── ideation_*.md               # Ideation prompts (6 categories)
└── github/                     # GitHub integration prompts
    ├── pr_orchestrator.md      # PR review orchestration
    ├── pr_reviewer.md          # PR code review
    ├── pr_security_agent.md    # Security-focused PR review
    ├── pr_quality_agent.md     # Quality-focused PR review
    ├── pr_logic_agent.md       # Logic verification
    ├── pr_fixer.md             # PR issue fixer
    ├── issue_analyzer.md       # Issue analysis
    ├── issue_triager.md        # Issue triage
    ├── duplicate_detector.md   # Duplicate issue detection
    └── spam_detector.md        # Spam/bot detection
```

---

## Coder Agent Prompt Structure

The coder prompt (`coder.md`) follows a strict structure:

### 1. Role Definition
```markdown
## YOUR ROLE - CODING AGENT

You are continuing work on an autonomous development task.
This is a **FRESH context window** - you have no memory of previous sessions.
Everything you know must come from files.

**Key Principle**: Work on ONE subtask at a time. Complete it. Verify it. Move on.
```

### 2. Environment Awareness
```markdown
## CRITICAL: ENVIRONMENT AWARENESS

Your filesystem is RESTRICTED to your working directory.
- ALWAYS use relative paths starting with `./`
- NEVER use absolute paths
- NEVER assume paths exist - check with `ls` first
```

### 3. Path Confusion Prevention
```markdown
## PATH CONFUSION PREVENTION

THE #1 BUG IN MONOREPOS: Doubled paths after `cd` commands

After running `cd ./apps/frontend`, paths like `apps/frontend/src/file.ts`
become doubled: `apps/frontend/apps/frontend/src/file.ts`

BEFORE every operation:
1. pwd (check where you are)
2. ls [target-path] (verify path exists)
3. Execute command
```

### 4. Worktree Isolation Rules
```markdown
## WORKTREE ISOLATION

You may be in an ISOLATED GIT WORKTREE environment.
A worktree is a complete copy of the project isolated from main.
```

### Key Design Decisions:
- **Fresh context assumption** - Every session starts clean
- **File-based memory** - Agent reads previous session files
- **One subtask at a time** - Prevents scope creep
- **Explicit environment rules** - Prevents path errors

---

## Planner Agent Prompt Structure

### Phase 0: Deep Codebase Investigation (Mandatory)

```markdown
## PHASE 0: DEEP CODEBASE INVESTIGATION (MANDATORY)

CRITICAL: Before ANY planning, you MUST thoroughly investigate the existing codebase.

### 0.1: Understand Project Structure
### 0.2: Analyze Existing Patterns for the Feature
### 0.3: Document Your Findings

YOU MUST READ AT LEAST 3 PATTERN FILES before planning.
If you skip this phase, your plan will be wrong.
```

### Phase 1: Read Spec and Context

```markdown
## PHASE 1: READ AND CREATE CONTEXT FILES

Read OR CREATE the Project Index (project_index.json):
{
    "project_type": "single|monorepo",
    "services": {...},
    "tech_stack": {...}
}
```

### Key Design Decisions:
- **Mandatory investigation before planning** - Prevents hallucinated plans
- **Pattern-first approach** - Plans follow existing codebase patterns
- **Project index creation** - Agent creates knowledge file if missing
- **Subtasks, not tests** - Plans define implementation steps, not test cases

---

## QA Reviewer Prompt Structure

```markdown
## YOUR ROLE - QA REVIEWER AGENT

You are the last line of defense. If you approve, the feature ships. Be thorough.

## WHY QA VALIDATION MATTERS

The Coder Agent may have:
- Completed all subtasks but missed edge cases
- Written code without necessary migrations
- Implemented features without adequate tests
- Left browser console errors
- Introduced security vulnerabilities
- Broken existing functionality
```

### QA Review Phases:
1. **Load Context** - Read spec, plan, progress, git diff
2. **Verify All Subtasks** - Check implementation_plan.json completeness
3. **Start Dev Environment** - Boot all services
4. **Run Automated Tests** - Unit, integration, E2E
5. **Manual Code Review** - Security, patterns, edge cases
6. **Browser Testing** - UI verification (via Puppeteer MCP)
7. **Generate Report** - Detailed findings + verdict

### Key Design Decisions:
- **No write tools** - Cannot fix, only report
- **Multi-phase validation** - Automated + manual + browser
- **Spec as source of truth** - Validates against original requirements
- **Dev environment required** - Boots services before testing

---

## Spec Pipeline Prompts

### Spec Gatherer (Discovery Phase)

```markdown
Investigate the project to understand:
- Existing architecture and patterns
- Technology stack details
- Files that will be affected
- Potential risks and dependencies
```

### Spec Writer

```markdown
Write a formal specification including:
- Feature description and scope
- Acceptance criteria
- Technical requirements
- Implementation constraints
- QA acceptance criteria
```

### Spec Critic

```markdown
Review the specification for:
- Completeness (all requirements covered)
- Feasibility (can be implemented as specified)
- Clarity (unambiguous language)
- Testability (can be validated)
```

---

## Dynamic Prompt Generation

```python
# prompt_generator.py
def generate_subtask_prompt(subtask, context) -> str:
    """Generate prompt for a specific subtask with full context."""

    prompt_parts = []

    # 1. Base system prompt (coder.md or coder_recovery.md)
    prompt_parts.append(load_prompt("coder.md"))

    # 2. Environment information
    prompt_parts.append(format_environment_info(context.project_dir, context.worktree))

    # 3. Memory context (from previous sessions)
    memory_context = format_memory_context(context.spec_dir)
    if memory_context:
        prompt_parts.append(memory_context)

    # 4. Subtask description
    prompt_parts.append(format_subtask(subtask))

    # 5. Implementation plan reference
    prompt_parts.append(format_plan_reference(context.spec_dir))

    return "\n\n---\n\n".join(prompt_parts)
```

---

## GitHub PR Review Prompts

Auto-Claude has a sophisticated multi-agent PR review system:

```
PR Submitted
    │
    ▼
PR Orchestrator (decides review strategy)
    │
    ├─→ PR Security Agent (security vulnerabilities)
    ├─→ PR Quality Agent (code quality, patterns)
    ├─→ PR Logic Agent (business logic verification)
    └─→ PR Structural Agent (architecture concerns)
    │
    ▼
PR Orchestrator (combines findings)
    │
    ▼
PR Reviewer (final verdict + comments)
    │
    ├─→ If issues found: PR Fixer (auto-fix)
    └─→ If clean: Approve
```

### Finding Validation

```markdown
## PR Finding Validator Prompt

For each finding, validate:
- Is this a real issue or false positive?
- What is the severity? (critical, high, medium, low)
- Can it be auto-fixed?
- Does it match project conventions?
```

---

## Ideation Prompts (6 Categories)

```
prompts/
├── ideation_code_improvements.md   # Code structure improvements
├── ideation_code_quality.md        # Quality and maintainability
├── ideation_documentation.md       # Documentation gaps
├── ideation_performance.md         # Performance optimizations
├── ideation_security.md            # Security hardening opportunities
└── ideation_ui_ux.md               # UI/UX improvements
```

Each generates structured improvement suggestions with:
- Description and rationale
- Affected files
- Estimated complexity
- Priority rating

---

## Prompt Engineering Principles

### 1. Fresh Context Assumption
Every session starts with no memory. Context comes from files, not conversation history.

### 2. Mandatory Investigation
Agents must investigate the codebase before acting. "If you skip this phase, your plan will be wrong."

### 3. Explicit Path Rules
Detailed rules for path handling prevent the #1 bug class in monorepo environments.

### 4. Role-Based Restrictions
Each agent role has explicit capabilities and limitations defined in the prompt.

### 5. Phase-Based Structure
Prompts are organized into mandatory sequential phases with clear outputs.

### 6. Verification Before Moving On
Each subtask must be verified complete before proceeding to the next.

---

*Reference: Prompt engineering patterns from Auto-Claude v2.7.5*
