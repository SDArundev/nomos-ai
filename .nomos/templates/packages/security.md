# Security Package Specification

> Template for `packages/security/` - to be created by F001 scaffold

## Package Structure

```
packages/security/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── lib/
    │   ├── validate-path.ts      # Path traversal protection
    │   ├── branch-name.ts        # Git branch sanitization
    │   ├── timing-safe.ts        # Timing-safe comparison
    │   └── env-sanitize.ts       # Environment variable filtering
    └── middleware/
        ├── security-headers.ts   # HTTP security headers
        ├── content-type.ts       # Content-Type enforcement
        ├── path-validation.ts    # Path parameter validation
        └── rate-limit.ts         # IP-based rate limiting
```

## package.json

```json
{
  "name": "@nomos/security",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

## Core Functions

### validate-path.ts

```typescript
export interface PathValidationResult {
  valid: boolean;
  error?: string;
  normalizedPath?: string;
}

export function validatePath(
  inputPath: string,
  allowedDirs?: string[]
): PathValidationResult;

export function isPathWithinDirectory(
  filePath: string,
  directory: string
): boolean;
```

### branch-name.ts

```typescript
export function sanitizeBranchName(name: string): string;
export function isValidBranchName(name: string): boolean;
```

### timing-safe.ts

```typescript
export function timingSafeCompare(a: string, b: string): boolean;
```

### env-sanitize.ts

```typescript
export function sanitizeEnvironment(
  env: NodeJS.ProcessEnv
): Record<string, string>;
```

## Middleware (Hono)

### security-headers.ts

Sets headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'...`
- `Strict-Transport-Security` (production only)

### content-type.ts

Enforces `Content-Type: application/json` for POST/PUT/PATCH requests.

### path-validation.ts

Validates path parameters in request body using `validatePath()`.

### rate-limit.ts

IP-based rate limiting with configurable limits and windows.

## Usage Example

```typescript
import { Hono } from 'hono';
import {
  securityHeaders,
  requireJsonContentType,
  validatePathParams,
  rateLimit,
  validatePath,
  isValidBranchName,
} from '@nomos/security';

const app = new Hono();

// Apply middleware
app.use('*', securityHeaders());
app.use('*', rateLimit(100, 60000));
app.use('/api/*', requireJsonContentType());
app.use('/api/*', validatePathParams());

// Use utilities
app.post('/api/files', async (c) => {
  const { path } = await c.req.json();
  const result = validatePath(path);
  if (!result.valid) {
    return c.json({ error: result.error }, 400);
  }
  // ...
});
```

## Security Considerations

1. **Path Traversal**: Always validate paths before file operations
2. **Timing Attacks**: Use timing-safe comparison for secrets
3. **Environment Leakage**: Filter env vars before subprocess execution
4. **Branch Injection**: Validate branch names before git operations
5. **Rate Limiting**: Protect against brute force attacks
6. **Content-Type**: Prevent CSRF via form submissions
