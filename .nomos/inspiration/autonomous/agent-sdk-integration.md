# Claude Agent SDK Integration

> Detailed patterns for integrating the Claude Agent SDK into autonomous development systems.

---

## SDK Overview

**Package:** `@anthropic-ai/claude-agent-sdk`
**Version:** v0.1.76+

The Claude Agent SDK enables autonomous AI agents with:
- Full codebase access (read, write, execute)
- Extended thinking capabilities (up to 32K tokens)
- Tool invocation (built-in + MCP servers)
- Session continuity across restarts
- Permission bypass for autonomous operation

---

## Integration Architecture

### Provider Abstraction Layer

Automaker wraps the SDK through a provider abstraction, enabling multi-model support:

```typescript
// Base provider interface
abstract class BaseProvider {
  abstract getName(): string;
  abstract executeQuery(options: ExecuteOptions): AsyncGenerator<ProviderMessage>;
  abstract detectInstallation(): Promise<InstallationStatus>;
  abstract getAvailableModels(): Promise<ModelInfo[]>;
  abstract validateConfig(): Promise<ValidationResult>;
  abstract supportsFeature(feature: string): boolean;
}

// Claude provider implementation
class ClaudeProvider extends BaseProvider {
  async *executeQuery(options: ExecuteOptions) {
    const stream = query({
      prompt: options.promptPayload,
      options: {
        apiKey: options.apiKey,
        environment: this.sanitizeEnv(process.env),
        allowedTools: options.allowedTools,
        maxThinkingTokens: options.thinkingBudget,
        agents: options.agents,
        mcpServers: options.mcpServers,
        permissionMode: 'bypassPermissions', // Autonomous mode
      },
    });

    for await (const message of stream) {
      yield this.normalizeMessage(message);
    }
  }

  private sanitizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
    // Only forward allowed env vars to SDK
    const allowed = [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_TIMEOUT',
      'HTTP_PROXY',
      'HTTPS_PROXY',
    ];
    return Object.fromEntries(
      Object.entries(env).filter(([k]) => allowed.includes(k))
    );
  }
}
```

### Provider Factory

```typescript
interface ProviderRegistration {
  name: string;
  factory: () => BaseProvider;
  aliases?: string[];
  canHandleModel?: (modelId: string) => boolean;
  priority?: number; // Higher = checked first
}

class ProviderFactory {
  private providers = new Map<string, ProviderRegistration>();

  register(config: ProviderRegistration) {
    this.providers.set(config.name, config);
  }

  getProviderForModel(modelId: string): BaseProvider {
    // Sort by priority (descending)
    const sorted = [...this.providers.values()]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const registration of sorted) {
      if (registration.canHandleModel?.(modelId)) {
        return registration.factory();
      }
    }

    // Fall back to Claude
    return this.providers.get('claude')!.factory();
  }
}

// Registration
factory.register({
  name: 'cursor',
  factory: () => new CursorProvider(config),
  canHandleModel: (id) => id.startsWith('cursor-'),
  priority: 10,
});

factory.register({
  name: 'codex',
  factory: () => new CodexProvider(config),
  canHandleModel: (id) => id.startsWith('codex-'),
  priority: 5,
});

factory.register({
  name: 'claude',
  factory: () => new ClaudeProvider(config),
  canHandleModel: () => true, // Fallback
  priority: 0,
});
```

---

## SDK Options Configuration

### Options Factory Pattern

```typescript
interface SDKOptions {
  workingDirectory: string;
  allowedTools: string[];
  maxTurns: number;
  permissionMode: 'default' | 'bypassPermissions';
  maxThinkingTokens?: number;
  systemPrompt?: string;
  mcpServers?: MCPServerConfig[];
  autoLoadClaudeMd?: boolean;
}

// Preset configurations for different use cases
const sdkOptionsFactory = {
  createSpecOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Glob', 'Grep'],
      maxTurns: 20,
      permissionMode: 'default',
    };
  },

  createFeaturesOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Glob', 'Grep', 'Write'],
      maxTurns: 5,
      permissionMode: 'default',
    };
  },

  createChatOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch'],
      maxTurns: 30,
      permissionMode: 'default',
    };
  },

  createAutonomousOptions(workDir: string): SDKOptions {
    return {
      workingDirectory: workDir,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
      maxTurns: 50,
      permissionMode: 'bypassPermissions', // Skip confirmations
      autoLoadClaudeMd: true,
    };
  },
};
```

### Dynamic Tool Extension

