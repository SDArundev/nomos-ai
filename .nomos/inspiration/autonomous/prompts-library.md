# Prompts Library

> Prompt engineering patterns for autonomous AI development systems.

---

## Prompt Architecture

### Prompt Composition Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: SYSTEM PROMPT                                      │
│   • Agent runner instructions                               │
│   • Base capabilities and constraints                       │
│   • Tool usage guidelines                                   │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: CONTEXT FILES                                      │
│   • CLAUDE.md (project conventions)                         │
│   • CODE_QUALITY.md (quality standards)                     │
│   • Memory files (task-relevant knowledge)                  │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: PLANNING PROMPT (if enabled)                       │
│   • Planning mode instructions (lite/spec/full)             │
│   • Output format requirements                              │
│   • Approval workflow integration                           │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: TASK PROMPT                                        │
│   • Feature description                                     │
│   • Images/screenshots                                      │
│   • Dependencies context                                    │
│   • Follow-up instructions                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## System Prompts

### Agent Runner System Prompt

```markdown
You are an autonomous AI development agent working within the Automaker platform.

## Core Responsibilities

1. **Implement features** as described in the task prompt
2. **Follow project conventions** from CLAUDE.md
3. **Maintain code quality** per CODE_QUALITY.md guidelines
4. **Use tools effectively** to read, write, and execute code

## Tool Usage Guidelines

### File Operations
- Use `Read` to examine existing code before modifications
- Use `Write` for new files, `Edit` for modifications
- Use `Glob` to find files by pattern
- Use `Grep` to search file contents

### Command Execution
- Use `Bash` for running tests, builds, and git operations
- Always verify command success before proceeding
- Handle errors gracefully with appropriate recovery

### Code Modifications
- Preserve existing code style and patterns
- Add appropriate comments for complex logic
- Update related tests when modifying functionality

## Constraints

1. **Scope**: Only modify files related to the current task
2. **Quality**: Follow established patterns in the codebase
3. **Safety**: Do not delete critical files or configurations
4. **Commits**: Make atomic commits with clear messages

## Communication

- Explain your approach before major changes
- Report any blockers or unexpected issues
- Summarize completed work at the end
```

### Autonomous Mode System Prompt Extension

```markdown
## Autonomous Execution Mode

You are operating in **autonomous mode** with the following behaviors:

1. **No Confirmations**: Proceed without user confirmation for standard operations
2. **Error Recovery**: Attempt to fix errors before reporting failure
3. **Comprehensive Work**: Complete all aspects of the feature
4. **Self-Verification**: Run tests to verify your changes

## Auto-Mode Workflow

1. Analyze the feature requirements
2. Create a mental plan (or explicit plan if planning mode enabled)
3. Implement the feature incrementally
4. Verify each step works before proceeding
5. Run tests and fix any failures
6. Commit changes with appropriate message
7. Report completion status
```

---

## Planning Prompts

### Lite Planning Mode

```markdown
## Quick Planning

Before implementing, provide a brief outline:

### 1. Goal
What we're building in one sentence.

### 2. Approach
High-level strategy (2-3 sentences).

### 3. Key Files
- List files to create
- List files to modify

### 4. Tasks
1. Task 1 description
2. Task 2 description
3. Task 3 description
(3-7 concrete tasks)

### 5. Risks
- Potential issue 1
- Potential issue 2

Keep it concise. Output directly without extensive exploration.
```

### Spec Planning Mode

```markdown
## Detailed Specification

Generate a detailed specification in XML format:

\`\`\`xml
<spec>
  <metadata>
    <feature_id>FEATURE_ID</feature_id>
    <title>Feature Title</title>
    <created_at>TIMESTAMP</created_at>
  </metadata>

  <problem_statement>
    Clear description of what we're solving and why.
    Include context about the current state and desired outcome.
  </problem_statement>

  <acceptance_criteria>
    <criterion id="AC-001">
      <given>Initial state or precondition</given>
      <when>Action performed by user or system</when>
      <then>Expected outcome or result</then>
    </criterion>
    <criterion id="AC-002">
      <given>Another precondition</given>
      <when>Another action</when>
      <then>Another expected outcome</then>
    </criterion>
  </acceptance_criteria>

  <technical_approach>
    <summary>Brief technical overview</summary>
    <components>
      <component name="ComponentName">
        Description of the component and its responsibility
      </component>
    </components>
    <data_flow>
      Description of how data flows through the system
    </data_flow>
  </technical_approach>

  <tasks>
    <task id="T001" file="path/to/file.ts" type="create">
      Create the main component with basic structure
    </task>
    <task id="T002" file="path/to/file.ts" type="modify">
      Add the feature-specific logic to existing file
    </task>
    <task id="T003" file="path/to/test.ts" type="create">
      Write tests for the new functionality
    </task>
  </tasks>

  <risks>
    <risk severity="medium">
      Description of potential risk and mitigation strategy
    </risk>
  </risks>
</spec>
\`\`\`

Mark with [SPEC_GENERATED] when complete to signal the spec is ready for approval.
```

