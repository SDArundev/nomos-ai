# Docker Configuration

> Container setup, orchestration, and agent isolation for NOMOS v3.

---

## Overview

Docker provides isolated, reproducible environments for:
- Development workstations
- Production deployment
- Agent execution sandboxing (ADR-001)

---

## Dockerfile (Multi-Stage Build)

```dockerfile
# docker/Dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM oven/bun:1.3 AS deps

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN bun install --frozen-lockfile

# ============================================
# Stage 2: Builder
# ============================================
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build all packages
RUN bun run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM oven/bun:1.3-slim AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nomos && \
    useradd -u 1001 -g nomos -s /bin/sh -m nomos

# Copy built artifacts
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R nomos:nomos /app

USER nomos

# Expose ports
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3008/health || exit 1

# Start server
CMD ["bun", "run", "apps/server/dist/index.js"]
```

---

## Agent Container (ADR-001)

```dockerfile
# docker/Dockerfile.agent
FROM oven/bun:1.3-slim

# Minimal runtime for agent execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Create isolated user
RUN useradd -m -u 1000 agent

WORKDIR /workspace

# Copy agent runtime
COPY --chown=agent:agent agent-runtime/ /opt/agent/

USER agent

# No network by default (enabled per-agent)
# No volume mounts by default (mounted per-agent)

ENTRYPOINT ["/opt/agent/entrypoint.sh"]
```

---

## Docker Compose (Development)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  # ===========================================
  # Backend Server
  # ===========================================
  server:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      target: builder
    ports:
      - "3008:3008"
    volumes:
      - ..:/app
      - /app/node_modules
      - ${HOME}/.nomos:/home/bun/.nomos
      - ${HOME}/.gitconfig:/home/bun/.gitconfig:ro
      - ${HOME}/.ssh:/home/bun/.ssh:ro
    environment:
      - NODE_ENV=development
      - PORT=3008
      - DATABASE_URL=file:/home/bun/.nomos/nomos.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ALLOWED_ROOT_DIRECTORIES=/app/projects
      - LOG_LEVEL=debug
    networks:
      - nomos-network
    restart: unless-stopped
    command: bun run dev:server

  # ===========================================
  # Web Frontend
  # ===========================================
  web:
    build:
      context: ../apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
      - "5173:5173"
    volumes:
      - ../apps/web:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3008
      - VITE_WS_URL=ws://localhost:3008
    depends_on:
      - server
    networks:
      - nomos-network
    command: bun run dev

networks:
  nomos-network:
    driver: bridge
```

---

## Docker Compose (Production)

```yaml
# docker/docker-compose.prod.yml
version: '3.8'

services:
  server:
    image: nomos/server:${VERSION:-latest}
    ports:
      - "3008:3008"
    volumes:
      - nomos-data:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For agent containers
    environment:
      - NODE_ENV=production
      - PORT=3008
      - DATABASE_URL=file:/data/nomos.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ALLOWED_ROOT_DIRECTORIES=/data/projects
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 2G
          cpus: '2'
        reservations:
          memory: 512M
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - nomos-network
      - nomos-agents

  web:
    image: nomos/web:${VERSION:-latest}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    deploy:
      replicas: 1
    depends_on:
      - server
    networks:
      - nomos-network

volumes:
  nomos-data:

networks:
  nomos-network:
    driver: bridge

  # Isolated network for agent containers
  nomos-agents:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

---

## Volume Mappings

### Data Volumes

| Volume | Purpose | Mount Point |
|--------|---------|-------------|
| `nomos-data` | Persistent app data | `/data` |
| `projects` | User project files | `/data/projects` |
| `worktrees` | Git worktrees | `/data/worktrees` |

### Development Bind Mounts

```yaml
volumes:
  # Source code (hot reload)
  - ..:/app

  # Preserve node_modules (performance)
  - /app/node_modules

  # User config
  - ${HOME}/.nomos:/home/bun/.nomos

  # Git credentials (read-only)
  - ${HOME}/.gitconfig:/home/bun/.gitconfig:ro
  - ${HOME}/.ssh:/home/bun/.ssh:ro

  # Project directories
  - ${PROJECTS_DIR:-~/projects}:/data/projects
```

### Security Considerations

```yaml
volumes:
  # Read-only where possible
  - ./config:/app/config:ro

  # Limit access to Docker socket
  - /var/run/docker.sock:/var/run/docker.sock:ro

  # tmpfs for sensitive temp files
  - type: tmpfs
    target: /tmp
    tmpfs:
      size: 100M
```

---

## Network Configuration

### Network Modes

