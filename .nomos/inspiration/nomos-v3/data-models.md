# Data Models & Zod Schemas

> Complete data model reference with Zod schemas for NOMOS v3.

---

## Overview

All data models in NOMOS use **Zod** for runtime validation and **TypeScript** for static typing. This ensures type safety from API boundaries through to database operations.

**Package:** `@nomos/types`
**Validation:** Zod v4.x

---

## Core Entities

### Feature

```typescript
// packages/types/src/feature.ts
import { z } from 'zod';

export const FeatureIdSchema = z.string().regex(/^F\d{3}$/, 'Feature ID must be F followed by 3 digits');
export type FeatureId = z.infer<typeof FeatureIdSchema>;

export const FeatureStatusSchema = z.enum([
  'backlog',
  'in_progress',
  'waiting_approval',
  'verified'
]);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const FeaturePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type FeaturePriority = z.infer<typeof FeaturePrioritySchema>;

export const PlanningModeSchema = z.enum(['skip', 'lite', 'spec', 'full']);
export type PlanningMode = z.infer<typeof PlanningModeSchema>;

export const ThinkingLevelSchema = z.enum(['none', 'medium', 'deep', 'ultra']);
export type ThinkingLevel = z.infer<typeof ThinkingLevelSchema>;

export const ModelSchema = z.enum([
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-haiku-3'
]);
export type Model = z.infer<typeof ModelSchema>;

export const DescriptionHistoryEntrySchema = z.object({
  description: z.string(),
  timestamp: z.string().datetime(),
  source: z.enum(['user', 'ai', 'import']),
});
export type DescriptionHistoryEntry = z.infer<typeof DescriptionHistoryEntrySchema>;

export const FeatureSchema = z.object({
  // Identity
  id: FeatureIdSchema,
  title: z.string().min(1).max(200),
  description: z.string(),
  category: z.string().default('general'),

  // Status
  status: FeatureStatusSchema.default('backlog'),
  priority: FeaturePrioritySchema.default('medium'),
  locked: z.boolean().default(false),
  lockedAt: z.number().optional(),
  lockedBy: z.string().optional(),

  // Dependencies
  dependencies: z.array(FeatureIdSchema).default([]),
  blockedBy: z.array(FeatureIdSchema).optional(),

  // Git Integration
  useWorktree: z.boolean().default(true),
  branch: z.string().optional(),

  // Agent Configuration
  planningMode: PlanningModeSchema.default('lite'),
  thinkingLevel: ThinkingLevelSchema.default('medium'),
  model: ModelSchema.optional(),

  // Media
  imagePaths: z.array(z.string()).default([]),

  // History
  descriptionHistory: z.array(DescriptionHistoryEntrySchema).default([]),

  // Requirements Tracing
  requirements: z.array(z.string()).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  verifiedAt: z.string().datetime().optional(),

  // Metrics (collected after completion)
  metrics: z.object({
    durationMinutes: z.number().optional(),
    retryCount: z.number().default(0),
    filesChanged: z.number().optional(),
    linesAdded: z.number().optional(),
    linesRemoved: z.number().optional(),
    testsPassed: z.number().optional(),
    testsFailed: z.number().optional(),
  }).optional(),
});

export type Feature = z.infer<typeof FeatureSchema>;

// Create/Update DTOs
export const CreateFeatureSchema = FeatureSchema.pick({
  title: true,
  description: true,
  category: true,
  priority: true,
  dependencies: true,
  useWorktree: true,
  planningMode: true,
  thinkingLevel: true,
  model: true,
  imagePaths: true,
  requirements: true,
}).partial({
  category: true,
  priority: true,
  dependencies: true,
  useWorktree: true,
  planningMode: true,
  thinkingLevel: true,
  model: true,
  imagePaths: true,
  requirements: true,
});
export type CreateFeature = z.infer<typeof CreateFeatureSchema>;

export const UpdateFeatureSchema = CreateFeatureSchema.partial().extend({
  status: FeatureStatusSchema.optional(),
});
export type UpdateFeature = z.infer<typeof UpdateFeatureSchema>;
```

