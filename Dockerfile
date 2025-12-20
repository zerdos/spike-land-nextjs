# syntax=docker/dockerfile:1.20

# ============================================================================
# Multi-Stage Dockerfile for CI/CD Pipeline
#
# This Dockerfile runs the full CI pipeline at build time:
# - Lint (parallel with build)
# - Build (parallel with lint)
# - Unit tests with coverage
# - E2E tests with real Chromium browser
#
# Key insight: Docker layer caching means test file changes don't rebuild the app!
#
# Usage:
#   docker build --target ci -t app:ci .           # Full CI pipeline
#   docker build --target unit-tests -t app:test . # Skip E2E
#   docker build --target build -t app:build .     # Skip tests
#   docker build --target production -t app:prod . # Production image
# ============================================================================

# ============================================================================
# STAGE 0: Base with system dependencies
# Uses Debian for better Chromium support (Alpine has issues with Playwright)
# ============================================================================
FROM node:24.12.0-bookworm-slim AS base
WORKDIR /app

# Install system dependencies for native modules and Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    # For sharp image processing
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev \
    # For Playwright/Chromium (will be installed properly later)
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable yarn

# ============================================================================
# STAGE 1: Install dependencies (excellent cache - only yarn.lock changes)
# ============================================================================
FROM base AS deps

# Copy Yarn configuration and binary
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy workspace package.json files (required for monorepo resolution)
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/opfs-node-adapter/package.json ./packages/opfs-node-adapter/

# Copy prisma schema (required for Prisma's postinstall hook)
COPY prisma ./prisma

# Install dependencies with cache mount for Yarn
# Prisma generate runs automatically during postinstall
RUN --mount=type=cache,target=./.yarn/cache \
    DATABASE_URL="postgresql://x:x@x:5432/x" yarn install --immutable

# ============================================================================
# STAGE 2: Prisma client already generated during install
# This stage just verifies and can regenerate if needed
# ============================================================================
FROM deps AS prisma
# Prisma client was generated during yarn install, verify it exists
RUN test -d node_modules/.prisma/client || \
    (DATABASE_URL="postgresql://x:x@x:5432/x" yarn prisma generate)

# ============================================================================
# STAGE 3: Copy source code (moderate cache - source changes frequently)
# ============================================================================
FROM prisma AS source
COPY tsconfig*.json next.config.ts postcss.config.mjs ./
COPY tailwind.config.ts eslint.config.mjs ./
COPY src ./src
COPY apps ./apps
COPY public ./public
COPY content ./content

# ============================================================================
# STAGE: Development server (for docker-compose)
# Use: docker-compose up or docker build --target dev
# ============================================================================
FROM source AS dev
# Copy .env.local for development (contains all required env vars)
COPY .env.local .env.local
ENV NODE_ENV=development
EXPOSE 3000
CMD ["yarn", "dev"]

# ============================================================================
# STAGE 4: Lint (PARALLEL with build - uses BuildKit)
# ============================================================================
FROM source AS lint
RUN yarn lint

# ============================================================================
# STAGE 5: Build application (PARALLEL with lint)
# ============================================================================
FROM source AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache \
    DATABASE_URL="postgresql://x:x@x:5432/x" yarn build

# ============================================================================
# STAGE 6: Merge lint + build (ensures both pass)
# ============================================================================
FROM build AS verified-build
COPY --from=lint /app/package.json /tmp/lint-passed

# ============================================================================
# STAGE 7: Copy test files AFTER build (KEY: test changes don't rebuild!)
# ============================================================================
FROM verified-build AS test-source
COPY vitest.config.ts vitest.setup.ts ./
COPY vitest.mock-*.ts vitest.mock-*.tsx ./
COPY cucumber.js ./
COPY e2e ./e2e

# ============================================================================
# STAGE 8: Run unit tests
# ============================================================================
FROM test-source AS unit-tests-1
RUN yarn test:run --shard 1/40 > /tmp/test-shard-1.log 2>&1 || (cat /tmp/test-shard-1.log && exit 1)

