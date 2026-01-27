# Security Architecture

> Defense-in-depth security patterns for NOMOS v3.

---

## Security Layers

```
+-------------------------------------------------------------+
| Layer 1: NETWORK & TRANSPORT                                 |
|   - CORS configuration                                       |
|   - HTTPS enforcement (production)                           |
|   - Content-Type validation                                  |
+-------------------------------------------------------------+
| Layer 2: AUTHENTICATION                                      |
|   - Bearer token authentication                              |
|   - Session cookies (HTTP-only, SameSite)                    |
|   - WebSocket tokens (short-lived)                           |
|   - Rate limiting                                            |
+-------------------------------------------------------------+
| Layer 3: INPUT VALIDATION                                    |
|   - Zod schema validation on all inputs                      |
|   - Path sanitization                                        |
|   - Feature ID format validation                             |
|   - Branch name sanitization                                 |
+-------------------------------------------------------------+
| Layer 4: EXECUTION ISOLATION                                 |
|   - Git worktree sandboxing                                  |
|   - Container isolation (ADR-001)                            |
|   - Directory constraints (ALLOWED_ROOT_DIRECTORIES)         |
|   - Environment variable filtering                           |
+-------------------------------------------------------------+
| Layer 5: PROVIDER SECURITY                                   |
|   - API key isolation                                        |
|   - Credential masking in logs                               |
|   - Tool permission enforcement                              |
+-------------------------------------------------------------+
| Layer 6: MONITORING & AUDIT                                  |
|   - Structured logging (Pino)                                |
|   - Request ID correlation                                   |
|   - Error tracking                                           |
|   - Rate limit tracking                                      |
+-------------------------------------------------------------+
```

---

## Authentication System

### Bearer Token Authentication

```typescript
// apps/server/src/middleware/auth.ts
import { bearerAuth } from 'hono/bearer-auth';
import { timingSafeEqual } from 'crypto';

// Generate API key on first run
async function ensureApiKey(): Promise<string> {
  const keyPath = path.join(os.homedir(), '.nomos', '.api-key');

  try {
    return await Bun.file(keyPath).text();
  } catch {
    // Generate new key
    const apiKey = crypto.randomUUID() + crypto.randomUUID();
    await Bun.write(keyPath, apiKey, { mode: 0o600 }); // Owner-only
    return apiKey;
  }
}

// Timing-safe token validation
function validateToken(provided: string, stored: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Middleware
export const authMiddleware = async (c, next) => {
  const apiKey = await ensureApiKey();
  return bearerAuth({ token: apiKey })(c, next);
};
```

### Session-Based Authentication

```typescript
// apps/server/src/services/session-service.ts
interface Session {
  token: string;
  createdAt: number;
  expiresAt: number;
  userId?: string;
}

const sessions = new Map<string, Session>();

function createSession(): Session {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: Session = {
    token,
    createdAt: now,
    expiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
  };
  sessions.set(token, session);
  return session;
}

function validateSession(token: string): boolean {
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}
```

### Rate Limiting

```typescript
// apps/server/src/middleware/rate-limit.ts
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

function checkRateLimit(
  ip: string,
  limit: number = 5,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
}

// Middleware
export const rateLimitMiddleware = (limit = 100, windowMs = 60000) => {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    const result = checkRateLimit(ip, limit, windowMs);

    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.resetIn));

    if (!result.allowed) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    await next();
  };
};
```

---

## Input Validation

### Path Sanitization

```typescript
// apps/server/src/lib/security.ts
import path from 'path';

export function validatePath(inputPath: string): { valid: boolean; error?: string } {
  // Reject null bytes
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Path contains null bytes' };
  }

  // Normalize path
  const normalized = path.normalize(inputPath);

  // Reject path traversal
  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // Check against allowed directories
  const allowedDirs = process.env.ALLOWED_ROOT_DIRECTORIES?.split(',') || [];

  const isAllowed = allowedDirs.some(dir => {
    const normalizedDir = path.normalize(dir);
    return normalized.startsWith(normalizedDir);
  });

  if (!isAllowed && allowedDirs.length > 0) {
    return { valid: false, error: 'Path outside allowed directories' };
  }

  return { valid: true };
}

// Middleware
export const pathValidationMiddleware = async (c, next) => {
  const body = await c.req.json().catch(() => ({}));

  for (const key of ['projectPath', 'workingDirectory', 'path', 'cwd']) {
    if (body[key]) {
      const result = validatePath(body[key]);
      if (!result.valid) {
        return c.json({ error: result.error }, 400);
      }
    }
  }

  await next();
};
```

### Feature ID Validation

```typescript
// packages/types/src/feature.ts
import { z } from 'zod';

export const FeatureIdSchema = z
  .string()
  .regex(/^F\d{3}$/, 'Feature ID must be F followed by 3 digits (e.g., F001)');

// Validation middleware
export const validateFeatureId = (featureId: string): boolean => {
  return FeatureIdSchema.safeParse(featureId).success;
};
```

### Branch Name Sanitization