---

### Agent Session

```typescript
// packages/types/src/agent.ts
import { z } from 'zod';

export const SessionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const AgentSessionSchema = z.object({
  id: z.string().uuid(),
  projectPath: z.string(),
  workingDirectory: z.string(),
  featureId: z.string().optional(),

  // Model configuration
  model: ModelSchema,
  thinkingLevel: ThinkingLevelSchema.default('medium'),
  planningMode: PlanningModeSchema.default('lite'),

  // SDK Session
  sdkSessionId: z.string().optional(),

  // Status
  status: SessionStatusSchema.default('pending'),
  isRunning: z.boolean().default(false),

  // Messages
  messageCount: z.number().default(0),

  // Token usage
  tokenUsage: z.object({
    input: z.number().default(0),
    output: z.number().default(0),
    thinking: z.number().default(0),
    cache: z.number().default(0),
    total: z.number().default(0),
  }).default({}),

  // Cost tracking
  costUsd: z.number().default(0),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export type AgentSession = z.infer<typeof AgentSessionSchema>;

// Session summary for lists
export const SessionSummarySchema = AgentSessionSchema.pick({
  id: true,
  featureId: true,
  model: true,
  status: true,
  messageCount: true,
  costUsd: true,
  createdAt: true,
  completedAt: true,
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
```

---

### Agent Events

```typescript
// packages/types/src/agent-events.ts
import { z } from 'zod';

// Text output from agent
export const TextEventSchema = z.object({
  type: z.literal('text'),
  sessionId: z.string(),
  content: z.string(),
});

// Tool call initiated
export const ToolCallEventSchema = z.object({
  type: z.literal('tool_call'),
  sessionId: z.string(),
  tool: z.string(),
  input: z.unknown(),
  callId: z.string().optional(),
});

// Tool execution result
export const ToolResultEventSchema = z.object({
  type: z.literal('tool_result'),
  sessionId: z.string(),
  tool: z.string(),
  result: z.unknown(),
  callId: z.string().optional(),
  durationMs: z.number().optional(),
});

// Thinking block (extended thinking)
export const ThinkingEventSchema = z.object({
  type: z.literal('thinking'),
  sessionId: z.string(),
  content: z.string(),
});

// Error event
export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  sessionId: z.string(),
  error: z.string(),
  code: z.string().optional(),
  retryable: z.boolean().optional(),
});

// Session lifecycle events
export const SessionInitEventSchema = z.object({
  type: z.literal('session_init'),
  sessionId: z.string(),
  sdkSessionId: z.string(),
});

export const SessionCompleteEventSchema = z.object({
  type: z.literal('complete'),
  sessionId: z.string(),
  tokenUsage: z.object({
    input: z.number(),
    output: z.number(),
    thinking: z.number().optional(),
  }).optional(),
});

// Discriminated union of all events
export const AgentEventSchema = z.discriminatedUnion('type', [
  TextEventSchema,
  ToolCallEventSchema,
  ToolResultEventSchema,
  ThinkingEventSchema,
  ErrorEventSchema,
  SessionInitEventSchema,
  SessionCompleteEventSchema,
]);

export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type TextEvent = z.infer<typeof TextEventSchema>;
export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;
export type ToolResultEvent = z.infer<typeof ToolResultEventSchema>;
export type ThinkingEvent = z.infer<typeof ThinkingEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
```

---

### Project & Workspace

```typescript
// packages/types/src/project.ts
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string(),
  description: z.string().optional(),

  // Git info
  gitRemote: z.string().optional(),
  mainBranch: z.string().default('main'),

  // Status
  isActive: z.boolean().default(false),
  isFavorite: z.boolean().default(false),

  // Feature counts
  featureCounts: z.object({
    backlog: z.number().default(0),
    inProgress: z.number().default(0),
    waitingApproval: z.number().default(0),
    verified: z.number().default(0),
  }).default({}),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Worktree for feature isolation
export const WorktreeSchema = z.object({
  path: z.string(),
  branchName: z.string(),
  featureId: z.string().optional(),

  // Status
  isDirty: z.boolean().default(false),
  ahead: z.number().default(0),
  behind: z.number().default(0),

  // PR info
  prInfo: z.object({
    url: z.string(),
    number: z.number(),
    title: z.string(),
    state: z.enum(['open', 'closed', 'merged']),
  }).optional(),

  // Init script status
  initScriptStatus: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  initScriptOutput: z.string().optional(),

  // Timestamps
  createdAt: z.string().datetime(),
});

export type Worktree = z.infer<typeof WorktreeSchema>;
```

