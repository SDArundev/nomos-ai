# Data Models: Automaker → nomos-ai

> Reference for agents implementing F040 (Types + DB Layer). Maps Automaker types to nomos-ai Zod schemas and Drizzle tables.

---

## 1. Type Modules to Create

### packages/types/src/event.ts (NEW)

```typescript
import { z } from "zod";

export const eventTypeSchema = z.enum([
  // Agent events
  "agent:stream",
  "agent:complete",
  "agent:error",
  // Feature events
  "feature:created",
  "feature:started",
  "feature:progress",
  "feature:completed",
  "feature:error",
  "feature:verified",
  // Auto-mode events
  "auto-mode:started",
  "auto-mode:stopped",
  "auto-mode:idle",
  "auto-mode:error",
  "auto-mode:event",
  // Worktree events
  "worktree:init-started",
  "worktree:init-completed",
  // Terminal events
  "terminal:output",
  // Notification events
  "notification:created",
]);

export type EventType = z.infer<typeof eventTypeSchema>;
export type EventCallback = (type: EventType, payload: unknown) => void;
```

### packages/types/src/provider.ts (NEW)

```typescript
import { z } from "zod";

export const thinkingLevelSchema = z.enum(["none", "low", "standard", "high", "ultrathink"]);
export type ThinkingLevel = z.infer<typeof thinkingLevelSchema>;

export const THINKING_TOKEN_BUDGET: Record<ThinkingLevel, number | undefined> = {
  none: undefined,
  low: 1024,
  standard: 10000,
  high: 16000,
  ultrathink: 32000,
};

export const contentBlockSchema = z.object({
  type: z.enum(["text", "tool_use", "thinking", "tool_result"]),
  text: z.string().optional(),
  thinking: z.string().optional(),
  name: z.string().optional(),
  input: z.unknown().optional(),
  tool_use_id: z.string().optional(),
  content: z.string().optional(),
});
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const providerMessageSchema = z.object({
  type: z.enum(["assistant", "user", "error", "result"]),
  subtype: z.enum(["success", "error", "error_max_turns"]).optional(),
  session_id: z.string().optional(),
  message: z.object({
    role: z.enum(["user", "assistant"]),
    content: z.array(contentBlockSchema),
  }).optional(),
  result: z.string().optional(),
  error: z.string().optional(),
});
export type ProviderMessage = z.infer<typeof providerMessageSchema>;

export const executeOptionsSchema = z.object({
  prompt: z.string(),
  model: z.string().default("sonnet"),
  cwd: z.string(),
  systemPrompt: z.string().optional(),
  maxTurns: z.number().default(10),
  allowedTools: z.array(z.string()).optional(),
  abortController: z.custom<AbortController>().optional(),
  sdkSessionId: z.string().optional(),
  thinkingLevel: thinkingLevelSchema.default("standard"),
});
export type ExecuteOptions = z.infer<typeof executeOptionsSchema>;
```

### packages/types/src/message.ts (NEW)

```typescript
import { z } from "zod";
import { contentBlockSchema } from "./provider";

export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(contentBlockSchema)]),
});
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const messageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
    result: z.string().optional(),
  })).optional(),
  thinkingContent: z.string().optional(),
  createdAt: z.date(),
});
export type Message = z.infer<typeof messageSchema>;
```

### packages/types/src/notification.ts (NEW)

```typescript
import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "feature_waiting_approval",
  "feature_verified",
  "feature_failed",
  "agent_complete",
  "auto_mode_complete",
  "auto_mode_error",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  createdAt: z.date(),
  read: z.boolean().default(false),
  dismissed: z.boolean().default(false),
  featureId: z.string().optional(),
  projectId: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;
```

### packages/types/src/worktree.ts (NEW)

```typescript
import { z } from "zod";

export const prStateSchema = z.enum(["OPEN", "MERGED", "CLOSED"]);
export type PRState = z.infer<typeof prStateSchema>;

export const worktreePRInfoSchema = z.object({
  number: z.number(),
  url: z.string().url(),
  title: z.string(),
  state: prStateSchema,
  createdAt: z.string().datetime(),
});
export type WorktreePRInfo = z.infer<typeof worktreePRInfoSchema>;

export const worktreeInfoSchema = z.object({
  id: z.string(),
  featureId: z.string(),
  branchName: z.string(),
  path: z.string(),
  pr: worktreePRInfoSchema.optional(),
  createdAt: z.date(),
  removedAt: z.date().optional(),
});
export type WorktreeInfo = z.infer<typeof worktreeInfoSchema>;
```