### Full Planning Mode

```markdown
## Comprehensive Software Design Document

Generate a comprehensive SDD with the following sections:

### 1. Executive Summary
- Feature overview
- Business value
- Scope and boundaries

### 2. User Stories
\`\`\`
As a [user type]
I want to [action]
So that [benefit]
\`\`\`

### 3. Acceptance Criteria (GIVEN-WHEN-THEN)
| ID | Given | When | Then |
|----|-------|------|------|
| AC-001 | Condition | Action | Result |

### 4. Technical Architecture
- System components
- Data models
- API contracts
- Integration points

### 5. Implementation Tasks (Phased)

#### Phase 1: Foundation
- [ ] T001: Description | File: path/to/file
- [ ] T002: Description | File: path/to/file

#### Phase 2: Core Features
- [ ] T003: Description | File: path/to/file

#### Phase 3: Testing & Polish
- [ ] T004: Description | File: path/to/file

### 6. Risk Assessment Matrix
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk description | High/Med/Low | High/Med/Low | Strategy |

### 7. Testing Strategy
- Unit tests
- Integration tests
- E2E tests
- Edge cases

### 8. Rollback Plan
Steps to revert changes if issues arise.

Mark with [SDD_GENERATED] when complete.
```

---

## Feature Implementation Prompts

### Basic Implementation Prompt

```markdown
## Feature Implementation

### Feature Details
**Title:** {{feature.title}}
**Description:** {{feature.description}}
**Category:** {{feature.category}}

### Requirements
{{#if feature.acceptanceCriteria}}
**Acceptance Criteria:**
{{feature.acceptanceCriteria}}
{{/if}}

{{#if feature.dependencies}}
### Dependencies
This feature depends on:
{{#each feature.dependencies}}
- {{this.title}} ({{this.status}})
{{/each}}
{{/if}}

### Instructions
1. Implement the feature as described
2. Follow existing code patterns in the project
3. Write tests for new functionality
4. Ensure all existing tests pass
5. Commit your changes

Begin implementation now.
```

### Implementation with Images

```markdown
## Feature Implementation

### Feature Details
**Title:** {{feature.title}}
**Description:** {{feature.description}}

### Visual Reference
The following images provide context for this feature:
{{#each feature.images}}
[Image {{@index}}: {{this.description}}]
{{/each}}

Please implement the feature matching the visual specifications shown.
```

### Follow-up Instruction Prompt

```markdown
## Follow-up Instruction

### Context
You are continuing work on: {{feature.title}}

### Previous Work
{{previousOutput}}

### New Instruction
{{followUpInstruction}}

### Guidelines
- Continue from where you left off
- Address the specific instruction above
- Maintain consistency with previous work
- Verify changes don't break existing functionality
```

---

## Pipeline Step Prompts

### Test Verification Prompt

```markdown
## Test Verification

### Context
You have just implemented: {{feature.title}}

### Task
1. Run all tests related to the implemented feature
2. Fix any failing tests
3. Add tests for any untested functionality
4. Ensure test coverage is adequate

### Commands
- Run tests: `npm test` or project-specific command
- Run specific tests: Use appropriate test filter

### Report
After verification, report:
- Total tests run
- Tests passed/failed
- Any issues encountered
- Coverage summary (if available)
```

### Code Review Prompt

