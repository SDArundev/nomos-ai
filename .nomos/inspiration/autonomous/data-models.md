# Data Models & Schemas

> Type definitions, data structures, and schemas for autonomous AI development systems.

---

## Core Data Models

### Feature

```typescript
interface Feature {
  // Identity
  id: string;                        // Timestamp-based unique ID (e.g., "1706123456789")
  title: string;                     // Short descriptive title
  description: string;               // Detailed feature description

  // Classification
  category: string;                  // Feature category (e.g., "authentication")
  status: FeatureStatus;             // Current workflow status
  priority?: 'high' | 'medium' | 'low';

  // Visual Context
  imagePaths: (string | ImageMetadata)[];  // Screenshots, mockups
  descriptionHistory: DescriptionHistoryEntry[];  // Change tracking

  // Dependencies
  dependencies: string[];            // Feature IDs this depends on
  blockedBy?: string[];              // Computed: features blocking this

  // Execution Configuration
  useWorktree: boolean;              // Execute in isolated branch
  branch?: string;                   // Branch name if using worktree
  planningMode: PlanningLevel;       // Planning approach
  thinkingLevel: ThinkingLevel;      // AI reasoning depth
  model?: string;                    // Model override

  // State
  locked?: boolean;                  // Currently being processed
  lockedAt?: number;                 // Lock timestamp
  lockedBy?: string;                 // Agent/session ID

  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

type FeatureStatus =
  | 'backlog'           // Not started
  | 'in_progress'       // Being worked on
  | 'waiting_approval'  // Needs review
  | 'verified'          // Completed and verified
  | 'archived';         // No longer active

type PlanningLevel = 'skip' | 'lite' | 'spec' | 'full';

type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'ultrathink';

interface ImageMetadata {
  path: string;
  description?: string;
  addedAt: number;
}

interface DescriptionHistoryEntry {
  description: string;
  timestamp: number;
  source: 'user' | 'ai' | 'import';
}
```

### Project

```typescript
interface Project {
  // Identity
  id: string;                        // UUID
  name: string;                      // Display name
  path: string;                      // Absolute filesystem path

  // Classification
  type?: 'standard' | 'monorepo' | 'package';
  framework?: string;                // Detected framework (react, express, etc.)

  // Settings Override
  settings?: Partial<ProjectSettings>;

  // State
  isFavorite: boolean;
  lastOpenedAt?: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

interface ProjectSettings {
  // UI
  theme?: string;
  font?: string;

  // Board
  boardBackground?: BoardBackground;
  columnOrder?: string[];

  // Execution
  autoModeConfig?: WorktreeAutoConfig;
  defaultPlanningMode?: PlanningLevel;
  defaultThinkingLevel?: ThinkingLevel;

  // Models
  phaseModelOverrides?: Record<string, PhaseModelConfig>;
}

interface BoardBackground {
  type: 'color' | 'image' | 'gradient';
  value: string;
  opacity?: number;
}
```

### Agent Session

```typescript
interface AgentSession {
  // Identity
  id: string;                        // UUID
  name?: string;                     // Optional display name

  // Context
  projectPath: string;               // Working project
  workingDirectory: string;          // CWD for agent
  featureId?: string;                // Associated feature

  // Conversation
  messages: Message[];               // Message history
  sdkSessionId?: string;             // SDK session for continuity

  // Configuration
  model: string;                     // Active model
  systemPrompt?: string;             // Custom system prompt
  allowedTools?: string[];           // Tool restrictions

  // State
  isRunning: boolean;                // Currently executing
  abortController?: AbortController; // For cancellation

  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastMessageAt?: number;
}

interface Message {
  id: string;                        // UUID
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;

  // Rich content
  images?: string[];                 // Base64 encoded
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];

  // Metadata
  model?: string;                    // Model used
  tokens?: { input: number; output: number };
  thinkingTime?: number;             // MS spent thinking
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  output: unknown;
  error?: string;
}
```

### Worktree

```typescript
interface WorktreeMetadata {
  // Identity
  branchName: string;
  path: string;                      // Absolute path to worktree

  // Git State
  baseBranch: string;                // Branch created from
  commitHash?: string;               // Current HEAD

  // PR Integration
  prInfo?: PullRequestInfo;

  // Init Script
  initScriptStatus?: 'pending' | 'running' | 'completed' | 'failed';
  initScriptOutput?: string;

  // Timestamps
  createdAt: number;
  lastAccessedAt?: number;
}

interface PullRequestInfo {
  url: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: number;
  updatedAt?: number;
}
```

