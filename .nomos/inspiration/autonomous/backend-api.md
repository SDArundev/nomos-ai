# Backend API Documentation

> Express server architecture, API endpoints, and service patterns.

---

## Server Architecture

### Core Setup

```typescript
// index.ts
const app = express();

// Middleware stack (defense-in-depth)
app.use(morgan('colored'));                        // HTTP logging
app.use(cors({ origin: corsAllowlist }));          // CORS
app.use(express.json({ limit: '50mb' }));          // Body parser
app.use(cookieParser());                           // Cookies
app.use(requireJsonContentType);                   // Content-type validation
app.use(validatePathParams);                       // Path sanitization

// Service initialization
const services = {
  agent: new AgentService(config),
  autoMode: new AutoModeService(config),
  terminal: new TerminalService(config),
  features: new FeatureLoader(config),
  settings: new SettingsService(config),
  eventHistory: new EventHistoryService(config),
  notifications: new NotificationService(config),
  // ... 13+ more
};

// Route registration
app.use('/api/auth', authRoutes(services));
app.use('/api/agent', agentRoutes(services));
app.use('/api/auto-mode', autoModeRoutes(services));
// ... 26+ more route groups

// WebSocket servers
const wss = new WebSocketServer({ server, path: '/api/events' });
const terminalWss = new WebSocketServer({ server, path: '/api/terminal/ws' });

// Graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
```

### Port & Configuration

```typescript
interface ServerConfig {
  port: number;           // Default: 3008
  host: string;           // Default: 'localhost'
  dataDir: string;        // Default: './data'
  logLevel: string;       // Default: 'info'
  corsOrigin: string[];   // Default: ['localhost:*']
  disableAuth: boolean;   // Default: false
}
```

---

## API Endpoints Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/status` | No | Check authentication state |
| POST | `/login` | No | Authenticate with API key (rate-limited 5/min) |
| GET | `/token` | Yes | Generate 5-minute WebSocket token |
| POST | `/logout` | Yes | Invalidate session |

**Login Request:**
```json
POST /api/auth/login
{
  "apiKey": "your-api-key"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Authenticated"
}
// Sets HTTP-only cookie: automaker_session
```

---

### Agent Sessions (`/api/agent`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Initialize agent session |
| POST | `/send` | Send message to agent |
| POST | `/history` | Get conversation history |
| POST | `/stop` | Cancel running operation |
| POST | `/clear` | Reset agent state |
| POST | `/model` | Update model configuration |
| POST | `/queue/add` | Add prompt to queue |
| GET | `/queue/list` | List queued items |
| DELETE | `/queue/remove` | Remove queue entry |
| DELETE | `/queue/clear` | Clear entire queue |

**Send Message Request:**
```json
POST /api/agent/send
{
  "sessionId": "uuid",
  "message": "Implement the login feature",
  "workingDirectory": "/path/to/project",
  "imagePaths": ["/path/to/screenshot.png"],
  "model": "claude-sonnet-4-20250514"
}
```

**Response:** Streams via WebSocket events (`agent:stream`)

---

### Features (`/api/features`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/list` | Query features (paginated) |
| POST | `/get` | Retrieve single feature |
| POST | `/create` | Create new feature |
| POST | `/update` | Update feature metadata |
| POST | `/delete` | Delete feature |
| POST | `/bulk-update` | Update multiple features |
| POST | `/bulk-delete` | Delete multiple features |
| POST | `/agent-output` | Get agent output markdown |
| POST | `/raw-output` | Get debug JSONL output |
| POST | `/generate-title` | AI-generate title from description |