```typescript
// apps/server/src/lib/git-security.ts
export function sanitizeBranchName(name: string): string {
  let sanitized = name;

  // Replace path separators
  sanitized = sanitized.replace(/[\\/]/g, '-');

  // Remove invalid characters
  sanitized = sanitized.replace(/[:"*?<>|]/g, '');

  // Convert spaces to underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Remove trailing dots
  sanitized = sanitized.replace(/\.+$/, '');

  // Collapse consecutive dashes
  sanitized = sanitized.replace(/-+/g, '-');

  // Check Windows reserved names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reserved.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Enforce max length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

export function isValidBranchName(name: string): boolean {
  const invalidPatterns = [
    /^\./,              // Can't start with .
    /\.$/,              // Can't end with .
    /\.\./,             // No consecutive dots
    /^-/,               // Can't start with -
    /-$/,               // Can't end with -
    /@\{/,              // No @{
    /[\x00-\x1f\x7f]/,  // No control characters
    /[~^:?*\[\]\\]/,    // No special git chars
    /\/\//,             // No consecutive slashes
  ];

  return !invalidPatterns.some(pattern => pattern.test(name));
}
```

---

## Execution Isolation

### Git Worktree Sandboxing

```typescript
// apps/server/src/services/worktree-service.ts
class WorktreeService {
  async create(
    projectPath: string,
    branchName: string
  ): Promise<string> {
    // Sanitize branch name
    const sanitizedBranch = sanitizeBranchName(branchName);

    // Validate project path
    const pathResult = validatePath(projectPath);
    if (!pathResult.valid) {
      throw new Error(pathResult.error);
    }

    const worktreePath = path.join(
      projectPath,
      '.nomos',
      'worktrees',
      sanitizedBranch
    );

    // Use array-based command execution (safe - no shell injection)
    await this.execGit(projectPath, [
      'worktree',
      'add',
      worktreePath,
      '-b',
      sanitizedBranch,
    ]);

    return worktreePath;
  }

  private async execGit(cwd: string, args: string[]): Promise<string> {
    const proc = Bun.spawn(['git', ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`Git command failed: ${stderr}`);
    }

    return new Response(proc.stdout).text();
  }
}
```

### Environment Variable Filtering

```typescript
// apps/server/src/lib/env-security.ts
const ALLOWED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'HOME',
  'USER',
  'PATH',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
];

const BLOCKED_PATTERNS = [
  'SECRET',
  'PASSWORD',
  'CREDENTIAL',
  'PRIVATE_KEY',
  'API_KEY', // Except ANTHROPIC_API_KEY
  'TOKEN',
];

export function sanitizeEnvironment(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;

    // Check explicit allowlist
    if (ALLOWED_ENV_VARS.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    // Check blocklist patterns
    const isBlocked = BLOCKED_PATTERNS.some(pattern =>
      key.toUpperCase().includes(pattern) &&
      !key.startsWith('ANTHROPIC_')
    );

    if (!isBlocked) {
      // Allow other safe variables
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## Container Isolation (ADR-001)

### Agent Container Configuration

```typescript
// apps/server/src/services/container-service.ts
interface ContainerConfig {
  image: string;
  memoryLimit: string;
  cpuLimit: string;
  networkMode: string;
  readOnlyRootfs: boolean;
  securityOpts: string[];
  capDrop: string[];
  capAdd: string[];
}

const AGENT_CONTAINER_CONFIG: ContainerConfig = {
  image: 'nomos/agent:latest',
  memoryLimit: '2g',
  cpuLimit: '2',
  networkMode: 'nomos-agents',
  readOnlyRootfs: true,
  securityOpts: ['no-new-privileges'],
  capDrop: ['ALL'],
  capAdd: ['CHOWN', 'SETUID', 'SETGID'],
};

async function spawnAgentContainer(
  featureId: string,
  worktreePath: string
): Promise<Container> {
  const config = {
    ...AGENT_CONTAINER_CONFIG,
    name: `nomos-agent-${featureId}`,
    Env: [
      `FEATURE_ID=${featureId}`,
      `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`,
    ],
    HostConfig: {
      Memory: 2 * 1024 * 1024 * 1024, // 2GB
      NanoCpus: 2 * 1e9, // 2 CPUs
      ReadonlyRootfs: true,
      Binds: [`${worktreePath}:/workspace:rw`],
      NetworkMode: 'nomos-agents',
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
    },
  };

  // Spawn container using Docker API
  return dockerService.createContainer(config);
}
```

---

## Security Headers

```typescript
// apps/server/src/middleware/security-headers.ts
import { Hono } from 'hono';

export const securityHeadersMiddleware = async (c, next) => {
  await next();

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // XSS Protection (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
  );

  // Strict Transport Security (production only)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};
```

---

## Logging & Audit

### Credential Masking

```typescript
// apps/server/src/lib/logging.ts
import pino from 'pino';

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'credential',
];

function redactSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: SENSITIVE_KEYS.map(k => `*.${k}`),
  formatters: {
    log: (obj) => redactSensitive(obj) as object,
  },
});
```

---

## Security Checklist

### Authentication
- [ ] API keys stored securely (0o600 permissions)
- [ ] Session cookies are HTTP-only and SameSite
- [ ] WebSocket tokens are short-lived (5 min)
- [ ] Timing-safe comparison for token validation
- [ ] Rate limiting on auth endpoints

### Input Validation
- [ ] All paths validated against allowlist
- [ ] Branch names sanitized before git operations
- [ ] Command arguments use array syntax (no shell interpolation)
- [ ] Null bytes rejected in all inputs
- [ ] Zod validation on all API endpoints

### Execution Isolation
- [ ] Features execute in git worktrees
- [ ] Environment variables filtered for agents
- [ ] Container isolation with resource limits
- [ ] No direct main branch access

### Network Security
- [ ] CORS configured with specific origins
- [ ] Security headers applied
- [ ] HTTPS enforced in production

---

*Reference: Security patterns for NOMOS v3 inspired by Automaker v0.13.0+*
