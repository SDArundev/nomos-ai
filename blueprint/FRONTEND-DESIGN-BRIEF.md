# NOMOS Frontend Design Brief

> Greenfield. No reference to existing code. Design from the product blueprint.

---

## 1. Product Identity

### What NOMOS Feels Like

NOMOS is a **mission control for AI agents building software**. The UI should evoke the feeling of watching a competent team work — calm, professional, information-dense when needed, minimal when not.

**Design pillars:**

| Pillar | Meaning | Anti-pattern |
|--------|---------|-------------|
| **Observable** | Every agent action is visible, expandable, and auditable | Hidden state, mystery spinners, "trust me" loading screens |
| **Non-blocking** | User watches or walks away; nothing requires babysitting | Modal hell, forced waits, mandatory confirmations |
| **Dense when open** | Collapsed by default, rich detail on demand | Wall-of-text defaults, information overload at rest |
| **Alive** | Real-time streaming everywhere — never stale | Polling, manual refresh, snapshots that go stale |

### Visual Direction

- **Dark-first**, with a functional light mode. Development tools live in dark environments.
- **Monospace for agent output**, proportional for UI chrome. Two typographic layers.
- **Color as status**, not decoration. Green/amber/red/blue for state. Neutral surfaces otherwise.
- **Density slider in spirit**: kanban cards are spacious, agent output is compact, pipeline view is somewhere between.
- **No ornamentation**. No gradients, no shadows deeper than 1px, no rounded corners larger than 6px. The content is the interface.

### Reference Aesthetic

Think: Linear, Vercel Dashboard, Railway, Raycast — tools built for developers who value speed and clarity over visual flair.

---

## 2. Information Architecture

### Route Structure

```
/                          → Redirect to /dashboard or /login
/login                     → Auth (sign in / sign up)
/dashboard                 → Project list + global stats
/projects/:projectId       → Project home (feature overview + intent box)
/projects/:projectId/kanban → Kanban board
/projects/:projectId/features/:featureId → Feature detail (pipeline, agent output)
/projects/:projectId/agent  → Agent chat (interactive sessions)
/projects/:projectId/teams  → Team sessions list
/projects/:projectId/teams/:teamId → Team conversation view
/projects/:projectId/learnings → Learning browser (patterns + antipatterns)
/projects/:projectId/settings → Project settings
/settings                   → Global settings (user profile, API keys, defaults)
```

### Navigation Model

**Sidebar (persistent, collapsible):**
- Project selector (dropdown at top)
- Dashboard (home icon)
- Kanban (board icon)
- Agent (chat icon)
- Teams (group icon) — Sprint 4
- Learnings (brain icon) — Sprint 5
- Settings (gear icon)

**Top bar (minimal):**
- Breadcrumb (Project > Feature > Phase)
- Global notifications (bell)
- Command palette trigger (Cmd+K)
- User avatar + menu

**Command palette (Cmd+K):**
- Navigate to any project/feature
- Create feature (quick input)
- Start pipeline on feature
- Launch team session
- Search learnings

### Project Scoping

Everything below `/projects/:projectId/` is scoped to that project. Switching projects via the sidebar selector changes the entire context. No cross-project views except `/dashboard`.

---

## 3. Core Surfaces

### 3.1 Auth (Sprint 1)

**Route:** `/login`

Single page with sign-in and sign-up modes (tab or toggle). Minimal — email + password. No social auth for MVP.

**Behavior:**
- On success: redirect to `/dashboard`
- On error: inline error message below the form
- Session persists via cookie (better-auth handles this)

**Key elements:**
- Product name + one-liner tagline
- Email field
- Password field
- Submit button
- Toggle between "Sign In" and "Create Account"

---

### 3.2 Dashboard (Sprint 1)

**Route:** `/dashboard`