**Feature Object:**
```typescript
interface Feature {
  id: string;                    // Timestamp-based unique ID
  title: string;
  description: string;
  category: string;
  status: 'backlog' | 'in_progress' | 'waiting_approval' | 'verified';
  imagePaths: string[];
  descriptionHistory: DescriptionHistoryEntry[];
  dependencies: string[];        // Feature IDs
  useWorktree: boolean;
  branch?: string;
  planningMode: PlanningLevel;
  thinkingLevel: ThinkingLevel;
  model?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Create Feature Request:**
```json
POST /api/features/create
{
  "projectPath": "/path/to/project",
  "feature": {
    "title": "User Authentication",
    "description": "Implement login/logout with JWT",
    "category": "authentication",
    "status": "backlog",
    "planningMode": "spec",
    "thinkingLevel": "medium"
  }
}
```

---

### Auto-Mode (`/api/auto-mode`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Begin autonomous feature loop |
| POST | `/stop` | Stop auto-mode loop |
| POST | `/run-feature` | Execute single feature |
| POST | `/stop-feature` | Stop feature execution |
| POST | `/verify-feature` | Mark feature as verified |
| POST | `/resume-feature` | Continue paused work |
| POST | `/follow-up-feature` | Send follow-up instruction |
| POST | `/commit-feature` | Commit feature changes |
| GET | `/status` | Get auto-mode status |
| POST | `/context-exists` | Check for existing context |
| POST | `/analyze-project` | Examine project structure |
| POST | `/approve-plan` | Authorize implementation plan |
| POST | `/resume-interrupted` | Restart halted operations |

**Start Auto-Mode Request:**
```json
POST /api/auto-mode/start
{
  "projectPath": "/path/to/project",
  "workingDir": "/path/to/worktree",
  "maxConcurrency": 3
}
```

**Events Emitted:**
- `auto_mode_started`
- `auto_mode_feature_start`
- `auto_mode_feature_complete`
- `auto_mode_paused_failures`
- `auto_mode_idle`
- `auto_mode_stopped`
- `auto_mode_error`

---

### Git Worktrees (`/api/worktree`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/info` | Get project info |
| POST | `/status` | Get worktree status |
| POST | `/list` | List all worktrees |
| POST | `/create` | Create new worktree |
| POST | `/delete` | Delete worktree |
| POST | `/init-git` | Initialize git repository |
| POST | `/diffs` | View all file differences |
| POST | `/file-diff` | Compare individual files |
| POST | `/merge` | Perform merge operation |
| POST | `/commit` | Create commit |
| POST | `/generate-commit-message` | AI-generate commit message |
| POST | `/push` | Push to remote |
| POST | `/pull` | Fetch and merge |
| POST | `/discard-changes` | Revert uncommitted changes |
| POST | `/checkout-branch` | Switch branch |
| POST | `/list-branches` | List available branches |
| POST | `/switch-branch` | Change active branch |
| POST | `/list-remotes` | Show remotes |
| POST | `/open-in-editor` | Launch code editor |
| GET | `/default-editor` | Get preferred editor |
| GET | `/available-editors` | List installed editors |
| POST | `/open-in-terminal` | Open terminal window |
| GET | `/available-terminals` | List terminal apps |
| POST | `/start-dev` | Launch dev server |
| POST | `/stop-dev` | Stop dev server |
| GET | `/list-dev-servers` | Show running servers |
| GET | `/dev-server-logs` | Access server logs |
| POST | `/create-pr` | Generate pull request |
| GET | `/pr-info` | Retrieve PR details |
| POST | `/run-init-script` | Execute init scripts |

**Create Worktree Request:**
```json
POST /api/worktree/create
{
  "projectPath": "/path/to/project",
  "branchName": "feature/user-auth",
  "baseBranch": "main"
}
```

**Worktree Metadata:**
```typescript
interface WorktreeMetadata {
  branchName: string;
  createdAt: number;
  prInfo?: {
    url: string;
    number: number;
    title: string;
    state: 'open' | 'closed' | 'merged';
  };
  initScriptStatus?: 'pending' | 'running' | 'completed' | 'failed';
  initScriptOutput?: string;
}
```

---

### Terminal Sessions (`/api/terminal`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/status` | No | Terminal service availability |
| POST | `/auth` | No | User authentication |
| POST | `/logout` | No | Clear session |
| GET | `/sessions` | Yes | List active sessions |
| POST | `/sessions` | Yes | Create new session |
| DELETE | `/sessions/:id` | Yes | Terminate session |
| POST | `/sessions/:id/resize` | Yes | Adjust dimensions |
| GET | `/settings` | Yes | User preferences |
| PUT | `/settings` | Yes | Update settings |