```typescript
function buildToolList(settings: Settings, feature: Feature): string[] {
  const baseTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'];
  const tools = [...baseTools];

  // Add Skill tool if enabled
  if (settings.enableSkills && !tools.includes('Skill')) {
    tools.push('Skill');
  }

  // Add Task tool for subagents if configured
  if (settings.enableSubagents && settings.customSubagents?.length > 0) {
    tools.push('Task');
  }

  // Add MCP server tools dynamically
  if (settings.mcpServers?.length > 0) {
    // MCP tools are added by the SDK based on server definitions
  }

  return tools;
}
```

---

## Thinking Modes

### Configuration

```typescript
type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'ultrathink';

const thinkingBudgets: Record<ThinkingLevel, number | undefined> = {
  none: undefined,     // Disabled
  low: 1024,           // Simple tasks
  medium: 10000,       // Standard implementation
  high: 16000,         // Complex problems (recommended)
  ultrathink: 32000,   // Maximum reasoning (risk of timeouts)
};

function buildThinkingOptions(level: ThinkingLevel): number | undefined {
  return thinkingBudgets[level];
}
```

### Usage

```typescript
const sdkOptions = {
  ...baseOptions,
  maxThinkingTokens: buildThinkingOptions(feature.thinkingLevel),
};
```

### Per-Phase Thinking

Different phases can use different thinking levels:

```typescript
interface PhaseModelConfig {
  model: string;
  thinkingLevel: ThinkingLevel;
  providerId?: string;
}

const phaseConfigs: Record<string, PhaseModelConfig> = {
  planning: {
    model: 'claude-sonnet-4-20250514',
    thinkingLevel: 'high',
  },
  implementation: {
    model: 'claude-sonnet-4-20250514',
    thinkingLevel: 'medium',
  },
  validation: {
    model: 'claude-haiku-3-5-20241022',
    thinkingLevel: 'low',
  },
};
```

---

## Planning System

### Planning Levels

```typescript
type PlanningLevel = 'skip' | 'lite' | 'spec' | 'full';

const planningPrompts: Record<PlanningLevel, string> = {
  skip: '', // No planning prompt

  lite: `
Before implementing, provide a brief outline:
1. Goal: What we're building
2. Approach: High-level strategy
3. Files: Key files to create/modify
4. Tasks: 3-7 concrete tasks
5. Risks: Potential issues

Keep it concise. Output directly without exploration.
`,

  spec: `
Generate a detailed specification in XML format:

<spec>
  <problem_statement>
    Clear description of what we're solving
  </problem_statement>

  <acceptance_criteria>
    <criterion id="AC-001">
      <given>Initial state</given>
      <when>Action performed</when>
      <then>Expected outcome</then>
    </criterion>
  </acceptance_criteria>

  <tasks>
    <task id="T001" file="path/to/file">
      Task description
    </task>
  </tasks>
</spec>

Mark with [SPEC_GENERATED] when complete.
`,

  full: `
Generate a comprehensive Software Design Document:

1. User Stories
2. Acceptance Criteria (GIVEN-WHEN-THEN)
3. Technical Architecture
4. Implementation Tasks (phased)
5. Risk Assessment Matrix
6. Testing Strategy
7. Rollback Plan
`,
};
```

### Plan Approval Workflow

```typescript
interface PlanState {
  status: 'pending' | 'generated' | 'approved' | 'rejected';
  content?: string;
  approvedAt?: number;
  rejectedReason?: string;
}

async function executeWithPlanning(
  feature: Feature,
  settings: Settings
): Promise<void> {
  const planState: PlanState = { status: 'pending' };

  // Generate plan if enabled
  if (feature.planningMode !== 'skip') {
    const planPrompt = planningPrompts[feature.planningMode];
    const planResult = await runAgent(workDir, planPrompt);

    planState.status = 'generated';
    planState.content = planResult;

    // Wait for approval if required
    if (settings.requirePlanApproval) {
      emitEvent('planning_approval_required', { featureId: feature.id, plan: planResult });

      await waitForPlanApproval(feature.id);

      if (planState.status === 'rejected') {
        throw new Error(`Plan rejected: ${planState.rejectedReason}`);
      }
    }
  }

  // Execute implementation
  const implementationPrompt = buildImplementationPrompt(feature, planState.content);
  await runAgent(workDir, implementationPrompt);
}
```

---

## Session Management

### Session Structure

```typescript
interface AgentSession {
  id: string;                        // Persistent session ID
  projectPath: string;               // Working directory
  messages: Message[];               // Conversation history
  isRunning: boolean;                // Execution flag
  abortController: AbortController;  // Cancellation
  sdkSessionId?: string;             // For conversation continuity
  model: string;                     // Selected model
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  images?: string[]; // Base64 encoded
}
```