Overview of all projects the user owns. Entry point after login.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  NOMOS                              🔔  👤     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your Projects                   [+ New Project] │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ nomos-ai        │  │ nomos-blog      │      │
│  │ 12 features     │  │ 4 features      │      │
│  │ ●3 active  ●2 ✓ │  │ ●1 active       │      │
│  │ Stack: bun+hono  │  │ Stack: next+ts  │      │
│  │ Last: 2h ago     │  │ Last: 1d ago    │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│  Recent Activity                                │
│  ┌──────────────────────────────────────────┐   │
│  │ F045 "Add auth" verified       2h ago    │   │
│  │ F046 "Add posts" in_progress   1h ago    │   │
│  │ F047 "Add comments" pending    30m ago   │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Project card shows:**
- Project name
- Feature count by status (colored dots: active, completed, failed, pending)
- Detected stack (as tags)
- Time since last activity
- Click → `/projects/:id`

**New Project flow:**
- Dialog: name, path (file picker or text input), description (optional)
- On create: server runs stack detection, populates settings
- Redirect to project home

---

### 3.3 Project Home (Sprint 1)

**Route:** `/projects/:projectId`

The primary workspace for a project. Two main elements: **Intent Box** and **Feature Overview**.

**Layout:**
```
┌────────┬──────────────────────────────────────────┐
│        │  nomos-blog                              │
│  Nav   │                                          │
│        │  ┌──────────────────────────────────────┐│
│  📊    │  │ Describe what you want to build...   ││
│  📋    │  │                                      ││
│  💬    │  │                         [Expand ▸]   ││
│  👥    │  └──────────────────────────────────────┘│
│  🧠    │                                          │
│  ⚙️    │  Features                    [+ Manual]  │
│        │  ┌─────────┬─────────┬────────┬────────┐│
│        │  │Backlog 3│Pending 2│Active 1│Done 5  ││
│        │  └─────────┴─────────┴────────┴────────┘│
│        │                                          │
│        │  ┌──────────────────────────────────────┐│
│        │  │ F045  Add user authentication  ✅    ││
│        │  │ F046  Post CRUD API            🔄    ││
│        │  │ F047  Comment system            ⏳    ││
│        │  │ F048  Search functionality      📋    ││
│        │  └──────────────────────────────────────┘│
│        │                                          │
│        │  Activity                                │
│        │  F046 Phase 3 EXECUTE started      now   │
│        │  F045 verified                    2h ago  │
│        │                                          │
└────────┴──────────────────────────────────────────┘
```

**Intent Box:**
- Multi-line text input with placeholder: "Describe what you want to build..."
- On submit: POST to expansion endpoint → AI decomposes into features
- Shows decomposition preview (list of proposed features with titles + descriptions)
- User confirms ("Create 5 features") or edits before confirming
- Can also type a single feature description for quick creation

**Feature list:**
- Table or compact list with columns: ID, title, status (badge), priority, category
- Status filter tabs at top (All | Backlog | Pending | Active | Done | Failed)
- Click row → `/projects/:id/features/:featureId`
- Inline actions: Start (→ pipeline), Edit, Delete

---

### 3.4 Kanban Board (Sprint 1)

**Route:** `/projects/:projectId/kanban`

Visual feature management with drag-and-drop.

**Columns:**
```
 Backlog    │   Pending    │  In Progress  │  Waiting     │  Verified
            │              │               │  Approval    │
 ┌────────┐ │ ┌──────────┐ │ ┌───────────┐ │              │ ┌──────────┐
 │ F048   │ │ │ F047     │ │ │ F046      │ │              │ │ F045     │
 │ Search │ │ │ Comments │ │ │ Post CRUD │ │              │ │ Auth     │
 │        │ │ │          │ │ │ Phase 3   │ │              │ │ $1.20    │
 │ S · api│ │ │ M · api  │ │ │ ████░░ 50%│ │              │ │ 45 min   │
 └────────┘ │ └──────────┘ │ └───────────┘ │              │ └──────────┘
```

