# Phase 2: EXECUTE

Mode-specific orchestration. The lead monitors agent progress, relays findings between agents, and drives the session forward.

**Input:** `session_config` from Phase 1 (with team assembled)

---

## Lead Role

You (the lead/orchestrator) are responsible for:
1. Monitoring agent task completion via `TaskList`
2. Relaying findings between agents via `SendMessage` when needed
3. Creating follow-up tasks based on agent findings
4. Collecting all findings for Phase 3
5. Managing batches (audit mode) or rounds (discuss mode)

<critical>
- Messages from teammates are delivered AUTOMATICALLY — you do NOT need to poll
- When a teammate goes idle, it means they finished their turn and are waiting
- Send messages to teammates by NAME (e.g., "explorer"), not by agent ID
- Be PATIENT — agents need time to work. Don't spam them with check-ins
</critical>

---

## Audit Mode

### Batch Flow

```
For each batch of features:
  1. Explorer maps implementation reality
     → Sends findings to Skeptic via DM
  2. Skeptic deep-dives suspicious findings
     → Sends confirmed issues to Tester via DM (if not -q)
  3. Tester exercises features at runtime
     → Sends runtime evidence to Lead
  4. Lead collects batch findings
  5. Create next batch tasks and assign
```

### Orchestration Steps

**Step 1: Wait for Explorer**
- Explorer receives batch task and examines each feature's code against its AC
- Explorer DMs Skeptic with initial findings
- When Explorer marks task complete, check findings

**Step 2: Relay to Skeptic (if needed)**
- If Explorer found nothing suspicious, note features as SOUND
- If Explorer found issues, Skeptic should already have received DMs
- Create Skeptic task: "Deep-dive batch {N} findings"
- Assign to skeptic

**Step 3: Relay to Tester (if not -q)**
- Once Skeptic confirms suspicious findings, create Tester task
- Task: "Runtime test features: {list of suspicious features}"
- Assign to tester
- Tester starts dev server and exercises features via Playwright

**Step 4: Collect Batch Results**
- Aggregate findings from all three agents
- Classify each feature: BROKEN / PARTIAL / FRAGILE / MISLEADING / SOUND
- Store in running findings list

**Step 5: Next Batch**
- Create new batch task for Explorer
- Repeat until all features covered

### Classification Rules

| Classification | Criteria |
|---------------|----------|
| **BROKEN** | Feature does not work at all — empty handlers, missing routes, crashes |
| **PARTIAL** | Some AC met, others missing or incomplete |
| **FRAGILE** | Happy path works but edge cases fail, no error handling |
| **MISLEADING** | AC technically met but feature is useless in practice |
| **SOUND** | Feature genuinely works as intended |

---

## Research Mode

### Parallel Research Flow

```
1. Generate 3-5 research questions from feature spec
2. Assign questions in parallel:
   - Researcher: codebase patterns, architecture, similar implementations
   - Librarian: external docs (Context7), prior art, best practices
3. Agents cross-reference via SendMessage as they find things
4. Lead synthesizes into research brief
```

### Orchestration Steps

**Step 1: Generate Questions**
Read the feature spec and formulate 3-5 research questions:
- What patterns exist for similar functionality?
- What libraries/APIs are needed?
- What existing code can be reused?
- What are the architectural constraints?
- What are the risks and unknowns?

**Step 2: Assign Work**
- Create tasks for each question
- Assign codebase questions to researcher
- Assign external doc questions to librarian

**Step 3: Cross-Reference**
- As agents report findings, encourage cross-referencing
- Send researcher's findings to librarian and vice versa
- Watch for conflicts or complementary discoveries

**Step 4: Synthesize**
- Combine all agent findings into a research brief

---

## Discuss Mode

### Round-Based Debate

```
Round 1: Independent opening arguments
  → Advocate argues FOR, Critic argues AGAINST (parallel)
Round 2: Read opponent's position, write counterarguments
  → Each reads the other's Round 1, responds
Pragmatist: Evaluates both positions against codebase reality
Round 3 (optional, if -r 3): Final rebuttals
Lead: Synthesize agreements, disagreements, recommendation
```

### Orchestration Steps

**Step 1: Round 1 — Opening Arguments**
- Send topic to both Advocate and Critic
- They work in parallel on independent arguments
- Wait for both to complete

**Step 2: Share Positions**
- Send Advocate's argument to Critic
- Send Critic's argument to Advocate
- Assign Round 2 tasks: "Counterargument to opponent's position"

**Step 3: Pragmatist Assessment**
- After Round 2, send both positions to Pragmatist
- Pragmatist evaluates feasibility against actual codebase
- Task: "Evaluate both positions against codebase reality"

**Step 4: Additional Rounds (if -r > 2)**
- Share Pragmatist's assessment with both Advocate and Critic
- One more round of rebuttals

**Step 5: Synthesize**
- Identify areas of agreement
- List unresolved disagreements
- Form recommendation with confidence level

---

## Learn Mode

### Sequential Audit + Analysis

```
1. Auditor reads ALL learning files, reports issues
2. Analyst receives Auditor's findings, cross-references against codebase
3. Lead produces improvement plan
4. If --prune: mark stale entries for removal
```

### Orchestration Steps

**Step 1: Learning File Audit**
- Auditor reads patterns.json, antipatterns.json, metrics.json, code/*.json
- Reports: inconsistencies, duplicates, stale entries, missing evidence
- When done, DMs Analyst with findings

**Step 2: Cross-Reference**
- Analyst receives Auditor's report
- For each flagged entry, checks if it still applies to current codebase
- Verifies pattern examples still exist in code
- Checks if antipattern code has been fixed

**Step 3: Improvement Plan**
- Combine both agents' findings
- Categorize: keep, update, remove, add new
- If `--prune`: prepare removal list

---

## Collecting Findings

Throughout execution, maintain a running list of findings:

```json
{
  "findings": [],
  "features_processed": 0,
  "features_total": 72,
  "current_batch": 3,
  "agents_active": ["explorer", "skeptic"],
  "start_time": "2026-02-08T14:30:22Z"
}
```

Append findings as agents report them. Each finding needs:
- Unique ID (SW-001, SW-002, ...)
- Feature ID
- Classification
- Severity
- Description
- Evidence array (agent + detail)
- Suggested action

---

## Continue

When all batches/rounds/tasks are complete:

**IMMEDIATELY load:** `steps/phase-03-report.md`

Pass `session_config` and the collected `findings` forward.