### Session Persistence

```typescript
class SessionManager {
  private sessions = new Map<string, AgentSession>();
  private storageDir: string;

  async saveSession(session: AgentSession): Promise<void> {
    const sessionPath = path.join(
      this.storageDir,
      'sessions',
      session.id,
      'session.json'
    );

    await fs.writeFile(
      sessionPath,
      JSON.stringify({
        ...session,
        abortController: undefined, // Non-serializable
      }, null, 2)
    );

    // Save messages separately for easier access
    const messagesPath = path.join(
      this.storageDir,
      'sessions',
      session.id,
      'messages.json'
    );
    await fs.writeFile(messagesPath, JSON.stringify(session.messages, null, 2));
  }

  async loadSession(sessionId: string): Promise<AgentSession | null> {
    const sessionPath = path.join(
      this.storageDir,
      'sessions',
      sessionId,
      'session.json'
    );

    try {
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(data);
      session.abortController = new AbortController();
      return session;
    } catch {
      return null;
    }
  }
}
```

### SDK Session Continuity

```typescript
async function runAgentWithContinuity(
  session: AgentSession,
  prompt: string
): Promise<string> {
  const options = {
    ...buildOptions(session),
    // Pass SDK session ID for conversation continuity
    sessionId: session.sdkSessionId,
  };

  const stream = query({ prompt, options });
  let response = '';

  for await (const message of stream) {
    if (message.type === 'session_id') {
      // Store SDK session ID for future continuity
      session.sdkSessionId = message.sessionId;
    } else if (message.type === 'text') {
      response += message.content;
      emitEvent('agent:stream', { sessionId: session.id, content: message.content });
    }
  }

  return response;
}
```

---

## Context Injection

### Context File Loading

```typescript
interface ContextResult {
  files: ContextFile[];
  combinedContent: string;
}

interface ContextFile {
  path: string;
  content: string;
  type: 'claude_md' | 'code_quality' | 'memory' | 'custom';
}

async function loadContextFiles(options: {
  projectPath: string;
  taskContext?: { title: string; description: string };
}): Promise<ContextResult> {
  const files: ContextFile[] = [];

  // Load CLAUDE.md (project and global)
  const claudeMdPaths = [
    path.join(options.projectPath, 'CLAUDE.md'),
    path.join(os.homedir(), '.claude', 'CLAUDE.md'),
  ];

  for (const p of claudeMdPaths) {
    if (await fileExists(p)) {
      files.push({
        path: p,
        content: await fs.readFile(p, 'utf-8'),
        type: 'claude_md',
      });
    }
  }

  // Load CODE_QUALITY.md
  const codeQualityPath = path.join(options.projectPath, 'CODE_QUALITY.md');
  if (await fileExists(codeQualityPath)) {
    files.push({
      path: codeQualityPath,
      content: await fs.readFile(codeQualityPath, 'utf-8'),
      type: 'code_quality',
    });
  }

  // Load relevant memory files based on task context
  if (options.taskContext) {
    const relevantMemories = await findRelevantMemories(
      options.projectPath,
      options.taskContext
    );
    files.push(...relevantMemories);
  }

  return {
    files,
    combinedContent: files.map(f => f.content).join('\n\n---\n\n'),
  };
}
```

### CLAUDE.md Deduplication

```typescript
function filterClaudeMdFromContext(
  context: ContextResult,
  autoLoadClaudeMd: boolean
): string {
  if (!autoLoadClaudeMd) {
    return context.combinedContent;
  }

  // SDK auto-loads CLAUDE.md, filter to prevent duplication
  const filtered = context.files.filter(f => f.type !== 'claude_md');
  return filtered.map(f => f.content).join('\n\n---\n\n');
}
```

---

## Tool Integration

### Base Tools

```typescript
const BASE_TOOLS = [
  'Read',       // Read file contents
  'Write',      // Write file contents
  'Edit',       // Edit file with diff
  'Glob',       // File pattern matching
  'Grep',       // Content search
  'Bash',       // Command execution
  'WebSearch',  // Web search
  'WebFetch',   // Fetch URL content
];
```

### Skill Tool