**Card anatomy:**
- Feature ID + title
- Size badge (S/M/L/XL)
- Category tag
- If in_progress: pipeline progress bar (phase X/6) with phase name
- If verified: total cost + duration
- If failed: red border + error indicator

**Drag behavior:**
- Drag between columns → triggers state transition via API
- Invalid transitions → card snaps back + toast ("Cannot move directly from backlog to in_progress")
- Server is authority — optimistic UI with rollback on error

**Column header:**
- Column name + count
- Collapse/expand

**Failed column** (special):
- Appears only when failed features exist
- Shows error reason on card
- "Retry" button on card → re-runs pipeline from failed phase

---

### 3.5 Feature Detail (Sprint 3)

**Route:** `/projects/:projectId/features/:featureId`

The richest view in the product. Shows everything about a feature: definition, pipeline progress, agent output, cost, git state.

**Layout — three zones:**

```
┌────────┬──────────────────────────────────────────────────────┐
│        │  F046: Post CRUD API                    [▶ Start]   │
│  Nav   │  Status: in_progress  │  Priority: high  │  Size: M │
│        │                                                      │
│        │  ┌──────────────────────────────────────────────────┐│
│        │  │  Pipeline                                        ││
│        │  │  ● Understand  ● Plan  ◉ Execute  ○ Review       ││
│        │  │  ○ Ship  ○ Learn                                 ││
│        │  │                                                  ││
│        │  │  Phase 3: EXECUTE    ██████░░░░ 62%   $0.45      ││
│        │  │  Iteration 1 of 3                                ││
│        │  └──────────────────────────────────────────────────┘│
│        │                                                      │
│        │  ┌─────────────────────┬────────────────────────────┐│
│        │  │ Phase Output        │ Feature Info               ││
│        │  │                     │                            ││
│        │  │ [tabs: each phase]  │ Description                ││
│        │  │                     │ Lorem ipsum dolor sit...   ││
│        │  │ Agent: coder        │                            ││
│        │  │ > Reading auth.ts   │ Acceptance Criteria        ││
│        │  │ > Writing post.ts   │ ☐ CRUD endpoints work     ││
│        │  │ > Running tests...  │ ☐ Validation on all inputs││
│        │  │                     │ ☐ Tests pass              ││
│        │  │ [thinking ▸]        │                            ││
│        │  │                     │ Git                        ││
│        │  │ Tool: writeFile     │ Branch: feature/F046      ││
│        │  │ path: src/post.ts   │ Commits: 2                ││
│        │  │ 142 bytes written   │ PR: #42                   ││
│        │  │                     │                            ││
│        │  │ Cost: $0.45         │ Cost                       ││
│        │  │ Tokens: 12.4K in    │ Total: $1.20              ││
│        │  │         8.2K out    │ Budget: $10.00            ││
│        │  └─────────────────────┴────────────────────────────┘│
└────────┴──────────────────────────────────────────────────────┘
```

**Pipeline stepper:**
- Horizontal stepper showing 6 phases
- States: completed (filled dot), running (pulsing dot), pending (hollow dot), failed (red dot), skipped (dash)
- Current phase name + progress bar + cost so far
- If paused for approval: "Approve Plan" / "Reject" buttons appear inline

**Phase output viewer (left panel):**
- Tab per phase (only completed/running phases have tabs)
- Shows streaming agent output for current phase
- Agent text renders as markdown
- Tool calls appear as collapsible blocks:
  ```
  ▸ readFile src/routes/posts.ts        ✓ 0.3s
  ▾ writeFile src/routes/posts.ts       ✓ 0.2s
    Content: [truncated, click to expand]
  ▸ bash: bun test                      ✗ 1.2s
  ```
- Thinking blocks: collapsible, dimmed text, labeled "[Thinking]"
- Running phase: streaming text with cursor animation