```markdown
## Self Code Review

### Context
Review the changes made for: {{feature.title}}

### Checklist
- [ ] Code follows project conventions (from CLAUDE.md)
- [ ] No debug code or console.logs left behind
- [ ] Error handling is appropriate
- [ ] Edge cases are handled
- [ ] Code is readable and well-documented
- [ ] No security vulnerabilities introduced
- [ ] Performance considerations addressed

### Output
List any issues found and fix them.
```

### Commit Message Generation Prompt

```markdown
## Generate Commit Message

### Changes Summary
{{diffSummary}}

### Files Changed
{{#each changedFiles}}
- {{this.path}}: {{this.changeType}}
{{/each}}

### Instructions
Generate a conventional commit message following this format:

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

Types: feat, fix, docs, style, refactor, test, chore
Scope: Component or area affected
Subject: Brief description (50 chars max)
Body: Detailed explanation if needed
Footer: Breaking changes, issue references

Output only the commit message, nothing else.
```

---

## Ideation Prompts

### Feature Suggestion Prompt

```markdown
## Feature Suggestions

### Project Context
{{projectDescription}}

### Current Features
{{#each existingFeatures}}
- {{this.title}}: {{this.description}}
{{/each}}

### Task
Analyze the project and suggest 5-10 new features that would:
1. Improve user experience
2. Add valuable functionality
3. Address common pain points
4. Build on existing features

### Output Format
\`\`\`json
[
  {
    "title": "Feature Title",
    "description": "Detailed description",
    "category": "Category Name",
    "priority": "high|medium|low",
    "rationale": "Why this feature is valuable"
  }
]
\`\`\`
```

### Refactoring Suggestion Prompt

```markdown
## Refactoring Suggestions

### Codebase Analysis
Analyze the following areas for refactoring opportunities:

{{#each filesToAnalyze}}
File: {{this.path}}
\`\`\`
{{this.content}}
\`\`\`
{{/each}}

### Focus Areas
1. Code duplication
2. Complex functions that could be simplified
3. Poor naming conventions
4. Missing abstractions
5. Performance improvements

### Output Format
\`\`\`json
[
  {
    "title": "Refactoring Title",
    "description": "What to refactor and why",
    "files": ["file1.ts", "file2.ts"],
    "impact": "high|medium|low",
    "effort": "high|medium|low"
  }
]
\`\`\`
```

### Security Suggestion Prompt

```markdown
## Security Analysis

### Codebase Overview
{{codebaseDescription}}

### Focus Areas
1. Authentication and authorization
2. Input validation
3. SQL injection vulnerabilities
4. XSS vulnerabilities
5. CSRF protection
6. Sensitive data handling
7. Dependency vulnerabilities
8. API security

### Output Format
\`\`\`json
[
  {
    "title": "Security Improvement",
    "description": "Detailed description of the vulnerability/improvement",
    "severity": "critical|high|medium|low",
    "category": "Category from focus areas",
    "recommendation": "How to address this"
  }
]
\`\`\`
```

---

## Verification Prompts

### Playwright Test Verification Prompt

```markdown
## Playwright Verification

### Feature
{{feature.title}}

### Acceptance Criteria
{{feature.acceptanceCriteria}}

### Task
Create or update Playwright E2E tests to verify the feature works correctly.

### Requirements
1. Test all acceptance criteria
2. Include happy path tests
3. Include error handling tests
4. Use proper selectors and assertions
5. Ensure tests are reliable (no flaky tests)

### Test Structure
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('{{feature.title}}', () => {
  test('should [behavior]', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
\`\`\`
```

---

## Enhancement Prompts

### Prompt Enhancement - Improve

```markdown
## Enhance Feature Description

### Original Description
{{originalDescription}}

### Enhancement Goals
1. Add more detail and clarity
2. Include specific requirements
3. Add acceptance criteria if missing
4. Identify edge cases
5. Suggest technical approach

### Output
Provide an enhanced version of the feature description that is:
- Clear and unambiguous
- Comprehensive but concise
- Actionable for implementation
```

### Prompt Enhancement - Technical

```markdown
## Add Technical Details

### Original Description
{{originalDescription}}

### Task
Add technical implementation details:
1. Suggested data models
2. API endpoints needed
3. Component structure
4. State management approach
5. Error handling strategy
6. Performance considerations

### Output
Enhanced description with technical specifications.
```

### Prompt Enhancement - Simplify