```typescript
interface SkillDefinition {
  name: string;
  description: string;
  path: string;
  source: 'user' | 'project';
}

function loadSkills(projectPath: string): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  // User skills
  const userSkillsPath = path.join(os.homedir(), '.claude', 'skills');
  if (fs.existsSync(userSkillsPath)) {
    skills.push(...loadSkillsFromDir(userSkillsPath, 'user'));
  }

  // Project skills
  const projectSkillsPath = path.join(projectPath, '.claude', 'skills');
  if (fs.existsSync(projectSkillsPath)) {
    skills.push(...loadSkillsFromDir(projectSkillsPath, 'project'));
  }

  return skills;
}
```

### MCP Server Integration

```typescript
interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'http';
  command?: string;       // For stdio
  args?: string[];        // For stdio
  url?: string;           // For sse/http
  env?: Record<string, string>;
}

function buildMCPConfig(settings: Settings): MCPServerConfig[] {
  return settings.mcpServers.map(server => ({
    name: server.name,
    transport: server.transport,
    command: server.command,
    args: server.args,
    url: server.url,
    env: server.env,
  }));
}
```

---

## Error Handling

### Error Classification

```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  BILLING = 'billing',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  PERMISSION = 'permission',
  CLI_ERROR = 'cli_error',
  MODEL_NOT_FOUND = 'model_not_found',
  SERVER_ERROR = 'server_error',
  PROVIDER_DISCONNECTED = 'provider_disconnected',
  UNKNOWN = 'unknown',
}

function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('401') || message.includes('unauthorized')) {
    return ErrorCategory.AUTHENTICATION;
  }
  if (message.includes('billing') || message.includes('quota')) {
    return ErrorCategory.BILLING;
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return ErrorCategory.RATE_LIMIT;
  }
  // ... more classifications

  return ErrorCategory.UNKNOWN;
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; retryableErrors?: ErrorCategory[] } = {}
): Promise<T> {
  const { maxRetries = 3, retryableErrors = [
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.SERVER_ERROR,
  ]} = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const category = classifyError(lastError);

      if (!retryableErrors.includes(category)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}
```

---

## Output Storage

### Agent Output Structure

```
.automaker/features/{featureId}/
├── feature.json          # Core metadata
├── agent-output.md       # Formatted, human-readable output
├── raw-output.jsonl      # Raw message stream for replay
└── images/               # Associated media
```

### Output Capture

```typescript
async function captureAgentOutput(
  featureId: string,
  stream: AsyncGenerator<ProviderMessage>
): Promise<void> {
  const outputPath = path.join(
    '.automaker',
    'features',
    featureId,
    'agent-output.md'
  );
  const rawPath = path.join(
    '.automaker',
    'features',
    featureId,
    'raw-output.jsonl'
  );

  let markdownOutput = '';
  const rawStream = fs.createWriteStream(rawPath, { flags: 'a' });

  for await (const message of stream) {
    // Write raw message
    rawStream.write(JSON.stringify(message) + '\n');

    // Build markdown output
    if (message.type === 'text') {
      markdownOutput += message.content;
    } else if (message.type === 'tool_use') {
      markdownOutput += `\n\n**Tool: ${message.tool}**\n\`\`\`\n${message.input}\n\`\`\`\n`;
    }

    // Emit for real-time streaming
    emitEvent('agent:stream', { featureId, message });
  }

  rawStream.end();
  await fs.writeFile(outputPath, markdownOutput);
}
```

---

## Best Practices

### 1. Always Use Provider Abstraction

Don't call the SDK directly; use the provider layer for:
- Multi-model support
- Consistent error handling
- Configuration management

### 2. Validate Working Directory

```typescript
function validateWorkingDirectory(cwd: string): void {
  const allowed = process.env.ALLOWED_ROOT_DIRECTORIES?.split(',') || [];
  const normalized = path.normalize(cwd);

  const isAllowed = allowed.some(dir =>
    normalized.startsWith(path.normalize(dir))
  );

  if (!isAllowed) {
    throw new Error(`Working directory not allowed: ${cwd}`);
  }
}
```

### 3. Sanitize Environment Variables

Only forward necessary env vars to the SDK to prevent leaking secrets.

### 4. Use Appropriate Thinking Levels

- Simple tasks: `low` or `none`
- Standard work: `medium`
- Complex reasoning: `high`
- Only use `ultrathink` when necessary (timeout risk)

### 5. Implement Graceful Cancellation

```typescript
const abortController = new AbortController();

// Pass to agent
const options = { ...baseOptions, signal: abortController.signal };

// Cancel on user request
function stopAgent(sessionId: string) {
  const session = sessions.get(sessionId);
  session?.abortController.abort();
}
```

---

*Reference: Claude Agent SDK integration patterns from Automaker v0.13.0+*