**WebSocket Protocol (`/api/terminal/ws`):**

```typescript
// Client → Server
{ type: 'input', sessionId: string, data: string }
{ type: 'resize', sessionId: string, rows: number, cols: number }

// Server → Client
{ type: 'data', sessionId: string, data: string, timestamp: number }
{ type: 'exit', sessionId: string, code: number }
```

**Create Session Request:**
```json
POST /api/terminal/sessions
{
  "workingDirectory": "/path/to/project",
  "shell": "/bin/zsh"
}
```

---

### File System (`/api/fs`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/read` | Read file contents |
| POST | `/write` | Write to file |
| POST | `/mkdir` | Create directory |
| POST | `/readdir` | List directory contents |
| POST | `/exists` | Check existence |
| POST | `/stat` | Get file statistics |
| POST | `/delete` | Delete file/directory |
| POST | `/validate-path` | Validate file path |
| POST | `/resolve-directory` | Resolve directory |
| POST | `/save-image` | Save image file |
| GET | `/image` | Retrieve image |
| POST | `/browse` | Browse file system |
| POST | `/save-board-background` | Save board background |
| POST | `/delete-board-background` | Remove background |

**All paths validated against `ALLOWED_ROOT_DIRECTORY`**

---

### Settings (`/api/settings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all settings |
| PUT | `/` | Update settings |
| POST | `/migrate` | Run migrations |
| GET | `/credentials` | Get masked API keys |

**Settings Object:**
```typescript
interface Settings {
  // UI
  theme: string;
  font: string;
  keyboardShortcuts: Record<string, string>;

  // Models
  phaseModels: Record<string, PhaseModelConfig>;
  defaultProvider: string;

  // Auto-mode
  autoModeByWorktree: Record<string, WorktreeAutoConfig>;
  requirePlanApproval: boolean;

  // Features
  enableSkills: boolean;
  enableSubagents: boolean;
  customSubagents: SubagentDefinition[];

  // MCP
  mcpServers: MCPServerConfig[];

  // Terminal
  terminalFont: string;
  terminalFontSize: number;
}
```

---

### GitHub Integration (`/api/github`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/issues` | List issues |
| POST | `/issues/import` | Import issues as features |
| POST | `/issues/validate` | Validate issue content |
| GET | `/prs` | List pull requests |
| POST | `/prs/create` | Create PR from feature |

---

### Additional Endpoints

**Sessions (`/api/sessions`):**
- GET `/` - List sessions
- POST `/` - Create session
- PUT `/:sessionId` - Update
- POST `/:sessionId/archive` - Archive
- POST `/:sessionId/unarchive` - Restore
- DELETE `/:sessionId` - Delete

**Models (`/api/models`):**
- GET `/available` - Available models
- GET `/providers` - Provider info

**Notifications (`/api/notifications`):**
- GET `/` - Get notifications
- POST `/` - Create notification
- PUT `/:id/read` - Mark as read
- DELETE `/:id` - Dismiss

**Health (`/api/health`):**
- GET `/` - Health check
- GET `/ready` - Readiness probe

---

## Service Implementations

### AgentService

```typescript
class AgentService {
  private sessions = new Map<string, AgentSession>();
  private providerFactory: ProviderFactory;

  async sendMessage(
    sessionId: string,
    message: string,
    options: SendOptions
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Convert images to base64
    const imagePaths = await this.processImages(options.imagePaths);

    // Build SDK options
    const sdkOptions = buildSdkOptions({
      workingDirectory: options.workingDirectory,
      model: options.model || session.model,
      settings: await this.settingsService.getSettings(),
    });

    // Get provider
    const provider = this.providerFactory.getProviderForModel(sdkOptions.model);

    // Execute
    session.isRunning = true;
    try {
      const stream = provider.executeQuery({
        prompt: message,
        imagePaths,
        ...sdkOptions,
      });

      for await (const chunk of stream) {
        this.emit('agent:stream', { sessionId, ...chunk });
        session.messages.push(chunk);
      }
    } finally {
      session.isRunning = false;
      await this.saveSession(session);
    }
  }
}
```