### packages/types/src/settings.ts (NEW)

```typescript
import { z } from "zod";
import { thinkingLevelSchema } from "./provider";

export const themeModeSchema = z.enum([
  "system", "dark", "light",
  "dracula", "nord", "monokai", "tokyonight",
  "solarized", "gruvbox", "catppuccin", "onedark",
  "synthwave", "forest", "ocean",
]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const planningModeSchema = z.enum(["skip", "lite", "spec", "full"]);
export type PlanningMode = z.infer<typeof planningModeSchema>;

export const settingScopeSchema = z.enum(["global", "project"]);
export type SettingScope = z.infer<typeof settingScopeSchema>;

export const settingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(), // JSON-encoded
  scope: settingScopeSchema,
  scopeId: z.string().nullable(), // projectId for project scope
  updatedAt: z.date(),
});
export type Setting = z.infer<typeof settingSchema>;

// Default settings keys
export const SETTING_KEYS = {
  THEME: "theme",
  MAX_CONCURRENCY: "maxConcurrency",
  DEFAULT_MODEL: "defaultModel",
  THINKING_LEVEL: "thinkingLevel",
  PLANNING_MODE: "planningMode",
  USE_WORKTREES: "useWorktrees",
  SKIP_TESTS: "skipTests",
  SIDEBAR_OPEN: "sidebarOpen",
} as const;
```

### packages/types/src/pipeline.ts (NEW)

```typescript
import { z } from "zod";

export const pipelineStepIdSchema = z.enum([
  "init", "context", "plan", "execute", "verify", "merge", "finish",
]);
export type PipelineStepId = z.infer<typeof pipelineStepIdSchema>;

export const pipelineStepStatusSchema = z.enum([
  "pending", "running", "completed", "failed", "skipped",
]);
export type PipelineStepStatus = z.infer<typeof pipelineStepStatusSchema>;

export const pipelineStepSchema = z.object({
  id: pipelineStepIdSchema,
  name: z.string(),
  order: z.number(),
  status: pipelineStepStatusSchema.default("pending"),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});
export type PipelineStep = z.infer<typeof pipelineStepSchema>;
```

### packages/types/src/pagination.ts (NEW)

```typescript
import { z } from "zod";

export const paginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

---

## 2. Type Modules to Extend

### packages/types/src/ids.ts (EXTEND)

Add these branded types:

```typescript
// NEW branded types
export const WorktreeId = z.string().brand<"WorktreeId">();
export type WorktreeId = z.infer<typeof WorktreeId>;

export const EventId = z.string().brand<"EventId">();
export type EventId = z.infer<typeof EventId>;

export const MessageId = z.string().brand<"MessageId">();
export type MessageId = z.infer<typeof MessageId>;

export const NotificationId = z.string().brand<"NotificationId">();
export type NotificationId = z.infer<typeof NotificationId>;