---

## Configuration Models

### Global Settings

```typescript
interface GlobalSettings {
  // UI Preferences
  theme: string;
  font: string;
  sidebarCollapsed: boolean;

  // Keyboard
  keyboardShortcuts: Record<string, string>;

  // Models
  phaseModels: Record<string, PhaseModelConfig>;
  defaultProvider: string;

  // Providers
  claudeCompatibleProviders: ClaudeCompatibleProvider[];

  // Auto Mode
  autoModeByWorktree: Record<string, WorktreeAutoConfig>;
  requirePlanApproval: boolean;

  // Features
  enableSkills: boolean;
  skillSources: ('user' | 'project')[];
  enableSubagents: boolean;
  customSubagents: SubagentDefinition[];

  // MCP
  mcpServers: MCPServerConfig[];

  // Terminal
  terminalFont: string;
  terminalFontSize: number;
  terminalTheme: string;

  // Logging
  httpLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Version
  settingsVersion: number;
}

interface PhaseModelConfig {
  model: string;
  thinkingLevel: ThinkingLevel;
  providerId?: string;
}

interface WorktreeAutoConfig {
  maxConcurrency: number;
  pauseOnFailures: boolean;
  failureThreshold: number;
}

interface ClaudeCompatibleProvider {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: ModelEntry[];
}

interface ModelEntry {
  id: string;
  name: string;
  supportsThinking?: boolean;
  maxTokens?: number;
}
```

### Subagent Definition

```typescript
interface SubagentDefinition {
  // Identity
  name: string;                      // Unique identifier
  displayName: string;               // UI display name
  description: string;               // What this agent does

  // Configuration
  systemPrompt: string;              // Agent instructions
  allowedTools: string[];            // Available tools
  maxTurns: number;                  // Max conversation turns

  // Model
  model?: string;                    // Model override
  thinkingLevel?: ThinkingLevel;

  // Constraints
  workingDirectoryScope?: 'project' | 'worktree' | 'any';
  timeoutMs?: number;
}
```

### MCP Server Configuration

```typescript
type MCPServerConfig =
  | MCPStdioServerConfig
  | MCPSSEServerConfig
  | MCPHttpServerConfig;

interface MCPStdioServerConfig {
  name: string;
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

interface MCPSSEServerConfig {
  name: string;
  transport: 'sse';
  url: string;
  headers?: Record<string, string>;
}

interface MCPHttpServerConfig {
  name: string;
  transport: 'http';
  url: string;
  headers?: Record<string, string>;
}
```

---

## Event Models

### Agent Events

```typescript
interface AgentStartEvent {
  type: 'agent:start';
  sessionId: string;
  featureId?: string;
  model: string;
  timestamp: number;
}

interface AgentStreamEvent {
  type: 'agent:stream';
  sessionId: string;
  content: string;
  timestamp: number;
}

interface AgentToolUseEvent {
  type: 'agent:tool_use';
  sessionId: string;
  tool: string;
  input: Record<string, unknown>;
  timestamp: number;
}

interface AgentCompleteEvent {
  type: 'agent:complete';
  sessionId: string;
  output: string;
  tokens: { input: number; output: number };
  duration: number;
  timestamp: number;
}

interface AgentErrorEvent {
  type: 'agent:error';
  sessionId: string;
  error: string;
  code?: string;
  timestamp: number;
}
```

### Auto Mode Events

```typescript
interface AutoModeStartedEvent {
  type: 'auto_mode_started';
  projectPath: string;
  branchName: string;
  maxConcurrency: number;
  timestamp: number;
}

interface AutoModeFeatureStartEvent {
  type: 'auto_mode_feature_start';
  featureId: string;
  featureTitle: string;
  projectPath: string;
  branchName?: string;
  timestamp: number;
}

interface AutoModeFeatureCompleteEvent {
  type: 'auto_mode_feature_complete';
  featureId: string;
  projectPath: string;
  status: 'success' | 'failure';
  duration: number;
  timestamp: number;
}

interface AutoModePausedEvent {
  type: 'auto_mode_paused_failures';
  projectPath: string;
  reason: string;
  failureCount: number;
  timestamp: number;
}

interface AutoModeStoppedEvent {
  type: 'auto_mode_stopped';
  projectPath: string;
  reason: 'user' | 'error' | 'complete';
  timestamp: number;
}
```