---

### Settings

```typescript
// packages/types/src/settings.ts
import { z } from 'zod';

export const PhaseModelConfigSchema = z.object({
  model: ModelSchema,
  thinkingLevel: ThinkingLevelSchema.optional(),
});

export const SubagentDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  allowedTools: z.array(z.string()),
  maxTurns: z.number().default(10),
  model: ModelSchema.optional(),
});

export const MCPServerConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(), // For HTTP/SSE servers
});

export const AutoModeConfigSchema = z.object({
  maxConcurrency: z.number().min(1).max(10).default(1),
  pauseOnFailure: z.boolean().default(true),
  consecutiveFailureThreshold: z.number().default(3),
  requirePlanApproval: z.boolean().default(false),
});

export const SettingsSchema = z.object({
  // UI
  theme: z.string().default('dark'),
  font: z.string().default('system'),

  // Models
  defaultModel: ModelSchema.default('claude-sonnet-4'),
  phaseModels: z.record(PhaseModelConfigSchema).default({}),

  // Auto-mode
  autoMode: AutoModeConfigSchema.default({}),

  // Features
  enableSkills: z.boolean().default(true),
  enableSubagents: z.boolean().default(false),
  customSubagents: z.array(SubagentDefinitionSchema).default([]),

  // MCP
  mcpServers: z.array(MCPServerConfigSchema).default([]),

  // Terminal
  terminalFont: z.string().default('JetBrains Mono'),
  terminalFontSize: z.number().min(8).max(24).default(14),

  // Keyboard shortcuts
  keyboardShortcuts: z.record(z.string()).default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type SubagentDefinition = z.infer<typeof SubagentDefinitionSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type AutoModeConfig = z.infer<typeof AutoModeConfigSchema>;
```

---

### AI Profile

```typescript
// packages/types/src/profile.ts
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),

  // Model configuration
  model: ModelSchema,
  thinkingLevel: ThinkingLevelSchema.default('medium'),
  planningMode: PlanningModeSchema.default('lite'),

  // System prompt
  systemPrompt: z.string().optional(),

  // Tool restrictions
  allowedTools: z.array(z.string()).optional(),
  blockedTools: z.array(z.string()).optional(),

  // Budget
  maxBudgetUsd: z.number().optional(),

  // Preset type
  isBuiltIn: z.boolean().default(false),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// Built-in profiles
export const BUILT_IN_PROFILES: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Heavy Task',
    description: 'For complex features requiring deep reasoning',
    model: 'claude-opus-4',
    thinkingLevel: 'deep',
    planningMode: 'spec',
    isBuiltIn: true,
  },
  {
    name: 'Balanced',
    description: 'Standard development work',
    model: 'claude-sonnet-4',
    thinkingLevel: 'medium',
    planningMode: 'lite',
    isBuiltIn: true,
  },
  {
    name: 'Quick Edit',
    description: 'Simple fixes and small changes',
    model: 'claude-haiku-3',
    thinkingLevel: 'none',
    planningMode: 'skip',
    isBuiltIn: true,
  },
];
```

---

### WebSocket Messages