**Feature info (right panel):**
- Description (editable inline when not running)
- Acceptance criteria (checklist)
- Git info (branch, commits, PR link)
- Cost breakdown (per phase, total, vs budget)
- Metadata (created, updated, category, priority)

**Controls:**
- Start button (when pending/backlog → starts pipeline)
- Stop button (when running → cancels pipeline)
- Retry button (when failed → resumes from failed phase)
- Approve/Reject (when waiting for plan approval)

---

### 3.6 Agent Chat (Sprint 2)

**Route:** `/projects/:projectId/agent`

Interactive conversation with Claude. Not tied to a pipeline — user talks to the agent directly.

**Layout:**
```
┌────────┬────────────┬─────────────────────────────────────────┐
│        │ Sessions   │                                         │
│  Nav   │            │  Agent Chat                             │
│        │ ● current  │                                         │
│        │ ○ yesterday│  ┌─────────────────────────────────────┐│
│        │ ○ 2 days   │  │ 🤖 I'll analyze the project...     ││
│        │            │  │                                     ││
│        │            │  │ ▸ glob **/*.ts           ✓ 23 files ││
│        │            │  │ ▸ readFile package.json  ✓ 0.1s     ││
│        │            │  │                                     ││
│        │            │  │ This is a Hono + React monorepo     ││
│        │            │  │ with Drizzle ORM. Key files:        ││
│        │            │  │ - src/routes/posts.ts               ││
│        │            │  │ - src/db/schema.ts                  ││
│        │            │  │                                     ││
│        │            │  │ [Thinking ▸]                        ││
│        │            │  │                                     ││
│        │            │  │ 👤 Create a new API endpoint for    ││
│        │            │  │    managing tags                    ││
│        │            │  │                                     ││
│        │            │  │ 🤖 I'll create the tags endpoint... ││
│        │            │  │ █ (streaming...)                    ││
│        │            │  └─────────────────────────────────────┘│
│        │            │                                         │
│        │            │  ┌─────────────────────────────────────┐│
│        │            │  │ Type a message...          [Send ▸] ││
│        │            │  └─────────────────────────────────────┘│
│        │            │                                         │
│        │            │  Tokens: 4.2K in / 2.1K out   $0.08    │
└────────┴────────────┴─────────────────────────────────────────┘
```

**Session sidebar (left of chat):**
- List of past sessions, most recent first
- Each shows: first message preview, date, token count
- Click to load history (read-only)
- "New Session" button at top
- Current session highlighted

**Message display:**
- User messages: right-aligned or distinguished by avatar/color
- Agent messages: left-aligned, rendered as markdown
- Tool calls: inline collapsible blocks between message segments
  - Collapsed: tool name + first arg + status icon (✓/✗) + duration
  - Expanded: full input + full output (scrollable, monospace)
- Thinking blocks: collapsible, visually dimmed, italic label
- Streaming indicator: blinking cursor at end of current agent response

**Input area:**
- Multi-line text input (auto-expand, max 6 lines visible)
- Send button (or Enter to send, Shift+Enter for newline)
- Stop button replaces Send while agent is responding
- Disabled while no active session

**Status bar (below input):**
- Token count (input/output for this session)
- Cost estimate
- Model name
- Session status

---

### 3.7 Team View (Sprint 4)

**Route:** `/projects/:projectId/teams/:teamId`

Multi-agent conversation viewer.

