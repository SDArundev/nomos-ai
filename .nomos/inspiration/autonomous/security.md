# Security Architecture

> Defense-in-depth security patterns for autonomous AI development systems.

---

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: NETWORK & TRANSPORT                                │
│   • CORS configuration                                      │
│   • HTTPS enforcement (production)                          │
│   • Content-Type validation                                 │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: AUTHENTICATION                                     │
│   • API key authentication                                  │
│   • Session cookies (HTTP-only, SameSite)                   │
│   • WebSocket tokens (short-lived)                          │
│   • Rate limiting                                           │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: INPUT VALIDATION                                   │
│   • Path sanitization                                       │
│   • Branch name validation                                  │
│   • Command argument escaping                               │
│   • Image upload validation                                 │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: EXECUTION ISOLATION                                │
│   • Git worktree sandboxing                                 │
│   • PTY sandboxing                                          │
│   • Directory constraints (ALLOWED_ROOT_DIRECTORY)          │
│   • Environment variable filtering                          │
│   • File permission restrictions                            │
├─────────────────────────────────────────────────────────────┤
│ Layer 5: PROVIDER SECURITY                                  │
│   • API key isolation                                       │
│   • Credential masking                                      │
│   • OAuth credential handling                               │
│   • Tool permission enforcement                             │
├─────────────────────────────────────────────────────────────┤
│ Layer 6: MONITORING & AUDIT                                 │
│   • Event history logging                                   │
│   • Error tracking & classification                         │
│   • Rate limit tracking                                     │
│   • Failure notifications                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication System

### Session-Based Authentication

```typescript
// Authentication configuration
interface AuthConfig {
  sessionCookieName: string;      // 'automaker_session'
  sessionExpirationDays: number;  // 30
  apiKeyHeader: string;           // 'X-API-Key'
  webSocketTokenHeader: string;   // 'X-Terminal-Token'
  webSocketTokenExpiration: number; // 5 minutes
}

// Session storage
interface Session {
  token: string;                  // 256-bit random token
  createdAt: number;
  expiresAt: number;
  userId?: string;
}

const sessions = new Map<string, Session>();

// Session creation
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

// Session validation
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

### Cookie Security

```typescript
// Set session cookie
function setSessionCookie(res: Response, token: string): void {
  res.cookie('automaker_session', token, {
    httpOnly: true,           // No JavaScript access
    sameSite: 'lax',          // CSRF protection
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}
```

### API Key Authentication

```typescript
// API key generation (on first run)
async function ensureApiKey(): Promise<string> {
  const keyPath = path.join(os.homedir(), '.automaker', '.api-key');

  try {
    return await fs.readFile(keyPath, 'utf-8');
  } catch {
    // Generate new key
    const apiKey = crypto.randomBytes(32).toString('hex');
    await fs.mkdir(path.dirname(keyPath), { recursive: true });
    await fs.writeFile(keyPath, apiKey, { mode: 0o600 }); // Owner-only
    return apiKey;
  }
}

// API key validation with timing-safe comparison
function validateApiKey(provided: string, stored: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
```

### Rate Limiting

```typescript
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
```

---

## Input Validation

### Path Sanitization

```typescript
function validatePath(inputPath: string): { valid: boolean; error?: string } {
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

  if (!isAllowed) {
    return { valid: false, error: 'Path outside allowed directories' };
  }

  return { valid: true };
}
```

### Branch Name Sanitization

```typescript
function sanitizeBranchName(name: string): string {
  let sanitized = name;

  // Replace path separators
  sanitized = sanitized.replace(/[\\/]/g, '-');

  // Remove Windows invalid chars
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

function isValidBranchName(name: string): boolean {
  // Git branch name rules
  const invalidPatterns = [
    /^\./,                    // Can't start with .
    /\.$/,                    // Can't end with .
    /\.\./,                   // No consecutive dots
    /^-/,                     // Can't start with -
    /-$/,                     // Can't end with -
    /@\{/,                    // No @{
    /[\x00-\x1f\x7f]/,        // No control characters
    /[~^:?*\[\]\\]/,          // No special git chars
    /\/\//,                   // No consecutive slashes
  ];

  return !invalidPatterns.some(pattern => pattern.test(name));
}
```

---

## Execution Isolation

### Git Worktree Sandboxing

```typescript
// Each feature executes in isolated worktree
async function getOrCreateWorktree(
  projectPath: string,
  branchName: string
): Promise<string> {
  const sanitizedBranch = sanitizeBranchName(branchName);
  const worktreePath = path.join(
    projectPath,
    '.git',
    'worktrees',
    sanitizedBranch
  );

  // Check if worktree exists
  if (await fs.pathExists(worktreePath)) {
    return worktreePath;
  }

  // Create worktree using array-based command execution (safe)
  await execGitCommand(projectPath, [
    'worktree',
    'add',
    worktreePath,
    '-b',
    sanitizedBranch,
  ]);

  return worktreePath;
}
```

### Safe Command Execution

```typescript
// ALWAYS use array-based command execution to prevent injection
async function execGitCommand(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Use execFile, NOT exec - prevents shell injection
    execFile('git', args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// VULNERABLE (never do this):
// await exec(`git merge ${branchName}`);

// SAFE (always do this):
// await execGitCommand(cwd, ['merge', branchName]);
```

### Environment Variable Filtering

```typescript
// Only forward safe env vars to AI agents
const ALLOWED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'HOME',
  'USER',
  'PATH',
  'SHELL',
  'TERM',
];

const BLOCKED_ENV_VARS = [
  'PORT',
  'DATA_DIR',
  'API_KEY',
  'SECRET',
  'PASSWORD',
  'CREDENTIAL',
];

function sanitizeEnvironment(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;

    // Check blocklist first
    const isBlocked = BLOCKED_ENV_VARS.some(blocked =>
      key.toUpperCase().includes(blocked) &&
      !key.startsWith('ANTHROPIC_')
    );
    if (isBlocked) continue;

    // Check allowlist
    if (ALLOWED_ENV_VARS.includes(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

---

## Security Headers

```typescript
function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );
  next();
}
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

### Execution Isolation
- [ ] Features execute in git worktrees
- [ ] Environment variables filtered for agents
- [ ] Terminal sessions restricted to allowed directories

### Network Security
- [ ] CORS configured with specific origins
- [ ] Security headers applied
- [ ] HTTPS enforced in production

---

*Reference: Security patterns from Automaker v0.13.0+*