### Pipeline Events

```typescript
interface PipelineStepStartedEvent {
  type: 'pipeline_step_started';
  featureId: string;
  step: string;
  stepIndex: number;
  totalSteps: number;
  timestamp: number;
}

interface PipelineStepCompleteEvent {
  type: 'pipeline_step_complete';
  featureId: string;
  step: string;
  output?: string;
  duration: number;
  timestamp: number;
}

interface PipelineStepErrorEvent {
  type: 'pipeline_step_error';
  featureId: string;
  step: string;
  error: string;
  timestamp: number;
}
```

---

## API Request/Response Models

### Feature Operations

```typescript
// Create Feature
interface CreateFeatureRequest {
  projectPath: string;
  feature: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>;
}

interface CreateFeatureResponse {
  success: true;
  feature: Feature;
}

// Update Feature
interface UpdateFeatureRequest {
  projectPath: string;
  featureId: string;
  updates: Partial<Feature>;
}

interface UpdateFeatureResponse {
  success: true;
  feature: Feature;
}

// List Features
interface ListFeaturesRequest {
  projectPath: string;
  status?: FeatureStatus[];
  category?: string;
  page?: number;
  limit?: number;
}

interface ListFeaturesResponse {
  success: true;
  features: Feature[];
  total: number;
  page: number;
  limit: number;
}
```

### Agent Operations

```typescript
// Send Message
interface SendMessageRequest {
  sessionId: string;
  message: string;
  workingDirectory?: string;
  imagePaths?: string[];
  model?: string;
}

// Response is streamed via WebSocket

// Get History
interface GetHistoryRequest {
  sessionId: string;
  limit?: number;
  before?: number; // Timestamp
}

interface GetHistoryResponse {
  success: true;
  messages: Message[];
  hasMore: boolean;
}
```

### Auto Mode Operations

```typescript
// Start Auto Mode
interface StartAutoModeRequest {
  projectPath: string;
  workingDir?: string;
  maxConcurrency?: number;
  featureIds?: string[]; // Specific features to process
}

interface StartAutoModeResponse {
  success: true;
  message: string;
}

// Run Single Feature
interface RunFeatureRequest {
  projectPath: string;
  featureId: string;
  workingDir?: string;
}

interface RunFeatureResponse {
  success: true;
  message: string;
}
```

---

## Storage Schemas

### Feature File (feature.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "title", "description", "status", "createdAt", "updatedAt"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string", "minLength": 1 },
    "description": { "type": "string" },
    "category": { "type": "string" },
    "status": {
      "type": "string",
      "enum": ["backlog", "in_progress", "waiting_approval", "verified", "archived"]
    },
    "priority": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    },
    "imagePaths": {
      "type": "array",
      "items": {
        "oneOf": [
          { "type": "string" },
          {
            "type": "object",
            "properties": {
              "path": { "type": "string" },
              "description": { "type": "string" },
              "addedAt": { "type": "number" }
            },
            "required": ["path"]
          }
        ]
      }
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string" }
    },
    "useWorktree": { "type": "boolean" },
    "branch": { "type": "string" },
    "planningMode": {
      "type": "string",
      "enum": ["skip", "lite", "spec", "full"]
    },
    "thinkingLevel": {
      "type": "string",
      "enum": ["none", "low", "medium", "high", "ultrathink"]
    },
    "model": { "type": "string" },
    "createdAt": { "type": "number" },
    "updatedAt": { "type": "number" }
  }
}
```

### Settings File (settings.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "settingsVersion": { "type": "number" },
    "theme": { "type": "string" },
    "font": { "type": "string" },
    "sidebarCollapsed": { "type": "boolean" },
    "keyboardShortcuts": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "phaseModels": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "model": { "type": "string" },
          "thinkingLevel": { "type": "string" },
          "providerId": { "type": "string" }
        },
        "required": ["model", "thinkingLevel"]
      }
    },
    "defaultProvider": { "type": "string" },
    "claudeCompatibleProviders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "apiKey": { "type": "string" },
          "baseUrl": { "type": "string" },
          "models": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "name": { "type": "string" },
                "supportsThinking": { "type": "boolean" }
              },
              "required": ["id", "name"]
            }
          }
        },
        "required": ["id", "name"]
      }
    },
    "autoModeByWorktree": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "maxConcurrency": { "type": "number", "minimum": 1 },
          "pauseOnFailures": { "type": "boolean" },
          "failureThreshold": { "type": "number", "minimum": 1 }
        },
        "required": ["maxConcurrency"]
      }
    },
    "requirePlanApproval": { "type": "boolean" },
    "enableSkills": { "type": "boolean" },
    "skillSources": {
      "type": "array",
      "items": { "type": "string", "enum": ["user", "project"] }
    },
    "enableSubagents": { "type": "boolean" },
    "mcpServers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "transport": { "type": "string", "enum": ["stdio", "sse", "http"] },
          "command": { "type": "string" },
          "args": { "type": "array", "items": { "type": "string" } },
          "url": { "type": "string" },
          "env": { "type": "object" }
        },
        "required": ["name", "transport"]
      }
    },
    "terminalFont": { "type": "string" },
    "terminalFontSize": { "type": "number" },
    "terminalTheme": { "type": "string" },
    "httpLogging": { "type": "boolean" },
    "logLevel": { "type": "string", "enum": ["debug", "info", "warn", "error"] }
  }
}
```