**Layout:**
```
┌────────┬────────────┬─────────────────────────────────────────┐
│        │ Agents     │  Discussion: Architecture for auth      │
│  Nav   │            │  Mode: discuss  │  Round 2/3            │
│        │ ● architect│                                         │
│        │   sonnet   │  ┌─────────────────────────────────────┐│
│        │   running  │  │ [architect] I recommend JWT with    ││
│        │            │  │ refresh tokens stored in httpOnly   ││
│        │ ● critic   │  │ cookies. Here's why...              ││
│        │   sonnet   │  │                                     ││
│        │   waiting  │  │ [critic] JWT has downsides: token   ││
│        │            │  │ revocation is complex. Consider     ││
│        │ ● security │  │ session-based auth instead...       ││
│        │   sonnet   │  │                                     ││
│        │   completed│  │ [security] From a security          ││
│        │            │  │ perspective, both approaches have   ││
│        │            │  │ trade-offs. Key concern: ...        ││
│        │            │  │                                     ││
│        │            │  │ [architect] Considering the         ││
│        │            │  │ feedback, I'd revise my             ││
│        │            │  │ recommendation to...   █            ││
│        │            │  └─────────────────────────────────────┘│
│        │            │                                         │
│        │ Cost: $2.40│  Synthesis                              │
│        │ Duration:  │  ┌─────────────────────────────────────┐│
│        │   8 min    │  │ The team recommends session-based   ││
│        │            │  │ auth with better-auth, storing      ││
│        │            │  │ sessions in PostgreSQL. JWT was     ││
│        │            │  │ considered but rejected due to...   ││
│        │            │  └─────────────────────────────────────┘│
└────────┴────────────┴─────────────────────────────────────────┘
```

**Agent sidebar:**
- Each agent: name, role badge (colored), model, status (running/waiting/completed)
- Total cost + duration at bottom

**Conversation:**
- Messages prefixed with `[agent-name]` in the agent's role color
- Round dividers: subtle horizontal line with "Round 2" label
- Streaming: current speaking agent's message has cursor animation
- Same tool call / thinking display as Agent Chat

**Synthesis panel:**
- Appears at bottom when team completes
- Rendered as markdown
- Can be collapsed

**Team list view** (`/projects/:projectId/teams`):
- Table: team ID, mode, status, agents, duration, cost, date
- Click → team detail
- "Launch Team" button → dialog to configure mode + agents + context

---

### 3.8 Learning Browser (Sprint 5)

**Route:** `/projects/:projectId/learnings`

Two tabs: **Patterns** and **Antipatterns**.

**Pattern table:**
| Column | Description |
|--------|-------------|
| Name | Pattern identifier (e.g., `PATTERN_REUSE`) |
| Category | Tag (architecture, typescript, testing, etc.) |
| Confidence | Progress bar 0-1.0 with numeric value |
| Status | Badge: active / proven / archived |
| Evidence | Number (how many times observed) |
| Success Rate | Percentage |
| Scope | project / universal |
| Actions | Approve, Archive, Edit, Promote to Universal |

**Antipattern table:**
| Column | Description |
|--------|-------------|
| Name | Antipattern identifier |
| Category | Tag |
| Severity | Badge: low / medium / high / critical |
| Times Prevented | Number |
| Scope | project / universal |
| Actions | Archive, Edit |

**Filters:**
- Category dropdown
- Status filter (active / proven / archived)
- Scope filter (project / universal)
- Search by name/description
- Sort by confidence, evidence, recency

**Detail view (expand row or side panel):**
- Full description
- Recommendation
- Code example (syntax highlighted)
- Feature history (which features produced this learning)
- Injection stats (times injected, times helped)

**Dashboard tab (or top section):**
- Total learnings (active / proven / archived)
- Top 5 patterns by confidence
- Injection effectiveness (% of "helped" outcomes)
- Learning velocity chart (learnings per feature over time)
- Per-category breakdown (bar chart)

---

### 3.9 Settings (Sprint 1+)

**Route:** `/projects/:projectId/settings` and `/settings`

**Project Settings tabs:**

| Tab | Contents | Sprint |
|-----|----------|--------|
| General | Name, path, description, detected stack (read-only display + re-detect button) | 1 |
| Pipeline | Default model, thinking level, planning mode, require approval toggle, budget limits | 3 |
| Agents | Per-phase model overrides, max turns, thinking tokens | 3 |
| Git | Default branch, auto-push, PR template | 3 |
| Danger | Delete project | 1 |