```typescript
// packages/types/src/websocket.ts
import { z } from 'zod';

// Client -> Server messages
export const WSClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('subscribe'),
    channels: z.array(z.string()),
  }),
  z.object({
    type: z.literal('unsubscribe'),
    channels: z.array(z.string()),
  }),
  z.object({
    type: z.literal('ping'),
  }),
]);

export type WSClientMessage = z.infer<typeof WSClientMessageSchema>;

// Server -> Client messages
export const WSServerMessageSchema = z.object({
  type: z.string(),
  channel: z.string().optional(),
  data: z.unknown(),
  timestamp: z.number(),
});

export type WSServerMessage = z.infer<typeof WSServerMessageSchema>;

// Terminal-specific messages
export const TerminalInputSchema = z.object({
  type: z.literal('input'),
  sessionId: z.string(),
  data: z.string(),
});

export const TerminalResizeSchema = z.object({
  type: z.literal('resize'),
  sessionId: z.string(),
  rows: z.number().min(1).max(500),
  cols: z.number().min(1).max(500),
});

export const TerminalOutputSchema = z.object({
  type: z.literal('data'),
  sessionId: z.string(),
  data: z.string(),
  timestamp: z.number(),
});

export const TerminalExitSchema = z.object({
  type: z.literal('exit'),
  sessionId: z.string(),
  code: z.number(),
});

export const TerminalMessageSchema = z.discriminatedUnion('type', [
  TerminalInputSchema,
  TerminalResizeSchema,
  TerminalOutputSchema,
  TerminalExitSchema,
]);

export type TerminalMessage = z.infer<typeof TerminalMessageSchema>;
```

---

### Common Utilities

```typescript
// packages/types/src/common.ts
import { z } from 'zod';

// Pagination
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().optional(),
  totalPages: z.number().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }).optional(),
    meta: z.object({
      requestId: z.string().optional(),
      timestamp: z.number(),
      pagination: PaginationSchema.optional(),
    }).optional(),
  });

// Sort order
export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// Date range filter
export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;
```

---

## Database Schema (Drizzle)

```typescript
// packages/db/src/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').default('general'),
  status: text('status').default('backlog'),
  priority: text('priority').default('medium'),
  locked: integer('locked', { mode: 'boolean' }).default(false),
  lockedAt: integer('locked_at'),
  lockedBy: text('locked_by'),
  dependencies: text('dependencies', { mode: 'json' }).$type<string[]>().default([]),
  useWorktree: integer('use_worktree', { mode: 'boolean' }).default(true),
  branch: text('branch'),
  planningMode: text('planning_mode').default('lite'),
  thinkingLevel: text('thinking_level').default('medium'),
  model: text('model'),
  imagePaths: text('image_paths', { mode: 'json' }).$type<string[]>().default([]),
  descriptionHistory: text('description_history', { mode: 'json' }).$type<unknown[]>().default([]),
  requirements: text('requirements', { mode: 'json' }).$type<string[]>().default([]),
  metrics: text('metrics', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  verifiedAt: text('verified_at'),
});

export const agentSessions = sqliteTable('agent_sessions', {
  id: text('id').primaryKey(),
  projectPath: text('project_path').notNull(),
  workingDirectory: text('working_directory').notNull(),
  featureId: text('feature_id').references(() => features.id),
  model: text('model').notNull(),
  thinkingLevel: text('thinking_level').default('medium'),
  planningMode: text('planning_mode').default('lite'),
  sdkSessionId: text('sdk_session_id'),
  status: text('status').default('pending'),
  isRunning: integer('is_running', { mode: 'boolean' }).default(false),
  messageCount: integer('message_count').default(0),
  tokenUsage: text('token_usage', { mode: 'json' }),
  costUsd: real('cost_usd').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('default'),
  data: text('data', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  model: text('model').notNull(),
  thinkingLevel: text('thinking_level').default('medium'),
  planningMode: text('planning_mode').default('lite'),
  systemPrompt: text('system_prompt'),
  allowedTools: text('allowed_tools', { mode: 'json' }).$type<string[]>(),
  blockedTools: text('blocked_tools', { mode: 'json' }).$type<string[]>(),
  maxBudgetUsd: real('max_budget_usd'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

---

## Type Exports

```typescript
// packages/types/src/index.ts
export * from './feature';
export * from './agent';
export * from './agent-events';
export * from './project';
export * from './settings';
export * from './profile';
export * from './websocket';
export * from './common';
```

---

*Reference: Data models and Zod schemas for NOMOS v3*