export const SettingId = z.string().brand<"SettingId">();
export type SettingId = z.infer<typeof SettingId>;
```

### packages/types/src/feature.ts (EXTEND)

Add these fields to the feature schema:

```typescript
// Add to existing featureSchema
useWorktree: z.boolean().default(false),
locked: z.boolean().default(false),
lockedBy: z.string().nullable().default(null),  // sessionId that locked it
lockedAt: z.date().nullable().default(null),
branchName: z.string().nullable().default(null),
pipelineStep: z.string().nullable().default(null),  // Current step ID
pipelineSteps: z.array(pipelineStepSchema).optional(),
error: z.string().nullable().default(null),
startedAt: z.date().nullable().default(null),
completedAt: z.date().nullable().default(null),
```

### packages/types/src/session.ts (EXTEND)

Add these fields to the session schema:

```typescript
// Add to existing sessionSchema
sdkSessionId: z.string().nullable().default(null),  // Claude SDK session ID for resume
model: z.string().default("sonnet"),
isRunning: z.boolean().default(false),
workingDirectory: z.string().nullable().default(null),
messageCount: z.number().default(0),
```

### packages/types/src/agent.ts (EXTEND)

Add these types:

```typescript
export const agentDefinitionSchema = z.object({
  description: z.string(),
  prompt: z.string(),
  tools: z.array(z.string()).optional(),
  model: z.enum(["sonnet", "opus", "haiku"]).optional(),
});
export type AgentDefinition = z.infer<typeof agentDefinitionSchema>;
```

---

## 3. Drizzle Schema Tables

### packages/db/src/schema/features.ts (EXTEND)

```typescript
// Add columns to existing features table
useWorktree: integer("use_worktree", { mode: "boolean" }).default(false),
locked: integer("locked", { mode: "boolean" }).default(false),
lockedBy: text("locked_by"),         // session ID
lockedAt: integer("locked_at", { mode: "timestamp" }),
branchName: text("branch_name"),
pipelineStep: text("pipeline_step"),  // current step
error: text("error"),
startedAt: integer("started_at", { mode: "timestamp" }),
completedAt: integer("completed_at", { mode: "timestamp" }),
```

### packages/db/src/schema/sessions.ts (EXTEND)

```typescript
// Add columns to existing sessions table
sdkSessionId: text("sdk_session_id"),
model: text("model").default("sonnet"),
isRunning: integer("is_running", { mode: "boolean" }).default(false),
workingDirectory: text("working_directory"),
messageCount: integer("message_count").default(0),
```

### packages/db/src/schema/events.ts (NEW)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "../lib/ids";

export const events = sqliteTable("events", {
  id: text("id").primaryKey().$defaultFn(createId),
  type: text("type").notNull(),           // EventType
  payload: text("payload"),               // JSON
  featureId: text("feature_id"),
  projectId: text("project_id"),
  sessionId: text("session_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### packages/db/src/schema/messages.ts (NEW)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "../lib/ids";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(createId),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),            // "user" | "assistant" | "system"
  content: text("content").notNull(),
  toolCalls: text("tool_calls"),           // JSON array
  thinkingContent: text("thinking_content"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### packages/db/src/schema/notifications.ts (NEW)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "../lib/ids";

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(createId),
  type: text("type").notNull(),            // NotificationType
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  dismissed: integer("dismissed", { mode: "boolean" }).default(false),
  featureId: text("feature_id"),
  projectId: text("project_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### packages/db/src/schema/settings.ts (NEW)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "../lib/ids";

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey().$defaultFn(createId),
  key: text("key").notNull(),
  value: text("value").notNull(),          // JSON-encoded
  scope: text("scope").notNull(),          // "global" | "project"
  scopeId: text("scope_id"),              // projectId for project scope
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### packages/db/src/schema/worktrees.ts (NEW)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "../lib/ids";

export const worktrees = sqliteTable("worktrees", {
  id: text("id").primaryKey().$defaultFn(createId),
  featureId: text("feature_id").notNull(),
  branchName: text("branch_name").notNull(),
  path: text("path").notNull(),
  prNumber: integer("pr_number"),
  prUrl: text("pr_url"),
  prTitle: text("pr_title"),
  prState: text("pr_state"),              // "OPEN" | "MERGED" | "CLOSED"
  prCreatedAt: text("pr_created_at"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  removedAt: integer("removed_at", { mode: "timestamp" }),
});
```

---

## 4. Repository Interfaces

### packages/db/src/repositories/event.ts (NEW)

```typescript
// Key methods:
create(event: NewEvent): Promise<Event>
findByType(type: string, limit?: number): Promise<Event[]>
findByFeatureId(featureId: string): Promise<Event[]>
findRecent(limit: number): Promise<Event[]>
```

### packages/db/src/repositories/message.ts (NEW)

```typescript
// Key methods:
create(message: NewMessage): Promise<Message>
findBySessionId(sessionId: string): Promise<Message[]>
deleteBySessionId(sessionId: string): Promise<void>
countBySessionId(sessionId: string): Promise<number>
```

### packages/db/src/repositories/notification.ts (NEW)

```typescript
// Key methods:
create(notification: NewNotification): Promise<Notification>
findByProjectId(projectId: string, unreadOnly?: boolean): Promise<Notification[]>
markRead(id: string): Promise<void>
markAllRead(projectId: string): Promise<void>
dismiss(id: string): Promise<void>
countUnread(projectId: string): Promise<number>
```