### AutoModeService

```typescript
class AutoModeService {
  private runningFeatures = new Map<string, AbortController>();
  private loopStatus = new Map<string, boolean>();

  async runAutoLoop(projectPath: string, workingDir: string): Promise<void> {
    this.loopStatus.set(projectPath, true);
    this.emit('auto_mode_started', { projectPath });

    while (this.loopStatus.get(projectPath)) {
      // Get pending features
      const features = await this.featureLoader.getFeatures(projectPath);
      const pending = features.filter(f =>
        f.status === 'backlog' || f.status === 'in_progress'
      );

      if (pending.length === 0) {
        this.emit('auto_mode_idle', { projectPath });
        await sleep(5000);
        continue;
      }

      // Check concurrency
      const running = this.runningFeatures.size;
      const maxConcurrency = await this.getMaxConcurrency(workingDir);
      if (running >= maxConcurrency) {
        await sleep(5000);
        continue;
      }

      // Execute next feature
      const feature = pending[0];
      await this.executeFeature(feature.id, projectPath, workingDir);
    }

    this.emit('auto_mode_stopped', { projectPath });
  }

  async executeFeature(
    featureId: string,
    projectPath: string,
    workingDir: string
  ): Promise<void> {
    const abortController = new AbortController();
    this.runningFeatures.set(featureId, abortController);

    try {
      this.emit('auto_mode_feature_start', { featureId, projectPath });

      // Load feature
      const feature = await this.featureLoader.getFeature(projectPath, featureId);

      // Create/locate worktree
      const worktreePath = feature.useWorktree
        ? await this.getOrCreateWorktree(projectPath, feature.branch!)
        : workingDir;

      // Load context
      const context = await this.loadContext(projectPath, feature);

      // Planning phase
      if (feature.planningMode !== 'skip') {
        await this.runPlanningPhase(feature, worktreePath, context);
      }

      // Implementation
      await this.agentService.sendMessage(
        featureId,
        this.buildPrompt(feature, context),
        { workingDirectory: worktreePath }
      );

      // Pipeline steps
      await this.runPipeline(feature, worktreePath);

      // Update status
      await this.featureLoader.updateFeature(projectPath, featureId, {
        status: 'waiting_approval',
      });

      this.emit('auto_mode_feature_complete', { featureId, projectPath });
    } catch (error) {
      this.emit('auto_mode_error', { featureId, error: error.message });
      await this.handleFailure(featureId, projectPath);
    } finally {
      this.runningFeatures.delete(featureId);
    }
  }
}
```

### TerminalService

```typescript
class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private maxSessions = 1000;

  async createSession(
    workingDir: string,
    shell?: string
  ): Promise<TerminalSession> {
    // Validate directory
    await this.validatePath(workingDir);

    // Detect shell
    const detectedShell = shell || await this.detectShell();

    // Create PTY
    const pty = spawn(detectedShell, this.getShellArgs(detectedShell), {
      cwd: workingDir,
      env: this.sanitizeEnv(process.env),
      cols: 80,
      rows: 24,
    });

    const session: TerminalSession = {
      id: `${Date.now()}-${randomUUID()}`,
      pty,
      cwd: workingDir,
      shell: detectedShell,
      scrollbackBuffer: [],
    };

    // Setup output handling
    pty.onData((data) => {
      this.bufferOutput(session, data);
    });

    pty.onExit(({ exitCode }) => {
      this.emit('terminal:exit', { sessionId: session.id, code: exitCode });
      this.sessions.delete(session.id);
    });

    this.sessions.set(session.id, session);
    return session;
  }

  private bufferOutput(session: TerminalSession, data: string): void {
    // Add to scrollback (50KB limit)
    session.scrollbackBuffer.push(data);
    while (this.getBufferSize(session) > 50 * 1024) {
      session.scrollbackBuffer.shift();
    }

    // Throttled emit (4KB batches, 4ms intervals)
    this.throttledEmit(session.id, data);
  }
}
```

---

## WebSocket Architecture

### Event Broadcasting