---

## Utility Types

### Result Types

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Usage
async function loadFeature(id: string): AsyncResult<Feature> {
  try {
    const feature = await fetchFeature(id);
    return { success: true, data: feature };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Pagination Types

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Filter Types

```typescript
interface FeatureFilter {
  status?: FeatureStatus | FeatureStatus[];
  category?: string | string[];
  priority?: 'high' | 'medium' | 'low';
  search?: string;
  createdAfter?: number;
  createdBefore?: number;
  updatedAfter?: number;
  locked?: boolean;
}

interface EventFilter {
  type?: string | string[];
  featureId?: string;
  sessionId?: string;
  after?: number;
  before?: number;
}
```

---

## Type Guards

```typescript
function isFeature(obj: unknown): obj is Feature {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'title' in obj &&
    'status' in obj &&
    typeof (obj as Feature).id === 'string' &&
    typeof (obj as Feature).title === 'string'
  );
}

function isAgentEvent(event: unknown): event is AgentEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    typeof (event as AgentEvent).type === 'string' &&
    (event as AgentEvent).type.startsWith('agent:')
  );
}

function isPlanningLevel(value: unknown): value is PlanningLevel {
  return ['skip', 'lite', 'spec', 'full'].includes(value as string);
}

function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return ['none', 'low', 'medium', 'high', 'ultrathink'].includes(value as string);
}
```

---

## Defaults

```typescript
const DEFAULT_FEATURE: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  description: '',
  category: 'general',
  status: 'backlog',
  imagePaths: [],
  descriptionHistory: [],
  dependencies: [],
  useWorktree: true,
  planningMode: 'lite',
  thinkingLevel: 'medium',
};

const DEFAULT_SETTINGS: GlobalSettings = {
  theme: 'dark',
  font: 'Inter',
  sidebarCollapsed: false,
  keyboardShortcuts: {},
  phaseModels: {
    planning: { model: 'claude-sonnet-4-20250514', thinkingLevel: 'high' },
    implementation: { model: 'claude-sonnet-4-20250514', thinkingLevel: 'medium' },
    validation: { model: 'claude-haiku-3-5-20241022', thinkingLevel: 'low' },
  },
  defaultProvider: 'anthropic',
  claudeCompatibleProviders: [],
  autoModeByWorktree: {
    'main': { maxConcurrency: 1, pauseOnFailures: true, failureThreshold: 3 },
  },
  requirePlanApproval: false,
  enableSkills: false,
  skillSources: ['user', 'project'],
  enableSubagents: false,
  customSubagents: [],
  mcpServers: [],
  terminalFont: 'JetBrains Mono',
  terminalFontSize: 14,
  terminalTheme: 'dark',
  httpLogging: true,
  logLevel: 'info',
  settingsVersion: 6,
};

const THINKING_BUDGETS: Record<ThinkingLevel, number | undefined> = {
  none: undefined,
  low: 1024,
  medium: 10000,
  high: 16000,
  ultrathink: 32000,
};
```

---

*Reference: Data models and schemas from Automaker v0.13.0+*