### packages/db/src/repositories/setting.ts (NEW)

```typescript
// Key methods:
findByKeyAndScope(key: string, scope: string, scopeId?: string): Promise<Setting | undefined>
upsert(setting: NewSetting): Promise<Setting>
deleteByScope(scope: string, scopeId: string): Promise<void>
getAllForScope(scope: string, scopeId?: string): Promise<Setting[]>
```

### packages/db/src/repositories/worktree.ts (NEW)

```typescript
// Key methods:
create(worktree: NewWorktree): Promise<Worktree>
findByFeatureId(featureId: string): Promise<Worktree | undefined>
findByBranchName(branchName: string): Promise<Worktree | undefined>
updatePR(id: string, pr: PRInfo): Promise<void>
markRemoved(id: string): Promise<void>
findActive(): Promise<Worktree[]>
```

---

## 5. Automaker → nomos-ai Field Mapping

### Feature Fields

| Automaker Field | nomos-ai Field | Notes |
|----------------|----------------|-------|
| `id` | `id` | Same (string) |
| `title` | `title` | Same |
| `titleGenerating` | — | Skip (not needed) |
| `category` | `category` | Same |
| `description` | `description` | Same |
| `passes` | `passes` | Same (boolean) |
| `status` | `status` | Map: `running` → `in_progress`, `completed` → `waiting_approval` |
| `dependencies` | `dependencies` | Same (string array) |
| `spec` | `spec` | Same (text) |
| `model` | `model` | Same (string) |
| `branchName` | `branchName` | Same |
| `skipTests` | `skipTests` | Same |
| `thinkingLevel` | `thinkingLevel` | Add "standard" level |
| `reasoningEffort` | — | Skip (Claude-only, not needed) |
| `planningMode` | `planningMode` | Same |
| `requirePlanApproval` | `requirePlanApproval` | Same |
| `planSpec` | `planSpec` | Same structure (JSON column) |
| `error` | `error` | Same |
| `summary` | `summary` | Same |
| `startedAt` | `startedAt` | Same |
| `descriptionHistory` | `descriptionHistory` | Same (JSON column) |
| `imagePaths` | — | Skip initially |
| `textFilePaths` | — | Skip initially |

### Session Fields

| Automaker Field | nomos-ai Field | Notes |
|----------------|----------------|-------|
| `id` | `id` | Same |
| `name` | `name` | Same |
| `projectPath` | `projectId` | Reference project by ID, not path |
| `createdAt` | `createdAt` | Same |
| `updatedAt` | `updatedAt` | Same |
| `messageCount` | `messageCount` | Same |
| `isArchived` | `isArchived` | Same |
| `isDirty` | — | Skip |
| `tags` | — | Skip initially |
| — | `sdkSessionId` | NEW: SDK session resume |
| — | `model` | NEW: Model per session |
| — | `isRunning` | NEW: Running state |
| — | `workingDirectory` | NEW: CWD for agent |

### Settings Keys

| Automaker Setting | nomos-ai Key | Type |
|------------------|--------------|------|
| `theme` | `theme` | ThemeMode |
| `maxConcurrency` | `maxConcurrency` | number |
| `defaultSkipTests` | `skipTests` | boolean |
| `useWorktrees` | `useWorktrees` | boolean |
| `defaultPlanningMode` | `planningMode` | PlanningMode |
| `defaultFeatureModel` | `defaultModel` | string |
| `sidebarOpen` | `sidebarOpen` | boolean |
| `chatHistoryOpen` | `chatHistoryOpen` | boolean |
| `enableDependencyBlocking` | `dependencyBlocking` | boolean |

---

## 6. ID Generation

Extend existing `packages/db/src/lib/ids.ts` (or wherever IDs are generated):

```typescript
export function createId(): string {
  return crypto.randomUUID(); // or nanoid/cuid2
}

// Prefix helpers for type safety
export const createEventId = () => `evt_${createId()}`;
export const createMessageId = () => `msg_${createId()}`;
export const createNotificationId = () => `ntf_${createId()}`;
export const createSettingId = () => `set_${createId()}`;
export const createWorktreeId = () => `wt_${createId()}`;
```