```yaml
networks:
  # Internal services
  nomos-internal:
    driver: bridge
    internal: true  # No external access

  # External-facing
  nomos-public:
    driver: bridge

  # Agent isolation (ADR-001)
  nomos-agents:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Port Mapping Strategy

| Service | Internal | External (Dev) | External (Prod) |
|---------|----------|----------------|-----------------|
| Server API | 3008 | 3008 | 3008 |
| Web UI | 3001 | 3001 | 80/443 |
| WebSocket | 3008 | 3008 | 443 |
| Vite HMR | 5173 | 5173 | - |

---

## Agent Container Isolation (ADR-001)

### Spawning Agent Containers

```typescript
// apps/server/src/services/container-service.ts
interface ContainerOptions {
  featureId: string;
  worktreePath: string;
  envVars: Record<string, string>;
}

async function spawnAgentContainer(options: ContainerOptions): Promise<string> {
  const containerName = `nomos-agent-${options.featureId}`;

  const createCommand = [
    'docker', 'run',
    '--detach',
    '--name', containerName,

    // Resource limits
    '--memory', '2g',
    '--cpus', '2',
    '--pids-limit', '100',

    // Security
    '--read-only',
    '--security-opt', 'no-new-privileges',
    '--cap-drop', 'ALL',
    '--cap-add', 'CHOWN',
    '--cap-add', 'SETUID',
    '--cap-add', 'SETGID',

    // Network isolation
    '--network', 'nomos-agents',

    // Writable workspace only
    '-v', `${options.worktreePath}:/workspace:rw`,

    // tmpfs for temp files
    '--tmpfs', '/tmp:size=100M',

    // Environment
    '-e', `FEATURE_ID=${options.featureId}`,
    '-e', `ANTHROPIC_API_KEY=${options.envVars.ANTHROPIC_API_KEY}`,

    // Image
    'nomos/agent:latest',
  ];

  const proc = Bun.spawn(createCommand, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to create container: ${stderr}`);
  }

  return containerName;
}

async function cleanupContainer(containerName: string): Promise<void> {
  // Stop container
  await Bun.spawn(['docker', 'stop', '-t', '10', containerName]).exited;

  // Remove container
  await Bun.spawn(['docker', 'rm', containerName]).exited;
}
```

---

## Health Checks

### Server Health Endpoint

```typescript
// apps/server/src/routes/health.ts
import { Hono } from 'hono';

const health = new Hono();

health.get('/', async (c) => {
  const checks = {
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      disk: await checkDiskSpace(),
    },
  };

  const isHealthy = Object.values(checks.checks).every(
    (check) => check.status === 'ok'
  );

  return c.json(checks, isHealthy ? 200 : 503);
});

health.get('/ready', async (c) => {
  // Readiness probe - is the app ready to receive traffic?
  const ready = await checkDatabaseConnection();
  return c.json({ ready }, ready ? 200 : 503);
});

async function checkDatabase(): Promise<{ status: string }> {
  try {
    await db.query.features.findFirst();
    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

async function checkDiskSpace(): Promise<{ status: string; freeGB?: number }> {
  // Check available disk space
  const stats = await fs.statfs('/data');
  const freeGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);

  if (freeGB < 1) {
    return { status: 'warning', freeGB };
  }

  return { status: 'ok', freeGB };
}

export default health;
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3008/health || exit 1
```

---

## Resource Limits

### Container Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Agent Limits (ADR-001)

| Resource | Limit | Purpose |
|----------|-------|---------|
| Memory | 2GB | Prevent runaway processes |
| CPU | 2 cores | Fair scheduling |
| Disk | Worktree only | Workspace limit |
| Network | Isolated | API access only |
| PIDs | 100 | Prevent fork bombs |

---

## Docker Commands Reference

### Development

```bash
# Start development environment
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose -f docker/docker-compose.yml logs -f server

# Rebuild after changes
docker compose -f docker/docker-compose.yml build --no-cache server

# Shell into container
docker compose -f docker/docker-compose.yml exec server sh

# Run tests in container
docker compose -f docker/docker-compose.yml exec server bun test
```

### Production

```bash
# Build production images
docker compose -f docker/docker-compose.prod.yml build

# Deploy
docker compose -f docker/docker-compose.prod.yml up -d

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f

# Rolling update
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
```

### Cleanup

```bash
# Stop all containers
docker compose down

# Remove volumes (caution: deletes data)
docker compose down -v

# Prune unused resources
docker system prune -af

# Clean agent containers
docker ps -a --filter "name=nomos-agent-" -q | xargs docker rm -f
```

---

*Reference: Docker patterns for NOMOS v3 inspired by Automaker v0.13.0+ and ADR-001*