**Global Settings tabs:**

| Tab | Contents | Sprint |
|-----|----------|--------|
| Profile | Name, email, avatar | 1 |
| API Keys | Create/revoke API keys, show key prefix | 1 |
| Defaults | Default pipeline config for new projects | 3 |
| Appearance | Theme (dark/light/system), density | 1 |

---

## 4. Component Design Language

### Atoms

| Component | Usage |
|-----------|-------|
| `Badge` | Status indicators (in_progress, verified, failed), category tags, size tags |
| `Button` | Primary (filled), Secondary (outline), Ghost (text-only), Danger (red) |
| `Input` | Text fields, search bars |
| `Textarea` | Intent box, agent chat input |
| `Select` | Dropdowns for filters, model selection |
| `Toggle` | Boolean settings (require approval, auto-push) |
| `Progress` | Pipeline phase progress, confidence bars |
| `Skeleton` | Loading placeholders for all data surfaces |
| `Toast` | Success/error/info notifications |
| `Avatar` | User icon, agent role icon |
| `Kbd` | Keyboard shortcut indicators |

### Molecules

| Component | Usage |
|-----------|-------|
| `FeatureCard` | Kanban card with ID, title, status, progress |
| `ProjectCard` | Dashboard card with name, stats, stack tags |
| `PhaseStepper` | Horizontal pipeline progress indicator |
| `ToolCallBlock` | Collapsible tool invocation display |
| `ThinkingBlock` | Collapsible thinking content display |
| `MessageBubble` | Chat message with avatar, content, metadata |
| `AgentBadge` | Agent name + role color + model indicator |
| `CostDisplay` | Token counts + USD estimate, inline or card |
| `StatusBadge` | Feature/pipeline/agent status with color coding |
| `CommandPalette` | Cmd+K overlay with fuzzy search |

### Organisms

| Component | Usage |
|-----------|-------|
| `IntentBox` | Multi-line input → expansion preview → confirm |
| `PipelineViewer` | Stepper + phase tabs + streaming output |
| `AgentConversation` | Message list + tool calls + thinking + streaming |
| `KanbanBoard` | Columns + drag-and-drop + state transitions |
| `LearningTable` | Sortable, filterable table with curation actions |
| `TeamConversation` | Multi-agent messages with role colors + synthesis |
| `ApprovalGate` | Plan display + approve/reject buttons |
| `FeatureList` | Filterable table/list of features |
| `ActivityFeed` | Chronological event stream |
| `SessionSidebar` | Past chat sessions list |

---

## 5. Real-Time Patterns

### WebSocket Channels

The app maintains a single WebSocket connection. Subscriptions are managed per-view:

```
agent:{sessionId}     → Agent chat streaming
pipeline:{featureId}  → Pipeline phase progress
team:{teamId}         → Team conversation streaming
events:{projectId}    → Activity feed updates
notifications:{userId} → Notification badge updates
```

**Subscribe on mount, unsubscribe on unmount.** No orphan subscriptions.

### Streaming Text Display

Agent output streams token-by-token. The display should:
1. Append tokens to a buffer
2. Render the buffer as markdown in real-time
3. Show a blinking cursor at the insertion point
4. Auto-scroll to bottom (with "scroll to bottom" button if user scrolled up)
5. When complete: remove cursor, finalize markdown rendering

### Optimistic Updates

- Kanban drag → update local state immediately, revert on API error
- Feature creation → show in list immediately with "saving..." indicator
- Settings changes → save on blur/change, not on form submit

### State Synchronization

```
Server event → WebSocket → Zustand store → React re-render
```

- Feature status changes arrive via WebSocket → update Zustand → kanban card moves
- Pipeline phase transitions → update stepper + activate next tab
- Agent events → append to message list
- No polling. Everything is push-based via WebSocket events.

---

## 6. Sprint-by-Sprint UI Deliverables

### Sprint 1: Foundation

