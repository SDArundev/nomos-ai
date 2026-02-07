# Complete Workflows

Three end-to-end workflows with full code.

---

## Workflow 1: Full Code Review with Parallel Specialists

```javascript
// === STEP 1: Setup ===
Teammate({ operation: "spawnTeam", team_name: "pr-review-123", description: "Reviewing PR #123" })

// === STEP 2: Spawn reviewers in parallel ===
// (Send all these in a single message for parallel execution)
Task({
  team_name: "pr-review-123",
  name: "security",
  subagent_type: "compound-engineering:review:security-sentinel",
  prompt: `Review PR #123 for security vulnerabilities.

  Focus on:
  - SQL injection
  - XSS vulnerabilities
  - Authentication/authorization bypass
  - Sensitive data exposure

  When done, send your findings to team-lead using:
  Teammate({ operation: "write", target_agent_id: "team-lead", value: "Your findings here" })`,
  run_in_background: true
})

Task({
  team_name: "pr-review-123",
  name: "perf",
  subagent_type: "compound-engineering:review:performance-oracle",
  prompt: `Review PR #123 for performance issues.

  Focus on:
  - N+1 queries
  - Missing indexes
  - Memory leaks
  - Inefficient algorithms

  Send findings to team-lead when done.`,
  run_in_background: true
})

Task({
  team_name: "pr-review-123",
  name: "arch",
  subagent_type: "compound-engineering:review:architecture-strategist",
  prompt: `Review PR #123 for architectural concerns.

  Focus on:
  - Design pattern adherence
  - SOLID principles
  - Separation of concerns
  - Testability

  Send findings to team-lead when done.`,
  run_in_background: true
})

// === STEP 3: Monitor and collect results ===
// Poll inbox or wait for idle notifications
// cat ~/.claude/teams/pr-review-123/inboxes/team-lead.json

// === STEP 4: Synthesize findings ===
// Combine all reviewer findings into a cohesive report

// === STEP 5: Cleanup ===
Teammate({ operation: "requestShutdown", target_agent_id: "security" })
Teammate({ operation: "requestShutdown", target_agent_id: "perf" })
Teammate({ operation: "requestShutdown", target_agent_id: "arch" })
// Wait for approvals...
Teammate({ operation: "cleanup" })
```

---

## Workflow 2: Research -> Plan -> Implement -> Test Pipeline

```javascript
// === SETUP ===
Teammate({ operation: "spawnTeam", team_name: "feature-oauth" })

// === CREATE PIPELINE ===
TaskCreate({ subject: "Research OAuth providers", description: "Research OAuth2 best practices and compare providers (Google, GitHub, Auth0)", activeForm: "Researching OAuth..." })
TaskCreate({ subject: "Create implementation plan", description: "Design OAuth implementation based on research findings", activeForm: "Planning..." })
TaskCreate({ subject: "Implement OAuth", description: "Implement OAuth2 authentication according to plan", activeForm: "Implementing OAuth..." })
TaskCreate({ subject: "Write tests", description: "Write comprehensive tests for OAuth implementation", activeForm: "Writing tests..." })
TaskCreate({ subject: "Final review", description: "Review complete implementation for security and quality", activeForm: "Final review..." })

// Set dependencies
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })
TaskUpdate({ taskId: "5", addBlockedBy: ["4"] })

// === SPAWN SPECIALIZED WORKERS ===
Task({
  team_name: "feature-oauth",
  name: "researcher",
  subagent_type: "compound-engineering:research:best-practices-researcher",
  prompt: "Claim task #1. Research OAuth2 best practices, compare providers, document findings. Mark task complete and send summary to team-lead.",
  run_in_background: true
})

Task({
  team_name: "feature-oauth",
  name: "planner",
  subagent_type: "Plan",
  prompt: "Wait for task #2 to unblock. Read research from task #1. Create detailed implementation plan. Mark complete and send plan to team-lead.",
  run_in_background: true
})

Task({
  team_name: "feature-oauth",
  name: "implementer",
  subagent_type: "general-purpose",
  prompt: "Wait for task #3 to unblock. Read plan from task #2. Implement OAuth2 authentication. Mark complete when done.",
  run_in_background: true
})

Task({
  team_name: "feature-oauth",
  name: "tester",
  subagent_type: "general-purpose",
  prompt: "Wait for task #4 to unblock. Write comprehensive tests for the OAuth implementation. Run tests. Mark complete with results.",
  run_in_background: true
})

Task({
  team_name: "feature-oauth",
  name: "reviewer",
  subagent_type: "compound-engineering:review:security-sentinel",
  prompt: "Wait for task #5 to unblock. Review the complete OAuth implementation for security. Send final assessment to team-lead.",
  run_in_background: true
})

// Pipeline auto-progresses as each stage completes
```

---

## Workflow 3: Self-Organizing Code Review Swarm

```javascript
// === SETUP ===
Teammate({ operation: "spawnTeam", team_name: "codebase-review" })

// === CREATE TASK POOL (all independent, no dependencies) ===
const filesToReview = [
  "app/models/user.rb",
  "app/models/payment.rb",
  "app/controllers/api/v1/users_controller.rb",
  "app/controllers/api/v1/payments_controller.rb",
  "app/services/payment_processor.rb",
  "app/services/notification_service.rb",
  "lib/encryption_helper.rb"
]

for (const file of filesToReview) {
  TaskCreate({
    subject: `Review ${file}`,
    description: `Review ${file} for security vulnerabilities, code quality, and performance issues`,
    activeForm: `Reviewing ${file}...`
  })
}

// === SPAWN WORKER SWARM ===
const swarmPrompt = `
You are a swarm worker. Your job is to continuously process available tasks.

LOOP:
1. Call TaskList() to see available tasks
2. Find a task that is:
   - status: 'pending'
   - no owner
   - not blocked
3. If found:
   - Claim it: TaskUpdate({ taskId: "X", owner: "YOUR_NAME" })
   - Start it: TaskUpdate({ taskId: "X", status: "in_progress" })
   - Do the review work
   - Complete it: TaskUpdate({ taskId: "X", status: "completed" })
   - Send findings to team-lead via Teammate write
   - Go back to step 1
4. If no tasks available:
   - Send idle notification to team-lead
   - Wait 30 seconds
   - Try again (up to 3 times)
   - If still no tasks, exit

Replace YOUR_NAME with your actual agent name from $CLAUDE_CODE_AGENT_NAME.
`

// Spawn 3 workers
Task({ team_name: "codebase-review", name: "worker-1", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "codebase-review", name: "worker-2", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })
Task({ team_name: "codebase-review", name: "worker-3", subagent_type: "general-purpose", prompt: swarmPrompt, run_in_background: true })

// Workers self-organize: race to claim tasks, naturally load-balance
// Monitor progress with TaskList() or by reading inbox
```