```markdown
## Simplify Feature Description

### Original Description
{{originalDescription}}

### Task
Simplify to the essential requirements:
1. Remove unnecessary complexity
2. Focus on core functionality
3. Identify MVP scope
4. Suggest phased approach if appropriate

### Output
Simplified, focused feature description.
```

---

## Learning Prompts

### ADR Generation Prompt

```markdown
## Generate Architecture Decision Record

### Context
{{changeContext}}

### Changes Made
{{changesSummary}}

### Task
Generate an ADR (Architecture Decision Record) in JSON format:

\`\`\`json
{
  "title": "ADR Title",
  "date": "YYYY-MM-DD",
  "status": "accepted",
  "context": "Why this decision was needed",
  "decision": "What was decided",
  "consequences": {
    "positive": ["List of benefits"],
    "negative": ["List of drawbacks"],
    "neutral": ["Observations"]
  },
  "alternatives": [
    {
      "option": "Alternative approach",
      "reason_rejected": "Why not chosen"
    }
  ]
}
\`\`\`
```

### Pattern Extraction Prompt

```markdown
## Extract Patterns

### Code Sample
{{codeSample}}

### Task
Identify reusable patterns in this code:

1. **Structural Patterns**: How the code is organized
2. **Behavioral Patterns**: How the code handles logic
3. **Error Handling Patterns**: How errors are managed
4. **Testing Patterns**: How the code is tested

### Output Format
\`\`\`json
{
  "patterns": [
    {
      "name": "Pattern Name",
      "category": "structural|behavioral|error|testing",
      "description": "What this pattern does",
      "example": "Code snippet showing the pattern",
      "applicability": "When to use this pattern"
    }
  ]
}
\`\`\`
```

---

## Prompt Utility Functions

### Template Rendering

```typescript
function renderPrompt(template: string, context: Record<string, unknown>): string {
  // Simple Handlebars-style template rendering
  let result = template;

  // Handle simple variables: {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(context[key] ?? match);
  });

  // Handle nested variables: {{object.property}}
  result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, obj, prop) => {
    const objValue = context[obj];
    if (typeof objValue === 'object' && objValue !== null) {
      return String((objValue as Record<string, unknown>)[prop] ?? match);
    }
    return match;
  });

  // Handle conditionals: {{#if condition}}...{{/if}}
  result = result.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, condition, content) => {
      return context[condition] ? content : '';
    }
  );

  // Handle loops: {{#each array}}...{{/each}}
  result = result.replace(
    /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, arrayKey, template) => {
      const array = context[arrayKey];
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          let itemResult = template;
          itemResult = itemResult.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => {
            return String(item[prop] ?? m);
          });
          itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
          itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
          return itemResult;
        }).join('');
      }
      return '';
    }
  );

  return result;
}
```

### Prompt Composition

```typescript
interface PromptComposition {
  systemPrompt: string;
  contextFiles: string[];
  planningPrompt?: string;
  taskPrompt: string;
  images?: string[];
}

function composePrompt(composition: PromptComposition): string {
  const parts: string[] = [];

  // System prompt (highest priority)
  parts.push(composition.systemPrompt);

  // Context files
  if (composition.contextFiles.length > 0) {
    parts.push('\n---\n## Project Context\n');
    parts.push(composition.contextFiles.join('\n\n---\n\n'));
  }

  // Planning prompt
  if (composition.planningPrompt) {
    parts.push('\n---\n## Planning Instructions\n');
    parts.push(composition.planningPrompt);
  }

  // Task prompt
  parts.push('\n---\n## Task\n');
  parts.push(composition.taskPrompt);

  return parts.join('\n');
}
```

---

## Best Practices

### 1. Clear Structure
- Use headers and sections
- Include numbered lists for steps
- Separate concerns clearly

### 2. Explicit Constraints
- State what NOT to do
- Define scope boundaries
- Set quality expectations

### 3. Output Format Specification
- Define expected output format
- Provide examples when helpful
- Use structured formats (JSON, XML) for parsing

### 4. Context Inclusion
- Include relevant project context
- Reference specific files or patterns
- Link to dependencies

### 5. Actionable Instructions
- Use imperative mood
- Be specific about expectations
- Include success criteria

---

*Reference: Prompt engineering patterns from Automaker v0.13.0+*
