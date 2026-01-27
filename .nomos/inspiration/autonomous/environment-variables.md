# Environment Variables

> Complete reference for all environment variables across development, staging, and production environments.

---

## Quick Reference

| Category | Variables |
|----------|-----------|
| Server | `PORT`, `NODE_ENV`, `DATA_DIR` |
| API Keys | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` |
| Security | `SESSION_SECRET`, `API_KEY`, `CORS_ORIGIN` |
| Database | `REDIS_URL`, `DATABASE_URL` |
| Features | `ALLOWED_ROOT_DIRECTORIES`, `MAX_CONCURRENCY` |

---

## Server Configuration

### Core Settings

```bash
# Server port (default: 3008)
PORT=3008

# Node environment: development | staging | production
NODE_ENV=development

# Data directory for persistent storage
DATA_DIR=/home/user/.automaker

# Log level: debug | info | warn | error
LOG_LEVEL=info

# Log format: json | pretty
LOG_FORMAT=pretty
```

### Web Configuration

```bash
# Frontend dev server port
VITE_PORT=3001

# API base URL (for frontend)
VITE_API_URL=http://localhost:3008

# WebSocket URL (for frontend)
VITE_WS_URL=ws://localhost:3008

# Enable dev tools
VITE_DEV_TOOLS=true
```

---

## API Keys

### AI Provider Keys

```bash
# Anthropic Claude API (required for Claude provider)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Anthropic Auth Token (alternative auth method)
ANTHROPIC_AUTH_TOKEN=...

# Anthropic Base URL (for proxies/custom endpoints)
ANTHROPIC_BASE_URL=https://api.anthropic.com

# OpenAI API Key (for Codex provider)
OPENAI_API_KEY=sk-...

# OpenAI Base URL
OPENAI_BASE_URL=https://api.openai.com/v1

# Cursor API Key (for Cursor provider)
CURSOR_API_KEY=...
```

### API Key Precedence

```typescript
// Resolution order for Anthropic:
// 1. ANTHROPIC_API_KEY (explicit API key)
// 2. ANTHROPIC_AUTH_TOKEN (OAuth token)
// 3. ~/.anthropic/api_key (file-based)

function resolveApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    readApiKeyFile()
  );
}
```

---

## Security Configuration

### Authentication

```bash
# Session secret for cookie signing (generate with: openssl rand -hex 32)
SESSION_SECRET=your-256-bit-secret-here

# API key for programmatic access
API_KEY=your-api-key-here

# Session expiration in days
SESSION_EXPIRATION_DAYS=30

# WebSocket token expiration in minutes
WS_TOKEN_EXPIRATION_MINUTES=5
```

### CORS Configuration

```bash
# Allowed CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:3001,http://localhost:5173

# Enable CORS credentials
CORS_CREDENTIALS=true
```

### Rate Limiting

```bash
# Rate limit window in milliseconds
RATE_LIMIT_WINDOW_MS=60000

# Max requests per window
RATE_LIMIT_MAX_REQUESTS=100

# Auth endpoint rate limit (stricter)
AUTH_RATE_LIMIT_MAX=5
```

---

## Database Configuration

### Redis

```bash
# Redis connection URL
REDIS_URL=redis://localhost:6379

# Redis password (production)
REDIS_PASSWORD=your-redis-password

# Redis database index
REDIS_DB=0

# Redis key prefix
REDIS_PREFIX=automaker:
```

### PostgreSQL (Optional)

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@localhost:5432/automaker

# Connection pool size
DATABASE_POOL_SIZE=10

# Connection timeout in milliseconds
DATABASE_TIMEOUT=5000
```

---

## Feature Configuration

### Directory Access

```bash
# Allowed root directories for file operations (comma-separated)
ALLOWED_ROOT_DIRECTORIES=/home/user/projects,/var/www

# Workspace base directory
WORKSPACE_DIR=/home/user/.automaker/workspaces

# Worktree directory
WORKTREE_DIR=/home/user/.automaker/worktrees
```

### Agent Configuration

```bash
# Maximum concurrent agents
MAX_CONCURRENCY=3

# Default provider: claude | codex | cursor | opencode
DEFAULT_PROVIDER=claude

# Default model
DEFAULT_MODEL=claude-sonnet-4-20250514

# Agent timeout in milliseconds
AGENT_TIMEOUT_MS=600000

# Max agent turns per session
MAX_AGENT_TURNS=100
```

### Auto Mode

