# Deployment Guide

> Production deployment, CI/CD pipelines, scaling strategies, and hosting options.

---

## Deployment Options

| Option | Best For | Complexity | Cost |
|--------|----------|------------|------|
| Single Server | Small teams, POC | Low | $ |
| Docker Compose | Medium teams | Medium | $$ |
| Kubernetes | Large scale | High | $$$ |
| Serverless | Variable load | Medium | Variable |

---

## Single Server Deployment

### Prerequisites

```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash automaker
sudo su - automaker

# Clone and build
git clone https://github.com/your-org/automaker.git
cd automaker
npm ci
npm run build

# Create data directory
mkdir -p ~/.automaker
```

### Systemd Service

```ini
# /etc/systemd/system/automaker.service
[Unit]
Description=Automaker AI Development Server
After=network.target redis.service

[Service]
Type=simple
User=automaker
WorkingDirectory=/home/automaker/automaker
Environment=NODE_ENV=production
Environment=PORT=3008
EnvironmentFile=/home/automaker/.automaker/.env
ExecStart=/usr/bin/node packages/server/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable automaker
sudo systemctl start automaker
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/automaker
upstream automaker_api {
    server 127.0.0.1:3008;
    keepalive 64;
}

server {
    listen 80;
    server_name automaker.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name automaker.example.com;

    ssl_certificate /etc/letsencrypt/live/automaker.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/automaker.example.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Static files
    location / {
        root /home/automaker/automaker/packages/web/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
    }

    # API proxy
    location /api {
        proxy_pass http://automaker_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://automaker_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## Docker Compose Deployment

### Production Compose File

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  server:
    image: ghcr.io/your-org/automaker:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "3008:3008"
    volumes:
      - automaker-data:/data
    environment:
      - NODE_ENV=production
      - PORT=3008
      - DATA_DIR=/data
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.production
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3008/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    image: ghcr.io/your-org/automaker-web:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - server

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  automaker-data:
  redis-data:
```

### Deployment Commands

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Deploy with zero downtime
docker compose -f docker-compose.prod.yml up -d --no-deps --scale server=2 server

# Wait for health check
sleep 30

# Remove old containers
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: deploy
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/automaker
            docker compose pull
            docker compose up -d

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    if: github.event_name == 'release'
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: deploy
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/automaker
            export VERSION=${{ github.event.release.tag_name }}
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --no-deps server
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE

test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm run test
    - npm run lint

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_IMAGE:$CI_COMMIT_SHA .
    - docker push $DOCKER_IMAGE:$CI_COMMIT_SHA
  only:
    - main
    - tags

deploy_staging:
  stage: deploy
  environment: staging
  script:
    - ssh deploy@staging "cd /opt/automaker && docker compose pull && docker compose up -d"
  only:
    - main

deploy_production:
  stage: deploy
  environment: production
  script:
    - ssh deploy@production "cd /opt/automaker && docker compose -f docker-compose.prod.yml up -d"
  only:
    - tags
  when: manual
```

---

## Kubernetes Deployment

### Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: automaker-server
  labels:
    app: automaker
    component: server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: automaker
      component: server
  template:
    metadata:
      labels:
        app: automaker
        component: server
    spec:
      containers:
        - name: server
          image: ghcr.io/your-org/automaker:latest
          ports:
            - containerPort: 3008
          env:
            - name: NODE_ENV
              value: production
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: automaker-secrets
                  key: anthropic-api-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3008
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3008
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: automaker-server
spec:
  selector:
    app: automaker
    component: server
  ports:
    - port: 3008
      targetPort: 3008
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: automaker-ingress
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "automaker-server"
spec:
  rules:
    - host: automaker.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: automaker-web
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: automaker-server
                port:
                  number: 3008
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: automaker-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: automaker-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Scaling Strategies

### Horizontal Scaling

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
│                   (Nginx/HAProxy)                    │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Server  │   │ Server  │   │ Server  │
   │   #1    │   │   #2    │   │   #3    │
   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
              ┌──────────────┐
              │    Redis     │
              │   (Shared)   │
              └──────────────┘
```

### Session Affinity (WebSockets)

```nginx
upstream automaker_api {
    ip_hash;  # Sticky sessions for WebSocket
    server 10.0.0.1:3008;
    server 10.0.0.2:3008;
    server 10.0.0.3:3008;
}
```

### Redis Cluster for Sessions

```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis-1.internal', port: 6379 },
  { host: 'redis-2.internal', port: 6379 },
  { host: 'redis-3.internal', port: 6379 },
]);
```

---

## Monitoring in Production

### Health Check Endpoint

```typescript
app.get('/api/health', async (req, res) => {
  const checks = {
    server: 'ok',
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
    memory: await checkMemory(),
  };

  const healthy = Object.values(checks).every(c => c === 'ok');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks,
  });
});
```

### Prometheus Metrics

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Security scan completed
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Database migrations ready
- [ ] Backup strategy in place

### During Deployment

- [ ] Blue-green or rolling deployment
- [ ] Health checks passing
- [ ] No error spike in logs
- [ ] Response times normal

### Post-Deployment

- [ ] Smoke tests passing
- [ ] Monitoring dashboards green
- [ ] Alert thresholds configured
- [ ] Rollback plan tested

---

*Reference: Deployment patterns from Automaker v0.13.0+*
