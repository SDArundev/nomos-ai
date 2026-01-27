# Configuration Reference

> Complete settings reference with defaults and descriptions for autonomous AI development systems.

---

## Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Priority                        │
│                    (Higher overrides lower)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Command-line arguments     --port 3009                      │
│                    ↓                                            │
│  2. Environment variables      PORT=3009                        │
│                    ↓                                            │
│  3. .env file (local)          .env.local                       │
│                    ↓                                            │
│  4. .env file (environment)    .env.development                 │
│                    ↓                                            │
│  5. .env file (base)           .env                             │
│                    ↓                                            │
│  6. User settings              ~/.automaker/settings.json       │
│                    ↓                                            │
│  7. Project settings           .automaker/settings.json         │
│                    ↓                                            │
│  8. Default values             Built into application           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Settings

### Core

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `port` | number | `3008` | HTTP server port |
| `host` | string | `0.0.0.0` | Server bind address |
| `nodeEnv` | string | `development` | Environment: development, staging, production |
| `dataDir` | string | `~/.automaker` | Data storage directory |
| `tempDir` | string | `${dataDir}/temp` | Temporary files directory |

### Logging

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `logLevel` | string | `info` | Log level: debug, info, warn, error |
| `logFormat` | string | `pretty` | Log format: pretty, json |
| `logFile` | string | `null` | Log file path (null = stdout only) |
| `logRotation` | boolean | `true` | Enable log file rotation |
| `logMaxSize` | string | `10m` | Max log file size before rotation |
| `logMaxFiles` | number | `5` | Number of rotated files to keep |

### Performance

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxRequestSize` | string | `10mb` | Maximum request body size |
| `requestTimeout` | number | `30000` | Request timeout in milliseconds |
| `keepAliveTimeout` | number | `65000` | Keep-alive timeout in milliseconds |
| `compression` | boolean | `true` | Enable gzip compression |
| `trustProxy` | boolean | `false` | Trust X-Forwarded-* headers |

---

## Security Settings

### Authentication

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sessionSecret` | string | *generated* | Session cookie signing secret |
| `sessionExpiration` | number | `2592000000` | Session expiration (30 days in ms) |
| `apiKeyEnabled` | boolean | `true` | Enable API key authentication |
| `apiKey` | string | *generated* | API key for programmatic access |
| `wsTokenExpiration` | number | `300000` | WebSocket token expiration (5 min) |

### Rate Limiting

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `rateLimitEnabled` | boolean | `true` | Enable rate limiting |
| `rateLimitWindow` | number | `60000` | Rate limit window (1 min) |
| `rateLimitMax` | number | `100` | Max requests per window |
| `rateLimitAuthMax` | number | `5` | Max auth attempts per window |

### CORS

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `corsOrigin` | string[] | `['*']` | Allowed CORS origins |
| `corsCredentials` | boolean | `true` | Allow credentials |
| `corsMethods` | string[] | `['GET','POST','PUT','DELETE','PATCH']` | Allowed methods |
| `corsHeaders` | string[] | `['Content-Type','Authorization']` | Allowed headers |

### Access Control

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `allowedRootDirectories` | string[] | `[]` | Directories agents can access |
| `blockedPaths` | string[] | `['/etc','/usr','/bin']` | Blocked path patterns |
| `allowDotfiles` | boolean | `false` | Allow access to dotfiles |

---

## Agent Settings

### Provider Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultProvider` | string | `claude` | Default AI provider |
| `defaultModel` | string | `claude-sonnet-4-20250514` | Default model |
| `fallbackProvider` | string | `null` | Fallback if primary fails |

### Claude Provider

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `claude.apiKey` | string | `$ANTHROPIC_API_KEY` | API key |
| `claude.baseUrl` | string | `https://api.anthropic.com` | API base URL |
| `claude.model` | string | `claude-sonnet-4-20250514` | Model to use |
| `claude.maxTokens` | number | `8192` | Max output tokens |
| `claude.temperature` | number | `0.7` | Temperature (0-1) |

### OpenAI/Codex Provider

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `codex.apiKey` | string | `$OPENAI_API_KEY` | API key |
| `codex.baseUrl` | string | `https://api.openai.com/v1` | API base URL |
| `codex.model` | string | `gpt-4o` | Model to use |
| `codex.maxTokens` | number | `4096` | Max output tokens |
| `codex.temperature` | number | `0.7` | Temperature (0-1) |

### Thinking Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `thinkingMode` | string | `medium` | Default thinking mode |
| `thinkingBudgets.none` | number | `0` | Tokens for none mode |
| `thinkingBudgets.low` | number | `1024` | Tokens for low mode |
| `thinkingBudgets.medium` | number | `4096` | Tokens for medium mode |
| `thinkingBudgets.high` | number | `16384` | Tokens for high mode |
| `thinkingBudgets.ultrathink` | number | `32768` | Tokens for ultrathink mode |

### Session Limits

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxTurns` | number | `100` | Max turns per session |
| `maxConcurrentSessions` | number | `3` | Max simultaneous sessions |
| `sessionTimeout` | number | `3600000` | Session timeout (1 hour) |
| `idleTimeout` | number | `300000` | Idle timeout (5 min) |

---

## Auto Mode Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoMode.enabled` | boolean | `false` | Enable auto mode |
| `autoMode.concurrency` | number | `1` | Concurrent agents |
| `autoMode.requireApproval` | boolean | `true` | Require plan approval |
| `autoMode.maxFailures` | number | `3` | Failures before pause |
| `autoMode.failureWindow` | number | `60000` | Failure counting window |
| `autoMode.idleDelay` | number | `5000` | Delay when no features |
| `autoMode.priorityOrder` | string[] | `['priority','created']` | Feature selection order |