```bash
# Enable auto mode by default
AUTO_MODE_ENABLED=false

# Consecutive failures before pause
AUTO_MODE_FAILURE_THRESHOLD=3

# Failure window in milliseconds
AUTO_MODE_FAILURE_WINDOW_MS=60000

# Require plan approval
REQUIRE_PLAN_APPROVAL=true
```

---

## Environment-Specific Settings

### Development (.env.development)

```bash
NODE_ENV=development
PORT=3008
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Frontend
VITE_PORT=3001
VITE_API_URL=http://localhost:3008
VITE_WS_URL=ws://localhost:3008
VITE_DEV_TOOLS=true

# Less strict security for dev
CORS_ORIGIN=*
SESSION_SECRET=dev-secret-not-for-production

# Local Redis
REDIS_URL=redis://localhost:6379

# All directories allowed in dev
ALLOWED_ROOT_DIRECTORIES=/

# Debug features
DEBUG_AGENT_STREAMS=true
DEBUG_TOOL_CALLS=true
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
PORT=3008
LOG_LEVEL=info
LOG_FORMAT=json

# Frontend
VITE_API_URL=https://staging-api.automaker.io
VITE_WS_URL=wss://staging-api.automaker.io

# Production-like security
CORS_ORIGIN=https://staging.automaker.io
SESSION_SECRET=${SESSION_SECRET}  # From secrets manager

# Managed Redis
REDIS_URL=redis://redis.staging.internal:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Restricted directories
ALLOWED_ROOT_DIRECTORIES=/data/projects

# Lower limits for cost control
MAX_CONCURRENCY=2
MAX_AGENT_TURNS=50
```

### Production (.env.production)

```bash
NODE_ENV=production
PORT=3008
LOG_LEVEL=warn
LOG_FORMAT=json

# Frontend
VITE_API_URL=https://api.automaker.io
VITE_WS_URL=wss://api.automaker.io

# Strict security
CORS_ORIGIN=https://automaker.io,https://www.automaker.io
SESSION_SECRET=${SESSION_SECRET}  # From secrets manager

# Production Redis cluster
REDIS_URL=redis://redis.production.internal:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Strict directory access
ALLOWED_ROOT_DIRECTORIES=/data/projects

# Production limits
MAX_CONCURRENCY=5
MAX_AGENT_TURNS=100
AGENT_TIMEOUT_MS=900000

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}
```

---

## Validation Schema

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3008),
  DATA_DIR: z.string().default(path.join(os.homedir(), '.automaker')),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // API Keys
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Security
  SESSION_SECRET: z.string().min(32).optional(),
  API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),

  // Database
  REDIS_URL: z.string().url().optional(),

  // Features
  ALLOWED_ROOT_DIRECTORIES: z.string().optional(),
  MAX_CONCURRENCY: z.coerce.number().min(1).max(10).default(3),
  DEFAULT_PROVIDER: z.enum(['claude', 'codex', 'cursor', 'opencode']).default('claude'),
});

export function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}
```

---

## Loading Environment Variables

### Using dotenv

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific file
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Load base .env (lower priority)
dotenv.config();
```

### Docker Compose

```yaml
services:
  server:
    env_file:
      - .env
      - .env.${NODE_ENV:-development}
    environment:
      # Override specific vars
      - NODE_ENV=${NODE_ENV:-development}
```

### Secrets Management (Production)

```bash
# Using Docker secrets
docker secret create anthropic_api_key ./secrets/anthropic_api_key.txt

# In docker-compose.yml
services:
  server:
    secrets:
      - anthropic_api_key
    environment:
      - ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_api_key

secrets:
  anthropic_api_key:
    external: true
```

---

## Environment Variable Checklist

### Required (All Environments)

- [ ] `NODE_ENV` - Set correctly for environment
- [ ] `PORT` - Server port
- [ ] `ANTHROPIC_API_KEY` - At least one AI provider key

### Required (Production)

- [ ] `SESSION_SECRET` - Strong, unique secret
- [ ] `CORS_ORIGIN` - Specific origins (not `*`)
- [ ] `ALLOWED_ROOT_DIRECTORIES` - Restricted paths
- [ ] `REDIS_URL` - Production Redis instance
- [ ] `REDIS_PASSWORD` - Redis authentication

### Recommended (Production)

- [ ] `SENTRY_DSN` - Error tracking
- [ ] `PROMETHEUS_ENABLED` - Metrics collection
- [ ] `LOG_FORMAT=json` - Structured logging
- [ ] `LOG_LEVEL=warn` - Reduce noise

---

*Reference: Environment configuration from Automaker v0.13.0+*