```typescript
class EventBroadcaster {
  private wss: WebSocketServer;
  private subscribers = new Map<WebSocket, Set<string>>();

  broadcast(type: string, payload: unknown): void {
    const message = JSON.stringify({ type, data: payload, timestamp: Date.now() });

    for (const [ws, subscriptions] of this.subscribers) {
      if (subscriptions.has('*') || subscriptions.has(type)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  handleConnection(ws: WebSocket): void {
    this.subscribers.set(ws, new Set(['*'])); // Subscribe to all by default

    ws.on('message', (data) => {
      const { type, subscriptions } = JSON.parse(data.toString());
      if (type === 'subscribe') {
        this.subscribers.set(ws, new Set(subscriptions));
      }
    });

    ws.on('close', () => {
      this.subscribers.delete(ws);
    });
  }
}
```

### Terminal WebSocket

```typescript
function handleTerminalWebSocket(ws: WebSocket, req: Request): void {
  // Validate token
  const token = req.headers['x-terminal-token'];
  if (!validateToken(token)) {
    ws.close(4001, 'Invalid token');
    return;
  }

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'input':
        const session = terminalService.getSession(message.sessionId);
        if (session) {
          session.pty.write(message.data);
        }
        break;

      case 'resize':
        const sess = terminalService.getSession(message.sessionId);
        if (sess) {
          // Debounce resizes (100ms minimum)
          debouncedResize(sess, message.rows, message.cols);
        }
        break;
    }
  });
}
```

---

## Data Storage

### Directory Structure

```
.automaker/                      # Per-project
├── features/
│   └── {featureId}/
│       ├── feature.json         # Metadata
│       ├── agent-output.md      # Human-readable output
│       ├── raw-output.jsonl     # Debug stream
│       └── images/              # Attached media
├── worktrees/
│   └── {branchName}/
│       └── worktree.json        # Worktree metadata
├── sessions/
│   └── {sessionId}/
│       ├── session.json         # Session state
│       └── messages.json        # Conversation history
├── events/
│   ├── index.json               # Event index
│   └── {eventId}.json           # Event details
├── notifications.json           # Notification queue
└── settings.json                # Project settings

~/.automaker/                    # Global
├── settings.json                # User preferences
├── credentials.json             # API keys (encrypted)
└── .api-key                     # Server API key
```

### Atomic Writes

```typescript
async function atomicWrite(path: string, data: string): Promise<void> {
  const tempPath = `${path}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, data, 'utf-8');
  await fs.rename(tempPath, path);
}
```

---

## Error Handling

### Error Classification

```typescript
const errorCategories = {
  authentication: { status: 401, retryable: false },
  billing: { status: 402, retryable: false },
  rateLimit: { status: 429, retryable: true },
  network: { status: 503, retryable: true },
  timeout: { status: 504, retryable: true },
  permission: { status: 403, retryable: false },
  notFound: { status: 404, retryable: false },
  validation: { status: 400, retryable: false },
  server: { status: 500, retryable: true },
};
```

### Error Response Format

```json
{
  "error": true,
  "code": "RATE_LIMIT",
  "message": "Too many requests. Please try again in 60 seconds.",
  "retryable": true,
  "retryAfter": 60
}
```

---

## Security

### Authentication Middleware

```typescript
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check API key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey && timingSafeEqual(apiKey, serverApiKey)) {
    return next();
  }

  // Check session cookie
  const sessionToken = req.cookies.automaker_session;
  if (sessionToken && validateSession(sessionToken)) {
    return next();
  }

  res.status(401).json({ error: true, message: 'Unauthorized' });
}
```

### Path Validation

```typescript
function validatePath(path: string): boolean {
  const normalized = path.normalize(path);

  // Reject null bytes
  if (normalized.includes('\0')) return false;

  // Reject path traversal
  if (normalized.includes('..')) return false;

  // Check against allowed directories
  const allowedDirs = process.env.ALLOWED_ROOT_DIRECTORIES?.split(',') || [];
  return allowedDirs.some(dir => normalized.startsWith(path.normalize(dir)));
}
```

### Rate Limiting

```typescript
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimiter.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
```

---

*Reference: Backend API patterns from Automaker v0.13.0+*
