# Stage 1: Install dependencies
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production runner
FROM oven/bun:latest AS runner
WORKDIR /app

ARG UID=1001
ARG GID=1001
RUN groupadd --gid ${GID} nomos && \
    useradd --uid ${UID} --gid ${GID} --create-home --shell /bin/bash nomos

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/apps/web/dist ./apps/server/public
COPY --from=builder /app/packages ./packages

# Create data directory for SQLite
RUN mkdir -p /data && chown -R nomos:nomos /app /data

USER nomos

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/nomos.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["bun", "run", "apps/server/src/index.ts"]