**Pages:**
- `/login` — sign in / sign up form
- `/dashboard` — project cards + recent activity
- `/projects/:id` — project home with intent box + feature list
- `/projects/:id/kanban` — kanban board with drag-and-drop
- `/projects/:id/settings` — general tab only
- `/settings` — profile + appearance

**Components to build:**
- AppShell (sidebar + top bar + main content area)
- Sidebar navigation
- ProjectCard
- FeatureCard (kanban variant)
- KanbanBoard with columns
- IntentBox (form-only, no AI expansion yet)
- FeatureList (table)
- StatusBadge
- ActivityFeed
- Toast system
- CommandPalette (basic: navigate to project/feature)
- Auth forms

**State:**
- Zustand stores: projects, features, ui (sidebar state, active project)
- TanStack Query for all API data fetching
- WebSocket connection for activity feed

---

### Sprint 2: Single Agent

**Pages:**
- `/projects/:id/agent` — agent chat with session sidebar

**Components to build:**
- AgentConversation
- MessageBubble (user + agent variants)
- ToolCallBlock (collapsible)
- ThinkingBlock (collapsible)
- StreamingTextDisplay (markdown rendering with cursor)
- SessionSidebar
- CostDisplay
- AgentInput (multi-line with send/stop)

**State:**
- Zustand store: agent sessions, messages
- WebSocket subscription: `agent:{sessionId}`
- Streaming buffer management

---

### Sprint 3: Pipeline

**Pages:**
- `/projects/:id/features/:featureId` — feature detail with pipeline viewer

**Components to build:**
- PhaseStepper (6 phases, states: pending/running/completed/failed/skipped)
- PipelineViewer (stepper + phase output tabs)
- PhaseOutputTab (streaming agent output, per phase)
- ApprovalGate (plan display + approve/reject)
- FeatureDetailPanel (description, ACs, git, cost)
- Pipeline controls (start/stop/retry buttons on feature cards and detail)

**Enhancements:**
- KanbanCard gains pipeline progress bar
- FeatureList gains "Start" action
- IntentBox gains AI expansion (calls expansion endpoint, shows decomposition preview)
- Settings gains Pipeline and Agents tabs

**State:**
- WebSocket subscription: `pipeline:{featureId}`
- Pipeline run data in feature store

---

### Sprint 4: Multi-Agent Teams

**Pages:**
- `/projects/:id/teams` — team sessions list
- `/projects/:id/teams/:teamId` — team conversation view

**Components to build:**
- TeamConversation (multi-agent messages with role colors)
- AgentBadge (name + role + color + model)
- AgentSidebar (agent list with status)
- TeamLaunchDialog (select mode, agents, context)
- SynthesisPanel
- RoundDivider (for discussion mode)

**Navigation:**
- "Teams" link appears in sidebar

**State:**
- WebSocket subscription: `team:{teamId}`
- Zustand store: team sessions

---

### Sprint 5: Learning System

**Pages:**
- `/projects/:id/learnings` — learning browser with dashboard

**Components to build:**
- LearningTable (patterns variant + antipatterns variant)
- ConfidenceBar (visual 0-1.0 indicator)
- CurationControls (approve, archive, edit, promote)
- LearningDetailPanel (description, recommendation, code example, history)
- LearningDashboard (stats cards + charts)
- InjectionPreview (show what learnings were injected into a pipeline run)

**Navigation:**
- "Learnings" link appears in sidebar

**Enhancements:**
- FeatureDetail shows "Injected Learnings" section (which patterns were used)
- Pipeline Phase 6 output shows extracted learnings

---

## 7. Interaction Patterns

### Progressive Disclosure

Every complex surface uses **collapse-by-default**:
- Tool calls → collapsed to one line, expand on click
- Thinking blocks → collapsed, expand on click
- Phase output → only current/selected phase visible
- Learning detail → expand row or open side panel
- Git info → collapsed section in feature detail

