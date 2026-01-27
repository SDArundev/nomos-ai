# Docker Configuration

> Container setup and orchestration for autonomous AI development systems.

---

## Overview

Docker provides isolated, reproducible environments for:
- Development workstations
- CI/CD pipelines
- Production deployment
- Agent execution sandboxing

---

## Dockerfile

### Multi-Stage Build

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci --ignore-scripts

# ============================================
# Stage 2: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build all packages
RUN npm run build

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:22-alpine AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache git openssh-client

# Create non-root user
RUN addgroup -g 1001 automaker && \
    adduser -u 1001 -G automaker -s /bin/sh -D automaker

# Copy built artifacts
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R automaker:automaker /app

USER automaker

# Expose ports
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3008/api/health || exit 1

# Start server
CMD ["node", "packages/server/dist/index.js"]
```

### Development Dockerfile

```dockerfile
# Dockerfile.dev
FROM node:22-alpine

WORKDIR /app

# Install dev dependencies
RUN apk add --no-cache python3 make g++ git openssh-client

# Install global tools
RUN npm install -g nodemon tsx

# Copy package files first (for caching)
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source (mounted as volume in dev)
COPY . .

EXPOSE 3008 3001 5173

CMD ["npm", "run", "dev"]
```

---

## Docker Compose

### Development Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ===========================================
  # Backend Server
  # ===========================================
  server:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3008:3008"
    volumes:
      - .:/app
      - /app/node_modules
      - ${HOME}/.automaker:/home/node/.automaker
      - ${HOME}/.gitconfig:/home/node/.gitconfig:ro
      - ${HOME}/.ssh:/home/node/.ssh:ro
    environment:
      - NODE_ENV=development
      - PORT=3008
      - DATA_DIR=/home/node/.automaker
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - ALLOWED_ROOT_DIRECTORIES=/app/projects
    depends_on:
      - redis
    networks:
      - automaker-net
    restart: unless-stopped

  # ===========================================
  # Web Frontend
  # ===========================================
  web:
    build:
      context: ./packages/web
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
      - "5173:5173"
    volumes:
      - ./packages/web:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3008
      - VITE_WS_URL=ws://localhost:3008
    depends_on:
      - server
    networks:
      - automaker-net

  # ===========================================
  # Redis (Session/Cache)
  # ===========================================
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - automaker-net
    restart: unless-stopped

  # ===========================================
  # Prometheus (Metrics)
  # ===========================================
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - automaker-net
    profiles:
      - monitoring

  # ===========================================
  # Grafana (Dashboards)
  # ===========================================
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    networks:
      - automaker-net
    profiles:
      - monitoring

volumes:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  automaker-net:
    driver: bridge
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  server:
    image: automaker/server:${VERSION:-latest}
    ports:
      - "3008:3008"
    volumes:
      - automaker-data:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For agent containers
    environment:
      - NODE_ENV=production
      - PORT=3008
      - DATA_DIR=/data
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
      - ALLOWED_ROOT_DIRECTORIES=/data/projects
    deploy:
      replicas: 2
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
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3008/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - redis
    networks:
      - automaker-net

  web:
    image: automaker/web:${VERSION:-latest}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    deploy:
      replicas: 2
    depends_on:
      - server
    networks:
      - automaker-net

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    deploy:
      resources:
        limits:
          memory: 256M
    networks:
      - automaker-net

volumes:
  automaker-data:
  redis-data:

networks:
  automaker-net:
    driver: overlay
```

---

## Volume Mappings

### Data Volumes

| Volume | Purpose | Mount Point |
|--------|---------|-------------|
| `automaker-data` | Persistent app data | `/data` |
| `redis-data` | Redis persistence | `/data` |
| `projects` | User project files | `/data/projects` |
| `worktrees` | Git worktrees | `/data/worktrees` |

### Development Bind Mounts

```yaml
volumes:
  # Source code (hot reload)
  - .:/app

  # Preserve node_modules (performance)
  - /app/node_modules

  # User config
  - ${HOME}/.automaker:/home/node/.automaker

  # Git credentials (read-only)
  - ${HOME}/.gitconfig:/home/node/.gitconfig:ro
  - ${HOME}/.ssh:/home/node/.ssh:ro

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
  automaker-internal:
    driver: bridge
    internal: true  # No external access

  # External-facing
  automaker-public:
    driver: bridge

  # Agent isolation
  automaker-agents:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Port Mapping Strategy

| Service | Internal | External (Dev) | External (Prod) |
|---------|----------|----------------|-----------------|
| Server API | 3008 | 3008 | - |
| Web UI | 3001 | 3001 | 80/443 |
| WebSocket | 3008 | 3008 | 443 |
| Redis | 6379 | 6379 | - |
| Prometheus | 9090 | 9090 | - |
| Grafana | 3000 | 3000 | - |

---

## Agent Container Isolation

### Agent Dockerfile

```dockerfile
# Dockerfile.agent
FROM node:22-alpine

# Minimal runtime for agent execution
RUN apk add --no-cache git openssh-client

# Create isolated user
RUN adduser -D -u 1000 agent

WORKDIR /workspace

# Copy agent runtime
COPY --chown=agent:agent agent-runtime/ /opt/agent/

USER agent

# No network by default (enabled per-agent)
# No volume mounts by default (mounted per-agent)

ENTRYPOINT ["/opt/agent/entrypoint.sh"]
```

### Spawning Agent Containers

```typescript
async function spawnAgentContainer(
  featureId: string,
  projectPath: string
): Promise<Container> {
  const docker = new Docker();

  const container = await docker.createContainer({
    Image: 'automaker/agent:latest',
    name: `agent-${featureId}`,
    Env: [
      `FEATURE_ID=${featureId}`,
      `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`,
    ],
    HostConfig: {
      // CPU/Memory limits
      Memory: 2 * 1024 * 1024 * 1024, // 2GB
      NanoCpus: 2 * 1e9, // 2 CPUs

      // Read-only root filesystem
      ReadonlyRootfs: true,

      // Writable workspace only
      Binds: [
        `${projectPath}:/workspace:rw`,
      ],

      // Isolated network
      NetworkMode: 'automaker-agents',

      // Security options
      SecurityOpt: ['no-new-privileges'],
      CapDrop: ['ALL'],
      CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
    },
  });

  await container.start();
  return container;
}
```

---

## Docker Commands Reference

### Development

```bash
# Start development environment
docker compose up -d

# View logs
docker compose logs -f server

# Rebuild after changes
docker compose build --no-cache server

# Shell into container
docker compose exec server sh

# Run tests in container
docker compose exec server npm test
```

### Production

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Deploy stack
docker stack deploy -c docker-compose.prod.yml automaker

# Scale services
docker service scale automaker_server=3

# Rolling update
docker service update --image automaker/server:v2 automaker_server

# View service logs
docker service logs -f automaker_server
```

### Cleanup

```bash
# Stop all containers
docker compose down

# Remove volumes (caution: deletes data)
docker compose down -v

# Prune unused resources
docker system prune -af
```

---

## Health Checks

### Server Health Endpoint

```typescript
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: checkDatabase(),
      redis: checkRedis(),
      disk: checkDiskSpace(),
    },
  };

  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3008/api/health || exit 1
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

### Agent Limits

| Resource | Limit | Purpose |
|----------|-------|---------|
| Memory | 2GB | Prevent runaway processes |
| CPU | 2 cores | Fair scheduling |
| Disk | 10GB | Workspace limit |
| Network | Limited | API access only |
| PIDs | 100 | Prevent fork bombs |

---

*Reference: Docker patterns from Automaker v0.13.0+*