---

## Git Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `git.useWorktrees` | boolean | `true` | Use git worktrees |
| `git.worktreeDir` | string | `${dataDir}/worktrees` | Worktree location |
| `git.autoCommit` | boolean | `false` | Auto-commit changes |
| `git.commitMessageStyle` | string | `conventional` | Commit message format |
| `git.branchPrefix` | string | `feature/` | Branch name prefix |
| `git.autoPush` | boolean | `false` | Auto-push commits |
| `git.defaultBranch` | string | `main` | Default base branch |

---

## Planning Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `planning.defaultMode` | string | `lite` | Default planning mode |
| `planning.requireApproval` | boolean | `true` | Require plan approval |
| `planning.outputDir` | string | `${dataDir}/plans` | Plan output directory |
| `planning.templateDir` | string | `${dataDir}/templates` | Custom templates |

### Planning Modes

| Mode | Description |
|------|-------------|
| `skip` | No planning, direct implementation |
| `lite` | Quick outline (1-2 paragraphs) |
| `spec` | XML specification with tasks |
| `full` | Full SDD document |

---

## UI Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `ui.theme` | string | `system` | Theme: light, dark, system |
| `ui.language` | string | `en` | UI language |
| `ui.sidebarWidth` | number | `300` | Sidebar width in pixels |
| `ui.terminalHeight` | number | `200` | Terminal height in pixels |
| `ui.showTimestamps` | boolean | `true` | Show timestamps in logs |
| `ui.fontFamily` | string | `monospace` | Terminal font family |
| `ui.fontSize` | number | `14` | Terminal font size |

---

## Feature Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `features.idPrefix` | string | `F` | Feature ID prefix |
| `features.idLength` | number | `3` | Feature ID number length |
| `features.defaultPriority` | number | `3` | Default priority (1-5) |
| `features.defaultStatus` | string | `backlog` | Default status |
| `features.statuses` | string[] | See below | Available statuses |

### Default Statuses

```json
["backlog", "in_progress", "waiting_approval", "verified", "rejected"]
```

---

## Database Settings

### Redis

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `redis.enabled` | boolean | `false` | Enable Redis |
| `redis.url` | string | `redis://localhost:6379` | Redis connection URL |
| `redis.password` | string | `null` | Redis password |
| `redis.db` | number | `0` | Redis database index |
| `redis.prefix` | string | `automaker:` | Key prefix |
| `redis.ttl` | number | `86400` | Default TTL (24 hours) |

### SQLite (File Storage)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `sqlite.enabled` | boolean | `true` | Enable SQLite |
| `sqlite.path` | string | `${dataDir}/automaker.db` | Database file path |
| `sqlite.wal` | boolean | `true` | Enable WAL mode |

---

## Monitoring Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `prometheus.enabled` | boolean | `false` | Enable Prometheus metrics |
| `prometheus.port` | number | `9090` | Metrics port |
| `prometheus.path` | string | `/metrics` | Metrics endpoint |
| `sentry.enabled` | boolean | `false` | Enable Sentry |
| `sentry.dsn` | string | `null` | Sentry DSN |

---

## Settings File Format

### User Settings (~/.automaker/settings.json)

```json
{
  "defaultProvider": "claude",
  "claude": {
    "model": "claude-sonnet-4-20250514",
    "maxTokens": 8192
  },
  "thinkingMode": "high",
  "autoMode": {
    "concurrency": 2,
    "requireApproval": true
  },
  "git": {
    "useWorktrees": true,
    "autoCommit": false
  },
  "ui": {
    "theme": "dark",
    "fontSize": 14
  }
}
```

### Project Settings (.automaker/settings.json)

```json
{
  "projectId": "my-project",
  "name": "My Project",
  "description": "Project description",
  "rootDir": "/path/to/project",
  "allowedDirectories": ["src", "tests", "docs"],
  "git": {
    "defaultBranch": "develop",
    "branchPrefix": "feature/PRJ-"
  },
  "planning": {
    "defaultMode": "spec"
  },
  "features": {
    "idPrefix": "PRJ"
  }
}
```

---

## Environment-Specific Overrides

### Development

```json
{
  "logLevel": "debug",
  "logFormat": "pretty",
  "corsOrigin": ["*"],
  "rateLimitEnabled": false,
  "autoMode": {
    "requireApproval": false
  }
}
```

### Production

```json
{
  "logLevel": "warn",
  "logFormat": "json",
  "corsOrigin": ["https://automaker.example.com"],
  "rateLimitEnabled": true,
  "trustProxy": true,
  "redis": {
    "enabled": true
  },
  "prometheus": {
    "enabled": true
  }
}
```

---

## Configuration API

### Get All Settings

```bash
GET /api/settings
```

### Get Specific Setting

```bash
GET /api/settings/autoMode.concurrency
```

### Update Settings

```bash
PATCH /api/settings
Content-Type: application/json

{
  "autoMode": {
    "concurrency": 3
  }
}
```

### Reset to Defaults

```bash
POST /api/settings/reset
```

---

*Reference: Configuration patterns from Automaker v0.13.0+*