### Keyboard-First

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+N` | New feature (when in project) |
| `Cmd+Enter` | Send message (agent chat) |
| `Escape` | Close dialogs, deselect |
| `1-6` | Switch phase tab (feature detail) |
| `J/K` | Navigate feature list / kanban cards |

### Empty States

Every surface has a designed empty state:
- No projects → "Create your first project" with illustration
- No features → "Describe what you want to build" pointing to Intent Box
- No agent sessions → "Start a conversation" with suggested prompts
- No teams → "Launch your first team" with mode descriptions
- No learnings → "Learnings appear after your first completed feature"

### Error States

- API errors → toast with retry action
- WebSocket disconnect → subtle banner: "Reconnecting..." with auto-retry
- Agent failure → inline error in chat with "Retry" button
- Pipeline failure → red phase in stepper + error details in output panel
- Budget exceeded → warning banner with link to settings

### Loading States

- Initial page load → skeleton placeholders matching layout
- Agent streaming → blinking cursor
- Pipeline phase transition → pulsing dot on stepper
- Data mutations → inline spinner on the triggering button
- Never a full-page spinner. Always show structure first.

---

## 8. Data Flow Summary

```
                    ┌──────────────────────────┐
                    │       Zustand Stores      │
                    │                          │
                    │  projectStore             │
                    │  featureStore             │
                    │  agentStore               │
                    │  teamStore    (Sprint 4)  │
                    │  learningStore (Sprint 5) │
                    │  uiStore                  │
                    │  settingsStore            │
                    └─────────┬────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
      TanStack Query    WebSocket       User Actions
      (fetch/mutate)    (push events)   (click/drag/type)
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────┴────────┐
                    │   Hono Server    │
                    │   (oRPC + WS)    │
                    └──────────────────┘
```

**TanStack Query** handles:
- Initial data fetching (projects, features, sessions, learnings)
- Mutations (create, update, delete)
- Cache invalidation on WebSocket events

**WebSocket** handles:
- Real-time streaming (agent tokens, pipeline events, team messages)
- State change notifications (feature status, pipeline phase transitions)
- Activity feed updates

**Zustand** handles:
- UI state (sidebar collapsed, active tab, selected feature)
- Streaming buffers (agent output being assembled)
- Ephemeral state (command palette open, drag state)

---

## 9. Constraints

- **No SSR.** Client-side SPA with TanStack Router. Server renders a shell, client hydrates.
- **No CSS-in-JS.** Tailwind 4 only. No styled-components, no Emotion.
- **No component library vendor lock-in.** Use Radix primitives or headless UI for behavior (dialogs, dropdowns, popovers). Style with Tailwind.
- **No global CSS beyond Tailwind.** Component-scoped only.
- **Mobile-aware but not mobile-first.** This is a desktop development tool. Responsive sidebar collapse, but no mobile-specific layouts.
- **Accessibility baseline.** Keyboard navigation, ARIA labels, focus management. Not WCAG AAA, but usable without a mouse.
- **Bundle size budget.** Code-split by route. Lazy-load Sprint 4+ pages.

---

## 10. Open Design Questions (Decide During Implementation)

1. **Kanban vs. List as default view?** Blueprint says both. Pick one as the default route, other as toggle.
2. **Side panel vs. full page for feature detail?** Side panel keeps kanban visible. Full page gives more room for pipeline output. Could be user preference.
3. **Agent chat: per-project or global?** Blueprint says per-project. But should there be a "quick chat" without project context?
4. **Intent Box placement:** Always visible on project home? Or a floating button that opens a dialog? Blueprint shows it prominently on project home.
5. **Notification system depth:** Real-time toast for everything? Or a notification center with history? Start with toasts + bell icon listing recent.
6. **Plan approval UX:** Show in feature detail? Or a dedicated modal/dialog that demands attention? Blueprint suggests inline in feature detail + notification.