FROM test-source AS unit-tests-2
RUN yarn test:run --shard 2/40 > /tmp/test-shard-2.log 2>&1 || (cat /tmp/test-shard-2.log && exit 1)

FROM test-source AS unit-tests-3
RUN yarn test:run --shard 3/40 > /tmp/test-shard-3.log 2>&1 || (cat /tmp/test-shard-3.log && exit 1)

FROM test-source AS unit-tests-4
RUN yarn test:run --shard 4/40 > /tmp/test-shard-4.log 2>&1 || (cat /tmp/test-shard-4.log && exit 1)

FROM test-source AS unit-tests
COPY --from=unit-tests-1 /tmp/test-shard-1.log /tmp/test-shard-1.log
COPY --from=unit-tests-2 /tmp/test-shard-2.log /tmp/test-shard-2.log
COPY --from=unit-tests-3 /tmp/test-shard-3.log /tmp/test-shard-3.log
COPY --from=unit-tests-4 /tmp/test-shard-4.log /tmp/test-shard-4.log

RUN cat /tmp/test-shard-1.log && \
    cat /tmp/test-shard-2.log && \
    cat /tmp/test-shard-3.log && \
    cat /tmp/test-shard-4.log

# ============================================================================
# STAGE 9: Install Playwright browsers for E2E
# ============================================================================
FROM unit-tests AS e2e-browser
# Install Playwright with all Chromium dependencies
RUN npx playwright install chromium --with-deps

# ============================================================================
# STAGE 10: Run E2E tests AT BUILD TIME
# This is the magic - E2E runs during docker build with full browser!
# ============================================================================
FROM e2e-browser AS e2e-tests

# Build args for E2E (passed at build time)
ARG DATABASE_URL
ARG AUTH_SECRET
ARG E2E_BYPASS_SECRET

# Environment for E2E
ENV CI=true \
    BASE_URL=http://localhost:3000 \
    NEXTAUTH_URL=http://localhost:3000 \
    SKIP_ENV_VALIDATION=true \
    DATABASE_URL=${DATABASE_URL} \
    AUTH_SECRET=${AUTH_SECRET} \
    E2E_BYPASS_SECRET=${E2E_BYPASS_SECRET}

# Create reports directory
RUN mkdir -p e2e/reports

# Run E2E tests with proper server lifecycle management
# This script: starts server -> waits for ready -> runs tests -> captures result
RUN --mount=type=cache,target=/app/.next/cache \
    set -e && \
    echo "Starting Next.js dev server..." && \
    yarn dev > /tmp/server.log 2>&1 & \
    SERVER_PID=$! && \
    echo "Waiting for server (PID: $SERVER_PID)..." && \
    for i in $(seq 1 120); do \
        if curl -s http://localhost:3000 > /dev/null 2>&1; then \
            echo "Server ready in ${i}s"; \
            break; \
        fi; \
        if [ $i -eq 120 ]; then \
            echo "Server failed to start"; \
            cat /tmp/server.log; \
            exit 1; \
        fi; \
        sleep 1; \
    done && \
    echo "Running E2E tests..." && \
    npx cucumber-js --profile ci e2e/features/**/*.feature; \
    TEST_EXIT=$?; \
    echo "Tests finished with code: $TEST_EXIT"; \
    kill $SERVER_PID 2>/dev/null || true; \
    exit $TEST_EXIT

# ============================================================================
# STAGE 11: CI validation target (runs all checks)
# Use: docker build --target ci -t app:ci .
# ============================================================================
FROM e2e-tests AS ci
RUN echo "All CI checks passed: lint, build, unit tests, e2e tests"

# ============================================================================
# STAGE 12: Production runtime (minimal image)
# ============================================================================
FROM node:24.12.0-bookworm-slim AS production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 nodejs \
    && useradd -u 1001 -g nodejs nextjs

# Copy ONLY production artifacts (standalone mode)
# Note: --link is incompatible with --chown when user is created in same stage
COPY --from=build --chown=1001:1001 /app/.next/standalone ./
COPY --from=build --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=build --chown=1001:1001 /app/public ./public

USER nextjs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
